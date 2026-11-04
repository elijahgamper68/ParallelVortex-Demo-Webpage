/* ==========================================================================
   Contact form
   Demo mode shows the success state without sending anything.
   Live mode sends to whichever backend PV_CONFIG.contact names:
     netlify: true      -> Netlify Forms (form-encoded POST to the site itself)
     endpoint: '...'    -> JSON POST (Formspree and similar)
     formsubmitEmail    -> FormSubmit's AJAX endpoint
   ========================================================================== */
(function () {
  'use strict';
  var PV = window.PV || {};
  var CFG = window.PV_CONFIG || {};
  var C = CFG.contact || {};
  var LIVE = CFG.mode === 'live';
  var form = document.getElementById('contactForm');
  var success = document.getElementById('contactSuccess');
  if (!form || !success) return;

  PV.forms && PV.forms.bind(form);
  var submit = form.querySelector('[type="submit"]');
  var title = success.querySelector('[data-success-title]');
  var val = function (n) { var el = form.elements.namedItem(n); return el ? el.value.trim() : ''; };
  var SUBJECT = 'New message from the Parallel Vortex website';

  function backend() {
    if (!LIVE) return 'demo';
    if (C.netlify) return 'netlify';
    if (/^https:\/\//i.test(C.endpoint || '')) return 'endpoint';
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(C.formsubmitEmail || '')) return 'formsubmit';
    return 'none';
  }
  PV.contactBackend = backend();
  if (PV.contactBackend === 'none' && window.console) console.warn('[Parallel Vortex] Live mode has no contact backend set in js/config.js');

  function send(data) {
    var kind = PV.contactBackend;
    var json = function (url, body) {
      return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json().catch(function () { return {}; }); })
        .then(function (res) { if (res && (res.success === false || res.success === 'false')) throw new Error(res.message || 'Rejected'); });
    };
    if (kind === 'demo') return new Promise(function (r) { setTimeout(r, 900); });
    if (kind === 'netlify') {
      var body = new URLSearchParams({ 'form-name': form.getAttribute('name') || 'contact', name: data.name, email: data.email, message: data.message, 'bot-field': '' }).toString();
      return fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); });
    }
    if (kind === 'endpoint') return json(C.endpoint, { name: data.name, email: data.email, message: data.message, _subject: SUBJECT, _replyto: data.email });
    if (kind === 'formsubmit') {
      return json('https://formsubmit.co/ajax/' + encodeURIComponent(C.formsubmitEmail), {
        name: data.name, email: data.email, message: data.message, _subject: SUBJECT, _replyto: data.email, _template: 'table', _captcha: 'false',
      });
    }
    return Promise.reject(new Error('No contact backend'));
  }

  function showError(msg) {
    var err = form.querySelector('[data-form-error]');
    if (!err) {
      err = document.createElement('p');
      err.className = 'field__error';
      err.setAttribute('role', 'alert');
      err.setAttribute('data-form-error', '');
      form.querySelector('.contact__actions').appendChild(err);
    }
    err.textContent = msg;
  }
  function clearError() { var err = form.querySelector('[data-form-error]'); if (err) err.textContent = ''; }

  function done(name) {
    title.textContent = 'Thanks, ' + name.split(/\s+/)[0] + '. Your message is in.';
    form.hidden = true;
    PV.forms ? PV.forms.reveal(success) : (success.hidden = false);
    success.focus({ preventScroll: true });
  }

  var sending = false;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;
    clearError();
    if (PV.forms && !PV.forms.validate(form)) return;
    var data = { name: val('name'), email: val('email'), message: val('message') };

    // Honeypot: real visitors never see or fill this field
    if (val('bot-field')) { done(data.name); return; }

    sending = true;
    submit.classList.add('is-loading');
    submit.setAttribute('aria-disabled', 'true');

    send(data).then(function () {
      done(data.name);
      form.dispatchEvent(new CustomEvent('pv:contact-sent', { detail: { backend: PV.contactBackend }, bubbles: true }));
    }).catch(function () {
      showError('That didn\'t go through. Please try again in a moment, or book a free consultation instead.');
    }).then(function () {
      sending = false;
      submit.classList.remove('is-loading');
      submit.removeAttribute('aria-disabled');
    });
  });

  success.querySelector('[data-contact-reset]').addEventListener('click', function () {
    PV.forms && PV.forms.reset(form);
    success.hidden = true;
    form.hidden = false;
    if (PV.gsap && !PV.reduced) PV.gsap.fromTo(form, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
    form.querySelector('input').focus({ preventScroll: true });
  });
})();
