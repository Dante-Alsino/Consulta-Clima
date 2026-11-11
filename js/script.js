(() => {
'use strict';

const CHAVE_TEMA_STORAGE = 'consulta_clima_tema';
const CHAVE_FAVORITOS_STORAGE = 'consulta_clima_favoritos';

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
 * Converte uma coordenada para número finito rejeitando strings vazias, nulos e booleanos
 * @param {unknown} valor
 * @returns {number}
 */
function parseCoordenada(valor) {
	if (valor === null || valor === undefined || typeof valor === 'boolean') {
		return Number.NaN;
	}
	if (typeof valor === 'string' && valor.trim() === '') {
		return Number.NaN;
	}
	return Number(valor);
}

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
	if (valor === null || valor === undefined || valor === '' || typeof valor === 'boolean' || Number.isNaN(Number(valor))) {
		return 'Não disponível';
	}
	const sufixo = unidade ? ` ${unidade}` : '';
	return `${valor}${sufixo}`;
}

/**
 * Converte uma data no formato ISO YYYY-MM-DD para string legível curta em pt-BR (ex: "Seg., 29/10")
 * @param {string} dataIsoString - Data em formato 'YYYY-MM-DD'
 * @returns {string}
 */
function formatarDataPrevisao(dataIsoString) {
	if (typeof dataIsoString !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dataIsoString)) {
		return 'Data não disponível';
	}
	try {
		// Divide YYYY-MM-DD para instanciar a data local sem distorção de fuso UTC
		const [ano, mes, dia] = dataIsoString.split('-').map(Number);
		const data = new Date(ano, mes - 1, dia);
		if (Number.isNaN(data.getTime())) {
			return 'Data não disponível';
		}

		const formatador = new Intl.DateTimeFormat('pt-BR', {
			weekday: 'short',
			day: '2-digit',
			month: '2-digit'
		});

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
			latitude: parseCoordenada(local.latitude),
			longitude: parseCoordenada(local.longitude)
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
	const lat = parseCoordenada(latitude);
	const lon = parseCoordenada(longitude);

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

/**
 * Gera um identificador único para a localidade com base no ID ou coordenadas
 * @param {object} local 
 * @returns {string}
 */
function gerarIdLocalidade(local) {
	if (!local || typeof local !== 'object') {
		return '';
	}
	if (local.id !== undefined && local.id !== null && String(local.id).trim() !== '') {
		return String(local.id).trim();
	}
	const lat = parseCoordenada(local.latitude);
	const lon = parseCoordenada(local.longitude);
	if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
		return '';
	}
	return `${lat.toFixed(4)}_${lon.toFixed(4)}`;
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
			item.name.trim() !== '' &&
			Number.isFinite(parseCoordenada(item.latitude)) &&
			Number.isFinite(parseCoordenada(item.longitude))
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
	if (!idAlvo) return false;
	const favoritos = carregarFavoritos();
	return favoritos.some((item) => gerarIdLocalidade(item) === idAlvo);
}

/**
 * Adiciona uma cidade à lista de favoritos evitando duplicidades
 * @param {object} local 
 * @returns {{ sucesso: boolean, lista: Array<object>, motivo?: string }}
 */
function adicionarFavorito(local) {
	const lat = parseCoordenada(local?.latitude);
	const lon = parseCoordenada(local?.longitude);

	if (!local || !local.name || !Number.isFinite(lat) || !Number.isFinite(lon)) {
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
		latitude: lat,
		longitude: lon
	};

	favoritos.push(novoItem);
	const persistido = salvarFavoritos(favoritos);

	if (!persistido) {
		return {
			sucesso: false,
			lista: carregarFavoritos(),
			motivo: 'Não foi possível salvar nos favoritos do navegador.'
		};
	}

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
	const lat = parseCoordenada(local.latitude);
	const lon = parseCoordenada(local.longitude);

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
 * Atualiza o estado visual e de acessibilidade do botão de favoritar a cidade atual
 * @param {object|null} local 
 */
function atualizarBotaoFavoritar(local = localidadeSelecionada) {
	const btnFavoritar = document.getElementById('btn-favoritar');
	const textoBtn = document.getElementById('btn-favoritar-texto');

	if (!btnFavoritar) return;

	if (!local) {
		btnFavoritar.disabled = true;
		btnFavoritar.setAttribute('aria-pressed', 'false');
		if (textoBtn) textoBtn.textContent = 'Favoritar';
		return;
	}

	const jaFavorito = isLocalidadeFavorita(local);
	btnFavoritar.setAttribute('aria-pressed', jaFavorito ? 'true' : 'false');
	btnFavoritar.disabled = jaFavorito;

	if (jaFavorito) {
		if (textoBtn) textoBtn.textContent = 'Favoritada';
		btnFavoritar.setAttribute('aria-label', `${local.name} já está nos favoritos`);
	} else {
		if (textoBtn) textoBtn.textContent = 'Favoritar';
		btnFavoritar.setAttribute('aria-label', `Adicionar ${local.name} aos favoritos`);
	}
}

/**
 * Preenche e exibe o painel com as condições meteorológicas atuais da cidade selecionada
 * @param {object} local - Dados da cidade selecionada
 * @param {object} dadosClima - Resposta completa da API Open-Meteo
 */
function renderizarClimaAtual(local, dadosClima) {
	if (!local || !dadosClima || !dadosClima.current) return;

	localidadeSelecionada = local;

	const climaInicial = document.getElementById('clima-inicial');
	const painelAtual = document.getElementById('painel-atual');
	const tituloEl = document.getElementById('titulo-clima-atual');
	const dataHoraEl = document.getElementById('clima-data-hora');
	const tempEl = document.getElementById('clima-temperatura');
	const descEl = document.getElementById('clima-descricao');
	const sensacaoEl = document.getElementById('clima-sensacao');
	const umidadeEl = document.getElementById('clima-umidade');
	const ventoEl = document.getElementById('clima-vento');

	const atual = dadosClima.current;
	const unidades = dadosClima.current_units || {};
	const infoWMO = obterInfoClimaWMO(atual.weather_code);

	const partesLocal = [local.name, local.admin1, local.country].filter(Boolean);
	if (tituloEl) {
		tituloEl.textContent = partesLocal.join(', ');
	}

	if (dataHoraEl) {
		dataHoraEl.textContent = formatarDataHoraLeitura(atual.time, dadosClima.timezone);
	}

	if (tempEl) {
		tempEl.textContent = formatarValorComUnidade(atual.temperature_2m, unidades.temperature_2m);
	}

	if (descEl) {
		descEl.textContent = `${infoWMO.icone} ${infoWMO.descricao}`;
	}

	if (sensacaoEl) {
		sensacaoEl.textContent = formatarValorComUnidade(atual.apparent_temperature, unidades.apparent_temperature);
	}

	if (umidadeEl) {
		umidadeEl.textContent = formatarValorComUnidade(atual.relative_humidity_2m, unidades.relative_humidity_2m);
	}

	if (ventoEl) {
		ventoEl.textContent = formatarValorComUnidade(atual.wind_speed_10m, unidades.wind_speed_10m);
	}

	atualizarBotaoFavoritar(local);

	if (climaInicial) climaInicial.hidden = true;
	if (painelAtual) painelAtual.hidden = false;
}

/**
 * Constrói e exibe os cartões comparativos de previsão para os próximos 5 dias
 * @param {object} daily - Bloco daily retornado pela API
 * @param {object} [dailyUnits={}] - Unidades do bloco daily_units
 */
function renderizarPrevisaoDiaria(daily, dailyUnits = {}) {
	const painelPrevisao = document.getElementById('painel-previsao');
	const gradePrevisao = document.getElementById('grade-previsao');

	if (!painelPrevisao || !gradePrevisao) return;

	gradePrevisao.replaceChildren();

	if (!daily || !Array.isArray(daily.time) || daily.time.length === 0) {
		painelPrevisao.hidden = true;
		return;
	}

	const fragmento = document.createDocumentFragment();
	const totalDias = Math.min(daily.time.length, 5);

	for (let i = 0; i < totalDias; i++) {
		const dataIso = daily.time[i];
		const codigoClima = Array.isArray(daily.weather_code) ? daily.weather_code[i] : null;
		const tempMax = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max[i] : null;
		const tempMin = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min[i] : null;
		const probChuva = Array.isArray(daily.precipitation_probability_max)
			? daily.precipitation_probability_max[i]
			: null;

		const infoWMO = obterInfoClimaWMO(codigoClima);

		const card = document.createElement('article');
		card.className = 'forecast-card';
		card.setAttribute('role', 'listitem');

		const dataEl = document.createElement('h3');
		dataEl.className = 'forecast-card__date';
		dataEl.textContent = formatarDataPrevisao(dataIso);

		const condicaoEl = document.createElement('p');
		condicaoEl.className = 'forecast-card__condition';
		condicaoEl.textContent = `${infoWMO.icone} ${infoWMO.descricao}`;

		const tempsContainer = document.createElement('div');
		tempsContainer.className = 'forecast-card__temps';

		const spanMax = document.createElement('span');
		spanMax.className = 'forecast-card__temp-max';
		spanMax.title = 'Temperatura máxima';
		spanMax.textContent = `Máx: ${formatarValorComUnidade(tempMax, dailyUnits.temperature_2m_max)}`;

		const spanMin = document.createElement('span');
		spanMin.className = 'forecast-card__temp-min';
		spanMin.title = 'Temperatura mínima';
		spanMin.textContent = `Mín: ${formatarValorComUnidade(tempMin, dailyUnits.temperature_2m_min)}`;

		tempsContainer.appendChild(spanMax);
		tempsContainer.appendChild(spanMin);

		const chuvaEl = document.createElement('p');
		chuvaEl.className = 'forecast-card__rain';
		const textoChuva = formatarValorComUnidade(probChuva, dailyUnits.precipitation_probability_max);
		chuvaEl.textContent = `Chuva: ${textoChuva}`;

		card.appendChild(dataEl);
		card.appendChild(condicaoEl);
		card.appendChild(tempsContainer);
		card.appendChild(chuvaEl);

		fragmento.appendChild(card);
	}

	gradePrevisao.appendChild(fragmento);
	painelPrevisao.hidden = false;
}


let idRequisicaoClimaAtiva = 0;

/**
 * Executa a consulta meteorológica completa para uma localidade selecionada
 * @param {object} local - Objeto da localidade contendo nome, região, país e coordenadas
 */
async function selecionarLocalidadeEConsultarClima(local) {
	if (!local) return;

	const idRequisicaoAtual = ++idRequisicaoClimaAtiva;
	const btnBuscar = document.getElementById('btn-buscar');

	// Limpa os dados anteriores imediatamente para evitar confusão visual durante o carregamento
	limparPainelClima(false);
	atualizarMensagemEstado(`Carregando condições meteorológicas para ${local.name}...`, 'loading', true);

	if (btnBuscar) btnBuscar.disabled = true;

	try {
		const dadosClima = await consultarClimaAPI(local.latitude, local.longitude);
		if (idRequisicaoAtual !== idRequisicaoClimaAtiva) return;

		renderizarClimaAtual(local, dadosClima);
		renderizarPrevisaoDiaria(dadosClima.daily, dadosClima.daily_units);
		atualizarMensagemEstado(`Previsão atualizada para ${local.name}.`, 'success', false);
	} catch (erro) {
		if (idRequisicaoAtual !== idRequisicaoClimaAtiva) return;

		console.error('Erro ao consultar previsão meteorológica:', erro);
		limparPainelClima(true);
		atualizarMensagemEstado(
			'Não foi possível consultar os dados meteorológicos desta localidade. Verifique sua conexão e tente novamente.',
			'error',
			false
		);
	} finally {
		if (idRequisicaoAtual === idRequisicaoClimaAtiva && btnBuscar) {
			btnBuscar.disabled = false;
		}
	}
}

/**
 * Trata o envio do formulário de pesquisa de cidades com validação e controle de concorrência
 * @param {SubmitEvent} evento 
 */
async function processarSubmissaoBusca(evento) {
	evento.preventDefault();

	const inputCidade = document.getElementById('input-cidade');
	const btnBuscar = document.getElementById('btn-buscar');

	if (!inputCidade) return;

	const termo = inputCidade.value.trim();

	if (!termo) {
		inputCidade.value = '';
		inputCidade.focus();
		atualizarMensagemEstado('Informe o nome de uma cidade válida para realizar a pesquisa.', 'warning', false);
		return;
	}

	if (btnBuscar) btnBuscar.disabled = true;
	atualizarMensagemEstado(`Pesquisando localidades para "${termo}"...`, 'loading', true);

	try {
		const locais = await pesquisarCidadesAPI(termo);

		if (locais.length === 0) {
			renderizarResultadosBusca([], 'Nenhuma localidade encontrada para a pesquisa informada.');
			atualizarMensagemEstado(
				`Nenhum resultado encontrado para "${termo}". Verifique a grafia e tente novamente.`,
				'warning',
				false
			);
			return;
		}

		renderizarResultadosBusca(locais);
		atualizarMensagemEstado(
			`${locais.length} localidade(s) encontrada(s). Selecione a cidade desejada na lista de resultados.`,
			'info',
			false
		);
	} catch (erro) {
		console.error('Erro na pesquisa de cidades:', erro);
		renderizarResultadosBusca([], 'Não foi possível carregar os resultados da pesquisa.');
		atualizarMensagemEstado(
			'Falha ao pesquisar localidades. Verifique sua conexão com a internet e tente novamente.',
			'error',
			false
		);
	} finally {
		if (btnBuscar) btnBuscar.disabled = false;
	}
}

/**
 * Configura os ouvintes de eventos do formulário, botões e listas com delegação de eventos
 */
function configurarEventosInterface() {
	const formBusca = document.getElementById('form-busca');
	const listaResultados = document.getElementById('lista-resultados');
	const listaFavoritos = document.getElementById('lista-favoritos');
	const btnFavoritar = document.getElementById('btn-favoritar');

	if (formBusca) {
		formBusca.addEventListener('submit', processarSubmissaoBusca);
	}

	if (listaResultados) {
		listaResultados.addEventListener('click', async (evento) => {
			const alvo = evento.target;
			if (!alvo || typeof alvo.closest !== 'function') return;

			const botao = alvo.closest('button[data-acao="selecionar-resultado"]');
			if (!botao) return;

			const indice = Number.parseInt(botao.dataset.indice, 10);
			const localSelecionado = resultadosPesquisaAtuais[indice];

			if (localSelecionado) {
				await selecionarLocalidadeEConsultarClima(localSelecionado);
			}
		});
	}

	if (listaFavoritos) {
		listaFavoritos.addEventListener('click', async (evento) => {
			const alvo = evento.target;
			if (!alvo || typeof alvo.closest !== 'function') return;

			const botao = alvo.closest('button[data-acao]');
			if (!botao) return;

			const acao = botao.dataset.acao;
			const idAlvo = botao.dataset.id;
			if (!idAlvo) return;

			if (acao === 'selecionar-favorito') {
				const favoritos = carregarFavoritos();
				const favoritoSelecionado = favoritos.find((item) => gerarIdLocalidade(item) === idAlvo);
				if (favoritoSelecionado) {
					await selecionarLocalidadeEConsultarClima(favoritoSelecionado);
				}
			} else if (acao === 'remover-favorito') {
				const listaAtualizada = removerFavorito(idAlvo);
				renderizarFavoritos(listaAtualizada);
				atualizarBotaoFavoritar(localidadeSelecionada);
				atualizarMensagemEstado('Localidade removida dos favoritos.', 'info', false);
			}
		});
	}

	if (btnFavoritar) {
		btnFavoritar.addEventListener('click', () => {
			if (!localidadeSelecionada) return;

			const resultado = adicionarFavorito(localidadeSelecionada);
			if (resultado.sucesso) {
				renderizarFavoritos(resultado.lista);
				atualizarBotaoFavoritar(localidadeSelecionada);
				atualizarMensagemEstado(`${localidadeSelecionada.name} foi adicionada aos favoritos.`, 'success', false);
			} else if (resultado.motivo) {
				atualizarMensagemEstado(resultado.motivo, 'warning', false);
			}
		});
	}
}

/**
 * Inicializa e gerencia a alternância entre modo escuro e modo claro (white mode)
 */
function inicializarGerenciadorTema() {
	const btnTema = document.getElementById('btn-tema');
	const iconeTema = document.getElementById('icone-tema');
	const textoTema = document.getElementById('texto-tema');

	if (!btnTema) return;

	let temaSalvo = null;
	try {
		temaSalvo = localStorage.getItem(CHAVE_TEMA_STORAGE);
	} catch (erro) {
		console.warn('Não foi possível ler o tema do localStorage:', erro);
	}
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

/**
 * Ponto de entrada principal da aplicação
 */
function inicializarAplicacao() {
	inicializarGerenciadorTema();
	renderizarFavoritos();
	configurarEventosInterface();
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', inicializarAplicacao);
} else {
	inicializarAplicacao();
}
})();
