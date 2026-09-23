const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGES = ['consultoria', 'consultoria/clinicas', 'consultoria/zfm'];

// As consultorias tem submit inline proprio (formulario com CNPJ, regime e
// faturamento), entao nao usam OpenLeadForms.init. Este teste garante que o
// handler delas segue a mesma regra do helper: Lead e tela de sucesso so
// depois do RD confirmar, com retry e erro visivel quando falha.
function submitHandler(dir) {
  const html = fs.readFileSync(path.join(ROOT, dir, 'index.html'), 'utf8');
  const start = html.indexOf("form.addEventListener('submit'");
  const end = html.indexOf('// Clear errors on input/change', start);
  assert.ok(start > -1, dir + ': handler de submit nao encontrado');
  assert.ok(end > start, dir + ': fim do handler de submit nao encontrado');
  return { html, block: html.slice(start, end) };
}

PAGES.forEach(function (dir) {
  const { html, block } = submitHandler(dir);

  const helperTag = html.indexOf('<script src="/assets/js/lead-form.js"></script>');
  const handlerStart = html.indexOf("form.addEventListener('submit'");
  assert.ok(helperTag > -1, dir + ': deve carregar /assets/js/lead-form.js');
  assert.ok(helperTag < handlerStart, dir + ': lead-form.js deve carregar antes do script da pagina');

  assert.ok(
    !block.includes("fetch('https://www.rdstation.com.br/api/1.3/conversions'"),
    dir + ': nao deve chamar o RD direto (sem retry)'
  );

  const post = block.indexOf('OpenLeadForms.postRdConversion(');
  assert.ok(post > -1, dir + ': deve enviar ao RD via OpenLeadForms.postRdConversion');

  const lead = block.indexOf("fbq('track', 'Lead'");
  const capi = block.indexOf("fetch('/capi.php'");
  const success = block.indexOf("getElementById('modalSuccess').classList.add('show')");
  const errorShow = block.indexOf('errorBox.show(', post);
  assert.ok(errorShow > -1, dir + ': erro visivel deve ser exibido quando o RD falha');
  // O .catch da cadeia do RD e o que envolve o errorBox.show — nao o .catch
  // interno do fetch da CAPI, que fica dentro do .then.
  const catchAt = block.lastIndexOf('.catch(', errorShow);
  const finallyAt = block.indexOf('.finally(', errorShow);

  assert.ok(lead > post, dir + ': Lead deve disparar so depois do RD confirmar');
  assert.ok(capi > post, dir + ': CAPI deve disparar so depois do RD confirmar');
  assert.ok(success > post, dir + ': tela de sucesso deve vir depois do envio ao RD');
  assert.ok(catchAt > post, dir + ': deve tratar falha do RD com .catch');
  assert.ok(lead < catchAt && capi < catchAt && success < catchAt, dir + ': Lead, CAPI e sucesso devem ficar no .then, antes do .catch');
  assert.ok(finallyAt > errorShow, dir + ': .finally deve vir por ultimo');
  assert.strictEqual(
    block.indexOf('modalSuccess', finallyAt),
    -1,
    dir + ': tela de sucesso nao pode ficar no .finally (apareceria mesmo com falha)'
  );
  assert.ok(block.includes('errorBox.hide()'), dir + ': reenvio deve limpar o erro anterior');
});

console.log('consultoria-submit tests passed');
