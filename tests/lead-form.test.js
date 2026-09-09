const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createElement(tagName) {
  return {
    tagName: tagName.toUpperCase(),
    type: '',
    name: '',
    id: '',
    value: '',
    textContent: '',
    disabled: false,
    style: {},
    children: [],
    listeners: {},
    classList: {
      values: new Set(),
      add(name) { this.values.add(name); },
      remove(name) { this.values.delete(name); },
      toggle(name, force) {
        if (force) this.values.add(name);
        else this.values.delete(name);
      },
      contains(name) { return this.values.has(name); },
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    focus() {
      this.focused = true;
    },
    querySelector(selector) {
      if (selector === '[type="submit"]') return this.submitButton;
      const hidden = selector.match(/^input\[type="hidden"\]\[name="(.+)"\]$/);
      if (hidden) return this.children.find((child) => child.type === 'hidden' && child.name === hidden[1]) || null;
      return null;
    },
  };
}

function loadHelper() {
  const elements = {};
  const session = {};
  const document = {
    cookie: '',
    createElement,
    getElementById(id) {
      return elements[id] || null;
    },
  };
  const window = {
    location: { href: 'https://example.test/congresso?utm_source=facebook&utm_medium=paid&utm_campaign=congresso_2026&utm_term=tributacao&utm_content=video_01&placement=feed', search: '?utm_source=facebook&utm_medium=paid&utm_campaign=congresso_2026&utm_term=tributacao&utm_content=video_01&placement=feed' },
    sessionStorage: {
      setItem(key, value) { session[key] = String(value); },
      getItem(key) { return Object.prototype.hasOwnProperty.call(session, key) ? session[key] : null; },
    },
  };
  const context = { window, document, URLSearchParams, console: { error() {}, log: console.log } };
  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, '..', 'assets/js/lead-form.js'), 'utf8');
  vm.runInContext(source, context);
  return { window, document, elements };
}

function buildFixture(search) {
  const { window, elements } = loadHelper();
  if (search !== undefined) {
    window.location.search = search;
    window.location.href = 'https://example.test/congresso' + search;
  }
  const form = createElement('form');
  form.id = 'leadForm';
  form.submitButton = createElement('button');
  form.submitButton.type = 'submit';
  form.submitButton.textContent = 'Enviar';

  elements.leadForm = form;
  elements.formWrap = createElement('div');
  elements.success = createElement('div');
  elements.nome = Object.assign(createElement('input'), { id: 'nome', value: 'Maria Silva' });
  elements.phone = Object.assign(createElement('input'), { id: 'phone', value: '(71) 99999-9999' });
  elements.email = Object.assign(createElement('input'), { id: 'email', value: 'maria@example.com' });
  elements.setor = Object.assign(createElement('select'), { id: 'setor', value: 'Financeiro' });
  elements.instituicao = Object.assign(createElement('select'), { id: 'instituicao', value: 'Instituição/entidade pública' });
  ['nameField', 'phoneField', 'emailField', 'setorField', 'instituicaoField'].forEach((id) => {
    elements[id] = createElement('div');
    elements[id].querySelector = () => createElement('input');
  });

  const config = {
    formId: 'leadForm',
    formWrapId: 'formWrap',
    successId: 'success',
    submitText: 'Enviar',
    loadingText: 'Enviando...',
    rdToken: 'token',
    rdIdentifier: 'identifier',
    fields: { name: 'nome', phone: 'phone', email: 'email', setor: 'setor', instituicao: 'instituicao' },
    errorFields: { name: 'nameField', phone: 'phoneField', email: 'emailField', setor: 'setorField', instituicao: 'instituicaoField' },
  };

  return { window, form, config, elements };
}

async function submitFixture(instituicao, rdOk = true) {
  const { window, form, config, elements } = buildFixture();
  const fetchCalls = [];
  const fbqCalls = [];

  elements.instituicao.value = instituicao;
  window.fetch = (url, options) => {
    fetchCalls.push({ url, options });
    return Promise.resolve({ ok: rdOk, status: rdOk ? 200 : 500 });
  };
  window.fbq = (...args) => {
    fbqCalls.push(args);
  };

  window.OpenLeadForms.init(config);
  form.listeners.submit({ preventDefault() {} });
  await new Promise((resolve) => setImmediate(resolve));
  return { fetchCalls, fbqCalls, elements };
}

async function flushPromises() {
  await new Promise((resolve) => setImmediate(resolve));
}

{
  const { window, form, config } = buildFixture();
  window.OpenLeadForms.init(config);
  const rdBody = window.OpenLeadForms._test.buildRdBody(form, config);

  assert.strictEqual(rdBody.cf_instituicao, 'Instituição/entidade pública');
  assert.strictEqual(rdBody.cf_setor, 'Financeiro');
  assert.strictEqual(rdBody.cf_utm_source, 'facebook');
  assert.strictEqual(rdBody.cf_utm_medium, 'paid');
  assert.strictEqual(rdBody.cf_utm_campaign, 'congresso_2026');
  assert.strictEqual(rdBody.cf_utm_term, 'tributacao');
  assert.strictEqual(rdBody.cf_utm_content, 'video_01');
  assert.strictEqual(rdBody.cf_placement, 'feed');
}

{
  const { window } = buildFixture();

  assert.strictEqual(window.OpenLeadForms._test.shouldTrackLead('Instituição/entidade pública'), true);
  assert.strictEqual(window.OpenLeadForms._test.shouldTrackLead('Instituição do Sistema S'), true);
  assert.strictEqual(window.OpenLeadForms._test.shouldTrackLead('Instituição privada'), false);
}

(async () => {
  {
    const { fetchCalls, fbqCalls, elements } = await submitFixture('Instituição/entidade pública');
    assert.strictEqual(fetchCalls.length, 2);
    assert.strictEqual(fetchCalls[0].url, 'https://www.rdstation.com.br/api/1.3/conversions');
    assert.strictEqual(fetchCalls[1].url, '/capi.php');
    assert.strictEqual(fbqCalls.length, 1);
    assert.strictEqual(elements.success.classList.contains('show'), true);
  }

  {
    const { fetchCalls, fbqCalls, elements } = await submitFixture('Instituição privada');
    assert.strictEqual(fetchCalls.length, 1);
    assert.strictEqual(fetchCalls[0].url, 'https://www.rdstation.com.br/api/1.3/conversions');
    assert.strictEqual(fbqCalls.length, 0);
    assert.strictEqual(elements.success.classList.contains('show'), true);
  }

  {
    const first = buildFixture('?utm_source=google&utm_medium=cpc&utm_campaign=abril&utm_term=ibs&utm_content=banner&placement=stories');
    first.window.OpenLeadForms.init(first.config);

    first.window.location.search = '';
    first.form.children = [];
    first.window.OpenLeadForms._test.captureTrackingFields(first.form);
    const rdBody = first.window.OpenLeadForms._test.buildRdBody(first.form, first.config);

    assert.strictEqual(rdBody.cf_utm_source, 'google');
    assert.strictEqual(rdBody.cf_utm_medium, 'cpc');
    assert.strictEqual(rdBody.cf_utm_campaign, 'abril');
    assert.strictEqual(rdBody.cf_utm_term, 'ibs');
    assert.strictEqual(rdBody.cf_utm_content, 'banner');
    assert.strictEqual(rdBody.cf_placement, 'stories');
  }

  {
    const { fetchCalls, fbqCalls, elements } = await submitFixture('Instituição do Sistema S', false);
    assert.strictEqual(fetchCalls.length, 1);
    assert.strictEqual(fbqCalls.length, 0);
    assert.strictEqual(elements.success.classList.contains('show'), false);
  }

  {
    const { window, form, config, elements } = buildFixture();
    const fetchCalls = [];
    window.fetch = (url, options) => {
      fetchCalls.push({ url, options });
      return Promise.resolve({ ok: true, status: 200 });
    };
    window.fbq = () => {
      throw new Error('fbq must not run for invalid forms');
    };

    elements.email.value = 'email-invalido';
    window.OpenLeadForms.init(config);
    form.listeners.submit({ preventDefault() {} });
    await flushPromises();

    assert.strictEqual(fetchCalls.length, 0);
    assert.strictEqual(elements.emailField.classList.contains('has-error'), true);
  }

  console.log('lead-form tests passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
