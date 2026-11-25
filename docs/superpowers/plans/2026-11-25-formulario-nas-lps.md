# Plano: formulário dentro das LPs (pedido "Open_Formulario_nas_LPs_para_TI.pdf")

Escopo: `consultoria/clinicas`, `consultoria`, `consultoria/zfm` (formulário + rodapé) e `curso/reforma-tributaria` (só rodapé).
Fora do repo: `opentreinamentos.com.br/consultoria-gratuita` (WordPress) — ticket separado.
Revisado por 7 agentes (um por fase). Baseline: `node tests/<arquivo>.test.js` — os 4 testes passam.

## Diagnóstico confirmado

- 8 links `typebot.co` com `target="_blank"` por página, linhas 87, 103, 132, 299, 340, 385, 426, 555 (header, menu mobile, hero, seções, CTA final). Nenhum outro typebot no HTML.
- O modal `#formModal` / `#rdForm` existe (linhas 683-798), mas nenhum botão o abre. Entre as 3 páginas mudam só título, sub, placeholders, texto de sucesso e `identificador` (`consultoria-clinicas-landing-page`, `consultoria-gratuita-landing-page`, `consultoria-zfm-landing-page`).
- Bug do telefone: a máscara corta em 11 dígitos (`substring(0,11)`). `+55 55 34992345623` vira `(55) 55349-9234` e passa. O mesmo bug existe em `assets/js/lead-form.js` (`bindPhoneMask` L167, `isValidPhone` L61-64), que afeta o curso.
- O RD recebe o telefone mascarado. `capi.php` normaliza o telefone só para a Meta.
- Os leads vão só para o RD (API 1.3, token no front). `enviar-lead.php` só tem `diagnostico-tributario-assespro`. Ele também **exige `company` e `regime` (L79-81), então responderia 422 para as consultorias**, ignora cnpj/faturamento e tem título e assunto fixos de "Assespro".
- `gclid` não é capturado em lugar nenhum. `fbclid` só vira o cookie `_fbc`. Não existe `dataLayer.push` de lead.
- UTMs: as consultorias usam `sessionStorage gtap_*` e enviam `traffic_*` + `cf_utm_placement`. O `lead-form.js` usa `open_*`, inputs hidden e `cf_utm_*`. **Não renomear os campos do RD**, porque automações podem depender deles.
- Modal no celular: sem `max-height`/`overflow`. A etapa 2 soma cerca de 670px em 375x667 (mais em iOS ou no SE), então o botão de envio fica inalcançável. Inputs com 14px fazem o iOS dar zoom.
- Os 3 `style.css` das consultorias são idênticos e carregam **sem `?v=`**. O cache de 7 dias vem do servidor.
- O link da LGPD (L770) usa `target="_blank"` e aponta para `/politica-de-privacidade`, que **não existe (404)**. No rodapé, "Privacidade" e "Termos" são `href="#"`. O curso não tem link de LGPD.
- Rodapé (4 páginas): logo com link externo, contato (tel/wa.me/mailto), "4 frentes", "Conheça também" (inclui Tributarista 7D do commit ed092f8) e redes sociais. Grid `280px 1fr 260px`.
- Sem ESC, sem `role="dialog"` e sem foco no modal das consultorias. O curso tem ESC (L891).

## Conferência no RD Station (2026-11-25)

- **Campos personalizados (11):** `cf_cpf`, `cf_curso_de_interesse`, `cf_instituicao`, `cf_nivel_de_conhecimento_tributario`, `cf_placement`, `cf_utm_campaign`, `cf_utm_content`, `cf_utm_medium`, `cf_utm_source`, `cf_utm_term`, `cf_whatsapp`.
- **Não existem:** `cf_cnpj`, `cf_regime_tributario`, `cf_faturamento_medio`, `cf_utm_placement`, `cf_gclid`, `cf_fbclid` e `cf_setor` (este último usado pelo `lead-form.js`). O RD descarta campos `cf_` que não existem. Hoje, CNPJ, regime e faturamento das consultorias seriam perdidos.
  - **Criados em 2026-11-25** (Campo aberto - Texto): `cf_cnpj`, `cf_regime_tributario`, `cf_faturamento_medio`, `cf_gclid`, `cf_fbclid`, `cf_setor`. O RD passou a ter 17 campos.
  - `cf_utm_placement` → usar o `cf_placement`, que já existe.
- **Eventos de conversão:** `consultoria-clinicas-landing-page`, `consultoria-gratuita-landing-page` e `consultoria-zfm-landing-page` **não existem**. Os formulários das LPs nunca enviaram nada, o que bate com o modal sem uso. Não existe evento "typebot" nem "zfm".
  - "Consultoria para clínicas" existe, com **1 lead só**: os leads do Typebot praticamente não chegam ao RD.
- **Integrações ativas:** WordPress, **Ploomes (CRM)**, Integromat/Make, DashGoo e Meta Lead Ads (disponível). Existem segmentações "ploomes". O caminho até o comercial pode ser RD → Ploomes, mas falta confirmar com quem administra o Ploomes qual segmentação ou evento ele puxa.
- O plano do RD **não é PRO**: sem Automação de Marketing (fluxos). Uma notificação ao comercial por automação no RD não é possível, o que reforça o e-mail via `enviar-lead.php`.
- A base está com 70% do armazenamento de contatos do plano.

## Fases

### 1. JS compartilhado — **concluída em 2026-11-25**
Implementado em `assets/js/consultoria-form.js` (`OpenConsultoriaForm.init({identificador})`), arquivo próprio em vez de `lead-form.js`, para não carregar código das consultorias nas páginas de curso e congresso. O `lead-form.js` só passou a exportar `isValidEmail`, `isValidPhone`, `bindPhoneMask` e `trackMetaLead`. `?v=2026-11-25` nas 7 páginas. Testes: `tests/consultoria-form.test.js` (novo), `consultoria-submit` e `asset-versioning` reescritos.

Plano original:
- Novo `OpenLeadForms.initStepper(cfg)`. Não mexer em `init()`, que o curso e o congresso usam.
- Mover para ele o stepper, as máscaras, a captura `gtap_*` e o submit. Manter **exatamente** os nomes de campo do RD (`traffic_*`, `cf_utm_placement`, `cf_cnpj`, `cf_regime_tributario`, `cf_faturamento_medio`).
- Reutilizar os helpers privados (`getCookie`, `ensureFbc`, `genUuid`).
- Configuração por página: `identificador`, `formulario` (`clinicas` | `consultoria` | `zfm`).
- Funções globais usadas em `onclick` (`openModal`, `closeModal`, `goToStep1/2`): trocar por listeners ou expor.
- Bump do `?v=` de `lead-form.js` nas 7 páginas que o carregam (o teste exige uma versão única).
- Reescrever `tests/consultoria-submit.test.js` (hoje ele recorta o handler inline) e adicionar um teste que trava os nomes de campo do RD.
- Atualizar README e `docs/superpowers/plans/2026-09-09-rd-meta-pixel-formularios.md`.
- Commit separado, antes das demais fases.

### 2. CTAs abrem o modal — **concluída em 2026-11-25**
24 CTAs viraram `<button type="button" data-open-modal>`. No modal: ESC, clique fora e X fecham e devolvem ao mesmo ponto da página; o foco vai para o modal e volta ao botão (no menu mobile, ao hamburguer); Tab fica preso no formulário; `role="dialog"`/`aria-modal`/`aria-labelledby`. Os dados digitados só são apagados depois de um envio concluído. Nenhum CSS precisou mudar; o CTA do menu mobile ficou com texto escuro sobre amarelo (antes, quase branco). Teste: `tests/landing-cta.test.js`. `consultoria-form.js?v=2026-11-25-2`.
- Problema antigo encontrado (não mexido): em telas de ~1024px o botão do header passa 32px da borda direita. Tratar na Fase 5.
- Evento de abertura (pedido do usuário): `dataLayer.push({event:'formulario_aberto', formulario, cta_local})`, só quando o visitante clica num botão e o formulário estava fechado. `formulario`: `clinicas` | `consultoria` | `zfm` (config `init`). `cta_local`: `menu-mobile`, `header`, id da seção ou nome `section-*`, ou `hero`. Clínicas: header, menu-mobile, hero, como-funciona, resultados, temas, depoimentos, inscricao. `consultoria-form.js?v=2026-11-25-3`.
- O marketing precisa trocar no GTM os gatilhos por clique em link do Typebot por um gatilho de evento personalizado `formulario_aberto`.

Plano original:
- 24 `<a typebot>` viram `<button type="button" data-open-modal>`, com delegação de evento.
- No menu mobile: `closeMobileNav()` antes de `openModal()`, nessa ordem por causa do `body.overflow`.
- Ao abrir, guardar `scrollY` e o elemento que abriu. Ao fechar (X, ESC, overlay), restaurar o scroll com `behavior:'instant'` (o `html` tem `scroll-behavior:smooth`) e devolver o foco.
- Adicionar `role="dialog"`, `aria-modal="true"`, `aria-labelledby` e foco no primeiro campo.
- Resetar o formulário **só depois do sucesso**, não em toda abertura, para que um fechamento acidental não apague os dados.
- CSS: `.mobile-nav-drawer a` deixa de valer para o CTA. Conferir a cor e adicionar `font-family:inherit`.
- **Avisar o marketing**: gatilhos do GTM por "clique em link/URL typebot" vão parar de disparar.

### 3. Telefone — **concluída em 2026-11-25**
`normalizePhone`/`isValidPhone`/`formatPhone` em `lead-form.js` (vale para as 7 páginas que o usam). Regra: tira `55` só com 12–13 dígitos; 10–11 dígitos; DDD da lista Anatel (67); celular começa com 9; fixo com 2–5. Máscara não corta dígitos, mantém o `+` digitado e não reformata ao apagar (cursor não pula). RD e CAPI recebem só os dígitos (`34992345623`). Textos do campo nas 3 consultorias conforme o PDF; congresso: "Informe um telefone com DDD. Ex.: (34) 99234-5623" (antes dizia "obrigatório" também para número inválido). Teste: `tests/phone.test.js`. `lead-form.js?v=2026-11-25-3`, `consultoria-form.js?v=2026-11-25-4`.
- Ainda fora: a página da Assespro tem campo e validação próprios (não usa a máscara do `lead-form.js`).

Plano original:
`normalizePhone` + `isValidPhone` em `lead-form.js`, usados pelas consultorias e pelo curso:
1. `d = raw.replace(/\D/g,'')`
2. Se `d` tem 12–13 dígitos e começa com `55`, remover o `55` (DDD 55 com 10–11 dígitos fica intacto).
3. Se o tamanho não for 10 ou 11, rejeitar.
4. Se o DDD não estiver na lista (11-19, 21, 22, 24, 27, 28, 31-35, 37, 38, 41-49, 51, 53-55, 61-69, 71, 73-75, 77, 79, 81-89, 91-99), rejeitar.
5. Com 11 dígitos, o 3º dígito tem que ser `9`. Com 10 dígitos (fixo), o 3º tem que estar entre 2 e 5.

- A máscara **não corta mais**: mostra os dígitos extras e a validação recusa.
- Mensagem de erro: "O número está incorreto. Ex.: (34) 99234-5623". Label: "Telefone / WhatsApp com DDD". Placeholder: `(34) 99234-5623`.
- Enviar ao RD só os dígitos (`DDNNNNNNNNN`), como diz `DOCS_RD_STATION.md`.
- Testes em `tests/lead-form.test.js`: o caso do PDF rejeitado; `+55 34 99234-5623` normaliza para `34992345623`; DDD 55 válido; fixo aceito; `(20)…` rejeitado; `(34) 8…` com 11 dígitos rejeitado.

### 4. Sucesso, rastreamento e entrega do lead — **concluída em 2026-11-25, exceto o e-mail ao comercial**
- Tela de sucesso do PDF (tela 3) nas 3 consultorias: check verde, "Agradecemos pelo seu contato!", texto, convite e botão do Instagram (`instagram.com/foco.tributario`, nova aba, `rel="noopener"`) e botão "Fechar". CSS novo nos 3 `style.css` (idênticos); `style.css?v=2026-11-25`.
- `dataLayer.push({event:'lead_enviado', formulario})` só depois do OK do RD, uma vez por envio.
- RD recebe também `cf_utm_*`, `cf_gclid`, `cf_fbclid`; `cf_utm_placement` (não existe no RD) virou `cf_placement`. `traffic_*` continuam.
- Proteções: não gera lead duplicado se o visitante fechar e reenviar durante o envio; erro do Pixel da Meta não mostra erro ao visitante depois que o RD aceitou; rastreamento de um clique novo substitui o anterior (não mistura campanhas).
- `consultoria-form.js?v=2026-11-25-6`.
- E-mail ao comercial: `enviar-lead.php` generalizado (`$DESTINOS` com `to`/`subject`/`titulo`/`obrigatorios`/`campos`); as 3 consultorias enviam para `vendas@opentreinamentos.com.br` e `soraya.sa@opensolucoestributarias.com.br` com CNPJ, regime, faturamento e origem (UTMs, placement, gclid, fbclid). Assespro mantém regras e campos. A página chama o e-mail depois do OK do RD, sem bloquear a tela de sucesso. `consultoria-form.js?v=2026-11-25-7`.
- **Não verificado:** a sintaxe e o envio real do PHP (sem PHP nesta máquina). Conferir no servidor com um lead de teste depois do deploy.

Plano original:
- Tela de sucesso: ícone de check, "Agradecemos pelo seu contato!", "Em breve retornaremos com todas as informações.", "Aproveite para seguir a Open no Instagram.", botão Instagram (`target="_blank" rel="noopener"`) e botão "Fechar".
- No `.then` do RD, uma vez só: `window.dataLayer = window.dataLayer || []; dataLayer.push({event:'lead_enviado', formulario})`. Nunca em `.finally`.
- Capturar `gclid` e `fbclid` junto com as UTMs e enviar ao RD como `cf_gclid`/`cf_fbclid` (os campos precisam existir no RD).
- `enviar-lead.php`:
  - Configuração por formulário: título, assunto, destinatário, campos obrigatórios. `company` obrigatório só para a Assespro.
  - Aceitar cnpj, regime, faturamento, gclid, fbclid e placement.
  - Adicionar as 3 chaves das consultorias.
  - Chamar sem esperar a resposta depois do OK do RD, com `.catch(console.error)`, sem bloquear a tela de sucesso.
- Manter `<form>` + `<button type="submit">`, sem iframe.
- Respeitar as amarras do `consultoria-submit.test.js`: sucesso dentro do `.then`; `.finally` por último.

### 5. Modal em tela cheia no celular — **concluída em 2026-11-25**
- Antes: em 375×667 a etapa 2 tinha 737px; X, título e botão de envio ficavam cortados, sem rolagem. Campos com 14px (zoom no iPhone).
- Agora (≤600px): tela cheia (`100dvh`), rolagem por dentro, X fixo no topo, "Próximo"/"Solicitar Diagnóstico" fixos embaixo, campos com 16px. Em telas baixas no computador o modal rola por dentro (`max-height: 100%`).
- Corrigido junto (antigo): a caixa do aceite LGPD aparecia como uma barra fina (`.field label { display:block }` vencia o flex); rótulos "Seus dados"/"Sua clínica" no celular.
- Header (antigo, anotado na Fase 2): entre ~860px e 1110px o botão passava da borda. Agora o espaçamento do menu diminui entre 861px e 1180px, e abaixo de 1000px aparece o menu hambúrguer (antes só abaixo de 860px).
- `style.css?v=2026-11-25-6`. Testes de CSS em `tests/landing-cta.test.js`. Conferido em 375×667, 390×844, 880, 1001, 1024 e 1280×700.
- Limitação: no iPhone, com o teclado aberto, o botão fixo pode ficar atrás do teclado; o formulário continua rolando.

Plano original:
- Dentro de `@media (max-width:600px)`, depois da regra `.modal` existente:
  - overlay com `padding:0`;
  - modal com `100vh` e `100dvh`, `transform:none` e `overflow-y:auto`;
  - `overscroll-behavior:contain`;
  - X sticky no topo;
  - "Próximo" / `.step-actions` sticky embaixo, com `env(safe-area-inset-bottom)`;
  - inputs com `16px`;
  - sucesso centralizado.
- Adicionar `?v=` no `<link>` do `style.css` das 3 páginas.
- Opcional: "Etapa N de 2" + barra no lugar dos pontos do stepper, para ficar igual ao mock.

### 6. Rodapé sem saídas — **concluída em 2026-11-25**
- Rodapé novo nas 4 LPs (consultoria, clínicas, zfm, curso/reforma-tributaria): logo sem link, slogan, razão social + CNPJ + endereço e "Política de Privacidade". Saíram contatos (0800, WhatsApp, e-mail), "4 frentes", "Conheça também" (com Tributarista 7D), redes sociais e "Termos de uso" (`href="#"`).
- Política de privacidade (decisão do usuário): `https://opentreinamentos.com.br/politica-de-privacidade/` (única publicada; `/politica-de-privacidade` dava 404), nova aba, no rodapé e no aceite LGPD das 3 consultorias. O texto atual é curto (cookies) — revisar com o jurídico.
- Saídas restantes nas páginas: política de privacidade e Instagram (tela de agradecimento, pedido do PDF).
- CSS: rodapé em uma coluna. CSS antigo das colunas removidas ficou sem uso (não afeta). `style.css?v=2026-11-25-7` (consultorias) e `?v=2026-11-25` (curso). Teste: `tests/footer-clean.test.js`.

Plano original:
- Remover o link do logo (manter a imagem), contato, "4 frentes", "Conheça também" (com Tributarista 7D) e redes sociais.
- Manter razão social + CNPJ + endereço + política de privacidade.
- Grid do `.footer-main` em 1 coluna. Limpar o CSS que ficou sem uso, incluindo os breakpoints 960 e 600.
- LGPD no modal: tirar o `target="_blank"` e apontar para a URL real da política (decisão pendente).
- "Termos de uso" com `href="#"`: remover, ou apontar para a URL real.
- Não mexer em congresso, livro, retencoes, assespro nem obrigado (fora do PDF).

### 7. Verificação
- Testes novos:
  - `tests/landing-cta.test.js`: 0 typebot; CTAs `data-open-modal`; nenhum `_blank` no modal exceto o Instagram; `<form>` com submit.
  - `tests/footer-clean.test.js`: sem tel/wa.me/mailto/domínios externos; CNPJ presente.
  - Extensões em `lead-form.test.js`.
  - Verificação do `?v=` do CSS em `asset-versioning`.
- Navegador: `python3 -m http.server` (não há PHP local; o `.htaccess` não roda).
- chrome-devtools do ECC:
  - Interceptar `fetch` (RD/capi/enviar-lead → ok e depois 500).
  - Carregar com `?utm_source=t&gclid=G1&fbclid=F1`.
  - Conferir o payload e se `lead_enviado` aparece só 1 vez.
  - Em 375x812: modal em tela cheia com rolagem; abrir no meio da página e fechar com X/ESC/overlay mantendo o `scrollY`.
  - Regressão: curso/reforma-tributaria, retencoes e congresso.
- `ecc:code-review` no diff.

## Decisões pendentes (negócio)
1. Perfil do Instagram: `instagram.com/foco.tributario`?
2. URL da política de privacidade. A rota atual dá 404. Opções: criar a página, ou exibir o texto sem link.
3. E-mail do comercial que recebe os leads das 3 consultorias.
4. Valores de `formulario` no dataLayer: `clinicas` / `consultoria` / `zfm`. Confirmar com o marketing.
5. ~~Campos no RD~~ Criados em 2026-11-25. Continua pendente: o Ploomes deve receber os leads das 3 consultorias?
6. Envio por e-mail: depois do OK do RD (proposto) ou em paralelo (padrão da Assespro: mais chance de entrega, risco de duplicar)?
7. Responsável pela página WordPress da opentreinamentos.
