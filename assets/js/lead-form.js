(function(window, document) {
  'use strict';

  var RD_ENDPOINT = 'https://www.rdstation.com.br/api/1.3/conversions';
  var RD_FIELD_INSTITUICAO = 'cf_instituicao';
  var TRACKING_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'placement'];

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

  function isValidPhone(value) {
    var digits = value.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
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
      mobile_phone: getValue(config.fields.phone),
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

  function bindPhoneMask(phoneId) {
    var phoneInput = getElement(phoneId);
    if (!phoneInput) return;
    phoneInput.addEventListener('input', function(event) {
      var value = event.target.value.replace(/\D/g, '');
      if (value.length > 11) value = value.substring(0, 11);

      var formatted = value;
      if (value.length > 2) {
        formatted = '(' + value.substring(0, 2) + ') ';
        if (value.length > 6) {
          formatted += value.length === 11
            ? value.substring(2, 7) + '-' + value.substring(7)
            : value.substring(2, 6) + '-' + value.substring(6);
        } else {
          formatted += value.substring(2);
        }
      }
      event.target.value = formatted;
    });
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

    form.addEventListener('submit', function(event) {
      event.preventDefault();
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
      window.fetch(RD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rdBody)
      })
      .then(function(response) {
        if (!response.ok) throw new Error('RD Station status ' + response.status);
        if (shouldTrackLead(rdBody[RD_FIELD_INSTITUICAO])) {
          trackMetaLead(rdBody);
        }
        showSuccess(config);
      })
      .catch(function(error) {
        console.error('[RD Station] Erro ao enviar conversao:', error);
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
    _test: {
      buildRdBody: buildRdBody,
      captureTrackingFields: captureTrackingFields,
      shouldTrackLead: shouldTrackLead,
      validateForm: validateForm
    }
  };
})(window, document);
