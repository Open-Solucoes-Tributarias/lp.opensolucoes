const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

// Carrega lead-form.js e consultoria-form.js num contexto isolado, como o
// navegador faz (lead-form.js primeiro). Nao chama init: testa so as funcoes
// puras expostas em _test.
function loadScripts(search) {
  const session = {};
  const window = {
    location: { href: 'https://example.test/consultoria/clinicas' + search, search },
    setTimeout(fn) { fn(); return 0; },
    sessionStorage: {
      setItem(key, value) { session[key] = String(value); },
      removeItem(key) { delete session[key]; },
      getItem(key) { return Object.prototype.hasOwnProperty.call(session, key) ? session[key] : null; },
    },
  };
  const document = { cookie: '', getElementById() { return null; } };
  const context = { window, document, URLSearchParams, console: { error() {}, log: console.log } };
  vm.createContext(context);
  ['assets/js/lead-form.js', 'assets/js/consultoria-form.js'].forEach(function (file) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context);
  });
  return { window, session };
}

const VALUES = {
  name: 'Maria Silva',
  email: 'maria@clinica.com',
  phone: '(71) 99999-9999',
  cnpj: '12.345.678/0001-90',
  regime: 'Lucro Presumido',
  faturamento: 'Até R$ 360 mil/ano',
};

// Nomes de campo que o RD Station ja recebe destas paginas. Automacoes e
// segmentacoes do RD dependem deles: nao renomear sem migrar o RD junto.
(function testRdFieldNames() {
  const { window } = loadScripts('');
  const api = window.OpenConsultoriaForm;
  assert.ok(api, 'consultoria-form.js deve expor window.OpenConsultoriaForm');
  assert.strictEqual(typeof api.init, 'function', 'OpenConsultoriaForm.init deve existir');

  const tracking = {
    utm_source: 'google',
    utm_medium: 'cpc',
    utm_campaign: 'clinicas',
    utm_term: 'credito',
    utm_content: 'anuncio_1',
    utm_placement: '',
    placement: 'feed',
    gclid: 'Cj0KCQ-teste',
    fbclid: 'IwAR-teste',
  };
  const body = api._test.buildRdBody('consultoria-clinicas-landing-page', VALUES, tracking);

  // traffic_*: campos padrao do RD que estas paginas ja enviavam.
  // cf_utm_*, cf_placement, cf_gclid, cf_fbclid: campos personalizados que
  // existem no RD (os mesmos das paginas de curso). Pedido do PDF: salvar
  // utm_*, gclid e fbclid junto com cada lead.
  assert.deepStrictEqual(JSON.parse(JSON.stringify(body)), {
    token_rdstation: 'fde56b5029b7f481d3f10fecb3f1de85',
    identificador: 'consultoria-clinicas-landing-page',
    name: 'Maria Silva',
    email: 'maria@clinica.com',
    mobile_phone: '71999999999',
    cf_cnpj: '12.345.678/0001-90',
    cf_regime_tributario: 'Lucro Presumido',
    cf_faturamento_medio: 'Até R$ 360 mil/ano',
    traffic_source: 'google',
    traffic_medium: 'cpc',
    traffic_campaign: 'clinicas',
    traffic_value: 'credito',
    traffic_content: 'anuncio_1',
    cf_utm_source: 'google',
    cf_utm_medium: 'cpc',
    cf_utm_campaign: 'clinicas',
    cf_utm_term: 'credito',
    cf_utm_content: 'anuncio_1',
    cf_placement: 'feed',
    cf_gclid: 'Cj0KCQ-teste',
    cf_fbclid: 'IwAR-teste',
  });
})();

(function testEmptyTrackingIsDropped() {
  const { window } = loadScripts('');
  const body = window.OpenConsultoriaForm._test.buildRdBody('consultoria-zfm-landing-page', VALUES, {});
  ['traffic_source', 'traffic_medium', 'traffic_campaign', 'traffic_value', 'traffic_content',
    'cf_utm_source', 'cf_utm_medium', 'cf_utm_campaign', 'cf_utm_term', 'cf_utm_content',
    'cf_placement', 'cf_gclid', 'cf_fbclid'].forEach(function (key) {
    assert.ok(!(key in body), key + ' vazio nao deve ser enviado ao RD');
  });
})();

(function testUtmPlacementWinsOverPlacement() {
  const { window } = loadScripts('');
  const body = window.OpenConsultoriaForm._test.buildRdBody('x', VALUES, { utm_placement: 'stories', placement: 'feed' });
  assert.strictEqual(body.cf_placement, 'stories');
})();

(function testTrackingPersistsInSession() {
  const { window, session } = loadScripts('?utm_source=meta&utm_term=ir&placement=reels&gclid=G1&fbclid=F1');
  const api = window.OpenConsultoriaForm._test;
  api.captureTracking();
  assert.strictEqual(session.gtap_utm_source, 'meta', 'UTM da URL deve ir para o sessionStorage com prefixo gtap_');
  assert.strictEqual(session.gtap_placement, 'reels');
  assert.strictEqual(session.gtap_gclid, 'G1', 'gclid deve ser guardado');
  assert.strictEqual(session.gtap_fbclid, 'F1', 'fbclid deve ser guardado');

  // Navegacao sem UTM nao apaga o que ja foi capturado.
  window.location.search = '';
  api.captureTracking();
  const tracking = api.readTracking();
  assert.strictEqual(tracking.utm_source, 'meta');
  assert.strictEqual(tracking.utm_term, 'ir');
  assert.strictEqual(tracking.utm_medium, '');

  // Novo clique em anuncio substitui todo o rastreamento anterior.
  window.location.search = '?gclid=G2';
  api.captureTracking();
  const fresh = api.readTracking();
  assert.strictEqual(fresh.gclid, 'G2');
  assert.strictEqual(fresh.utm_source, '', 'UTM da campanha anterior nao pode ir junto com o gclid novo');
  assert.strictEqual(fresh.fbclid, '');
})();

// E-mail para o comercial (enviar-lead.php): mesmos dados do lead, com as
// chaves que o PHP le.
(function testEmailBody() {
  const { window } = loadScripts('');
  const body = window.OpenConsultoriaForm._test.buildEmailBody(
    'consultoria-clinicas-landing-page',
    VALUES,
    { utm_source: 'google', utm_term: 'credito', placement: 'feed', gclid: 'G1', fbclid: '' },
    'https://pagina.opensolucoestributarias.com.br/consultoria/clinicas'
  );
  assert.deepStrictEqual(JSON.parse(JSON.stringify(body)), {
    form: 'consultoria-clinicas-landing-page',
    name: 'Maria Silva',
    email: 'maria@clinica.com',
    phone: '(71) 99999-9999',
    cnpj: '12.345.678/0001-90',
    regime: 'Lucro Presumido',
    faturamento: 'Até R$ 360 mil/ano',
    page: 'https://pagina.opensolucoestributarias.com.br/consultoria/clinicas',
    utm_source: 'google',
    utm_term: 'credito',
    placement: 'feed',
    gclid: 'G1',
  });
})();

// O PHP tem um destino para cada pagina de consultoria.
(function testPhpDestinations() {
  const php = fs.readFileSync(path.join(ROOT, 'enviar-lead.php'), 'utf8');
  ['consultoria-clinicas-landing-page', 'consultoria-gratuita-landing-page', 'consultoria-zfm-landing-page'].forEach(function (id) {
    const start = php.indexOf("'" + id + "' => [");
    assert.ok(start > -1, 'enviar-lead.php deve ter destino para ' + id);
    const entry = php.slice(start, php.indexOf('],', php.indexOf("'campos'", start)));
    assert.ok(entry.includes("'to'           => $CONSULTORIA_TO"), id + ': destino deve ser $CONSULTORIA_TO');
  });
  // Comercial e Soraya recebem os leads das consultorias.
  assert.ok(
    php.includes("$CONSULTORIA_TO = 'vendas@opentreinamentos.com.br, soraya.sa@opensolucoestributarias.com.br';"),
    'leads das consultorias devem ir para vendas@opentreinamentos.com.br e soraya.sa@opensolucoestributarias.com.br'
  );
  ['cnpj', 'faturamento', 'gclid', 'fbclid', 'placement'].forEach(function (key) {
    assert.ok(php.includes("'" + key + "'"), 'enviar-lead.php deve ler ' + key);
  });
})();

(function testCnpjMask() {
  const { window } = loadScripts('');
  const format = window.OpenConsultoriaForm._test.formatCnpj;
  assert.strictEqual(format('12'), '12');
  assert.strictEqual(format('123'), '12.3');
  assert.strictEqual(format('1234567'), '12.345.67');
  assert.strictEqual(format('123456789'), '12.345.678/9');
  assert.strictEqual(format('1234567800019'), '12.345.678/0001-9');
  assert.strictEqual(format('12345678000190'), '12.345.678/0001-90');
  assert.strictEqual(format('12.345.678/0001-9099'), '12.345.678/0001-90', 'corta em 14 digitos');
})();

// Evento para o GTM quando o visitante abre o formulario por um botao.
(function testFormOpenEvent() {
  const { window } = loadScripts('');
  const track = window.OpenConsultoriaForm._test.trackFormOpen;

  function fakeTrigger(matches, section) {
    return {
      closest(selector) {
        if (selector === 'section') return section || null;
        return matches.includes(selector) ? {} : null;
      },
    };
  }

  track('clinicas', fakeTrigger(['.mobile-nav-drawer', 'header']));
  track('clinicas', fakeTrigger(['header']));
  track('zfm', fakeTrigger([], { id: 'como-funciona', className: 'section section-como-funciona' }));
  track('zfm', fakeTrigger([], { id: '', className: 'section section-temas' }));
  track('consultoria', fakeTrigger([], { id: '', className: 'section hero-section theme-dark' }));
  track('consultoria', fakeTrigger([]));

  assert.deepStrictEqual(JSON.parse(JSON.stringify(window.dataLayer)), [
    { event: 'formulario_aberto', formulario: 'clinicas', cta_local: 'menu-mobile' },
    { event: 'formulario_aberto', formulario: 'clinicas', cta_local: 'header' },
    { event: 'formulario_aberto', formulario: 'zfm', cta_local: 'como-funciona' },
    { event: 'formulario_aberto', formulario: 'zfm', cta_local: 'temas' },
    { event: 'formulario_aberto', formulario: 'consultoria', cta_local: 'hero' },
    { event: 'formulario_aberto', formulario: 'consultoria', cta_local: 'hero' },
  ]);
})();

(function testFormOpenKeepsExistingDataLayer() {
  const { window } = loadScripts('');
  const existing = [{ 'gtm.start': 1 }];
  window.dataLayer = existing;
  window.OpenConsultoriaForm._test.trackFormOpen('zfm', { closest() { return null; } });
  assert.strictEqual(window.dataLayer, existing, 'deve usar o dataLayer do GTM, nao criar outro');
  assert.strictEqual(existing.length, 2);
})();

(function testValidationHelpersAreShared() {
  const { window } = loadScripts('');
  // O formulario das consultorias usa a mesma validacao do lead-form.js,
  // para que a correcao do telefone (Fase 3) valha para todas as paginas.
  ['isValidEmail', 'isValidPhone', 'bindPhoneMask', 'trackMetaLead'].forEach(function (name) {
    assert.strictEqual(typeof window.OpenLeadForms[name], 'function', 'OpenLeadForms.' + name + ' deve ser publico');
  });
})();

console.log('consultoria-form tests passed');
