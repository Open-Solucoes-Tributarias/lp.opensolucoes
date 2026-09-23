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
];

const versions = new Set();

PAGES.forEach(function (dir) {
  const html = fs.readFileSync(path.join(ROOT, dir, 'index.html'), 'utf8');
  const refs = html.match(/src="\/assets\/js\/lead-form\.js[^"]*"/g) || [];
  assert.strictEqual(refs.length, 1, dir + ': deve carregar lead-form.js exatamente uma vez');
  const match = refs[0].match(/\?v=([^"&]+)/);
  assert.ok(match, dir + ': lead-form.js deve ter ?v= no src para furar o cache de 7 dias');
  versions.add(match[1]);
});

assert.strictEqual(versions.size, 1, 'todas as paginas devem usar a mesma versao do lead-form.js: ' + [...versions].join(', '));

console.log('asset-versioning tests passed');
