const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// As consultorias usam o formulario em 2 etapas de assets/js/consultoria-form.js
// (CNPJ, regime e faturamento), nao o OpenLeadForms.init. Cada pagina so passa
// o identificador do RD.
const PAGES = {
  'consultoria': 'consultoria-gratuita-landing-page',
  'consultoria/clinicas': 'consultoria-clinicas-landing-page',
  'consultoria/zfm': 'consultoria-zfm-landing-page',
};
// Nome da pagina nos eventos do GTM (formulario_aberto, lead_enviado).
const FORMULARIO = {
  'consultoria': 'consultoria',
  'consultoria/clinicas': 'clinicas',
  'consultoria/zfm': 'zfm',
};

Object.keys(PAGES).forEach(function (dir) {
  const html = fs.readFileSync(path.join(ROOT, dir, 'index.html'), 'utf8');

  const helperTag = html.indexOf('<script src="/assets/js/lead-form.js');
  const formTag = html.indexOf('<script src="/assets/js/consultoria-form.js');
  const initCall = html.indexOf('OpenConsultoriaForm.init(');
  assert.ok(helperTag > -1, dir + ': deve carregar /assets/js/lead-form.js');
  assert.ok(formTag > helperTag, dir + ': consultoria-form.js deve carregar depois do lead-form.js');
  assert.ok(initCall > formTag, dir + ': OpenConsultoriaForm.init deve vir depois do consultoria-form.js');

  const initArgs = html.slice(initCall, html.indexOf(')', initCall));
  assert.ok(
    initArgs.includes("identificador: '" + PAGES[dir] + "'"),
    dir + ': deve iniciar o formulario com identificador ' + PAGES[dir]
  );
  assert.ok(
    initArgs.includes("formulario: '" + FORMULARIO[dir] + "'"),
    dir + ': deve iniciar o formulario com formulario ' + FORMULARIO[dir]
  );

  // O codigo do formulario mora so no arquivo compartilhado.
  assert.ok(!html.includes("form.addEventListener('submit'"), dir + ': submit inline deve sair da pagina');
  assert.ok(!html.includes('token_rdstation'), dir + ': payload do RD deve sair da pagina');
  assert.ok(!/onclick="(goToStep1|goToStep2|closeModal)\(\)"/.test(html), dir + ': botoes do modal sao ligados pelo consultoria-form.js');
});

// Regra do envio: Lead e tela de sucesso so depois do RD confirmar, com retry
// (postRdConversion) e erro visivel quando falha.
const source = fs.readFileSync(path.join(ROOT, 'assets/js/consultoria-form.js'), 'utf8');
const start = source.indexOf("form.addEventListener('submit'");
const end = source.indexOf('// Fim do submit', start);
assert.ok(start > -1, 'consultoria-form.js: handler de submit nao encontrado');
assert.ok(end > start, 'consultoria-form.js: marcador "// Fim do submit" nao encontrado');
const block = source.slice(start, end);

assert.ok(!block.includes('rdstation.com.br'), 'nao deve chamar o RD direto (sem retry)');

// O arquivo guarda window.OpenLeadForms em `leads`.
assert.ok(source.includes('var leads = window.OpenLeadForms;'), 'deve usar os helpers do lead-form.js');
const post = block.indexOf('leads.postRdConversion(');
const lead = block.indexOf('leads.trackMetaLead(');
const success = block.indexOf('showSuccess(');
// Pedido do rastreamento (PDF): evento do GTM so no envio concluido.
const leadEvent = block.indexOf("event: 'lead_enviado'");
const errorShow = block.indexOf('errorBox.show(', post);
const catchAt = block.lastIndexOf('.catch(', errorShow);
const finallyAt = block.indexOf('.finally(', errorShow);

assert.ok(post > -1, 'deve enviar ao RD via OpenLeadForms.postRdConversion');
assert.ok(errorShow > -1, 'erro visivel deve ser exibido quando o RD falha');
assert.ok(lead > post, 'Lead (Pixel + CAPI) deve disparar so depois do RD confirmar');
assert.ok(success > post, 'tela de sucesso deve vir depois do envio ao RD');
assert.ok(catchAt > post, 'deve tratar falha do RD com .catch');
assert.ok(lead < catchAt && success < catchAt, 'Lead e sucesso devem ficar no .then, antes do .catch');
assert.ok(leadEvent > post && leadEvent < catchAt, "dataLayer lead_enviado deve ficar no .then, depois do RD confirmar");
assert.ok(block.slice(leadEvent - 120, leadEvent).includes('dataLayer.push('), 'lead_enviado deve ir para o dataLayer');
assert.ok(block.slice(leadEvent, leadEvent + 80).includes('formulario: config.formulario'), 'lead_enviado deve levar o nome do formulario');

// E-mail ao comercial: depois do RD confirmar e sem travar a tela de sucesso.
const email = block.indexOf('sendLeadEmail(');
assert.ok(email > post && email < catchAt, 'e-mail ao comercial deve sair no .then, depois do RD confirmar');
const sendFn = source.slice(source.indexOf('function sendLeadEmail('), source.indexOf('function sendLeadEmail(') + 700);
assert.ok(sendFn.includes("'/enviar-lead.php'"), 'sendLeadEmail deve chamar /enviar-lead.php');
assert.ok(sendFn.includes('.catch('), 'falha do e-mail nao pode quebrar o envio');
assert.ok(finallyAt > errorShow, '.finally deve vir por ultimo');
assert.strictEqual(block.indexOf('showSuccess(', finallyAt), -1, 'tela de sucesso nao pode ficar no .finally (apareceria mesmo com falha)');
assert.ok(block.includes('errorBox.hide()'), 'reenvio deve limpar o erro anterior');

console.log('consultoria-submit tests passed');
