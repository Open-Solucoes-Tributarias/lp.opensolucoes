// O servidor serve este arquivo com cache de 7 dias. Ao altera-lo, atualize
// o ?v= em todas as paginas que o carregam (tests/asset-versioning.test.js).
(function(window, document) {
  'use strict';

  var RD_ENDPOINT = 'https://www.rdstation.com.br/api/1.3/conversions';
  var RD_FIELD_INSTITUICAO = 'cf_instituicao';
  var TRACKING_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'placement'];
  var RD_MAX_ATTEMPTS = 3;
  var RD_RETRY_BASE_MS = 600;
  var RD_ERROR_TEXT = 'Não foi possível enviar seus dados agora. Verifique sua conexão e tente novamente.';

  function getElement(id) {
    return document.getElementById(id);
  }

  function getValue(id) {
    var element = getElement(id);
    return element ? element.value.trim() : '';
  }

  function getCookie(name) {
    var match = document.cookie && document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function ensureFbc() {
    var existing = getCookie('_fbc');
    if (existing) return existing;
    var params = new URLSearchParams(window.location.search);
    var fbclid = params.get('fbclid');
    if (!fbclid) return null;
    var fbc = 'fb.1.' + Date.now() + '.' + fbclid;
    document.cookie = '_fbc=' + fbc + '; path=/; max-age=7776000';
    return fbc;
  }

  function genUuid() {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function setFieldError(fieldId, hasError) {
    var field = getElement(fieldId);
    if (!field) return;
    var input = field.querySelector('input,select');
    field.classList.toggle('has-error', hasError);
    if (input && input.classList) input.classList.toggle('is-invalid', hasError);
  }

  function isValidEmail(value) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
  }

  // DDDs em uso no Brasil (Anatel).
  var VALID_DDDS = (
    '11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 ' +
    '41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 ' +
    '71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'
  ).split(' ');
  var PHONE_MAX_DIGITS = 15;

  // Telefone / WhatsApp com DDD. Devolve DDD + numero so com digitos
  // ("34992345623") ou null se for invalido. Aceita o codigo do pais (+55)
  // na frente, sem confundir com o DDD 55 (RS).
  function normalizePhone(value) {
    var digits = String(value || '').replace(/\D/g, '');
    if ((digits.length === 12 || digits.length === 13) && digits.indexOf('55') === 0) {
      digits = digits.substring(2);
    }
    if (digits.length !== 10 && digits.length !== 11) return null;
    if (VALID_DDDS.indexOf(digits.substring(0, 2)) === -1) return null;
    var first = digits.charAt(2);
    if (digits.length === 11 && first !== '9') return null; // celular
    if (digits.length === 10 && '2345'.indexOf(first) === -1) return null; // fixo
    return digits;
  }

  function isValidPhone(value) {
    return normalizePhone(value) !== null;
  }

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
      if (value) window.sessionStorage.setItem(storedKey, value);
      input.value = window.sessionStorage.getItem(storedKey) || '';
    });
  }

  function getHiddenValue(form, name) {
    var input = form.querySelector('input[type="hidden"][name="' + name + '"]');
    return input ? input.value.trim() : '';
  }

  function buildRdBody(form, config) {
    var body = {
      token_rdstation: config.rdToken,
      identificador: config.rdIdentifier,
      name: getValue(config.fields.name),
      email: getValue(config.fields.email),
      mobile_phone: normalizePhone(getValue(config.fields.phone)) || getValue(config.fields.phone),
      cf_setor: getValue(config.fields.setor),
      cf_utm_source: getHiddenValue(form, 'utm_source'),
      cf_utm_medium: getHiddenValue(form, 'utm_medium'),
      cf_utm_campaign: getHiddenValue(form, 'utm_campaign'),
      cf_utm_term: getHiddenValue(form, 'utm_term'),
      cf_utm_content: getHiddenValue(form, 'utm_content'),
      cf_placement: getHiddenValue(form, 'placement')
    };

    body[RD_FIELD_INSTITUICAO] = getValue(config.fields.instituicao);

    ['cf_utm_source', 'cf_utm_medium', 'cf_utm_campaign', 'cf_utm_term', 'cf_utm_content', 'cf_placement'].forEach(function(key) {
      if (!body[key]) delete body[key];
    });

    return body;
  }

  function shouldTrackLead(value) {
    return value === 'Instituição/entidade pública' || value === 'Instituição do Sistema S';
  }

  function validateForm(config) {
    var values = {
      name: getValue(config.fields.name),
      phone: getValue(config.fields.phone),
      email: getValue(config.fields.email),
      setor: getValue(config.fields.setor),
      instituicao: getValue(config.fields.instituicao)
    };

    var checks = {
      name: values.name.length >= 3,
      phone: isValidPhone(values.phone),
      email: isValidEmail(values.email),
      setor: values.setor !== '',
      instituicao: values.instituicao !== ''
    };

    Object.keys(checks).forEach(function(key) {
      setFieldError(config.errorFields[key], !checks[key]);
    });

    return Object.keys(checks).every(function(key) { return checks[key]; });
  }

  function focusFirstError(form) {
    var firstError = form.querySelector('.has-error input,.has-error select');
    if (firstError) firstError.focus();
  }

  function bindValidation(config) {
    Object.keys(config.fields).forEach(function(key) {
      var element = getElement(config.fields[key]);
      if (!element) return;
      element.addEventListener('input', function() {
        var field = getElement(config.errorFields[key]);
        if (field && field.classList.contains('has-error')) validateForm(config);
      });
      element.addEventListener('change', function() {
        var field = getElement(config.errorFields[key]);
        if (field && field.classList.contains('has-error')) validateForm(config);
      });
    });
  }

  // (34) 99234-5623 / (34) 3234-5623
  function formatNationalPhone(digits) {
    if (digits.length <= 2) return digits;
    var formatted = '(' + digits.substring(0, 2) + ') ';
    if (digits.length <= 6) return formatted + digits.substring(2);
    return formatted + (digits.length === 11
      ? digits.substring(2, 7) + '-' + digits.substring(7)
      : digits.substring(2, 6) + '-' + digits.substring(6));
  }

  // Mascara do campo. Nao corta digitos a mais: o visitante ve exatamente o
  // que digitou e a validacao mostra o erro.
  function formatPhone(value) {
    var hasPlus = /^\s*\+/.test(value);
    var digits = String(value || '').replace(/\D/g, '').substring(0, PHONE_MAX_DIGITS);
    if ((digits.length === 12 || digits.length === 13) && digits.indexOf('55') === 0) {
      return '+55 ' + formatNationalPhone(digits.substring(2));
    }
    // Quem comeca com "+" esta digitando o codigo do pais: mostra os digitos
    // crus ate o numero ficar completo, sem formatar como DDD.
    if (hasPlus || digits.length > 11) return (hasPlus ? '+' : '') + digits;
    return formatNationalPhone(digits);
  }

  function bindPhoneMask(phoneId) {
    var phoneInput = getElement(phoneId);
    if (!phoneInput) return;
    phoneInput.addEventListener('input', function(event) {
      // Apagando: nao reformata, senao "(" ")" e "-" voltam e o cursor pula.
      if (event.inputType && event.inputType.indexOf('delete') === 0) return;
      var formatted = formatPhone(event.target.value);
      if (formatted !== event.target.value) event.target.value = formatted;
    });
  }

  function createErrorBox(form) {
    var box = document.createElement('div');
    box.className = 'lead-form-error';
    box.setAttribute('role', 'alert');
    // Estilo inline: o helper atende paginas com CSS diferentes.
    box.style.display = 'none';
    box.style.color = '#c0392b';
    box.style.marginTop = '12px';
    box.style.fontSize = '14px';
    box.style.lineHeight = '1.4';
    form.appendChild(box);
    return box;
  }

  function showError(box, message) {
    box.textContent = message;
    box.style.display = 'block';
  }

  function hideError(box) {
    box.textContent = '';
    box.style.display = 'none';
  }

  function delay(ms) {
    return new Promise(function(resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  function postRdConversion(rdBody) {
    var attempt = 0;

    function attemptOnce() {
      attempt += 1;
      return window.fetch(RD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rdBody)
      }).then(function(response) {
        if (response.ok) return response;
        var httpError = new Error('RD Station status ' + response.status);
        // 4xx e erro de payload/token: repetir nao muda o resultado.
        httpError.retryable = response.status >= 500;
        throw httpError;
      }, function(networkError) {
        networkError.retryable = true;
        throw networkError;
      }).catch(function(error) {
        if (error.retryable && attempt < RD_MAX_ATTEMPTS) {
          return delay(RD_RETRY_BASE_MS * attempt).then(attemptOnce);
        }
        throw error;
      });
    }

    return attemptOnce();
  }

  function errorBoxFor(form) {
    var box = createErrorBox(form);
    return {
      show: function(message) { showError(box, message || RD_ERROR_TEXT); },
      hide: function() { hideError(box); }
    };
  }

  function showSuccess(config) {
    var formWrap = getElement(config.formWrapId);
    var success = getElement(config.successId);
    if (formWrap) formWrap.style.display = 'none';
    if (success) success.classList.add('show');
  }

  function trackMetaLead(rdBody) {
    var eventId = genUuid();
    var payload = {
      event_name: 'Lead',
      event_id: eventId,
      event_source_url: window.location.href,
      name: rdBody.name,
      email: rdBody.email,
      phone: rdBody.mobile_phone,
      fbp: getCookie('_fbp'),
      fbc: ensureFbc()
    };

    if (typeof window.fbq === 'function') {
      window.fbq('track', 'Lead', {}, { eventID: eventId });
    }

    window.fetch('/capi.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(function(error) {
      console.error('[Meta CAPI] Erro de rede ao enviar evento:', error);
    });
  }

  function bindSubmit(config) {
    var form = getElement(config.formId);
    var button = form ? form.querySelector('[type="submit"]') : null;
    if (!form) return;

    var errorBox = createErrorBox(form);

    form.addEventListener('submit', function(event) {
      event.preventDefault();
      hideError(errorBox);
      captureTrackingFields(form);

      if (!validateForm(config)) {
        focusFirstError(form);
        return;
      }

      var originalText = button ? button.textContent : '';
      if (button) {
        button.disabled = true;
        button.textContent = config.loadingText;
      }

      var rdBody = buildRdBody(form, config);
      postRdConversion(rdBody)
      .then(function() {
        if (shouldTrackLead(rdBody[RD_FIELD_INSTITUICAO])) {
          trackMetaLead(rdBody);
        }
        showSuccess(config);
      })
      .catch(function(error) {
        console.error('[RD Station] Erro ao enviar conversao:', error);
        showError(errorBox, config.errorText || RD_ERROR_TEXT);
      })
      .finally(function() {
        if (button) {
          button.disabled = false;
          button.textContent = originalText || config.submitText;
        }
      });
    });
  }

  function init(config) {
    var form = getElement(config.formId);
    if (!form) return;
    captureTrackingFields(form);
    bindPhoneMask(config.fields.phone);
    bindValidation(config);
    bindSubmit(config);
  }

  window.OpenLeadForms = {
    init: init,
    // Usados pelo formulario em 2 etapas das consultorias
    // (/assets/js/consultoria-form.js).
    postRdConversion: postRdConversion,
    errorBoxFor: errorBoxFor,
    isValidEmail: isValidEmail,
    isValidPhone: isValidPhone,
    normalizePhone: normalizePhone,
    bindPhoneMask: bindPhoneMask,
    trackMetaLead: trackMetaLead,
    _test: {
      buildRdBody: buildRdBody,
      formatPhone: formatPhone,
      captureTrackingFields: captureTrackingFields,
      shouldTrackLead: shouldTrackLead,
      validateForm: validateForm
    }
  };
})(window, document);
