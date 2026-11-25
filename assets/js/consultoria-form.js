// Formulario em 2 etapas (dados pessoais + dados da empresa) das LPs de
// consultoria: /consultoria, /consultoria/clinicas e /consultoria/zfm.
// Depende de /assets/js/lead-form.js (window.OpenLeadForms), que deve carregar
// antes. O servidor serve este arquivo com cache de 7 dias: ao altera-lo,
// atualize o ?v= nas paginas que o carregam (tests/asset-versioning.test.js).
(function(window, document) {
  'use strict';

  var RD_TOKEN = 'fde56b5029b7f481d3f10fecb3f1de85';
  var STORAGE_PREFIX = 'gtap_';
  var TRACKING_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_placement', 'placement', 'gclid', 'fbclid'];
  var LOADING_TEXT = 'Processando...';

  function byId(id) {
    return document.getElementById(id);
  }

  // === RASTREAMENTO ===
  // Guarda as UTMs da URL na sessao, para que sobrevivam a recarregamentos.
  // Uma URL com rastreamento novo substitui todo o anterior (ultimo clique),
  // para nao misturar um gclid novo com UTMs de outra campanha.
  function captureTracking() {
    try {
      var params = new URLSearchParams(window.location.search);
      var hasTracking = TRACKING_KEYS.some(function(key) { return params.get(key); });
      if (!hasTracking) return;
      TRACKING_KEYS.forEach(function(key) {
        var value = params.get(key);
        if (value) window.sessionStorage.setItem(STORAGE_PREFIX + key, value);
        else window.sessionStorage.removeItem(STORAGE_PREFIX + key);
      });
    } catch (e) {}
  }

  function readTracking() {
    var tracking = {};
    TRACKING_KEYS.forEach(function(key) {
      var value = null;
      try { value = window.sessionStorage.getItem(STORAGE_PREFIX + key); } catch (e) {}
      tracking[key] = value || '';
    });
    return tracking;
  }

  // Campos do RD (tests/consultoria-form.test.js). traffic_* sao campos padrao
  // do RD; cf_* sao campos personalizados que existem na conta (cf_utm_*,
  // cf_placement, cf_gclid, cf_fbclid, cf_cnpj, cf_regime_tributario,
  // cf_faturamento_medio). Campo cf_ que nao existe no RD e descartado.
  function buildRdBody(identificador, values, tracking) {
    // RD recebe so os digitos com DDD ("71999999999").
    var phone = window.OpenLeadForms.normalizePhone(values.phone) || values.phone;
    var body = {
      token_rdstation: RD_TOKEN,
      identificador: identificador,
      name: values.name,
      email: values.email,
      mobile_phone: phone,
      cf_cnpj: values.cnpj,
      cf_regime_tributario: values.regime,
      cf_faturamento_medio: values.faturamento,
      traffic_source: tracking.utm_source,
      traffic_medium: tracking.utm_medium,
      traffic_campaign: tracking.utm_campaign,
      traffic_value: tracking.utm_term,
      traffic_content: tracking.utm_content,
      cf_utm_source: tracking.utm_source,
      cf_utm_medium: tracking.utm_medium,
      cf_utm_campaign: tracking.utm_campaign,
      cf_utm_term: tracking.utm_term,
      cf_utm_content: tracking.utm_content,
      cf_placement: tracking.utm_placement || tracking.placement,
      cf_gclid: tracking.gclid,
      cf_fbclid: tracking.fbclid
    };

    Object.keys(body).forEach(function(key) {
      if (body[key] === undefined || body[key] === null || body[key] === '') delete body[key];
    });

    return body;
  }

  // === E-MAIL PARA O COMERCIAL (/enviar-lead.php) ===
  // Mesmos dados do lead, com as chaves que o PHP le. "form" escolhe o
  // destinatario no $DESTINOS do PHP.
  function buildEmailBody(identificador, values, tracking, page) {
    var body = {
      form: identificador,
      name: values.name,
      email: values.email,
      phone: values.phone,
      cnpj: values.cnpj,
      regime: values.regime,
      faturamento: values.faturamento,
      page: page
    };
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'].forEach(function(key) {
      if (tracking[key]) body[key] = tracking[key];
    });
    var placement = tracking.utm_placement || tracking.placement;
    if (placement) body.placement = placement;
    return body;
  }

  // Aviso ao comercial. Roda depois do RD aceitar o lead e nunca mostra erro
  // ao visitante: o lead ja esta salvo no RD.
  function sendLeadEmail(body) {
    try {
      window.fetch('/enviar-lead.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(function(response) {
        if (!response.ok) console.error('[E-mail] enviar-lead.php status ' + response.status);
      }).catch(function(error) {
        console.error('[E-mail] Erro ao enviar lead por e-mail:', error);
      });
    } catch (error) {
      console.error('[E-mail] Erro ao enviar lead por e-mail:', error);
    }
  }

  // Evento do GTM quando o visitante abre o formulario por um botao.
  // cta_local: menu-mobile, header, id da secao (ou o nome da classe
  // section-*, quando a secao nao tem id) ou hero.
  function ctaLocal(trigger) {
    if (trigger.closest('.mobile-nav-drawer')) return 'menu-mobile';
    if (trigger.closest('header')) return 'header';
    var section = trigger.closest('section');
    if (!section) return 'hero';
    if (section.id) return section.id;
    var named = (section.className || '').match(/(?:^|\s)section-([\w-]+)/);
    return named ? named[1] : 'hero';
  }

  function trackFormOpen(formulario, trigger) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'formulario_aberto',
      formulario: formulario,
      cta_local: ctaLocal(trigger)
    });
  }

  // CNPJ: 00.000.000/0000-00
  function formatCnpj(raw) {
    var v = raw.replace(/\D/g, '').substring(0, 14);
    if (v.length > 12) return v.substring(0, 2) + '.' + v.substring(2, 5) + '.' + v.substring(5, 8) + '/' + v.substring(8, 12) + '-' + v.substring(12);
    if (v.length > 8) return v.substring(0, 2) + '.' + v.substring(2, 5) + '.' + v.substring(5, 8) + '/' + v.substring(8);
    if (v.length > 5) return v.substring(0, 2) + '.' + v.substring(2, 5) + '.' + v.substring(5);
    if (v.length > 2) return v.substring(0, 2) + '.' + v.substring(2);
    return v;
  }

  function init(config) {
    var leads = window.OpenLeadForms;
    var modal = byId('formModal');
    var form = byId('rdForm');
    if (!leads || !modal || !form) {
      console.error('[OpenConsultoriaForm] lead-form.js, #formModal ou #rdForm ausente: formulario desativado.');
      return;
    }

    var wrapper = byId('modalFormWrapper');
    var success = byId('modalSuccess');
    var step1 = byId('formStep1');
    var step2 = byId('formStep2');
    var btnSubmit = byId('btnSubmit');
    var inputs = {
      name: byId('rd-name'),
      phone: byId('rd-phone'),
      email: byId('rd-email'),
      cnpj: byId('rd-cnpj'),
      regime: byId('rd-regime'),
      faturamento: byId('rd-faturamento'),
      lgpd: byId('rd-lgpd')
    };
    var errorBox = leads.errorBoxFor(form);

    function setError(input, hasError) {
      input.closest('.field').classList.toggle('has-error', hasError);
    }

    // === ETAPAS ===
    function setStepper(step) {
      var dot1 = modal.querySelector('.step-dot[data-step="1"]');
      var dot2 = modal.querySelector('.step-dot[data-step="2"]');
      var labels = modal.querySelectorAll('.step-label');
      dot1.classList.toggle('active', step === 1);
      dot1.classList.toggle('done', step === 2);
      dot2.classList.toggle('active', step === 2);
      modal.querySelector('.step-line-fill').style.width = step === 2 ? '100%' : '0%';
      labels[0].classList.toggle('active', step === 1);
      labels[1].classList.toggle('active', step === 2);
    }

    function showStep(step) {
      step1.classList.toggle('active', step === 1);
      step2.classList.toggle('active', step === 2);
      setStepper(step);
    }

    function validateStep1() {
      var checks = [
        [inputs.name, inputs.name.value.trim().length >= 3],
        [inputs.phone, leads.isValidPhone(inputs.phone.value)],
        [inputs.email, leads.isValidEmail(inputs.email.value.trim())]
      ];
      checks.forEach(function(check) { setError(check[0], !check[1]); });
      return checks.every(function(check) { return check[1]; });
    }

    function validateStep2() {
      var checks = [
        [inputs.cnpj, inputs.cnpj.value.replace(/\D/g, '').length === 14],
        [inputs.regime, !!inputs.regime.value],
        [inputs.faturamento, !!inputs.faturamento.value],
        [inputs.lgpd, inputs.lgpd.checked]
      ];
      checks.forEach(function(check) { setError(check[0], !check[1]); });
      return checks.every(function(check) { return check[1]; });
    }

    function goToStep1() {
      showStep(1);
      step2.querySelectorAll('.field').forEach(function(field) { field.classList.remove('has-error'); });
    }

    function goToStep2() {
      if (validateStep1()) showStep(2);
    }

    // === MODAL ===
    var dialog = modal.querySelector('[role="dialog"]');
    var lastTrigger = null;
    var savedScrollY = 0;

    function resetForm() {
      form.reset();
      wrapper.style.display = 'block';
      success.classList.remove('show');
      errorBox.hide();
      showStep(1);
      modal.querySelectorAll('.field').forEach(function(field) { field.classList.remove('has-error'); });
    }

    function isOpen() {
      return modal.classList.contains('open');
    }

    // Fechar sem querer (ESC, clique fora) nao apaga o que foi digitado: o
    // formulario so volta ao inicio depois de um envio concluido.
    function openModal(trigger) {
      if (isOpen()) return;
      lastTrigger = trigger || document.activeElement;
      // O botao do menu mobile some com o menu fechado: devolve o foco ao hamburguer.
      if (lastTrigger && lastTrigger.closest && lastTrigger.closest('.mobile-nav-drawer')) {
        lastTrigger = byId('hamburgerBtn') || lastTrigger;
      }
      savedScrollY = window.scrollY;
      if (success.classList.contains('show')) resetForm();
      else errorBox.hide();
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      if (dialog) dialog.focus({ preventScroll: true });
    }

    // Volta exatamente ao ponto da pagina de onde o visitante abriu o
    // formulario. O html usa scroll-behavior: smooth, entao pede 'instant'.
    function restoreScroll() {
      if (Math.abs(window.scrollY - savedScrollY) < 1) return;
      try {
        window.scrollTo({ top: savedScrollY, left: 0, behavior: 'instant' });
      } catch (e) {
        window.scrollTo(0, savedScrollY);
      }
    }

    function closeModal() {
      if (!isOpen()) return;
      modal.classList.remove('open');
      document.body.style.overflow = '';
      restoreScroll();
      if (lastTrigger && lastTrigger.focus && document.body.contains(lastTrigger)) {
        lastTrigger.focus({ preventScroll: true });
      }
      lastTrigger = null;
    }

    function showSuccess() {
      wrapper.style.display = 'none';
      success.classList.add('show');
      // O botao de envio sumiu junto com o formulario: o foco volta para a janela.
      if (dialog) dialog.focus({ preventScroll: true });
    }

    // Botoes "Preencher Aplicacao" / "Agendar Analise Gratuita" da pagina.
    document.addEventListener('click', function(event) {
      var trigger = event.target.closest('[data-open-modal]');
      if (!trigger) return;
      event.preventDefault();
      // O menu mobile tambem trava o scroll do body: fecha ele antes.
      if (trigger.closest('.mobile-nav-drawer') && typeof window.closeMobileNav === 'function') {
        window.closeMobileNav();
      }
      if (!isOpen()) trackFormOpen(config.formulario, trigger);
      openModal(trigger);
    });

    // Teclado: ESC fecha; Tab circula so entre os campos do formulario.
    document.addEventListener('keydown', function(event) {
      if (!isOpen() || event.defaultPrevented) return;
      if (event.key === 'Escape') {
        closeModal();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      var focusable = Array.prototype.filter.call(
        dialog.querySelectorAll('button, [href], input, select, textarea'),
        function(el) { return !el.disabled && el.offsetParent !== null; }
      );
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelectorAll('[data-close-modal]').forEach(function(button) {
      button.addEventListener('click', closeModal);
    });
    modal.addEventListener('click', function(event) {
      if (event.target === modal) closeModal();
    });
    byId('btnNextStep').addEventListener('click', goToStep2);
    modal.querySelector('.btn-back').addEventListener('click', goToStep1);

    // === MASCARAS ===
    leads.bindPhoneMask('rd-phone');
    inputs.cnpj.addEventListener('input', function(event) {
      event.target.value = formatCnpj(event.target.value);
    });

    // Limpa o erro do campo assim que o usuario mexe nele.
    form.querySelectorAll('input, select').forEach(function(input) {
      ['input', 'change'].forEach(function(type) {
        input.addEventListener(type, function() { setError(input, false); });
      });
    });

    // === ENVIO ===
    // Lead e tela de sucesso so depois do RD confirmar. Se falhar mesmo apos
    // as tentativas, o usuario ve o erro e pode reenviar.
    var sending = false;

    form.addEventListener('submit', function(event) {
      event.preventDefault();
      // Fechar e reabrir durante o envio nao pode gerar um segundo lead.
      if (sending) return;
      errorBox.hide();

      // Revalida a etapa 1: impede pular a etapa mexendo no DOM.
      if (!validateStep1()) {
        goToStep1();
        return;
      }
      if (!validateStep2()) return;

      var originalText = btnSubmit.textContent;
      btnSubmit.textContent = LOADING_TEXT;
      btnSubmit.disabled = true;
      sending = true;

      var values = {
        name: inputs.name.value.trim(),
        email: inputs.email.value.trim(),
        phone: inputs.phone.value.trim(),
        cnpj: inputs.cnpj.value.trim(),
        regime: inputs.regime.value,
        faturamento: inputs.faturamento.value
      };
      var tracking = readTracking();
      var rdBody = buildRdBody(config.identificador, values, tracking);

      leads.postRdConversion(rdBody)
      .then(function() {
        // O lead ja esta no RD: daqui em diante nada pode mostrar erro ao
        // visitante (ele reenviaria e duplicaria o lead).
        // Conversao para o GTM (pixel e conversoes sao configurados pelo marketing).
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'lead_enviado', formulario: config.formulario });
        showSuccess();
        sendLeadEmail(buildEmailBody(config.identificador, values, tracking, window.location.href));
        try {
          leads.trackMetaLead(rdBody);
        } catch (error) {
          console.error('[Meta] Erro ao enviar Lead:', error);
        }
      })
      .catch(function(error) {
        console.error('[RD Station] Erro ao enviar conversao:', error);
        errorBox.show();
      })
      .finally(function() {
        sending = false;
        btnSubmit.textContent = originalText;
        btnSubmit.disabled = false;
      });
    });
    // Fim do submit

    captureTracking();
  }

  window.OpenConsultoriaForm = {
    init: init,
    _test: {
      buildRdBody: buildRdBody,
      buildEmailBody: buildEmailBody,
      captureTracking: captureTracking,
      readTracking: readTracking,
      formatCnpj: formatCnpj,
      trackFormOpen: trackFormOpen
    }
  };
})(window, document);
