const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Pedido do marketing: os botoes das LPs de consultoria abrem o formulario na
// propria pagina. Nenhum CTA leva para o Typebot nem abre nova aba.
const PAGES = ['consultoria', 'consultoria/clinicas', 'consultoria/zfm'];
const CTAS_PER_PAGE = 8;

PAGES.forEach(function (dir) {
  const html = fs.readFileSync(path.join(ROOT, dir, 'index.html'), 'utf8');

  assert.ok(!html.includes('typebot'), dir + ': nenhum link para o Typebot');

  const ctas = html.match(/<button type="button" data-open-modal class="[^"]+"[^>]*>/g) || [];
  assert.strictEqual(ctas.length, CTAS_PER_PAGE, dir + ': ' + CTAS_PER_PAGE + ' botoes devem abrir o formulario (achou ' + ctas.length + ')');

  // Ate o rodape nada abre nova aba (o rodape e tratado na Fase 6).
  const body = html.slice(0, html.indexOf('<footer'));
  assert.ok(!body.includes('target="_blank"'), dir + ': nenhum link do conteudo deve abrir nova aba');

  // Formulario acessivel: leitor de tela anuncia a janela e o titulo.
  const dialog = html.match(/<div class="modal modal-stepper"([^>]*)>/);
  assert.ok(dialog, dir + ': modal do formulario nao encontrado');
  assert.ok(dialog[1].includes('role="dialog"'), dir + ': modal deve ter role="dialog"');
  assert.ok(dialog[1].includes('aria-modal="true"'), dir + ': modal deve ter aria-modal="true"');
  assert.ok(dialog[1].includes('tabindex="-1"'), dir + ': modal deve receber foco ao abrir');
  const labelledBy = dialog[1].match(/aria-labelledby="([^"]+)"/);
  assert.ok(labelledBy, dir + ': modal deve ter aria-labelledby');
  assert.ok(html.includes('id="' + labelledBy[1] + '"'), dir + ': titulo #' + labelledBy[1] + ' deve existir');

  // Textos do telefone pedidos no PDF (tela 2).
  assert.ok(html.includes('Telefone / WhatsApp com DDD'), dir + ': rotulo deve pedir o DDD');
  assert.ok(html.includes('O número está incorreto. Ex.: (34) 99234-5623'), dir + ': mensagem de erro do telefone do PDF');

  // Tela depois do envio (PDF tela 3): agradecimento, Instagram em nova aba e Fechar.
  const successStart = html.indexOf('id="modalSuccess"');
  const successBlock = html.slice(successStart, html.indexOf('<!-- === JAVASCRIPT', successStart));
  assert.ok(successBlock.includes('Agradecemos pelo seu contato!'), dir + ': titulo do agradecimento');
  assert.ok(successBlock.includes('Em breve retornaremos com todas as informações.'), dir + ': texto do agradecimento');
  assert.ok(successBlock.includes('Aproveite para seguir a Open no Instagram.'), dir + ': convite do Instagram');
  assert.ok(!successBlock.includes('Recebemos seus dados'), dir + ': mensagem antiga deve sair');
  const instagram = successBlock.match(/<a [^>]*href="https:\/\/www\.instagram\.com\/[^"]+"[^>]*>/);
  assert.ok(instagram, dir + ': botao do Instagram');
  assert.ok(instagram[0].includes('target="_blank"') && instagram[0].includes('rel="noopener"'), dir + ': Instagram abre em nova aba com rel="noopener"');
  assert.ok(/<button type="button"[^>]*data-close-modal[^>]*>\s*Fechar\s*<\/button>/.test(successBlock), dir + ': botao Fechar');

  // Continua sendo um <form> HTML com botao de envio (pedido do rastreamento).
  assert.ok(/<form id="rdForm"/.test(html), dir + ': formulario deve ser <form id="rdForm">');
  assert.ok(/<button type="submit"[^>]*id="btnSubmit"/.test(html), dir + ': envio deve ser <button type="submit">');
});

// CSS: as 3 paginas usam copias do mesmo style.css; o formulario ocupa a tela
// inteira no celular (PDF tela 4) e rola por dentro em telas baixas.
const css = PAGES.map(function (dir) { return fs.readFileSync(path.join(ROOT, dir, 'assets/style.css'), 'utf8'); });
assert.ok(css.every(function (c) { return c === css[0]; }), 'os 3 style.css das consultorias devem continuar identicos');
const mobile = css[0].slice(css[0].indexOf('Celular: o formulario ocupa a tela inteira'));
assert.ok(mobile.includes('height: 100dvh;'), 'no celular o formulario deve ocupar a altura da tela');
assert.ok(/#btnNextStep,\s*#rdForm \.step-actions \{\s*position: sticky;/.test(mobile), 'botao de avancar/enviar fica fixo embaixo');
assert.ok(/#rdForm \.field select \{ font-size: 16px; \}/.test(mobile), 'campos com 16px para o iPhone nao dar zoom');
assert.ok(css[0].includes('.modal-overlay .modal-stepper {\n  max-height: 100%;\n  overflow-y: auto;'), 'em telas baixas o formulario rola por dentro');
assert.ok(css[0].includes('.field .lgpd-check { display: flex; }'), 'caixa do aceite LGPD visivel');

// O consultoria-form.js liga os botoes e fecha com ESC.
const source = fs.readFileSync(path.join(ROOT, 'assets/js/consultoria-form.js'), 'utf8');
assert.ok(source.includes("closest('[data-open-modal]')"), 'consultoria-form.js deve abrir o modal a partir de [data-open-modal]');
assert.ok(source.includes("'Escape'"), 'consultoria-form.js deve fechar o modal com ESC');

console.log('landing-cta tests passed');
