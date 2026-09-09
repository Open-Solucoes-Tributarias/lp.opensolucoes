# RD Station and Meta Pixel Forms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the three landing page forms so RD Station receives `Instituição`, `setor`, and hidden UTM fields correctly, and Meta Pixel `549971842334998` fires `PageView` on page load and `Lead` only after successful public/Sistema S submissions.

**Architecture:** Keep the static HTML deployment model, but replace duplicated inline form logic with one shared vanilla JavaScript helper used by all three pages. Each page keeps its own content and modal markup while using the same RD payload builder, hidden UTM capture, validation, and Meta Lead gating.

**Tech Stack:** Static HTML/CSS, vanilla JavaScript, RD Station conversion endpoint `https://www.rdstation.com.br/api/1.3/conversions`, Meta Pixel browser script, local `capi.php` relay for Meta Conversions API, Chrome with Meta Pixel Helper for manual validation.

**Spec:** User request in chat on 2026-09-09.

## Global Constraints

- Pages in scope: `curso/retencoes-na-fonte/index.html`, `curso/reforma-tributaria/index.html`, `congresso/index.html`.
- Pixel ID must be exactly `549971842334998` on all three pages.
- `PageView` must fire automatically when each page opens.
- `Lead` must fire only after successful RD form submission.
- `Lead` must fire for `Instituição/entidade pública` and `Instituição do Sistema S`.
- `Lead` must not fire for `Instituição privada`.
- Institution field label/name must be exactly `Instituição`.
- Do not create another RD field for institution; use the RD-generated technical identifier for the existing custom field if RD requires one.
- Institution options must be exactly `Instituição/entidade pública`, `Instituição do Sistema S`, and `Instituição privada`.
- Institution field must be required.
- Hidden form fields must be present in the forms and filled from URL parameters: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `placement`.
- RD custom-field mapping must be exactly: `utm_source -> cf_utm_source`, `utm_medium -> cf_utm_medium`, `utm_campaign -> cf_utm_campaign`, `utm_term -> cf_utm_term`, `utm_content -> cf_utm_content`, `placement -> cf_placement`.
- Hidden fields must not be visible or manually filled by the user.
- Do not consider implementation complete without testing PageView, Lead, the three Institution options, and UTM receipt across the pages.

---

### Task 1: Confirm RD Technical Field Keys

**Files:**
- Modify: none
- Reference later: `assets/js/lead-form.js`

**Interfaces:**
- Consumes: RD Station account configuration.
- Produces: exact JavaScript constants `RD_FIELD_INSTITUICAO`, `RD_FIELD_UTM_SOURCE`, `RD_FIELD_UTM_MEDIUM`, `RD_FIELD_UTM_CAMPAIGN`, `RD_FIELD_UTM_TERM`, `RD_FIELD_UTM_CONTENT`, `RD_FIELD_PLACEMENT`.

- [ ] **Step 1: Verify the existing RD custom field for institution**

Open RD Station custom fields and find the existing field with display name exactly `Instituição`.

Record the generated API key. Expected if RD follows the current project convention: `cf_instituicao`. If the account shows a different generated key, use the RD-generated key, not a guessed key.

- [ ] **Step 2: Verify the existing RD custom UTM fields**

Confirm these exact API keys already exist:

```text
cf_utm_source
cf_utm_medium
cf_utm_campaign
cf_utm_term
cf_utm_content
cf_placement
```

- [ ] **Step 3: Block execution if any key is missing or different**

If `Instituição` is not present or its API key cannot be verified, stop and ask for the exact RD field identifier before editing the integration. Do not create fields in RD from code.

### Task 2: Add Shared Lead Form Helper

**Files:**
- Create: `assets/js/lead-form.js`
- Modify: none
- Test: manual browser smoke test plus request inspection

**Interfaces:**
- Consumes: global `window.OpenLeadForms.init(config)`.
- Produces:

```javascript
window.OpenLeadForms.init({
  formId: 'leadForm',
  formWrapId: 'modalForm',
  successId: 'formSuccess',
  submitText: 'Enviar',
  loadingText: 'Enviando...',
  rdToken: 'fde56b5029b7f481d3f10fecb3f1de85',
  rdIdentifier: 'lp-reforma-tributaria',
  fields: {
    name: 'f-nome',
    phone: 'f-whats',
    email: 'f-email',
    setor: 'f-setor',
    instituicao: 'f-instituicao'
  },
  errorFields: {
    name: 'field-nome',
    phone: 'field-whats',
    email: 'field-email',
    setor: 'field-setor',
    instituicao: 'field-instituicao'
  }
});
```

- [ ] **Step 1: Create the helper skeleton**

Create `assets/js/lead-form.js` with an IIFE exposing `window.OpenLeadForms.init`.

```javascript
(function(window, document) {
  'use strict';

  var PIXEL_ID = '549971842334998';
  var RD_ENDPOINT = 'https://www.rdstation.com.br/api/1.3/conversions';
  var RD_FIELD_INSTITUICAO = 'cf_instituicao';
  var TRACKING_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'placement'];

  function init(config) {
    var form = document.getElementById(config.formId);
    if (!form) return;
    captureTrackingFields(form);
    bindPhoneMask(config.fields.phone);
    bindValidation(config);
    bindSubmit(config);
  }

  window.OpenLeadForms = { init: init };
})(window, document);
```

Replace `cf_instituicao` with the verified RD key from Task 1 if RD uses a different generated identifier.

- [ ] **Step 2: Implement hidden UTM capture**

Inside the helper, implement `captureTrackingFields(form)` so it:

```javascript
function captureTrackingFields(form) {
  var params = new URLSearchParams(window.location.search);
  TRACKING_KEYS.forEach(function(key) {
    var input = form.querySelector('input[type="hidden"][name="' + key + '"]');
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.id = 'hidden-' + key;
      form.appendChild(input);
    }
    var storedKey = 'open_' + key;
    var value = params.get(key);
    if (value) sessionStorage.setItem(storedKey, value);
    input.value = sessionStorage.getItem(storedKey) || '';
  });
}
```

- [ ] **Step 3: Implement validation**

Validate name length >= 3, phone with 10-11 digits, valid email, non-empty setor, and non-empty institution. Validation must set `.has-error` on the configured field wrappers and focus the first invalid field.

- [ ] **Step 4: Implement RD payload builder**

Build the RD payload with the exact keys:

```javascript
{
  token_rdstation: config.rdToken,
  identificador: config.rdIdentifier,
  name: getValue(config.fields.name),
  email: getValue(config.fields.email),
  mobile_phone: getValue(config.fields.phone),
  cf_setor: getValue(config.fields.setor),
  [RD_FIELD_INSTITUICAO]: getValue(config.fields.instituicao),
  cf_utm_source: getHiddenValue(form, 'utm_source'),
  cf_utm_medium: getHiddenValue(form, 'utm_medium'),
  cf_utm_campaign: getHiddenValue(form, 'utm_campaign'),
  cf_utm_term: getHiddenValue(form, 'utm_term'),
  cf_utm_content: getHiddenValue(form, 'utm_content'),
  cf_placement: getHiddenValue(form, 'placement')
}
```

Remove only empty optional tracking values before sending. Do not remove required user fields after validation passes.

- [ ] **Step 5: Implement successful-submit-only Meta Lead**

Submit to RD first. Only after `res.ok` is true:

```javascript
if (shouldTrackLead(instituicao)) {
  trackMetaLead(rdBody);
}
showSuccess(config);
```

`shouldTrackLead` must return true only for:

```javascript
return value === 'Instituição/entidade pública' || value === 'Instituição do Sistema S';
```

Do not fire browser Pixel or CAPI before RD success. Do not show success in the RD error branch.

- [ ] **Step 6: Keep Meta CAPI deduplication**

`trackMetaLead` must create one event ID, send `fbq('track', 'Lead', {}, { eventID: eventId })`, and POST the same `event_id` to `/capi.php` with `event_name`, `event_source_url`, name, email, phone, `_fbp`, and `_fbc`.

### Task 3: Update Course Forms

**Files:**
- Modify: `curso/reforma-tributaria/index.html`
- Modify: `curso/retencoes-na-fonte/index.html`
- Test: manual validation and request inspection in Chrome DevTools

**Interfaces:**
- Consumes: `window.OpenLeadForms.init` from Task 2.
- Produces: both course forms include `Instituição`, hidden tracking fields, and page-specific RD identifiers.

- [ ] **Step 1: Add Institution field to both course modals**

Insert after `Setor de Trabalho`:

```html
<div class="field" id="field-instituicao">
  <label for="f-instituicao">Instituição</label>
  <select id="f-instituicao" name="instituicao" required>
    <option value="" disabled selected>Selecione</option>
    <option value="Instituição/entidade pública">Instituição/entidade pública</option>
    <option value="Instituição do Sistema S">Instituição do Sistema S</option>
    <option value="Instituição privada">Instituição privada</option>
  </select>
  <div class="err-msg">Selecione sua instituição.</div>
</div>
```

- [ ] **Step 2: Add explicit hidden tracking fields to both forms**

Add inside each `<form id="leadForm">` before the submit button:

```html
<input type="hidden" name="utm_source" id="hidden-utm_source">
<input type="hidden" name="utm_medium" id="hidden-utm_medium">
<input type="hidden" name="utm_campaign" id="hidden-utm_campaign">
<input type="hidden" name="utm_term" id="hidden-utm_term">
<input type="hidden" name="utm_content" id="hidden-utm_content">
<input type="hidden" name="placement" id="hidden-placement">
```

- [ ] **Step 3: Replace duplicated submit scripts**

Remove duplicated inline UTM/RD/CAPI submit code from both course pages and load:

```html
<script src="/assets/js/lead-form.js" defer></script>
```

Initialize Reforma Tributária:

```html
<script>
window.addEventListener('DOMContentLoaded', function() {
  window.OpenLeadForms.init({
    formId: 'leadForm',
    formWrapId: 'modalForm',
    successId: 'formSuccess',
    submitText: 'Enviar',
    loadingText: 'Enviando...',
    rdToken: 'fde56b5029b7f481d3f10fecb3f1de85',
    rdIdentifier: 'lp-reforma-tributaria',
    fields: { name: 'f-nome', phone: 'f-whats', email: 'f-email', setor: 'f-setor', instituicao: 'f-instituicao' },
    errorFields: { name: 'field-nome', phone: 'field-whats', email: 'field-email', setor: 'field-setor', instituicao: 'field-instituicao' }
  });
});
</script>
```

Initialize Retenções na Fonte with the same config except:

```javascript
rdIdentifier: 'lp-retencoes-na-fonte'
```

### Task 4: Update Congresso Form

**Files:**
- Modify: `congresso/index.html`
- Test: manual validation and request inspection in Chrome DevTools

**Interfaces:**
- Consumes: `window.OpenLeadForms.init` from Task 2.
- Produces: Congresso uses the same three Institution values and only tracks qualified leads after RD success.

- [ ] **Step 1: Replace old vínculo field**

Replace `rd-vinculo` with:

```html
<div class="field" id="field-instituicao">
  <label for="rd-instituicao">Instituição</label>
  <select id="rd-instituicao" name="instituicao" required>
    <option value="">Selecione uma opção</option>
    <option value="Instituição/entidade pública">Instituição/entidade pública</option>
    <option value="Instituição do Sistema S">Instituição do Sistema S</option>
    <option value="Instituição privada">Instituição privada</option>
  </select>
  <span class="err-msg">Selecione uma opção</span>
</div>
```

- [ ] **Step 2: Add Setor de Trabalho if absent**

Add a required setor field before Institution:

```html
<div class="field" id="field-setor">
  <label for="rd-setor">Setor de Trabalho *</label>
  <select id="rd-setor" name="setor" required>
    <option value="">Selecione</option>
    <option>Contabilidade</option>
    <option>RH</option>
    <option>Financeiro</option>
    <option>Contratos e Licitações</option>
    <option>Outros</option>
  </select>
  <span class="err-msg">Selecione seu setor de trabalho</span>
</div>
```

- [ ] **Step 3: Add hidden tracking fields**

Add the same six hidden inputs from Task 3 inside `<form id="rdForm">`.

- [ ] **Step 4: Replace Congresso submit logic**

Keep non-form UI code. Remove only the old UTM/RD/CAPI submit block and initialize the helper:

```html
<script src="/assets/js/lead-form.js" defer></script>
<script>
window.addEventListener('DOMContentLoaded', function() {
  window.OpenLeadForms.init({
    formId: 'rdForm',
    formWrapId: 'modalFormWrapper',
    successId: 'modalSuccess',
    submitText: 'Prosseguir com a Inscrição',
    loadingText: 'Processando...',
    rdToken: 'fde56b5029b7f481d3f10fecb3f1de85',
    rdIdentifier: 'x-gtap-2026-landing-page',
    fields: { name: 'rd-name', phone: 'rd-phone', email: 'rd-email', setor: 'rd-setor', instituicao: 'rd-instituicao' },
    errorFields: { name: 'field-name', phone: 'field-phone', email: 'field-email', setor: 'field-setor', instituicao: 'field-instituicao' }
  });
});
</script>
```

### Task 5: Verify Pixel Installation and JavaScript Health

**Files:**
- Modify if needed: the three page `<head>` Meta Pixel blocks
- Test: Chrome with Meta Pixel Helper and DevTools Console

**Interfaces:**
- Consumes: deployed or local pages.
- Produces: evidence that `PageView` appears for Pixel `549971842334998` on all three pages.

- [ ] **Step 1: Static check**

Run:

```bash
rg -n "fbq\\('init', '549971842334998'\\)|fbq\\('track', 'PageView'\\)|tr\\?id=549971842334998" congresso/index.html curso/reforma-tributaria/index.html curso/retencoes-na-fonte/index.html
```

Expected: each file has exactly one init, one PageView, and one noscript image for the same ID.

- [ ] **Step 2: Browser check**

Open each page in Chrome with Meta Pixel Helper active:

```text
https://pagina.opensolucoestributarias.com.br/curso/retencoes-na-fonte
https://pagina.opensolucoestributarias.com.br/curso/reforma-tributaria
https://pagina.opensolucoestributarias.com.br/congresso
```

Expected: Pixel Helper shows Pixel `549971842334998`, event `PageView`, and no wrong pixel ID.

- [ ] **Step 3: Console check**

In DevTools Console for each page, confirm there are no JavaScript errors before opening or submitting the form.

### Task 6: Verify RD, Lead Rules, and UTMs

**Files:**
- Modify if failures appear: `assets/js/lead-form.js` and affected page
- Test: Chrome DevTools Network, Meta Pixel Helper, RD Station contact record

**Interfaces:**
- Consumes: completed Tasks 2-5.
- Produces: per-page validation evidence.

- [ ] **Step 1: Test public institution on each page**

Submit a unique test email on each page with `Instituição/entidade pública`.

Expected:

```text
RD conversion request returns HTTP 200/2xx.
Success message appears only after RD response succeeds.
Meta Pixel Helper shows Lead.
RD contact has Instituição = Instituição/entidade pública.
```

- [ ] **Step 2: Test Sistema S on each page**

Submit a unique test email on each page with `Instituição do Sistema S`.

Expected:

```text
RD conversion request returns HTTP 200/2xx.
Success message appears only after RD response succeeds.
Meta Pixel Helper shows Lead.
RD contact has Instituição = Instituição do Sistema S.
```

- [ ] **Step 3: Test private institution on each page**

Submit a unique test email on each page with `Instituição privada`.

Expected:

```text
RD conversion request returns HTTP 200/2xx.
Success message appears only after RD response succeeds.
Meta Pixel Helper does not show Lead for this submit.
No /capi.php request is sent for this submit.
RD contact has Instituição = Instituição privada.
```

- [ ] **Step 4: Test UTM mapping**

Open:

```text
https://pagina.opensolucoestributarias.com.br/congresso?utm_source=facebook&utm_medium=paid&utm_campaign=congresso_2026&utm_term=tributacao&utm_content=video_01&placement=feed
```

Submit a qualified institution value.

Expected RD contact fields:

```text
cf_utm_source = facebook
cf_utm_medium = paid
cf_utm_campaign = congresso_2026
cf_utm_term = tributacao
cf_utm_content = video_01
cf_placement = feed
```

- [ ] **Step 5: Regression check invalid form behavior**

Try submitting each form with missing Institution and with invalid email.

Expected:

```text
No RD request is sent.
No Lead event is fired.
Validation message appears.
```

### Task 7: Final Review and Delivery Notes

**Files:**
- Modify: none unless Task 6 reveals failures

**Interfaces:**
- Consumes: all previous task evidence.
- Produces: final implementation summary and test matrix.

- [ ] **Step 1: Run local static checks**

Run:

```bash
rg -n "cf_vinculo_institucional|cf_utm_placement|traffic_source|traffic_medium|traffic_campaign|traffic_value|traffic_content|Não faço parte" congresso/index.html curso/reforma-tributaria/index.html curso/retencoes-na-fonte/index.html assets/js/lead-form.js
```

Expected: no matches in the final form integration.

- [ ] **Step 2: Prepare final test matrix**

Document results by page:

```text
Page | PageView | Public Lead | Sistema S Lead | Private no Lead | RD Instituição | RD UTMs | JS errors
```

- [ ] **Step 3: Commit**

```bash
git add assets/js/lead-form.js congresso/index.html curso/reforma-tributaria/index.html curso/retencoes-na-fonte/index.html
git commit -m "fix: align RD fields and Meta lead tracking"
```

