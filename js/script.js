/**
 * Consulta Meteorológica - Gerenciamento de Tema (Dark / White Mode)
 */

const CHAVE_TEMA_STORAGE = 'consulta_clima_tema';

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
