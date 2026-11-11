const fs = require('fs');
const path = require('path');
const vm = require('vm');

class ElementoDOM {
	constructor(tagName, id = '') {
		this.tagName = tagName.toUpperCase();
		this.id = id;
		this.className = '';
		this.textContent = '';
		this.value = '';
		this.hidden = false;
		this.disabled = false;
		this.title = '';
		this.type = '';
		this.dataset = {};
		this.attributes = {};
		this.children = [];
		this.parentElement = null;
		this.listeners = {};
		this.focado = false;
		const self = this;
		this.classList = {
			_set: new Set(),
			add(...classes) {
				classes.forEach((c) => this._set.add(c));
				self.className = Array.from(this._set).join(' ');
			},
			remove(...classes) {
				classes.forEach((c) => this._set.delete(c));
				self.className = Array.from(this._set).join(' ');
			},
			contains(c) {
				return this._set.has(c);
			}
		};
	}

	setAttribute(nome, valor) {
		this.attributes[nome] = String(valor);
	}

	getAttribute(nome) {
		return this.attributes[nome] ?? null;
	}

	removeAttribute(nome) {
		delete this.attributes[nome];
	}

	appendChild(filho) {
		if (filho.tagName === 'DOCUMENT_FRAGMENT') {
			filho.children.forEach((c) => {
				c.parentElement = this;
				this.children.push(c);
			});
			filho.children = [];
		} else {
			filho.parentElement = this;
			this.children.push(filho);
		}
		return filho;
	}

	replaceChildren(...novos) {
		this.children = [];
		novos.forEach((n) => this.appendChild(n));
	}

	addEventListener(tipo, fn) {
		if (!this.listeners[tipo]) this.listeners[tipo] = [];
		this.listeners[tipo].push(fn);
	}

	async dispatchEvent(evento) {
		const fns = this.listeners[evento.type] || [];
		for (const fn of fns) {
			await fn(evento);
		}
	}

	focus() {
		this.focado = true;
	}

	closest(seletor) {
		let atual = this;
		while (atual) {
			if (
				seletor === 'button[data-acao="selecionar-resultado"]' &&
				atual.tagName === 'BUTTON' &&
				atual.dataset.acao === 'selecionar-resultado'
			) {
				return atual;
			}
			if (
				seletor === 'button[data-acao]' &&
				atual.tagName === 'BUTTON' &&
				atual.dataset.acao
			) {
				return atual;
			}
			atual = atual.parentElement;
		}
		return null;
	}
}

function criarAmbienteDOM(storageCompartilhado = new Map()) {
	const elementosPorId = {};
	const idsIniciais = [
		['btn-tema', 'button'],
		['icone-tema', 'span'],
		['texto-tema', 'span'],
		['form-busca', 'form'],
		['input-cidade', 'input'],
		['btn-buscar', 'button'],
		['status-container', 'div'],
		['status-spinner', 'span'],
		['status-mensagem', 'p'],
		['resultados-vazio', 'p'],
		['lista-resultados', 'ul'],
		['favoritos-vazio', 'p'],
		['lista-favoritos', 'ul'],
		['painel-meteorologico', 'section'],
		['clima-inicial', 'div'],
		['painel-atual', 'article'],
		['titulo-clima-atual', 'h2'],
		['clima-data-hora', 'p'],
		['btn-favoritar', 'button'],
		['btn-favoritar-texto', 'span'],
		['clima-temperatura', 'span'],
		['clima-descricao', 'p'],
		['clima-sensacao', 'dd'],
		['clima-umidade', 'dd'],
		['clima-vento', 'dd'],
		['painel-previsao', 'section'],
		['grade-previsao', 'div']
	];

	idsIniciais.forEach(([id, tag]) => {
		const el = new ElementoDOM(tag, id);
		if (['status-container', 'status-spinner', 'painel-atual', 'painel-previsao'].includes(id)) {
			el.hidden = true;
		}
		elementosPorId[id] = el;
	});

	const localStorageMock = {
		getItem: (k) => (storageCompartilhado.has(k) ? storageCompartilhado.get(k) : null),
		setItem: (k, v) => storageCompartilhado.set(k, String(v)),
		removeItem: (k) => storageCompartilhado.delete(k),
		clear: () => storageCompartilhado.clear()
	};

	const documentMock = {
		readyState: 'complete',
		documentElement: new ElementoDOM('html'),
		getElementById: (id) => elementosPorId[id] || null,
		createElement: (tag) => new ElementoDOM(tag),
		createDocumentFragment: () => new ElementoDOM('DOCUMENT_FRAGMENT'),
		addEventListener: () => {}
	};

	return { elementosPorId, localStorageMock, documentMock, storageCompartilhado };
}

async function executarBateriaTestes() {
	const caminhoScript = path.join(__dirname, 'js', 'script.js');
	const codigoJS = fs.readFileSync(caminhoScript, 'utf8');
	const { elementosPorId, localStorageMock, documentMock, storageCompartilhado } = criarAmbienteDOM();

	const estadosCapturadosDuranteLoading = [];
	const fetchReal = global.fetch;

	const contexto = {
		document: documentMock,
		localStorage: localStorageMock,
		URLSearchParams,
		Intl,
		Date,
		Number,
		Array,
		Object,
		String,
		Math,
		JSON,
		console: {
			log: () => {},
			warn: () => {},
			error: () => {}
		},
		fetch: async (url, opts) => {
			estadosCapturadosDuranteLoading.push({
				url: String(url),
				spinnerHidden: elementosPorId['status-spinner'].hidden,
				statusHidden: elementosPorId['status-container'].hidden,
				statusTexto: elementosPorId['status-mensagem'].textContent,
				btnBuscarDisabled: elementosPorId['btn-buscar'].disabled
			});
			return fetchReal(url, opts);
		}
	};

	vm.createContext(contexto);
	vm.runInContext(codigoJS, contexto);

	const relatorio = [];
	const registrar = (num, nome, passou, detalhe) => {
		relatorio.push({ num, nome, passou, detalhe });
		console.log(`${passou ? '✅' : '❌'} Teste ${String(num).padStart(2, '0')} (${nome}): ${detalhe}`);
	};

	// Teste 1: Pesquisa válida ("Porto Alegre")
	elementosPorId['input-cidade'].value = 'Porto Alegre';
	await elementosPorId['form-busca'].dispatchEvent({ type: 'submit', preventDefault: () => {} });
	const qtdPortoAlegre = elementosPorId['lista-resultados'].children.length;
	registrar(1, 'Pesquisa válida', qtdPortoAlegre > 0, `${qtdPortoAlegre} localidade(s) listada(s) para "Porto Alegre"`);

	// Teste 2: Pesquisa com nomes semelhantes ("São Paulo")
	elementosPorId['input-cidade'].value = 'São Paulo';
	await elementosPorId['form-busca'].dispatchEvent({ type: 'submit', preventDefault: () => {} });
	const itensSP = elementosPorId['lista-resultados'].children;
	const primeiroBtnSP = itensSP[0]?.children[0];
	const nomeSP = primeiroBtnSP?.children[0]?.textContent;
	const metaSP = primeiroBtnSP?.children[1]?.textContent;
	registrar(2, 'Nomes semelhantes', itensSP.length > 1 && Boolean(metaSP), `${itensSP.length} resultados distintos; 1º item: "${nomeSP} — ${metaSP}"`);

	// Teste 3: Pesquisa vazia
	elementosPorId['input-cidade'].value = '    ';
	const chamadasAntesVazio = estadosCapturadosDuranteLoading.length;
	await elementosPorId['form-busca'].dispatchEvent({ type: 'submit', preventDefault: () => {} });
	const bloqueouFetchVazio = estadosCapturadosDuranteLoading.length === chamadasAntesVazio;
	const exibiuAvisoVazio = !elementosPorId['status-container'].hidden && elementosPorId['status-container'].classList.contains('status--warning');
	registrar(3, 'Pesquisa vazia', bloqueouFetchVazio && exibiuAvisoVazio, `Fetch bloqueado=${bloqueouFetchVazio}, Mensagem="${elementosPorId['status-mensagem'].textContent}"`);

	// Teste 4: Cidade não encontrada
	elementosPorId['input-cidade'].value = 'xyz123456inexistente';
	await elementosPorId['form-busca'].dispatchEvent({ type: 'submit', preventDefault: () => {} });
	const zeroResultados = elementosPorId['lista-resultados'].children.length === 0 && !elementosPorId['resultados-vazio'].hidden;
	registrar(4, 'Cidade não encontrada', zeroResultados, `Mensagem vazia="${elementosPorId['resultados-vazio'].textContent}"`);

	// Teste 5: Consulta meteorológica completa (buscando "São Paulo" e selecionando 1º item)
	elementosPorId['input-cidade'].value = 'São Paulo';
	await elementosPorId['form-busca'].dispatchEvent({ type: 'submit', preventDefault: () => {} });
	const btnSelecionarSP = elementosPorId['lista-resultados'].children[0]?.children[0];
	await elementosPorId['lista-resultados'].dispatchEvent({
		type: 'click',
		target: btnSelecionarSP
	});
	const painelAtualVisivel = !elementosPorId['painel-atual'].hidden;
	const painelPrevisaoVisivel = !elementosPorId['painel-previsao'].hidden;
	const qtdDiasPrevisao = elementosPorId['grade-previsao'].children.length;
	const tempAtual = elementosPorId['clima-temperatura'].textContent;
	registrar(5, 'Consulta meteorológica completa', painelAtualVisivel && painelPrevisaoVisivel && qtdDiasPrevisao === 5, `Clima atual="${tempAtual}", Cartões diários=${qtdDiasPrevisao}`);

	// Teste 6: Nova pesquisa após consulta anterior (Buscar e selecionar "Curitiba")
	elementosPorId['input-cidade'].value = 'Curitiba';
	await elementosPorId['form-busca'].dispatchEvent({ type: 'submit', preventDefault: () => {} });
	const primeiroBtnCuritiba = elementosPorId['lista-resultados'].children[0]?.children[0];
	await elementosPorId['lista-resultados'].dispatchEvent({
		type: 'click',
		target: primeiroBtnCuritiba
	});
	const tituloAtualizado = elementosPorId['titulo-clima-atual'].textContent;
	registrar(6, 'Nova pesquisa', tituloAtualizado.includes('Curitiba'), `Painel atualizado para "${tituloAtualizado}"`);

	// Teste 7: Estado de carregamento
	const ultimoLoading = estadosCapturadosDuranteLoading[estadosCapturadosDuranteLoading.length - 1];
	const carregouCorretamente = !ultimoLoading.spinnerHidden && ultimoLoading.btnBuscarDisabled && elementosPorId['status-spinner'].hidden && !elementosPorId['btn-buscar'].disabled;
	registrar(7, 'Estado de carregamento', carregouCorretamente, `Spinner visível durante fetch=${!ultimoLoading.spinnerHidden}, oculto após término=${elementosPorId['status-spinner'].hidden}`);

	// Teste 8: Falha de comunicação / Offline
	contexto.fetch = async () => {
		throw new Error('NetworkError when attempting to fetch resource.');
	};
	elementosPorId['input-cidade'].value = 'Porto Alegre';
	await elementosPorId['form-busca'].dispatchEvent({ type: 'submit', preventDefault: () => {} });
	const tratouErroRede = elementosPorId['status-container'].classList.contains('status--error') && elementosPorId['status-spinner'].hidden && !elementosPorId['btn-buscar'].disabled;
	registrar(8, 'Falha de comunicação', tratouErroRede, `Erro exibido="${elementosPorId['status-mensagem'].textContent}", Spinner oculto=${elementosPorId['status-spinner'].hidden}`);

	// Restaura fetch real e seleciona Curitiba novamente para testar favoritos
	contexto.fetch = fetchReal;
	elementosPorId['input-cidade'].value = 'Curitiba';
	await elementosPorId['form-busca'].dispatchEvent({ type: 'submit', preventDefault: () => {} });
	await elementosPorId['lista-resultados'].dispatchEvent({
		type: 'click',
		target: elementosPorId['lista-resultados'].children[0]?.children[0]
	});

	// Teste 9: Adicionar cidade aos favoritos + bloqueio de duplicidade
	await elementosPorId['btn-favoritar'].dispatchEvent({ type: 'click' });
	const qtdFavUI = elementosPorId['lista-favoritos'].children.length;
	const btnDesabilitadoAposFavoritar = elementosPorId['btn-favoritar'].disabled;
	await elementosPorId['btn-favoritar'].dispatchEvent({ type: 'click' });
	const salvosStorage = JSON.parse(localStorageMock.getItem('consulta_clima_favoritos') || '[]');
	registrar(9, 'Adicionar favorito', qtdFavUI === 1 && btnDesabilitadoAposFavoritar && salvosStorage.length === 1, `Favoritos UI=${qtdFavUI}, Duplicata bloqueada=${salvosStorage.length === 1}`);

	// Teste 10: Persistência dos favoritos ao recarregar a página (nova instância DOM com mesmo localStorage)
	const sessaoReload = criarAmbienteDOM(storageCompartilhado);
	const contextoReload = {
		document: sessaoReload.documentMock,
		localStorage: sessaoReload.localStorageMock,
		URLSearchParams,
		Intl,
		Date,
		Number,
		Array,
		Object,
		String,
		Math,
		JSON,
		console: { log: () => {}, warn: () => {}, error: () => {} },
		fetch: fetchReal
	};
	vm.createContext(contextoReload);
	vm.runInContext(codigoJS, contextoReload);
	const qtdAposReload = sessaoReload.elementosPorId['lista-favoritos'].children.length;
	registrar(10, 'Persistência dos favoritos', qtdAposReload === 1, `Favoritos restaurados automaticamente após F5=${qtdAposReload}`);

	// Teste 12: Reutilizar cidade favorita
	const btnSelecionarFavorito = elementosPorId['lista-favoritos'].children[0]?.children[0];
	await elementosPorId['lista-favoritos'].dispatchEvent({
		type: 'click',
		target: btnSelecionarFavorito
	});
	const consultouPeloFavorito = !elementosPorId['painel-atual'].hidden && elementosPorId['titulo-clima-atual'].textContent.includes('Curitiba');
	registrar(12, 'Reutilizar favorito', consultouPeloFavorito, `Reconsulta direta executada para "${elementosPorId['titulo-clima-atual'].textContent}"`);

	// Teste 11: Remover cidade favorita
	const btnRemoverFavorito = elementosPorId['lista-favoritos'].children[0]?.children[1];
	await elementosPorId['lista-favoritos'].dispatchEvent({
		type: 'click',
		target: btnRemoverFavorito
	});
	const favsRestantesStorage = JSON.parse(localStorageMock.getItem('consulta_clima_favoritos') || '[]').length;
	const favsRestantesUI = elementosPorId['lista-favoritos'].children.length;
	registrar(11, 'Remover favorito', favsRestantesStorage === 0 && favsRestantesUI === 0, `Favoritos UI=${favsRestantesUI}, localStorage=${favsRestantesStorage}`);

	// Teste 13: Tratamento de dados ausentes (null / undefined / NaN)
	contexto.fetch = async () => ({
		ok: true,
		status: 200,
		json: async () => ({
			current: {
				time: '2026-11-11T10:00',
				temperature_2m: 22.5,
				relative_humidity_2m: null,
				apparent_temperature: null,
				weather_code: 999,
				wind_speed_10m: null
			},
			current_units: {
				temperature_2m: '°C',
				relative_humidity_2m: '%',
				apparent_temperature: '°C',
				wind_speed_10m: 'km/h'
			},
			daily: {
				time: ['2026-11-11'],
				weather_code: [null],
				temperature_2m_max: [null],
				temperature_2m_min: [null],
				precipitation_probability_max: [null]
			},
			daily_units: {
				temperature_2m_max: '°C',
				temperature_2m_min: '°C',
				precipitation_probability_max: '%'
			}
		})
	});
	await elementosPorId['lista-resultados'].dispatchEvent({
		type: 'click',
		target: elementosPorId['lista-resultados'].children[0]?.children[0]
	});
	const sensacaoAusente = elementosPorId['clima-sensacao'].textContent === 'Não disponível';
	const umidadeAusente = elementosPorId['clima-umidade'].textContent === 'Não disponível';
	const ventoAusente = elementosPorId['clima-vento'].textContent === 'Não disponível';
	registrar(13, 'Dados ausentes', sensacaoAusente && umidadeAusente && ventoAusente, `Sensação="${elementosPorId['clima-sensacao'].textContent}", Umidade="${elementosPorId['clima-umidade'].textContent}", Vento="${elementosPorId['clima-vento'].textContent}"`);

	const falhas = relatorio.filter((r) => !r.passou);
	console.log(`\nResumo: ${relatorio.length - falhas.length}/${relatorio.length} cenários aprovados.`);
	if (falhas.length > 0) {
		process.exitCode = 1;
	}
}

executarBateriaTestes();
