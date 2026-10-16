/* ==========================================================================
   Contact form
   With PV_CONFIG.contact.endpoint empty, submitting shows the success state.
   With an endpoint set, the form POSTs JSON to it first.
   ========================================================================== */
(function () {
  'use strict';
  var PV = window.PV || {};
  var CFG = window.PV_CONFIG || {};
  var form = document.getElementById('contactForm');
  var success = document.getElementById('contactSuccess');
  if (!form || !success) return;

  PV.forms && PV.forms.bind(form);
  var submit = form.querySelector('[type="submit"]');
  var title = success.querySelector('[data-success-title]');
  var val = function (n) { return form.elements.namedItem(n).value.trim(); };

  function showError(msg) {
    var err = form.querySelector('.contact__actions .field__error');
    if (!err) {
      err = document.createElement('p');
      err.className = 'field__error';
      err.setAttribute('role', 'alert');
      form.querySelector('.contact__actions').appendChild(err);
    }
    err.textContent = msg;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (PV.forms && !PV.forms.validate(form)) return;
    var data = { name: val('name'), email: val('email'), message: val('message'), source: 'parallelvortex-site' };
    submit.classList.add('is-loading');
    submit.setAttribute('aria-disabled', 'true');

    var endpoint = CFG.contact && CFG.contact.endpoint;
    var request = endpoint
      ? fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
          .then(function (r) { if (!r.ok) throw new Error('Request failed'); })
      : new Promise(function (r) { setTimeout(r, 900); });

    request.then(function () {
      var first = data.name.split(/\s+/)[0];
      title.textContent = 'Thanks, ' + first + '. Your message is in.';
      form.hidden = true;
      PV.forms ? PV.forms.reveal(success) : (success.hidden = false);
      success.focus({ preventScroll: true });
    }).catch(function () {
      showError('That didn\'t go through. Please try again in a moment, or book a free consultation instead.');
    }).then(function () {
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
