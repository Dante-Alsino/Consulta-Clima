# Consulta Clima ⛅

> Aplicação web front-end para consulta meteorológica em tempo real, previsão para 5 dias e gerenciamento de cidades favoritas com persistência local via API Open-Meteo.

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?logo=javascript&logoColor=black)
![API](https://img.shields.io/badge/API-Open--Meteo-009688)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## 1. Sobre o Projeto

**Consulta Clima** é uma aplicação web desenvolvida durante o **Programa de Formação Acelerada — Bolsa Futuro Digital (Curso de Desenvolvimento Front-end)**, promovido pelo **Instituto Hardware BR**, **Softex**, **MCTI** e **IFSUL (Câmpus Charqueadas)**.

O projeto resolve a necessidade de planejar atividades cotidianas e viagens consultando condições meteorológicas reais de qualquer localidade do mundo. A aplicação opera em **duas etapas assíncronas dependentes**:
1. **Geocodificação:** Localiza cidades pelo nome e desambigua homônimos (exibindo cidade, estado/região, país e coordenadas).
2. **Previsão Meteorológica:** Utiliza a latitude e longitude selecionadas para buscar o clima atual e a previsão estendida para os próximos 5 dias, além de permitir salvar localidades favoritas no navegador (`localStorage`).


---

## 2. Features Principais

- **Busca e Desambiguação de Cidades (RF01 / RF02):** Pesquisa localidades via Geocoding API exibindo nome, estado (`admin1`/`admin2`) e país para seleção precisa antes da consulta climática.
- **Painel de Condições Atuais (RF03):** Exibe temperatura atual, sensação térmica, umidade relativa do ar, velocidade do vento e tradução dos códigos meteorológicos **WMO** (ex.: *Céu limpo*, *Parcialmente nublado*, *Tempestade*).
- **Previsão para 5 Dias (RF04):** Organização visual em cartões comparativos contendo data, condição climática (WMO), temperaturas mínima/máxima e probabilidade máxima de precipitação.
- **Gerenciamento de Cidades Favoritas (RF06 / RF07):** Adição, listagem, consulta rápida com 1 clique e remoção de cidades favoritas com bloqueio de duplicidade (validado por ID/coordenadas) e persistência automática no `localStorage`.
- **Feedback Visual de Estados Assíncronos (RF08 / RA04):** Tratamento completo de estados de `loading`, sucesso, busca vazia, ausência de resultados e falhas de rede/HTTP (`!response.ok`), garantindo que erros não congelem a interface nem misturem dados de consultas anteriores.

---

## 3. Tecnologias Utilizadas

| Camada | Tecnologias / Recursos |
| :--- | :--- |
| **Frontend (Core)** | HTML5 Semântico, CSS3 (Layout Responsivo), JavaScript Vanilla (ES6+) |
| **Comunicação Assíncrona** | Fetch API, Promises (`async`/`await` / `.then()`), manipulação de `URLSearchParams` |
| **Persistência Client-Side** | Web Storage API (`localStorage`) com validação de integridade de JSON |
| **APIs Externas** | [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api) & [Open-Meteo Weather Forecast API](https://open-meteo.com/en/docs) |

---

## 4. Arquitetura e Estrutura do Projeto

O repositório segue a separação de responsabilidades recomendada na especificação técnica:

```text
Consulta-Clima/
├── sistema/
│   ├── index.html        # Estrutura semântica (Busca, Resultados, Clima Atual, Previsão 5 dias, Favoritos, Status)
│   ├── css/
│   │   └── style.css     # Estilização, grid de cartões e estados visuais de feedback
│   └── js/
│       └── script.js     # Módulos de requisição (Fetch), tradução WMO, manipulação de DOM e localStorage
├── .gitignore            # Regras de exclusão do Git (incluindo pasta local Diretriz/)
└── README.md             # Documentação técnica do projeto
```

---

## 5. Pré-requisitos & Instalação

A API **Open-Meteo** é gratuita para uso não comercial, possui suporte nativo a **CORS** e **não exige chave de API (`API Key`)**, permitindo execução direta no navegador.

### Passo a passo para rodar localmente

```bash
# 1. Clone o repositório
git clone https://github.com/Dante-Alsino/Consulta-Clima.git

# 2. Acesse o diretório do projeto
cd Consulta-Clima
```

Para abrir a aplicação, escolha uma das opções abaixo:
- **Opção A (Direto no navegador):** Abra o arquivo `sistema/index.html` diretamente no seu navegador favorito.
- **Opção B (Servidor local via VS Code):** Utilize a extensão **Live Server** clicando em *"Go Live"* sobre o arquivo `sistema/index.html`.
- **Opção C (Via terminal com Python ou Node):**
  ```bash
  # Usando npx (Node.js)
  npx serve sistema

  # Ou usando Python 3
  python -m http.server 8080 --directory sistema
  ```

---

## 6. Como Executar Testes (Cenários de Validação)

O projeto conta com **13 cenários de teste funcionais e de resiliência** que devem ser verificados no navegador:

| ID | Cenário | Como testar | Resultado esperado |
| :--- | :--- | :--- | :--- |
| **T01** | Pesquisa válida | Buscar por `"Porto Alegre"` | Lista resultados de localização e permite selecionar a cidade. |
| **T02** | Homônimos | Buscar cidade com múltiplos resultados (ex.: `"Santa Maria"`) | Exibe estado/país para distinguir e selecionar a localidade exata. |
| **T03** | Pesquisa vazia | Enviar formulário vazio ou apenas com espaços | Impede a requisição HTTP e exibe alerta/mensagem de validação. |
| **T04** | Cidade inexistente | Buscar por texto inexistente (ex.: `"xyz123abc"`) | Informa que nenhum resultado foi encontrado sem exibir dados climáticos. |
| **T05** | Consulta climática | Selecionar uma localidade listada | Exibe painel de clima atual + cartões de previsão para 5 dias com unidades. |
| **T06** | Nova pesquisa | Consultar outra cidade em seguida | Substitui os dados anteriores pelos da nova cidade selecionada. |
| **T07** | Estado de carregamento | Observar a UI durante a busca | Exibe indicador de carregamento e o oculta ao finalizar (`finally`). |
| **T08** | Falha de rede | Bloquear rede no DevTools (*Network -> Offline*) | Exibe mensagem amigável de erro de comunicação e reabilita nova tentativa. |
| **T09–T12** | Ciclo de Favoritos | Adicionar, recarregar página (`F5`), consultar e remover favorito | Mantém sincronia entre DOM e `localStorage`, impedindo duplicatas. |
| **T13** | Dados ausentes | Receber resposta com campo opcional ausente | Exibe indicação apropriada sem quebrar a execução e sem inventar dados. |

---

## 7. Documentação de API / Endpoints Consumidos

### 7.1. Etapa 1 — Geocodificação (`Geocoding API`)
Busca coordenadas a partir do nome da localidade:
```http
GET https://geocoding-api.open-meteo.com/v1/search?name={cidade}&count=10&language=pt&format=json
```
- **Principais campos utilizados:** `results[].id`, `results[].name`, `results[].admin1`, `results[].admin2`, `results[].country`, `results[].latitude`, `results[].longitude`.

### 7.2. Etapa 2 — Previsão Meteorológica (`Weather Forecast API`)
Consulta condições atuais e diárias usando as coordenadas obtidas na Etapa 1:
```http
GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto
```
- **Atribuição:** Dados meteorológicos fornecidos por [Open-Meteo.com](https://open-meteo.com/).

---

## 8. Como Contribuir

Contribuições são bem-vindas! Siga o fluxo abaixo mantendo o padrão de **Conventional Commits**:

1. Faça um **Fork** do projeto.
2. Crie uma branch para sua feature ou correção:
   ```bash
   git checkout -b feat/previsao-horaria
   ```
3. Realize o commit das suas alterações seguindo a convenção semântica:
   ```bash
   git commit -m "feat: adiciona grafico de previsao horaria"
   ```
4. Envie para o seu repositório remoto:
   ```bash
   git push origin feat/previsao-horaria
   ```
5. Abra um **Pull Request** detalhando o que foi alterado e os testes realizados.

---

## 9. Licença & Autoria

Distribuído sob a licença **MIT**.

- **Autor:** [Dante Alsino](https://github.com/Dante-Alsino)
- **Dados Meteorológicos:** [Open-Meteo API](https://open-meteo.com/) (CC BY 4.0)
