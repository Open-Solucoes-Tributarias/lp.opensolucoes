const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Telefone / WhatsApp com DDD (pedido do marketing, PDF tela 2): o numero
// precisa ter DDD valido antes de avancar. Regra unica para todas as paginas
// que usam o lead-form.js.
function loadHelper() {
  const listeners = {};
  const input = { value: '', addEventListener(type, fn) { listeners[type] = fn; } };
  const window = { location: { search: '', href: '' }, setTimeout(fn) { fn(); return 0; }, sessionStorage: { getItem() { return null; }, setItem() {} } };
  const document = { cookie: '', getElementById(id) { return id === 'tel' ? input : null; } };
  const context = { window, document, URLSearchParams, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets/js/lead-form.js'), 'utf8'), context);
  return { api: window.OpenLeadForms, input, listeners };
}

const { api, input, listeners } = loadHelper();

// --- normalizePhone: devolve so os digitos nacionais (DDD + numero) ou null.
const valid = {
  '(34) 99234-5623': '34992345623',
  '34992345623': '34992345623',
  '+55 34 99234-5623': '34992345623',
  '55 34 99234-5623': '34992345623',
  '+55 (34) 3234-5623': '3432345623',
  '(55) 99234-5623': '55992345623', // DDD 55 (RS) nao e confundido com o codigo do pais
  '(34) 3234-5623': '3432345623', // fixo
  '(11) 99999-9999': '11999999999',
  '(71) 99999-9999': '71999999999',
};
Object.keys(valid).forEach(function (raw) {
  assert.strictEqual(api.normalizePhone(raw), valid[raw], raw + ' deve virar ' + valid[raw]);
  assert.strictEqual(api.isValidPhone(raw), true, raw + ' deve ser valido');
});

const invalid = [
  '+55 55 34992345623', // exemplo do PDF: digitos a mais
  '349923456230', // 12 digitos sem 55 na frente
  '(34) 9923-456', // curto
  '',
  '(20) 99234-5623', // DDD inexistente
  '(10) 99234-5623',
  '(00) 99234-5623',
  '(34) 89234-5623', // celular sem o 9
  '(34) 1234-5623', // fixo nao comeca com 1
  '(34) 9234-5623', // 10 digitos comecando com 9: celular sem o 9 extra
];
invalid.forEach(function (raw) {
  assert.strictEqual(api.normalizePhone(raw), null, raw + ' deve ser invalido');
  assert.strictEqual(api.isValidPhone(raw), false, raw + ' deve ser invalido');
});

// --- Mascara: formata enquanto digita e NAO corta digitos a mais (o visitante
// precisa ver o erro, e nao um numero diferente do que digitou).
const fmt = api._test.formatPhone;
assert.strictEqual(fmt('34'), '34');
assert.strictEqual(fmt('349'), '(34) 9');
assert.strictEqual(fmt('3499234'), '(34) 9923-4');
assert.strictEqual(fmt('3432345623'), '(34) 3234-5623');
assert.strictEqual(fmt('34992345623'), '(34) 99234-5623');
assert.strictEqual(fmt('+55 34 99234-5623'), '+55 (34) 99234-5623');
assert.strictEqual(fmt('553432345623'), '+55 (34) 3234-5623');
assert.strictEqual(fmt('+55 55 34992345623'), '+555534992345623', 'digitos a mais ficam visiveis, sem formatar');
assert.strictEqual(fmt('5555349923456230000'), '555534992345623', 'limite de 15 digitos');
// Digitando com "+": o sinal fica e nao vira "(55) ..." no meio do caminho.
assert.strictEqual(fmt('+'), '+');
assert.strictEqual(fmt('+55'), '+55');
assert.strictEqual(fmt('+553499'), '+553499');
assert.strictEqual(fmt('+5534992345623'), '+55 (34) 99234-5623');

// A mascara ligada ao campo usa a mesma regra.
api.bindPhoneMask('tel');
input.value = '+55 55 34992345623';
listeners.input({ target: input });
assert.strictEqual(input.value, '+555534992345623');
assert.strictEqual(api.isValidPhone(input.value), false, 'o exemplo do PDF continua invalido depois da mascara');

// Apagar nao reformata: o "-" apagado nao volta.
input.value = '(34) 99234';
listeners.input({ target: input, inputType: 'deleteContentBackward' });
assert.strictEqual(input.value, '(34) 99234');

console.log('phone tests passed');
