/* ==========================================================================
   Sessions & services checkout
   If a Stripe / PayPal link is set in PV_CONFIG.payments, the button opens it.
   Otherwise a demo checkout runs in a modal and ends on a thank-you screen.
   ========================================================================== */
(function () {
  'use strict';
  var PV = window.PV || {};
  var CFG = window.PV_CONFIG || {};
  var PAY = CFG.payments || {};
  var modal = document.getElementById('checkout');
  if (!modal) return;

  var SERVICES = {
    tech: { name: 'Tech Session', detail: 'One hour of one-on-one help' },
    website: { name: 'Website Build', detail: 'A simple, streamlined website' },
    support: { name: 'Ongoing Support', detail: 'Help when you need it' },
  };
  var ARROW = '<svg class="icon icon--a1"><use href="#i-arrow"/></svg><svg class="icon icon--a2"><use href="#i-arrow"/></svg>';
  var body = modal.querySelector('.modal__body');
  var panel = modal.querySelector('.modal__panel');
  var backdrop = modal.querySelector('.modal__backdrop');
  var gsap = PV.gsap;
  var lastTrigger = null;
  var isOpen = false;

  /* ---------- Triggers ---------- */
  document.querySelectorAll('[data-pay]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var method = btn.dataset.pay, service = btn.dataset.service;
      var url = PAY[method] && PAY[method][service];
      if (url) { window.open(url, '_blank', 'noopener'); return; }
      lastTrigger = btn;
      open(method, service);
    });
  });

  /* ---------- Templates ---------- */
  function field(id, label, attrs, extra) {
    return '<div class="field"' + (extra || '') + '><label class="field__label font-XS" for="' + id + '">' + label + '</label>' +
      '<input class="field__input" id="' + id + '" ' + attrs + '><span class="field__error"></span></div>';
  }

  function formView(method, svc) {
    var card = method === 'stripe';
    return '' +
      '<div class="modal__step" data-mstep="form">' +
        '<span class="modal__eyebrow font-XS">' + (card ? 'Checkout · Card payment' : 'Checkout · PayPal') + '</span>' +
        '<h2 class="modal__title font-L" id="checkout-title">' + svc.name + '</h2>' +
        '<p class="modal__sub font-S">' + svc.detail + '. Enter the amount agreed on your free consultation.</p>' +
        '<form class="modal__form" novalidate data-mform>' +
          '<div class="field-row" style="grid-template-columns:repeat(auto-fit,minmax(18rem,1fr))">' +
            field('m-amount', 'Agreed amount (CAD)', 'name="amount" type="text" inputmode="decimal" autocomplete="off" required data-validate="amount"') +
            field('m-email', 'Email for your receipt', 'name="email" type="email" autocomplete="email" required') +
          '</div>' +
          (card
            ? field('m-card', 'Card number', 'name="card" type="text" inputmode="numeric" autocomplete="off" maxlength="23" required data-validate="card"') +
              '<div class="field-row">' +
                field('m-exp', 'Expiry (MM / YY)', 'name="expiry" type="text" inputmode="numeric" autocomplete="off" maxlength="7" required data-validate="expiry"') +
                field('m-cvc', 'Security code', 'name="cvc" type="text" inputmode="numeric" autocomplete="off" maxlength="4" required data-validate="cvc"') +
              '</div>'
            : '') +
          '<div class="modal__actions">' +
            '<p class="modal__note font-XS"><svg class="icon"><use href="#i-lock"/></svg>Demo checkout: no payment is processed</p>' +
            '<button type="submit" class="buttonArrow" data-color="dark" data-msubmit><span class="button__title" data-paylabel>' + (card ? 'Pay now' : 'Continue to PayPal') + '</span><span class="button__arrow" aria-hidden="true">' + ARROW + '</span></button>' +
          '</div>' +
          (card ? '<button type="button" class="buttonLine" data-fill style="margin-top:.4rem"><span class="buttonLine__label font-XS">Fill in a demo test card</span><span class="buttonLine__line"><span></span><span></span></span></button>' : '') +
        '</form>' +
      '</div>' +

      '<div class="modal__step" data-mstep="redirect" hidden>' +
        '<span class="modal__eyebrow font-XS">Checkout · PayPal</span>' +
        '<h2 class="modal__title font-L">Connecting to PayPal</h2>' +
        '<p class="modal__sub font-S">Confirming your payment. This only takes a moment.</p>' +
        '<span class="buttonArrow is-loading" data-color="dark" aria-hidden="true"><span class="button__arrow">' + ARROW + '</span></span>' +
      '</div>' +

      '<div class="modal__step" data-mstep="done" hidden>' +
        '<div class="success" data-msuccess tabindex="-1">' +
          '<span class="success__icon"><svg viewBox="0 0 18 18" aria-hidden="true"><path d="m3.5 9.4 3.6 3.6 7.4-8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
          '<h2 class="font-L">Payment received, thank you.</h2>' +
          '<p class="success__text font-S" data-mdone-text></p>' +
          '<div class="success__recap font-S"><strong class="font-S--semibold" data-mdone-svc></strong><span data-mdone-amt></span><span data-mdone-method style="color:var(--coal)"></span></div>' +
          '<button type="button" class="buttonArrow" data-color="slate" data-close><span class="button__title">Close</span><span class="button__arrow" aria-hidden="true">' + ARROW + '</span></button>' +
        '</div>' +
      '</div>';
  }

  /* ---------- Input formatting ---------- */
  function money(v) { var n = parseFloat(String(v).replace(/[^0-9.]/g, '')); return n > 0 ? n.toFixed(2) : ''; }

  function wire(method, svc) {
    var f = body.querySelector('[data-mform]');
    PV.forms && PV.forms.bind(f);
    var amount = f.elements.namedItem('amount');
    var label = body.querySelector('[data-paylabel]');
    var card = method === 'stripe';

    amount.addEventListener('input', function () {
      amount.value = amount.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').replace(/^(\d*\.\d{0,2}).*$/, '$1');
      if (card) { var m = money(amount.value); label.textContent = m ? 'Pay $' + m + ' CAD' : 'Pay now'; }
    });
    amount.addEventListener('blur', function () { var m = money(amount.value); if (m) amount.value = m; });

    if (card) {
      var num = f.elements.namedItem('card'), exp = f.elements.namedItem('expiry'), cvc = f.elements.namedItem('cvc');
      num.addEventListener('input', function () { num.value = num.value.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 '); });
      exp.addEventListener('input', function (e) {
        var d = exp.value.replace(/\D/g, '').slice(0, 4);
        if (d.length === 1 && +d > 1) d = '0' + d;
        exp.value = d.length > 2 ? d.slice(0, 2) + ' / ' + d.slice(2) : (d.length === 2 && e.inputType !== 'deleteContentBackward' ? d + ' / ' : d);
      });
      cvc.addEventListener('input', function () { cvc.value = cvc.value.replace(/\D/g, '').slice(0, 4); });
      body.querySelector('[data-fill]').addEventListener('click', function () {
        num.value = '4242 4242 4242 4242';
        var yy = (new Date().getFullYear() + 3) % 100;
        exp.value = '12 / ' + (yy < 10 ? '0' : '') + yy;
        cvc.value = '123';
        [num, exp, cvc].forEach(function (i) { PV.forms && PV.forms.setError(i, ''); });
        if (!amount.value) amount.focus();
      });
    }

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (PV.forms && !PV.forms.validate(f)) return;
      var amt = money(amount.value);
      var email = f.elements.namedItem('email').value.trim();
      var done = function () {
        body.querySelector('[data-mdone-text]').textContent = 'Your payment for ' + svc.name + ' is complete. A receipt is on its way to ' + email + '.';
        body.querySelector('[data-mdone-svc]').textContent = svc.name;
        body.querySelector('[data-mdone-amt]').textContent = '$' + amt + ' CAD';
        body.querySelector('[data-mdone-method]').textContent = card ? 'Paid by card ending in ' + f.elements.namedItem('card').value.replace(/\D/g, '').slice(-4) : 'Paid with PayPal';
        step('done');
      };
      if (card) {
        var btn = body.querySelector('[data-msubmit]');
        btn.classList.add('is-loading');
        btn.setAttribute('aria-disabled', 'true');
        label.textContent = 'Processing';
        setTimeout(done, 1200);
      } else {
        step('redirect');
        setTimeout(done, 1500);
      }
    });
  }

  function step(name) {
    var cur = body.querySelector('.modal__step:not([hidden])');
    var next = body.querySelector('[data-mstep="' + name + '"]');
    var swap = function () {
      if (cur) cur.hidden = true;
      next.hidden = false;
      if (name === 'done') {
        var s = next.querySelector('[data-msuccess]');
        PV.forms ? PV.forms.reveal(s) : (s.hidden = false);
        s.focus({ preventScroll: true });
      } else if (gsap && !PV.reduced) {
        gsap.fromTo(next, { opacity: 0, y: 16, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.5, ease: 'power2.out', clearProps: 'filter,transform' });
      }
    };
    if (cur && gsap && !PV.reduced) gsap.to(cur, { opacity: 0, y: -10, duration: 0.25, ease: 'power2.in', onComplete: function () { gsap.set(cur, { clearProps: 'all' }); swap(); } });
    else swap();
  }

  /* ---------- Open / close ---------- */
  function open(method, service) {
    var svc = SERVICES[service] || SERVICES.tech;
    body.innerHTML = formView(method, svc);
    wire(method, svc);
    modal.hidden = false;
    modal.classList.add('is-open');
    isOpen = true;
    PV.lockScroll && PV.lockScroll();
    document.querySelector('main').setAttribute('inert', '');
    if (gsap && !PV.reduced) {
      gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' });
      gsap.fromTo(panel, { y: window.innerHeight }, { y: 0, duration: 1.1, ease: 'power4.inOut' });
      gsap.fromTo(body.querySelectorAll('[data-mstep="form"] > *'), { y: 10, opacity: 0, filter: 'blur(5px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.5, stagger: 0.07, delay: 0.6, clearProps: 'filter' });
    } else {
      backdrop.style.opacity = 1;
    }
    setTimeout(function () { var i = body.querySelector('input'); if (i) i.focus({ preventScroll: true }); }, PV.reduced ? 0 : 900);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    var finish = function () {
      modal.classList.remove('is-open');
      modal.hidden = true;
      body.innerHTML = '';
      document.querySelector('main').removeAttribute('inert');
      PV.unlockScroll && PV.unlockScroll();
      if (lastTrigger) lastTrigger.focus({ preventScroll: true });
    };
    if (gsap && !PV.reduced) {
      gsap.to(panel, { y: window.innerHeight, duration: 0.8, ease: 'power4.inOut' });
      gsap.to(backdrop, { opacity: 0, duration: 0.6, delay: 0.2, ease: 'power2.in', onComplete: finish });
    } else finish();
  }

  modal.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) { close(); return; }
    if (e.target.hasAttribute('data-close-outside')) close();
  });
  document.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') {
      var f = Array.prototype.filter.call(panel.querySelectorAll('button, input, a[href], textarea, [tabindex="-1"].success'), function (el) {
        return !el.closest('[hidden]') && !el.disabled && el.offsetParent !== null;
      });
      if (!f.length) return;
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
})();
