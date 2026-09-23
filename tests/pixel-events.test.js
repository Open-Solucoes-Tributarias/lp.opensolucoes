const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PIXEL_ID = '549971842334998';

// Páginas que devem disparar PageView + ViewContent no carregamento.
const LANDING_PAGES = [
  'congresso',
  'livro',
  'consultoria',
  'consultoria/clinicas',
  'consultoria/zfm',
  'curso/reforma-tributaria',
  'curso/retencoes-na-fonte',
];

// Páginas que só precisam do pixel base + PageView (sem ViewContent).
const PLAIN_PAGES = ['consultoria/obrigado'];

function readPage(dir) {
  return fs.readFileSync(path.join(ROOT, dir, 'index.html'), 'utf8');
}

function assertBasePixel(dir, html) {
  assert.ok(
    html.includes('connect.facebook.net/en_US/fbevents.js'),
    dir + ': snippet base do Meta Pixel ausente'
  );
  assert.ok(
    new RegExp("fbq\\(\\s*'init'\\s*,\\s*'" + PIXEL_ID + "'").test(html),
    dir + ": fbq('init', '" + PIXEL_ID + "') ausente"
  );
  assert.ok(
    /fbq\(\s*'track'\s*,\s*'PageView'/.test(html),
    dir + ": fbq('track', 'PageView') ausente"
  );
}

function assertViewContent(dir, html) {
  const match = html.match(/fbq\(\s*'track'\s*,\s*'ViewContent'\s*,\s*\{([\s\S]*?)\}\s*\)/);
  assert.ok(match, dir + ": fbq('track', 'ViewContent', {...}) ausente");
  assert.ok(
    /content_name\s*:\s*'[^']+'/.test(match[1]),
    dir + ': ViewContent sem content_name preenchido'
  );
  assert.ok(
    /content_category\s*:\s*'[^']+'/.test(match[1]),
    dir + ': ViewContent sem content_category preenchido'
  );
}

LANDING_PAGES.forEach(function (dir) {
  const html = readPage(dir);
  assertBasePixel(dir, html);
  assertViewContent(dir, html);
});

PLAIN_PAGES.forEach(function (dir) {
  const html = readPage(dir);
  assertBasePixel(dir, html);
});

// O congresso vende inscrição via modal: abrir o modal é o início do checkout.
{
  const html = readPage('congresso');
  assert.ok(
    /fbq\(\s*'track'\s*,\s*'InitiateCheckout'/.test(html),
    "congresso: fbq('track', 'InitiateCheckout') ausente na abertura do modal"
  );
}

// Um ViewContent por página — dois disparos inflariam a métrica.
LANDING_PAGES.forEach(function (dir) {
  const html = readPage(dir);
  const hits = html.match(/fbq\(\s*'track'\s*,\s*'ViewContent'/g) || [];
  assert.strictEqual(hits.length, 1, dir + ': ViewContent deve ser disparado exatamente uma vez');
});

console.log('pixel-events tests passed');
