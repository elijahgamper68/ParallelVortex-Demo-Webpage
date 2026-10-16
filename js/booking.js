/* ==========================================================================
   Booking widget: calendar > time slot > details > confirmation
   Set PV_CONFIG.booking.mode = 'calendly' (plus calendlyUrl) to swap in a
   Calendly inline embed instead. Nothing else needs to change.
   ========================================================================== */
(function () {
  'use strict';
  var root = document.getElementById('booker');
  if (!root) return;

  var PV = window.PV || {};
  var CFG = window.PV_CONFIG || {};
  var BOOK = CFG.booking || {};
  var TZ = CFG.timezone || 'America/Toronto';
  var SL = Object.assign({ start: '09:00', end: '17:00', stepMin: 30, weeksAhead: 6, minNoticeMin: 120 }, CFG.slots || {});

  /* ---------- Calendly mode ---------- */
  if (BOOK.mode === 'calendly' && BOOK.calendlyUrl) {
    var url = BOOK.calendlyUrl + (BOOK.calendlyUrl.indexOf('?') > -1 ? '&' : '?') + 'hide_gdpr_banner=1';
    root.innerHTML = '<div class="calendly-inline-widget booker__calendly" data-url="' + url.replace(/"/g, '&quot;') + '"></div>';
    var s = document.createElement('script');
    s.src = 'https://assets.calendly.com/assets/external/widget.js';
    s.async = true;
    document.body.appendChild(s);
    return;
  }

  /* ---------- Date helpers (all in Eastern Time) ---------- */
  var ARROW = '<svg class="icon icon--a1"><use href="#i-arrow"/></svg><svg class="icon icon--a2"><use href="#i-arrow"/></svg>';
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var keyOf = function (y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); };
  var parseKey = function (k) { var p = k.split('-'); return { y: +p[0], m: +p[1] - 1, d: +p[2] }; };
  var utc = function (y, m, d) { return new Date(Date.UTC(y, m, d, 12)); };
  var addDays = function (k, n) { var p = parseKey(k); var dt = utc(p.y, p.m, p.d + n); return keyOf(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()); };
  var dow = function (k) { var p = parseKey(k); return utc(p.y, p.m, p.d).getUTCDay(); };
  var toMin = function (hm) { var p = hm.split(':'); return +p[0] * 60 + +p[1]; };

  function nowET() {
    var parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    return { key: o.year + '-' + o.month + '-' + o.day, min: (+o.hour % 24) * 60 + +o.minute };
  }

  var fmtLong = new Intl.DateTimeFormat('en-CA', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
  var fmtFull = new Intl.DateTimeFormat('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  var fmtMonth = new Intl.DateTimeFormat('en-CA', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  function longDate(k, withYear) { var p = parseKey(k); return (withYear ? fmtFull : fmtLong).format(utc(p.y, p.m, p.d)); }
  function fmtTime(min) {
    var h = Math.floor(min / 60), m = min % 60, ap = h >= 12 ? 'PM' : 'AM';
    return ((h % 12) || 12) + ':' + pad(m) + ' ' + ap;
  }

  // Demo realism: a steady set of already-taken slots per day
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  var booked = {};
  try { booked = JSON.parse(sessionStorage.getItem('pvBooked') || '{}'); } catch (e) {}

  var now = nowET();
  var todayKey = now.key;
  var maxKey = addDays(todayKey, SL.weeksAhead * 7);

  function slotsFor(k) {
    var d = dow(k);
    if (d === 0 || d === 6 || k < todayKey || k > maxKey) return [];
    var out = [];
    for (var t = toMin(SL.start); t + SL.stepMin <= toMin(SL.end); t += SL.stepMin) {
      if (k === todayKey && t < now.min + SL.minNoticeMin) continue;
      if (hash(k + ':' + t) % 100 < 24) continue;
      if (booked[k + ':' + t]) continue;
      out.push(t);
    }
    return out;
  }
  var isAvail = function (k) { return slotsFor(k).length > 0; };

  function firstAvailFrom(k, dir, limit) {
    var cur = k;
    for (var i = 0; i < (limit || 70); i++) {
      if (cur < todayKey || cur > maxKey) return null;
      if (isAvail(cur)) return cur;
      cur = addDays(cur, dir);
    }
    return null;
  }

  /* ---------- State ---------- */
  var tp = parseKey(todayKey);
  var state = { y: tp.y, m: tp.m, date: null, time: null, focusKey: null, step: 1 };
  var first = firstAvailFrom(todayKey, 1);
  if (first) { var fp = parseKey(first); state.y = fp.y; state.m = fp.m; }

  /* ---------- Markup ---------- */
  root.innerHTML =
    '<ol class="booker__progress font-XS" aria-label="Booking steps">' +
      '<li data-p="1" aria-current="step"><span>01</span>Date &amp; time</li>' +
      '<li data-p="2"><span>02</span>Your details</li>' +
      '<li data-p="3"><span>03</span>Confirmed</li>' +
    '</ol>' +
    '<p class="sr-only" aria-live="polite" data-live></p>' +

    '<div class="booker__step" data-step="1">' +
      '<div class="booker__pick">' +
        '<div class="cal">' +
          '<div class="cal__head">' +
            '<h3 class="font-XM" id="cal-month" data-month aria-live="polite"></h3>' +
            '<div class="cal__nav">' +
              '<button type="button" class="buttonCircle buttonCircle--sm" data-prev aria-label="Previous month"><svg class="icon" style="transform:rotate(180deg)"><use href="#i-arrow"/></svg><span class="buttonCircle__background"></span></button>' +
              '<button type="button" class="buttonCircle buttonCircle--sm" data-next aria-label="Next month"><svg class="icon"><use href="#i-arrow"/></svg><span class="buttonCircle__background"></span></button>' +
            '</div>' +
          '</div>' +
          '<div class="cal__grid" role="grid" aria-labelledby="cal-month" data-grid-days></div>' +
          '<p class="cal__tz font-XS">Weekdays only · All times in Eastern Time (Ottawa)</p>' +
        '</div>' +
        '<div class="slots">' +
          '<h3 class="slots__head font-S--semibold" data-slots-head tabindex="-1">Choose a date</h3>' +
          '<div data-slots><p class="slots__empty font-S">Pick a day on the calendar to see open times. Each call is 30 minutes.</p></div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="booker__step" data-step="2" hidden>' +
      '<div class="booker__recap">' +
        '<div><p class="font-XS" style="color:var(--coal)">Your free consultation</p><p class="font-XM" data-recap-date></p><p class="font-S" data-recap-time></p></div>' +
        '<button type="button" class="buttonLine" data-back><span class="buttonLine__label">Change time</span><span class="buttonLine__line"><span></span><span></span></span></button>' +
      '</div>' +
      '<form class="booker__form" novalidate data-form>' +
        '<div class="field-row" style="grid-template-columns:repeat(auto-fit,minmax(20rem,1fr))">' +
          '<div class="field"><label class="field__label font-XS" for="b-name">Name</label><input class="field__input" id="b-name" name="name" type="text" autocomplete="name" required><span class="field__error"></span></div>' +
          '<div class="field"><label class="field__label font-XS" for="b-email">Email</label><input class="field__input" id="b-email" name="email" type="email" autocomplete="email" required><span class="field__error"></span></div>' +
        '</div>' +
        '<div class="field"><label class="field__label font-XS" for="b-needs">What do you need help with?</label><textarea class="field__input" id="b-needs" name="needs" rows="3" required></textarea><span class="field__error"></span></div>' +
        '<div class="booker__actions">' +
          '<button type="button" class="buttonArrow buttonArrow--back" data-color="slate" data-back><span class="button__title">Back</span><span class="button__arrow" aria-hidden="true">' + ARROW + '</span></button>' +
          '<button type="submit" class="buttonArrow" data-color="dark" data-submit><span class="button__title">Confirm booking</span><span class="button__arrow" aria-hidden="true">' + ARROW + '</span></button>' +
        '</div>' +
      '</form>' +
    '</div>' +

    '<div class="booker__step" data-step="3" hidden>' +
      '<div class="success" data-success tabindex="-1">' +
        '<span class="success__icon"><svg viewBox="0 0 18 18" aria-hidden="true"><path d="m3.5 9.4 3.6 3.6 7.4-8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
        '<h3 class="font-L">You\'re booked.</h3>' +
        '<p class="success__text font-XM">Your free 30-minute consultation is confirmed. A Google Meet link will be sent to your email.</p>' +
        '<div class="success__recap font-S"><strong class="font-S--semibold" data-done-date></strong><span data-done-time></span><span data-done-email style="color:var(--coal)"></span></div>' +
        '<button type="button" class="buttonArrow" data-color="slate" data-restart><span class="button__title">Book another time</span><span class="button__arrow" aria-hidden="true">' + ARROW + '</span></button>' +
      '</div>' +
    '</div>';

  var $ = function (sel) { return root.querySelector(sel); };
  var grid = $('[data-grid-days]');
  var monthEl = $('[data-month]');
  var prevBtn = $('[data-prev]');
  var nextBtn = $('[data-next]');
  var slotsWrap = $('[data-slots]');
  var slotsHead = $('[data-slots-head]');
  var live = $('[data-live]');
  var form = $('[data-form]');
  PV.forms && PV.forms.bind(form);

  function announce(t) { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 30); }

  /* ---------- Calendar ---------- */
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DOW_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function renderCalendar(focusAfter) {
    var y = state.y, m = state.m;
    monthEl.textContent = fmtMonth.format(utc(y, m, 1));
    var lead = utc(y, m, 1).getUTCDay();
    var days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

    var html = '<div role="row" style="display:contents">';
    DOW.forEach(function (d, i) { html += '<span role="columnheader" class="cal__dow font-XS" aria-label="' + DOW_FULL[i] + '">' + d + '</span>'; });
    html += '</div><div role="row" style="display:contents">';
    for (var i = 0; i < lead; i++) html += '<span role="gridcell" aria-hidden="true"></span>';

    var avail = [];
    for (var d = 1; d <= days; d++) {
      var k = keyOf(y, m, d);
      var ok = isAvail(k);
      if (ok) avail.push(k);
      if ((lead + d - 1) % 7 === 0 && d !== 1) html += '</div><div role="row" style="display:contents">';
      var label = longDate(k) + (ok ? ', available' : ', unavailable');
      html += '<button type="button" role="gridcell" class="cal__day" data-key="' + k + '" data-available="' + ok + '"' +
        (k === todayKey ? ' data-today="true"' : '') +
        ' aria-selected="' + (state.date === k) + '"' + (ok ? '' : ' aria-disabled="true" disabled') +
        ' tabindex="-1" aria-label="' + label + '">' + d + '</button>';
    }
    html += '</div>';
    grid.innerHTML = html;

    // Roving tabindex: selected > previously focused > first available
    var target = (state.date && avail.indexOf(state.date) > -1 && state.date) ||
      (state.focusKey && avail.indexOf(state.focusKey) > -1 && state.focusKey) || avail[0];
    if (target) {
      var btn = grid.querySelector('[data-key="' + target + '"]');
      btn.tabIndex = 0;
      if (focusAfter) btn.focus();
    }

    var firstOfMonth = keyOf(y, m, 1), lastOfMonth = keyOf(y, m, days);
    prevBtn.disabled = firstOfMonth <= todayKey.slice(0, 8) + '01';
    nextBtn.disabled = lastOfMonth >= maxKey;
  }

  function goMonth(delta, focusKey) {
    var dt = utc(state.y, state.m + delta, 1);
    state.y = dt.getUTCFullYear(); state.m = dt.getUTCMonth();
    state.focusKey = focusKey || null;
    renderCalendar(!!focusKey);
    if (PV.gsap && !PV.reduced) PV.gsap.fromTo(grid, { opacity: 0, x: delta * 12 }, { opacity: 1, x: 0, duration: 0.45, ease: 'power2.out' });
  }

  prevBtn.addEventListener('click', function () { goMonth(-1); });
  nextBtn.addEventListener('click', function () { goMonth(1); });

  grid.addEventListener('click', function (e) {
    var b = e.target.closest('.cal__day');
    if (!b || b.disabled) return;
    selectDate(b.dataset.key);
  });

  grid.addEventListener('keydown', function (e) {
    var b = e.target.closest('.cal__day');
    if (!b) return;
    var k = b.dataset.key, next = null;
    switch (e.key) {
      case 'ArrowRight': next = firstAvailFrom(addDays(k, 1), 1); break;
      case 'ArrowLeft': next = firstAvailFrom(addDays(k, -1), -1); break;
      case 'ArrowDown': next = firstAvailFrom(addDays(k, 7), 1); break;
      case 'ArrowUp': next = firstAvailFrom(addDays(k, -7), -1); break;
      case 'Home': { var p = parseKey(k); next = firstAvailFrom(keyOf(p.y, p.m, 1), 1); break; }
      case 'End': { var q = parseKey(k); next = firstAvailFrom(keyOf(q.y, q.m, new Date(Date.UTC(q.y, q.m + 1, 0)).getUTCDate()), -1); break; }
      case 'PageDown': goMonth(1); e.preventDefault(); return;
      case 'PageUp': goMonth(-1); e.preventDefault(); return;
      default: return;
    }
    e.preventDefault();
    if (!next) return;
    var np = parseKey(next);
    if (np.y !== state.y || np.m !== state.m) {
      goMonth((np.y - state.y) * 12 + (np.m - state.m), next);
    } else {
      grid.querySelectorAll('.cal__day').forEach(function (x) { x.tabIndex = -1; });
      var nb = grid.querySelector('[data-key="' + next + '"]');
      nb.tabIndex = 0; nb.focus();
      state.focusKey = next;
    }
  });

  /* ---------- Slots ---------- */
  function selectDate(k) {
    state.date = k;
    state.focusKey = k;
    renderCalendar(false);
    var sel = grid.querySelector('[data-key="' + k + '"]');
    if (sel) sel.focus({ preventScroll: true });

    var list = slotsFor(k);
    slotsHead.textContent = longDate(k);
    var html = '<div class="slots__list" role="list">';
    list.forEach(function (t) {
      html += '<div role="listitem"><button type="button" class="slot" data-time="' + t + '" aria-label="' + fmtTime(t) + ' Eastern, ' + longDate(k) + '">' + fmtTime(t) + '</button></div>';
    });
    html += '</div>';
    slotsWrap.innerHTML = html;
    announce(list.length + ' open times on ' + longDate(k) + '. Times are in Eastern Time.');

    if (PV.gsap && !PV.reduced) {
      PV.gsap.fromTo(slotsWrap.querySelectorAll('.slot'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.025, ease: 'power2.out' });
    }
    // On stacked layouts, bring the times into view
    if (window.innerWidth < 768) {
      var top = slotsHead.getBoundingClientRect().top + window.scrollY - 90;
      if (PV.lenis) PV.lenis.scrollTo(top, { duration: 0.9 }); else window.scrollTo({ top: top, behavior: 'smooth' });
    }
  }

  slotsWrap.addEventListener('click', function (e) {
    var b = e.target.closest('.slot');
    if (!b) return;
    state.time = +b.dataset.time;
    goStep(2);
  });

  /* ---------- Steps ---------- */
  function setProgress(n) {
    root.querySelectorAll('.booker__progress li').forEach(function (li) {
      var p = +li.dataset.p;
      li.classList.toggle('is-done', p < n);
      if (p === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
  }

  function goStep(n) {
    var from = root.querySelector('[data-step="' + state.step + '"]');
    var to = root.querySelector('[data-step="' + n + '"]');
    state.step = n;
    setProgress(n);

    if (n === 2) {
      $('[data-recap-date]').textContent = longDate(state.date);
      $('[data-recap-time]').textContent = fmtTime(state.time) + ' to ' + fmtTime(state.time + 30) + ' Eastern · Google Meet';
    }

    var show = function () {
      from.hidden = true;
      to.hidden = false;
      if (PV.gsap && !PV.reduced) {
        PV.gsap.fromTo(to, { opacity: 0, y: 20, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.6, ease: 'power2.out', clearProps: 'filter,transform' });
      }
      if (n === 2) { setTimeout(function () { $('#b-name').focus({ preventScroll: true }); }, 50); announce('Step 2 of 3. Your details for ' + longDate(state.date) + ' at ' + fmtTime(state.time) + '.'); }
      if (n === 1) { var s = grid.querySelector('[data-key="' + state.date + '"]') || grid.querySelector('[tabindex="0"]'); if (s) s.focus({ preventScroll: true }); announce('Step 1 of 3. Choose a date and time.'); }
      if (n === 3) { var ok = $('[data-success]'); PV.forms ? PV.forms.reveal(ok) : (ok.hidden = false); ok.focus({ preventScroll: true }); }
      // Keep the widget in view
      var r = root.getBoundingClientRect();
      if (r.top < 0 || r.top > window.innerHeight * 0.6) {
        var y = r.top + window.scrollY - 40;
        if (PV.lenis) PV.lenis.scrollTo(y, { duration: 0.9 }); else window.scrollTo({ top: y, behavior: 'smooth' });
      }
    };

    if (PV.gsap && !PV.reduced) PV.gsap.to(from, { opacity: 0, y: -10, duration: 0.25, ease: 'power2.in', onComplete: function () { PV.gsap.set(from, { clearProps: 'all' }); show(); } });
    else show();
  }

  root.querySelectorAll('[data-back]').forEach(function (b) { b.addEventListener('click', function () { goStep(1); }); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (PV.forms && !PV.forms.validate(form)) return;
    var submit = $('[data-submit]');
    submit.classList.add('is-loading');
    submit.setAttribute('aria-disabled', 'true');
    var val = function (n) { return form.elements.namedItem(n).value.trim(); };
    var data = { name: val('name'), email: val('email'), needs: val('needs'), date: state.date, time: fmtTime(state.time), timezone: TZ };

    setTimeout(function () {
      submit.classList.remove('is-loading');
      submit.removeAttribute('aria-disabled');
      booked[state.date + ':' + state.time] = true;
      try { sessionStorage.setItem('pvBooked', JSON.stringify(booked)); } catch (err) {}
      $('[data-done-date]').textContent = longDate(state.date, true);
      $('[data-done-time]').textContent = fmtTime(state.time) + ' Eastern · 30 minutes · Google Meet';
      $('[data-done-email]').textContent = 'Details on their way to ' + data.email;
      root.dispatchEvent(new CustomEvent('pv:booked', { detail: data, bubbles: true }));
      goStep(3);
    }, 900);
  });

  $('[data-restart]').addEventListener('click', function () {
    PV.forms && PV.forms.reset(form);
    state.date = null; state.time = null;
    slotsHead.textContent = 'Choose a date';
    slotsWrap.innerHTML = '<p class="slots__empty font-S">Pick a day on the calendar to see open times. Each call is 30 minutes.</p>';
    renderCalendar(false);
    goStep(1);
  });

  renderCalendar(false);
})();
