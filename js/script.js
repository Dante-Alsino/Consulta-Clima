/**
 * Consulta Meteorológica - Gerenciamento de Tema (Dark / White Mode)
 */

const CHAVE_TEMA_STORAGE = 'consulta_clima_tema';

// Códigos meteorológicos WMO e descrições correspondentes
const DESCRICOES_CLIMA_WMO = {
	0: { descricao: 'Céu limpo', icone: '☀️' },
	1: { descricao: 'Predominantemente limpo', icone: '🌤️' },
	2: { descricao: 'Parcialmente nublado', icone: '⛅' },
	3: { descricao: 'Nublado', icone: '☁️' },
	45: { descricao: 'Nevoeiro', icone: '🌫️' },
	48: { descricao: 'Nevoeiro com geada', icone: '🌫️' },
	51: { descricao: 'Garoa leve', icone: '🌦️' },
	53: { descricao: 'Garoa moderada', icone: '🌦️' },
	55: { descricao: 'Garoa intensa', icone: '🌧️' },
	56: { descricao: 'Garoa congelante leve', icone: '🌧️' },
	57: { descricao: 'Garoa congelante intensa', icone: '🌧️' },
	61: { descricao: 'Chuva fraca', icone: '🌦️' },
	63: { descricao: 'Chuva moderada', icone: '🌧️' },
	65: { descricao: 'Chuva forte', icone: '🌧️' },
	66: { descricao: 'Chuva congelante leve', icone: '🌨️' },
	67: { descricao: 'Chuva congelante forte', icone: '🌨️' },
	71: { descricao: 'Neve fraca', icone: '🌨️' },
	73: { descricao: 'Neve moderada', icone: '❄️' },
	75: { descricao: 'Neve forte', icone: '❄️' },
	77: { descricao: 'Grãos de neve', icone: '❄️' },
	80: { descricao: 'Pancadas de chuva fracas', icone: '🌦️' },
	81: { descricao: 'Pancadas de chuva moderadas', icone: '🌧️' },
	82: { descricao: 'Pancadas de chuva violentas', icone: '⛈️' },
	85: { descricao: 'Pancadas de neve fracas', icone: '🌨️' },
	86: { descricao: 'Pancadas de neve fortes', icone: '❄️' },
	95: { descricao: 'Tempestade', icone: '⛈️' },
	96: { descricao: 'Tempestade com granizo leve', icone: '⛈️' },
	99: { descricao: 'Tempestade com granizo forte', icone: '⛈️' }
};

/**
 * Retorna as informações legíveis e o ícone de um código meteorológico WMO
 * @param {number|null|undefined} codigo - Código WMO numérico retornado pela API
 * @returns {{ descricao: string, icone: string }}
 */
function obterInfoClimaWMO(codigo) {
	if (codigo === null || codigo === undefined || !Object.prototype.hasOwnProperty.call(DESCRICOES_CLIMA_WMO, codigo)) {
		return {
			descricao: 'Condição não disponível',
			icone: '🌡️'
		};
	}
	return DESCRICOES_CLIMA_WMO[codigo];
}

/**
 * Formata valor numérico acompanhado de unidade ou fallback caso ausente
 * @param {number|string|null|undefined} valor 
 * @param {string} [unidade='']
 * @returns {string}
 */
function formatarValorComUnidade(valor, unidade = '') {
	if (valor === null || valor === undefined || valor === '' || Number.isNaN(Number(valor))) {
		return 'Não disponível';
	}
	const sufixo = unidade ? ` ${unidade}` : '';
	return `${valor}${sufixo}`;
}

/**
 * Converte uma data no formato ISO YYYY-MM-DD para string legível curta em pt-BR (ex: "seg., 29/10")
 * @param {string} dataIsoString - Data em formato 'YYYY-MM-DD'
 * @returns {string}
 */
function formatarDataPrevisao(dataIsoString) {
	if (!dataIsoString) return 'Data não disponível';
	try {
		// Divide YYYY-MM-DD para instanciar a data local sem distorção de fuso UTC
		const [ano, mes, dia] = dataIsoString.split('-').map(Number);
		if (!ano || !mes || !dia) return dataIsoString;
		const data = new Date(ano, mes - 1, dia);

		const formatador = new Intl.DateTimeFormat('pt-BR', {
			weekday: 'short',
			day: '2-digit',
			month: '2-digit'
		});

		// Capitaliza a primeira letra do dia da semana
		const partes = formatador.format(data);
		return partes.charAt(0).toUpperCase() + partes.slice(1);
	} catch (erro) {
		console.warn('Erro ao formatar data de previsão:', erro);
		return dataIsoString;
	}
}

/**
 * Formata a data e hora atual no fuso da localidade
 * @param {string} isoString - Data/hora no padrão ISO ou string retornada pela API
 * @param {string} [timezone=''] - Nome do fuso horário retornado pela API
 * @returns {string}
 */
function formatarDataHoraLeitura(isoString, timezone = '') {
	if (!isoString) return '';
	try {
		const data = new Date(isoString);
		if (Number.isNaN(data.getTime())) {
			return `Atualizado em: ${isoString}`;
		}
		const formatador = new Intl.DateTimeFormat('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
		const fusoFormatado = timezone ? ` (${timezone})` : '';
		return `Atualizado em: ${formatador.format(data)}${fusoFormatado}`;
	} catch {
		return `Atualizado em: ${isoString}`;
	}
}
/**
 * Consulta a API de Geocodificação da Open-Meteo para localizar cidades pelo nome
 * @param {string} termo - Nome da cidade ou região
 * @returns {Promise<Array<{id: number|string, name: string, admin1: string, admin2: string, country: string, latitude: number, longitude: number}>>}
 */
async function pesquisarCidadesAPI(termo) {
	const termoLimpo = (termo || '').trim();
	if (!termoLimpo) {
		return [];
	}

	const parametros = new URLSearchParams({
		name: termoLimpo,
		count: '10',
		language: 'pt',
		format: 'json'
	});

	const url = `https://geocoding-api.open-meteo.com/v1/search?${parametros.toString()}`;

	try {
		const resposta = await fetch(url);

		if (!resposta.ok) {
			throw new Error(`Falha no serviço de localização (HTTP ${resposta.status}).`);
		}

		const dados = await resposta.json();

		if (!dados || !Array.isArray(dados.results)) {
			return [];
		}

		// Normaliza os resultados garantindo campos definidos e tipos consistentes
		return dados.results.map((local) => ({
			id: local.id ?? `${local.latitude}_${local.longitude}`,
			name: local.name || '',
			admin1: local.admin1 || '',
			admin2: local.admin2 || '',
			country: local.country || '',
			latitude: Number(local.latitude),
			longitude: Number(local.longitude)
		}));
	} catch (erro) {
		console.error('Erro na requisição de geocodificação:', erro);
		throw erro;
	}
}

/**
 * Consulta as condições atuais e a previsão para os próximos 5 dias
 * @param {number|string} latitude - Latitude geográfica (-90 a 90)
 * @param {number|string} longitude - Longitude geográfica (-180 a 180)
 * @returns {Promise<object>} Objeto com current, current_units, daily, daily_units e timezone
 */
async function consultarClimaAPI(latitude, longitude) {
	const lat = Number(latitude);
	const lon = Number(longitude);

	if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
		throw new Error('Coordenadas geográficas inválidas para a consulta de previsão.');
	}

	const parametros = new URLSearchParams({
		latitude: String(lat),
		longitude: String(lon),
		current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
		daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
		forecast_days: '5',
		timezone: 'auto'
	});

	const url = `https://api.open-meteo.com/v1/forecast?${parametros.toString()}`;

	try {
		const resposta = await fetch(url);

		if (!resposta.ok) {
			throw new Error(`Falha no serviço meteorológico (HTTP ${resposta.status}).`);
		}

		const dados = await resposta.json();

		if (!dados || typeof dados !== 'object' || !dados.current || !dados.daily) {
			throw new Error('Resposta do serviço meteorológico incompleta ou inválida.');
		}

		return dados;
	} catch (erro) {
		console.error('Erro na requisição meteorológica:', erro);
		throw erro;
	}
}

// Chave utilizada para persistência no localStorage
const CHAVE_FAVORITOS_STORAGE = 'consulta_clima_favoritos';

/**
 * Gera um identificador único para a localidade com base no ID ou coordenadas
 * @param {object} local 
 * @returns {string}
 */
function gerarIdLocalidade(local) {
	if (local.id !== undefined && local.id !== null) {
		return String(local.id);
	}
	const lat = Number(local.latitude).toFixed(4);
	const lon = Number(local.longitude).toFixed(4);
	return `${lat}_${lon}`;
}

/**
 * Carrega a lista de favoritos salva no navegador
 * @returns {Array<object>}
 */
function carregarFavoritos() {
	try {
		const serializado = localStorage.getItem(CHAVE_FAVORITOS_STORAGE);
		if (!serializado) {
			return [];
		}
		const parsed = JSON.parse(serializado);
		if (!Array.isArray(parsed)) {
			return [];
		}
		return parsed.filter((item) => (
			item &&
			typeof item === 'object' &&
			typeof item.name === 'string' &&
			Number.isFinite(Number(item.latitude)) &&
			Number.isFinite(Number(item.longitude))
		));
	} catch (erro) {
		console.warn('Falha ao ler favoritos do armazenamento:', erro);
		return [];
	}
}

/**
 * Salva a lista de favoritos no armazenamento local
 * @param {Array<object>} favoritos 
 * @returns {boolean}
 */
function salvarFavoritos(favoritos) {
	try {
		if (!Array.isArray(favoritos)) return false;
		localStorage.setItem(CHAVE_FAVORITOS_STORAGE, JSON.stringify(favoritos));
		return true;
	} catch (erro) {
		console.error('Falha ao salvar favoritos no armazenamento:', erro);
		return false;
	}
}

/**
 * Verifica se uma localidade já está salva nos favoritos
 * @param {object} local 
 * @returns {boolean}
 */
function isLocalidadeFavorita(local) {
	if (!local) return false;
	const idAlvo = gerarIdLocalidade(local);
	const favoritos = carregarFavoritos();
	return favoritos.some((item) => gerarIdLocalidade(item) === idAlvo);
}

/**
 * Adiciona uma cidade à lista de favoritos evitando duplicidades
 * @param {object} local 
 * @returns {{ sucesso: boolean, lista: Array<object>, motivo?: string }}
 */
function adicionarFavorito(local) {
	if (!local || !local.name || !Number.isFinite(Number(local.latitude)) || !Number.isFinite(Number(local.longitude))) {
		return { sucesso: false, lista: carregarFavoritos(), motivo: 'Dados da localidade incompletos.' };
	}

	const favoritos = carregarFavoritos();
	const idAlvo = gerarIdLocalidade(local);

	const jaExiste = favoritos.some((item) => gerarIdLocalidade(item) === idAlvo);
	if (jaExiste) {
		return { sucesso: false, lista: favoritos, motivo: 'Localidade já está favoritada.' };
	}

	const novoItem = {
		id: idAlvo,
		name: local.name,
		admin1: local.admin1 || '',
		admin2: local.admin2 || '',
		country: local.country || '',
		latitude: Number(local.latitude),
		longitude: Number(local.longitude)
	};

	favoritos.push(novoItem);
	salvarFavoritos(favoritos);
	return { sucesso: true, lista: favoritos };
}

/**
 * Remove uma cidade da lista de favoritos pelo identificador
 * @param {string|number} id 
 * @returns {Array<object>} Lista atualizada
 */
function removerFavorito(id) {
	const idStr = String(id);
	const favoritos = carregarFavoritos();
	const atualizados = favoritos.filter((item) => gerarIdLocalidade(item) !== idStr);
	salvarFavoritos(atualizados);
	return atualizados;
}

// Estado em memória da aplicação
let localidadeSelecionada = null;
let resultadosPesquisaAtuais = [];

/**
 * Atualiza o banner de status com feedback visual e indicador de carregamento
 * @param {string} texto - Mensagem a ser exibida (vazio oculta o banner)
 * @param {'info'|'loading'|'success'|'warning'|'error'} [tipo='info'] - Categoria visual da mensagem
 * @param {boolean} [carregando=false] - Exibe ou oculta o spinner de carregamento
 */
function atualizarMensagemEstado(texto, tipo = 'info', carregando = false) {
	const container = document.getElementById('status-container');
	const spinner = document.getElementById('status-spinner');
	const paragrafo = document.getElementById('status-mensagem');

	if (!container || !paragrafo) return;

	const mensagemLimpa = (texto || '').trim();

	if (!mensagemLimpa) {
		container.hidden = true;
		paragrafo.textContent = '';
		if (spinner) spinner.hidden = true;
		return;
	}

	const classesEstado = [
		'status--info',
		'status--loading',
		'status--success',
		'status--warning',
		'status--error'
	];

	container.classList.remove(...classesEstado);

	const classeAlvo = classesEstado.includes(`status--${tipo}`)
		? `status--${tipo}`
		: 'status--info';

	container.classList.add(classeAlvo);
	paragrafo.textContent = mensagemLimpa;

	if (spinner) {
		spinner.hidden = !carregando;
	}

	container.hidden = false;
}

/**
 * Limpa e oculta os painéis de clima atual e previsão, restaurando o estado vazio
 * @param {boolean} [mostrarEstadoInicial=true] - Define se o card de boas-vindas deve aparecer
 */
function limparPainelClima(mostrarEstadoInicial = true) {
	localidadeSelecionada = null;

	const climaInicial = document.getElementById('clima-inicial');
	const painelAtual = document.getElementById('painel-atual');
	const painelPrevisao = document.getElementById('painel-previsao');
	const gradePrevisao = document.getElementById('grade-previsao');

	if (painelAtual) painelAtual.hidden = true;
	if (painelPrevisao) painelPrevisao.hidden = true;
	if (climaInicial) climaInicial.hidden = !mostrarEstadoInicial;

	const idsTextoAtual = [
		'titulo-clima-atual',
		'clima-data-hora',
		'clima-temperatura',
		'clima-descricao',
		'clima-sensacao',
		'clima-umidade',
		'clima-vento'
	];

	idsTextoAtual.forEach((id) => {
		const el = document.getElementById(id);
		if (el) el.textContent = '';
	});

	if (gradePrevisao) {
		gradePrevisao.replaceChildren();
	}
}

/**
 * Monta o texto descritivo secundário (região, estado, país e coordenadas) para distinguir cidades homônimas
 * @param {object} local 
 * @returns {string}
 */
function formatarSubtituloLocalidade(local) {
	if (!local) return '';
	const regioes = [];
	if (local.admin2 && local.admin2 !== local.name) {
		regioes.push(local.admin2);
	}
	if (local.admin1 && local.admin1 !== local.admin2) {
		regioes.push(local.admin1);
	}
	if (local.country) {
		regioes.push(local.country);
	}

	const textoRegiao = regioes.join(', ');
	const lat = Number(local.latitude);
	const lon = Number(local.longitude);

	if (Number.isFinite(lat) && Number.isFinite(lon)) {
		const coords = `(${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`;
		return textoRegiao ? `${textoRegiao} • ${coords}` : coords;
	}

	return textoRegiao;
}

/**
 * Renderiza a lista de cidades retornadas pela pesquisa de geocodificação
 * @param {Array<object>} locais 
 * @param {string} [mensagemVazio='Realize uma pesquisa acima para listar as cidades encontradas.']
 */
function renderizarResultadosBusca(locais, mensagemVazio = 'Realize uma pesquisa acima para listar as cidades encontradas.') {
	const listaEl = document.getElementById('lista-resultados');
	const vazioEl = document.getElementById('resultados-vazio');

	if (!listaEl) return;

	resultadosPesquisaAtuais = Array.isArray(locais) ? locais : [];
	listaEl.replaceChildren();

	if (resultadosPesquisaAtuais.length === 0) {
		if (vazioEl) {
			vazioEl.textContent = mensagemVazio;
			vazioEl.hidden = false;
		}
		return;
	}

	if (vazioEl) {
		vazioEl.hidden = true;
	}

	const fragmento = document.createDocumentFragment();

	resultadosPesquisaAtuais.forEach((local, indice) => {
		const itemLi = document.createElement('li');
		itemLi.className = 'location-item';

		const botaoSelecionar = document.createElement('button');
		botaoSelecionar.type = 'button';
		botaoSelecionar.className = 'location-item__select';
		botaoSelecionar.dataset.acao = 'selecionar-resultado';
		botaoSelecionar.dataset.indice = String(indice);

		const spanNome = document.createElement('span');
		spanNome.className = 'location-item__name';
		spanNome.textContent = local.name || 'Localidade sem nome';

		const spanMeta = document.createElement('span');
		spanMeta.className = 'location-item__meta';
		spanMeta.textContent = formatarSubtituloLocalidade(local);

		botaoSelecionar.appendChild(spanNome);
		botaoSelecionar.appendChild(spanMeta);
		itemLi.appendChild(botaoSelecionar);
		fragmento.appendChild(itemLi);
	});

	listaEl.appendChild(fragmento);
}

/**
 * Renderiza a lista de cidades favoritas salvas no navegador
 * @param {Array<object>} [favoritos=carregarFavoritos()]
 */
function renderizarFavoritos(favoritos = carregarFavoritos()) {
	const listaEl = document.getElementById('lista-favoritos');
	const vazioEl = document.getElementById('favoritos-vazio');

	if (!listaEl) return;

	const listaSegura = Array.isArray(favoritos) ? favoritos : [];
	listaEl.replaceChildren();

	if (listaSegura.length === 0) {
		if (vazioEl) {
			vazioEl.hidden = false;
		}
		return;
	}

	if (vazioEl) {
		vazioEl.hidden = true;
	}

	const fragmento = document.createDocumentFragment();

	listaSegura.forEach((local) => {
		const idLocal = gerarIdLocalidade(local);

		const itemLi = document.createElement('li');
		itemLi.className = 'location-item';

		const botaoSelecionar = document.createElement('button');
		botaoSelecionar.type = 'button';
		botaoSelecionar.className = 'location-item__select';
		botaoSelecionar.dataset.acao = 'selecionar-favorito';
		botaoSelecionar.dataset.id = idLocal;

		const spanNome = document.createElement('span');
		spanNome.className = 'location-item__name';
		spanNome.textContent = local.name || 'Localidade';

		const spanMeta = document.createElement('span');
		spanMeta.className = 'location-item__meta';
		const partesMeta = [local.admin1, local.country].filter(Boolean);
		spanMeta.textContent = partesMeta.join(', ') || formatarSubtituloLocalidade(local);

		botaoSelecionar.appendChild(spanNome);
		botaoSelecionar.appendChild(spanMeta);

		const botaoRemover = document.createElement('button');
		botaoRemover.type = 'button';
		botaoRemover.className = 'btn btn--delete';
		botaoRemover.dataset.acao = 'remover-favorito';
		botaoRemover.dataset.id = idLocal;
		botaoRemover.setAttribute('aria-label', `Remover ${local.name} dos favoritos`);
		botaoRemover.title = 'Remover dos favoritos';
		botaoRemover.textContent = 'Remover';

		itemLi.appendChild(botaoSelecionar);
		itemLi.appendChild(botaoRemover);
		fragmento.appendChild(itemLi);
	});

	listaEl.appendChild(fragmento);
}


/**
 * Inicializa e gerencia a alternância entre modo escuro e modo claro (white mode)
 */
function inicializarGerenciadorTema() {
	const btnTema = document.getElementById('btn-tema');
	const iconeTema = document.getElementById('icone-tema');
	const textoTema = document.getElementById('texto-tema');

	if (!btnTema) return;

	// Recupera tema salvo ou prefere dark como padrão da aplicação
	const temaSalvo = localStorage.getItem(CHAVE_TEMA_STORAGE);
	const temaAtual = temaSalvo || 'dark';

	aplicarTema(temaAtual);

	btnTema.addEventListener('click', () => {
		const temaAtivo = document.documentElement.getAttribute('data-theme') || 'dark';
		const novoTema = temaAtivo === 'light' ? 'dark' : 'light';
		aplicarTema(novoTema);
		try {
			localStorage.setItem(CHAVE_TEMA_STORAGE, novoTema);
		} catch (erro) {
			console.warn('Não foi possível salvar o tema no localStorage:', erro);
		}
	});

	function aplicarTema(tema) {
		if (tema === 'light') {
			document.documentElement.setAttribute('data-theme', 'light');
			if (iconeTema) iconeTema.textContent = '🌙';
			if (textoTema) textoTema.textContent = 'Modo Escuro';
			btnTema.setAttribute('aria-label', 'Alternar para modo escuro');
		} else {
			document.documentElement.removeAttribute('data-theme');
			if (iconeTema) iconeTema.textContent = '☀️';
			if (textoTema) textoTema.textContent = 'Modo Claro';
			btnTema.setAttribute('aria-label', 'Alternar para modo claro');
		}
	}
}

// Inicializa o tema assim que a árvore do DOM estiver pronta
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', inicializarGerenciadorTema);
} else {
	inicializarGerenciadorTema();
}
