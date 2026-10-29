/**
 * Consulta Meteorológica - Gerenciamento de Tema (Dark / White Mode)
 */

const CHAVE_TEMA_STORAGE = 'consulta_clima_tema';

/* ==========================================================================
   CARD 08 — DICIONÁRIO WMO, CONSTANTES E UTILITÁRIOS DE FORMATAÇÃO
   Requisitos RF03, RF04 e Regra de Negócio 9 (Sem dados fictícios)
   ========================================================================== */

/**
 * Tabela de códigos WMO oficiais da Open-Meteo, suas descrições e ícones correspondentes
 */
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
 * Formata um valor numérico acompanhado de sua unidade oficial da API.
 * Garante que valores ausentes (null, undefined, NaN) sejam apresentados como "Não disponível"
 * sem nunca inventar valores fictícios (Regra de Negócio 9 e Teste 13).
 * 
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
