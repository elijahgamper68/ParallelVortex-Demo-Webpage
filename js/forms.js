/* Shared form helpers: validation, errors, success reveal */
(function () {
  'use strict';
  var PV = (window.PV = window.PV || {});
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var uid = 0;

  var messages = {
    name: 'Please add your name.',
    email: 'Please add an email address.',
    emailFormat: 'That email address doesn\'t look quite right.',
    message: 'Please add a short message.',
    needs: 'Tell us a little about what you need. A sentence or two is plenty.',
    amount: 'Please enter the amount you agreed on.',
    card: 'Please enter a valid card number.',
    expiry: 'Use MM / YY, with a date in the future.',
    cvc: 'Three or four digits.',
    generic: 'Please fill this in.',
  };

  function luhn(num) {
    var sum = 0, alt = false;
    for (var i = num.length - 1; i >= 0; i--) {
      var n = parseInt(num.charAt(i), 10);
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n; alt = !alt;
    }
    return sum % 10 === 0;
  }

  function check(input) {
    var v = (input.value || '').trim();
    var kind = input.dataset.validate || input.name;
    if (input.required && !v) return messages[kind] || messages.generic;
    if (!v) return '';
    if (input.type === 'email' && !EMAIL.test(v)) return messages.emailFormat;
    if (kind === 'amount') { var a = parseFloat(v.replace(/[^0-9.]/g, '')); if (!(a > 0)) return messages.amount; }
    if (kind === 'card') { var d = v.replace(/\D/g, ''); if (d.length < 13 || d.length > 19 || !luhn(d)) return messages.card; }
    if (kind === 'expiry') {
      var m = v.replace(/\s/g, '').match(/^(\d{2})\/(\d{2})$/);
      if (!m) return messages.expiry;
      var mm = +m[1], yy = 2000 + +m[2], now = new Date();
      if (mm < 1 || mm > 12) return messages.expiry;
      if (yy < now.getFullYear() || (yy === now.getFullYear() && mm < now.getMonth() + 1)) return messages.expiry;
    }
    if (kind === 'cvc' && !/^\d{3,4}$/.test(v)) return messages.cvc;
    return '';
  }

  function setError(input, msg) {
    var field = input.closest('.field');
    if (!field) return;
    var err = field.querySelector('.field__error');
    if (err && !err.id) err.id = 'err-' + (++uid);
    field.classList.toggle('is-invalid', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) { err.textContent = msg || ''; input.setAttribute('aria-describedby', err.id); }
  }

  function bind(form) {
    form.querySelectorAll('.field__input').forEach(function (input) {
      input.addEventListener('blur', function () { if (input.value) setError(input, check(input)); });
      input.addEventListener('input', function () { if (input.getAttribute('aria-invalid') === 'true') setError(input, check(input)); });
    });
  }

  function validate(form) {
    var first = null;
    form.querySelectorAll('.field__input').forEach(function (input) {
      var msg = check(input);
      setError(input, msg);
      if (msg && !first) first = input;
    });
    if (first) first.focus();
    return !first;
  }

  function reset(form) {
    form.reset();
    form.querySelectorAll('.field__input').forEach(function (i) { setError(i, ''); });
  }

  // Blur-up reveal for success panels
  function reveal(el) {
    el.hidden = false;
    el.classList.remove('is-in');
    void el.offsetWidth;
    el.classList.add('is-in');
    if (PV.gsap && !PV.reduced) {
      PV.gsap.fromTo(el.children, { y: 20, opacity: 0, filter: 'blur(10px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.8, stagger: 0.08, ease: 'power2.out', clearProps: 'filter' });
    }
  }

  PV.forms = { bind: bind, validate: validate, reset: reset, setError: setError, reveal: reveal };
})();
