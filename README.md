# LP Open Soluções Tributárias

Este repositório contém as landing pages estáticas da **Open Soluções Tributárias**. 

A arquitetura do projeto foi desenhada para ser simples, extremamente rápida de carregar e de fácil manutenção, sem a necessidade de compiladores, pré-processadores ou dependências de runtime.

---

## 🛠️ Arquitetura do Projeto (Instruções para IAs e Desenvolvedores)

> [!IMPORTANT]
> **ESTRUTURA 100% ESTÁTICA (SEM NODE.JS):** 
> Este projeto **não utiliza** Node.js, Astro, Tailwind CLI, bundlers (Vite/Webpack) ou instaladores de pacotes (`npm`, `pnpm`, `yarn`).
>
> Todas as páginas são arquivos estáticos puros (**HTML, CSS e JavaScript Vanilla**). Qualquer biblioteca de terceiros (ex: fontes, ícones, scripts de analytics) **deve ser incluída via link de CDN** diretamente no HTML.

### 📁 Estrutura de Diretórios

As páginas devem ser organizadas em subdiretórios auto-contidos dentro da pasta raiz para manter a modularidade:

```text
lp.opensolucoes/
├── .htaccess             # Configurações do servidor (URLs limpas, cache e redirecionamentos)
├── README.md             # Este arquivo de documentação
├── .gitignore            # Arquivos ignorados pelo Git
└── curso/                # Categoria ou agrupador de páginas
    ├── [nome-da-lp]/     # Pasta específica de uma landing page (ex: cursos, curso-antigo)
    │   ├── index.html    # Código-fonte principal da página (sempre index.html)
    │   └── assets/       # Assets exclusivos desta página (imagens, ícones, etc.)
    │       ├── logo-open-rto.webp
    │       └── hero-curso-rto.webp
```
*Observação sobre URLs sem barra final: se a estrutura exigir uma página no nível superior da categoria (ex: `/curso/reforma-tributaria`), o HTML será um arquivo avulso (`curso/reforma-tributaria.html`) e seus assets viverão em uma pasta homônima (`curso/reforma-tributaria_assets/`).*

---

## 🖼️ Gerenciamento de Assets (Imagens, CSS e JS)

*   **Arquitetura Auto-contida (Colocação):** Todos os assets específicos de uma página devem ficar em sua pasta local `_assets/` associada à página ou `assets/` se for um diretório.
*   **Caminhos Relativos:** Dentro do arquivo HTML, todas as referências a esses assets **devem ser caminhos relativos** (ex: `src="reforma-tributaria_assets/hero-curso-rto.webp"`). 
    *   *Por que?* Isso torna a página 100% portátil. Ela pode ser movida, duplicada ou renomeada sem quebrar nenhum link de imagem ou recurso.
*   **Otimização de Imagens:** Sempre prefira formatos modernos como `.webp` ou `.svg`. Imagens grandes de fundo devem ser comprimidas e usar `loading="lazy"` (exceto acima da dobra, onde deve ser usado `fetchpriority="high"` ou pré-carregamento).

---

## 🌐 Configuração do Servidor Estático (Hostinger)

O subdomínio em produção é hospedado na Hostinger (servidor Apache/LiteSpeed). O roteamento e as URLs limpas são controlados pelo arquivo `.htaccess` na raiz:

1.  **Index de Diretório:** O servidor resolve automaticamente o arquivo `index.html` dentro de cada subpasta.
    *   Acesso físico: `/curso/cursos/index.html` -> URL visível: `meudominio.com/curso/cursos`
2.  **Remoção do `.html`:** Qualquer tentativa de acessar arquivos `.html` diretamente é interceptada e redirecionada (301) para a versão limpa, ou servida ocultando a extensão.
3.  **Redirecionamentos de Legado:** URLs antigas estruturadas na raiz (ex: `/curso-antigo.html`) são redirecionadas permanentemente (301) para suas respectivas novas pastas (ex: `/curso/reforma-tributaria`).

---

## 📈 Boas Práticas de SEO e Performance

Ao criar ou editar qualquer página neste repositório, certifique-se de seguir estes padrões:

### HTML Semântico e SEO:
*   **URLs Amigáveis (Slugs SEO) e Barra Final (`/`):**
    *   **Use nomes descritivos com hífens:** IAs e desenvolvedores devem sempre indicar nomes descritivos para os caminhos. Evite barras em datas ou nomes compostos que gerem subpastas profundas (ex: em vez de `curso/reforma-tributaria/07/05/2026`, use `curso/reforma-tributaria-07-05-2026`). Isso é muito melhor para SEO.
    *   **Remover a Barra Final (`/`):** Se o design exigir que a URL **não termine** com barra (ex: `/curso/cursos` em vez de `/curso/cursos/`), a página deve ser criada como um arquivo HTML avulso (ex: `curso/cursos.html`) ao invés de uma pasta com `index.html`. O `.htaccess` servirá o arquivo omitindo o `.html` sem adicionar a barra final. Os assets correspondentes devem ficar em uma pasta de nome correspondente (ex: `curso/cursos_assets/`).
*   Use apenas um único elemento `<h1>` por página (geralmente no título principal da dobra de destaque).
*   Use tags estruturais do HTML5 (`<header>`, `<main>`, `<section>`, `<footer>`).
*   Configure os metadados de SEO essenciais no `<head>`:
    ```html
    <title>Título curto e chamativo com a palavra-chave</title>
    <meta name="description" content="Descrição chamativa de até 160 caracteres.">
    <link rel="canonical" href="https://pagina.opensolucoestributarias.com.br/curso/cursos">
    ```
*   Sempre forneça a propriedade `alt` descritiva para imagens.

### Performance e Acessibilidade:
*   Adicione atributos `width` e `height` em todas as tags `<img>` para evitar instabilidade de layout (CLS - Cumulative Layout Shift).
*   Carregue fontes de forma otimizada usando `font-display: swap` no CSS.
*   Scripts de rastreamento (GTM, Pixel, Analytics) devem ser carregados de forma assíncrona (`async` ou `defer`) ou injetados no final do body para não bloquear a renderização inicial da página.
