const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// O servidor manda o lead-form.js com cache de 7 dias. Sem ?v= no src, quem
// tem a versao antiga em cache continua com ela, e paginas que dependem de
// funcoes novas quebram. Toda pagina deve usar a mesma versao.
const PAGES = [
  'congresso',
  'curso/reforma-tributaria',
  'curso/retencoes-na-fonte',
  'consultoria',
  'consultoria/clinicas',
  'consultoria/zfm',
  'diagnostico-tributario-reforma-tributaria-assespro',
];

// O formulario em 2 etapas das consultorias tem o mesmo cache.
const CONSULTORIA_PAGES = ['consultoria', 'consultoria/clinicas', 'consultoria/zfm'];

function checkScript(file, pages) {
  const versions = new Set();
  const pattern = new RegExp('src="/assets/js/' + file.replace('.', '\\.') + '[^"]*"', 'g');

  pages.forEach(function (dir) {
    const html = fs.readFileSync(path.join(ROOT, dir, 'index.html'), 'utf8');
    const refs = html.match(pattern) || [];
    assert.strictEqual(refs.length, 1, dir + ': deve carregar ' + file + ' exatamente uma vez');
    const match = refs[0].match(/\?v=([^"&]+)/);
    assert.ok(match, dir + ': ' + file + ' deve ter ?v= no src para furar o cache de 7 dias');
    versions.add(match[1]);
  });

  assert.strictEqual(versions.size, 1, 'todas as paginas devem usar a mesma versao do ' + file + ': ' + [...versions].join(', '));
}

checkScript('lead-form.js', PAGES);
checkScript('consultoria-form.js', CONSULTORIA_PAGES);

// O CSS das consultorias muda junto com o formulario (tela de sucesso, celular).
CONSULTORIA_PAGES.forEach(function (dir) {
  const html = fs.readFileSync(path.join(ROOT, dir, 'index.html'), 'utf8');
  assert.ok(/<link rel="stylesheet" href="assets\/style\.css\?v=[^"]+">/.test(html), dir + ': style.css deve ter ?v= para furar o cache');
});

console.log('asset-versioning tests passed');
