const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Pedido do marketing (PDF tela 8): cada LP deixa o visitante com so duas
// opcoes, preencher o formulario ou sair. O rodape mantem razao social com
// CNPJ e a politica de privacidade, e perde contatos, links e redes sociais.
const PAGES = ['consultoria', 'consultoria/clinicas', 'consultoria/zfm', 'curso/reforma-tributaria'];
const PRIVACY = 'https://opentreinamentos.com.br/politica-de-privacidade/';

PAGES.forEach(function (dir) {
  const html = fs.readFileSync(path.join(ROOT, dir, 'index.html'), 'utf8');
  const start = html.indexOf('<footer class="site-footer">');
  const end = html.indexOf('</footer>', start);
  assert.ok(start > -1 && end > start, dir + ': rodape nao encontrado');
  const footer = html.slice(start, end);

  // Tirar
  ['tel:', 'wa.me', 'mailto:', 'Nossas 4 frentes', 'Conheça também', 'footer-social', 'tributarista7d',
    'gtap.com.br', 'focotributario.com.br', 'gestaotributaria.com.br', 'linkedin.com', 'instagram.com',
    'youtube.com', 'facebook.com', 'Termos de uso'].forEach(function (text) {
    assert.ok(!footer.includes(text), dir + ': rodape nao deve ter "' + text + '"');
  });
  assert.ok(!/<a [^>]*class="footer-logo"/.test(footer), dir + ': logo do rodape nao deve ser link');

  // Manter
  assert.ok(footer.includes('Open Soluções Tributárias LTDA: 09.094.300/0001-51'), dir + ': razao social com CNPJ');
  assert.ok(/class="footer-logo"/.test(footer), dir + ': logo continua no rodape (sem link)');

  // O unico link do rodape e a politica de privacidade.
  const links = footer.match(/<a [^>]*>/g) || [];
  assert.strictEqual(links.length, 1, dir + ': o rodape deve ter so o link da politica de privacidade (achou ' + links.length + ')');
  assert.ok(links[0].includes('href="' + PRIVACY + '"'), dir + ': link da politica de privacidade');
  assert.ok(links[0].includes('target="_blank"') && links[0].includes('rel="noopener"'), dir + ': politica abre em nova aba com rel="noopener"');

  // O aceite da LGPD do formulario aponta para a mesma politica (antes: 404).
  assert.ok(!html.includes('href="/politica-de-privacidade"'), dir + ': link antigo da politica (404) deve sair');
});

['consultoria', 'consultoria/clinicas', 'consultoria/zfm'].forEach(function (dir) {
  const html = fs.readFileSync(path.join(ROOT, dir, 'index.html'), 'utf8');
  const lgpd = html.match(/<span class="lgpd-text">[\s\S]*?<\/span>/);
  assert.ok(lgpd, dir + ': texto do aceite LGPD');
  assert.ok(lgpd[0].includes('href="' + PRIVACY + '" target="_blank" rel="noopener"'), dir + ': aceite LGPD aponta para a politica de privacidade');
});

console.log('footer-clean tests passed');
