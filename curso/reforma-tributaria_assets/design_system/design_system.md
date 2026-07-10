# Open Soluções Tributárias - Design System (Vanilla HTML/CSS)

Este Design System foi extraído e adaptado a partir do projeto original (Next.js/Tailwind CSS) para servir como guia definitivo no desenvolvimento de novas páginas institucionais utilizando apenas **HTML e CSS puros**. Ele visa garantir extrema consistência visual, organização estrutural e transições fluídas que reflitam a mesma identidade visual robusta e premium.

---

## 1. Grid e Espaçamentos (Layout & Grid System)

Para manter o layout alinhado e perfeitamente responsivo, utilizamos um container principal restrito, somado a margens/paddings laterais proporcionais e CSS Grid para organização interna.

### 1.1. Container e Restrições de Largura (Max-Widths)
A página toda deve ser restrita em telas ultra-largas para manter a leitura confortável.
* `--max-w-project`: `1920px` (Limite absoluto da página e wrappers como o header e footer).
* `--max-w-project-inner`: `1608px` (Conteúdo interno mais largo).
* `--max-w-text-wide`: `1320px` (Padrão para sessões de texto e grids centrais).
* `--max-w-hero-text`: `704px` (Blocos de texto em seções de destaque como Banners).
* `--width-card`: `520px` (Largura máxima padrão para cards isolados).

### 1.2. Espaçamentos Laterais (Lateral Padding)
Sempre utilize *paddings* progressivos nos *wrappers* (contêineres de conteúdo) dependendo da resolução:
* **Mobile (base):** `padding-left: 24px; padding-right: 24px;` (equivalente a `px-6`).
* **Tablet (md):** `padding-left: 48px; padding-right: 48px;` (equivalente a `px-12`).
* **Desktop Grande (2xl+):** `padding-left: 156px; padding-right: 156px;` (padrão `--container-px`).

### 1.3. Espaçamentos Verticais de Seção (Section Padding)
* `--spacing-section-sm`: `80px`
* `--spacing-section-lg`: `104px`
* `--spacing-section-xl`: `144px`

### 1.4. O Padrão de Grid (CSS Grid)
As seções complexas (como o Footer ou Nossas Soluções) utilizam um grid de 12 colunas em desktop e se adaptam para menos colunas em telas menores.
* **Mobile:** `grid-template-columns: 1fr;`
* **Tablet:** `grid-template-columns: repeat(2, 1fr);`
* **Desktop:** `grid-template-columns: repeat(12, 1fr);`
* **Gaps (Espaçamentos internos do Grid):** Tipicamente `32px` (equivalente a `gap-8`) ou `48px` (`gap-12`).

---

## 2. Componentes Estruturais (Structural Components)

### 2.1. Header / Navbar
O Header é flutuante, fixado ao topo e utiliza o efeito "Glassmorphism".
* **Posicionamento:** Fixo ao topo (`position: fixed; top: 0; left: 0; width: 100%; z-index: 50;`).
* **Espaçamento do Container:** `padding-top: 24px;` com restrição de `max-width: 1920px; margin: 0 auto;`. Adota o mesmo espaçamento lateral base (24px, 48px, 156px).
* **O "Card" do Header:** O conteúdo em si fica dentro de um bloco com fundo translúcido:
  * `background: rgba(255, 255, 255, 0.7);`
  * `backdrop-filter: blur(12px);`
  * `-webkit-backdrop-filter: blur(12px);`
  * `border: 1px solid rgba(255, 255, 255, 0.4);`
  * `border-radius: 16px;`
  * `box-shadow: var(--shadow-card-main);`
  * **Espaçamento Interno:** `padding: 12px 16px;` (mobile), evoluindo até `16px 64px;` (desktop 2xl).
* **Links:** Textos em `--color-navy-dark`, mudando para `--color-royal-blue` no hover, `font-size: 16px` a `24px` dependendo do breakpoint, com transição de cor suave.

### 2.2. Footer (Rodapé)
O rodapé é denso, escuro e utiliza uma marca d'água elegante do globo.
* **Fundo:** `--color-navy-dark` (`#010718`).
* **Espaçamento Vertical:** Topo `padding-top: 128px;`, Base `padding-bottom: 60px;`.
* **Container Interno:** `max-width: 1920px; margin: 0 auto;`, e usa os paddings laterais globais definidos. Relativo (`position: relative; z-index: 10;`).
* **Marca d'água (Globo):** A imagem `globo-open.svg` fica posicionada em `absolute` no fundo à direita:
  * `width: 1147px; height: 1147px;`
  * `opacity: 0.1;`
  * `mix-blend-mode: overlay;`
  * `pointer-events: none;`
* **Topografia Interna:** 
  * Os títulos das colunas usam texto em branco com `font-weight: 700; font-size: 21px;`. 
  * Os links usam `font-weight: 400; font-size: 16px; opacity: 0.8;` e `:hover` muda cor para `--color-cyan` (`#0B8ECC`) e opacidade para `1`.
* **Ícones Sociais:** Estilo arredondado (`border-radius: 50%; width: 32px; height: 32px; border: 2px solid #dfe0e2;`), efeito no hover (`background: white; color: #010718;`).

---

## 3. Cores (Color Palette)
Variáveis nativas para consistência absoluta.

### 3.1. Primárias
* `--color-navy-dark`: `#010718`
* `--color-navy-blue`: `#173468`
* `--color-royal-blue`: `#1D61DC`
* `--color-dark-blue`: `#1B3C64`
* `--color-deep-navy`: `#030D2F`

### 3.2. Secundárias
* `--color-cyan`: `#0B8ECC`
* `--color-light-cyan`: `#68D0FA`
* `--color-blue-logo`: `#0082C8`
* `--color-dark-logo`: `#003D7C`
* `--color-gold`: `#CAA624`

### 3.3. Neutras e Funcionais
* `--color-background-main`: `#FBFBFB`
* `--color-pure-white`: `#FFFFFF`
* `--color-warm-gray`: `#F4F2F0`
* `--color-light-gray`: `#E4E4EC`
* `--color-medium-gray`: `#C4C4C4`
* `--color-body-text`: `#63636E`
* `--color-dark-text`: `#434351`
* `--color-placeholder`: `#AFAFB6`
* `--color-error`: `#FF5252`

---

## 4. Tipografia (Typography)
* **Família:** `'Roboto Condensed', sans-serif`
* **Pesos:** `400` (Regular), `500` (Medium), `600` (SemiBold), `700` (Bold)
* **Tamanhos Base:** Textos normais começam em `16px`. Linha base (leading/line-height) geralmente em `1.2` (120%) para cabeçalhos curtos, e `1.5` (150%) para blocos de texto longo.

---

## 5. Gradientes, Fundos e Sombras

### 5.1. Gradientes
* **Botão Primário:** `linear-gradient(to left, #1B3C64 30.6%, #1D61DC)`
* **Botão Cyan:** `linear-gradient(to right, #0B8ECC, #68D0FA)`
* **Fundo Diagonal Escuro:** `linear-gradient(221deg, #040404 13.6%, #031140 64%)`
* **Fundo Diagonal Claro:** `linear-gradient(67.7deg, #F4F2F0 37.9%, #B4B4B4 134.9%)`

### 5.2. Sombras
* **Card Principal:** `0px 22px 48px rgba(0, 0, 0, 0.05), 0px 87px 87px rgba(0, 0, 0, 0.04)`
* **Botões:** `0px 4px 24px rgba(0, 0, 0, 0.16)`

---

## 6. Comportamentos, Interações e Animações (Interaction & Animations)

Como não utilizamos React/Framer Motion no ambiente puramente HTML, a interatividade e fluidez dependem inteiramente das `Transitions` CSS.

### 6.1. Regras de Transição
* O padrão é `transition: all 0.3s ease;` em quase todo elemento clicável ou com hover.
* Comportamento da Página (Smooth Scroll): `html { scroll-behavior: smooth; }`

### 6.2. Interação de Botões
* Os botões principais possuem padding robusto: `padding: 16px 32px;`, `border-radius: 8px;`, `font-weight: 700;`.
* **Hover:** Escala leve `transform: scale(1.02); opacity: 0.9;`
* **Active (Clique):** Escala reduzida `transform: scale(0.98);`
* *Botões escuros (`solid-dark`):* Mudam de `--color-navy-dark` para `--color-navy-blue` no hover, mantendo a escala.

### 6.3. Interação de Inputs (Formulários)
* Background branco base, `border-radius: 8px`, `border: 1px solid var(--color-medium-gray)`.
* **Hover no Input:** `border-color: #a0a0a0;`
* **Focus no Input:** `border-color: var(--color-dark-blue); box-shadow: 0 0 15px rgba(27,60,100,0.08); transform: translateY(-1px);`

---

## 7. Referência de Implementação CSS CSS/Variables (:root)

Abaixo temos uma arquitetura inicial base que qualquer IA pode utilizar para iniciar perfeitamente as estilizações sem precisar reescrever variáveis.

```css
@import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;500;600;700&display=swap');

:root {
  /* Colors */
  --color-navy-dark: #010718;
  --color-navy-blue: #173468;
  --color-royal-blue: #1D61DC;
  --color-dark-blue: #1B3C64;
  --color-deep-navy: #030D2F;
  --color-cyan: #0B8ECC;
  --color-light-cyan: #68D0FA;
  --color-background-main: #FBFBFB;
  --color-pure-white: #FFFFFF;
  --color-body-text: #63636E;
  --color-dark-text: #434351;
  --color-medium-gray: #C4C4C4;

  /* Spacing */
  --padding-mobile: 24px;
  --padding-tablet: 48px;
  --padding-desktop: 156px;
  
  --spacing-section-sm: 80px;
  --spacing-section-lg: 104px;
  --spacing-section-xl: 144px;

  /* Layout Max-Widths */
  --max-w-project: 1920px;
  --max-w-project-inner: 1608px;
  --max-w-text-wide: 1320px;

  /* Shadows */
  --shadow-card-main: 0px 22px 48px rgba(0, 0, 0, 0.05), 0px 87px 87px rgba(0, 0, 0, 0.04);
  --shadow-btn-arrow: 0px 4px 24px rgba(0, 0, 0, 0.16);
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  padding: 0;
  font-family: 'Roboto Condensed', sans-serif;
  background-color: var(--color-background-main);
  color: var(--color-dark-text);
  overflow-x: hidden;
}

/* Base Wrapper/Container Utility (Para Header, Footer e Main Content) */
.container-fluid {
  width: 100%;
  max-width: var(--max-w-project);
  margin: 0 auto;
  padding-left: var(--padding-mobile);
  padding-right: var(--padding-mobile);
}

@media (min-width: 768px) {
  .container-fluid {
    padding-left: var(--padding-tablet);
    padding-right: var(--padding-tablet);
  }
}

@media (min-width: 1536px) {
  .container-fluid {
    padding-left: var(--padding-desktop);
    padding-right: var(--padding-desktop);
  }
}

/* Grid Utility (12 colunas) */
.grid-12 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
}

@media (min-width: 768px) {
  .grid-12 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .grid-12 {
    grid-template-columns: repeat(12, 1fr);
  }
}
```
