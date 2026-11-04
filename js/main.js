/* ==========================================================================
   Parallel Vortex: core motion + navigation
   Smooth scroll (Lenis), preloader, hero + services track, menu overlay,
   scroll reveals, footer. Booking / contact live in their own files.
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.PV_CONFIG || {};
  var docEl = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined';
  var PV = (window.PV = { reduced: reduced, lenis: null });

  // Social links from config
  document.querySelectorAll('[data-social]').forEach(function (a) {
    var url = CFG.social && CFG.social[a.dataset.social];
    if (/^https:\/\//i.test(url || '')) a.href = url;
    else a.hidden = true; // empty in config = no link shown
  });
  if (!(CFG.effects && CFG.effects.vortexOverlay)) docEl.classList.add('no-vortex');

  if (!hasGsap) {
    // Libraries failed to load: show everything statically.
    docEl.classList.remove('js-motion');
    docEl.classList.add('reduced');
    PV.scrollTo = function (t) { var el = typeof t === 'string' ? document.querySelector(t) : t; if (el) el.scrollIntoView({ behavior: 'smooth' }); };
    bindAnchors();
    return;
  }

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  PV.gsap = gsap;

  /* ------------------------------------------------------------------------
     Smooth scroll (Lenis on the GSAP ticker, as the reference does)
     ------------------------------------------------------------------------ */
  if (!reduced && typeof window.Lenis !== 'undefined') {
    var lenis = new window.Lenis({ autoRaf: false });
    PV.lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function lockScroll() {
    document.body.classList.add('preloaderActive');
    if (PV.lenis) PV.lenis.stop();
  }
  function unlockScroll() {
    document.body.classList.remove('preloaderActive');
    if (PV.lenis) PV.lenis.start();
  }
  PV.lockScroll = function () { if (PV.lenis) PV.lenis.stop(); document.body.style.overflow = 'hidden'; };
  PV.unlockScroll = function () { if (PV.lenis) PV.lenis.start(); document.body.style.overflow = ''; };

  /* ------------------------------------------------------------------------
     Anchor scrolling. Every CTA routes through here.
     ------------------------------------------------------------------------ */
  var heroST = null;

  PV.scrollTo = function (target, opts) {
    opts = opts || {};
    var y;
    if (target === '#top' || target === 0) {
      y = 0;
    } else if (target === '#services' && heroST) {
      // Inside the pinned track: land where the first card sits fully in view.
      // Card 0 sits at the track's layout left at progress 0 and moves by
      // (n - 0.8) card widths over the whole pin. Solve for "left edge = 4rem".
      var cards = document.querySelectorAll('.homeHero__categories > .svcCard');
      var w = cards[0].offsetWidth;
      var startLeft = document.querySelector('.homeHero__categories').getBoundingClientRect().left;
      var shift = w * (cards.length - 0.8);
      var p = Math.min(Math.max((startLeft - 40) / shift, 0), 1);
      y = heroST.start + (heroST.end - heroST.start) * p;
    } else {
      var el = typeof target === 'string' ? document.querySelector(target) : target;
      if (!el) return;
      y = el.getBoundingClientRect().top + window.scrollY + (opts.offset || 0);
    }
    if (PV.lenis && !reduced) {
      PV.lenis.scrollTo(y, { duration: opts.immediate ? 0 : 1.4, immediate: !!opts.immediate, force: true });
    } else {
      window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    }
  };

  function bindAnchors() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"], [data-scrollto]');
      if (!a) return;
      var hash = a.getAttribute('data-scrollto') || a.getAttribute('href');
      if (!hash || hash === '#') return;
      e.preventDefault();
      var inMenu = !!a.closest('#mainNavigation');
      if (inMenu && PV.closeMenu) PV.closeMenu({ restoreFocus: false });
      PV.scrollTo(hash);
      // Move focus for keyboard and screen reader users
      var el = hash === '#top' ? document.getElementById('main') : document.querySelector(hash);
      if (el) {
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
        setTimeout(function () { el.focus({ preventScroll: true }); }, inMenu ? 900 : 600);
      }
    });
  }
  bindAnchors();

  /* ------------------------------------------------------------------------
     Preloader: S·implify / E·xplain / B·uild / S·upport, then the wordmark,
     then the frame opens into the hero.
     ------------------------------------------------------------------------ */
  var preloader = document.querySelector('.preloader');
  var frame = document.querySelector('.preloader__imageWrapper');
  var sec1 = document.querySelector('.preloader__section--1');
  var sec2 = document.querySelector('.preloader__section--2');
  var mark = document.querySelector('.preloader__mark');
  var words = ['one', 'two', 'three', 'four'].map(function (k) {
    var w = document.querySelector('[data-word="' + k + '"]');
    return { fl: w.querySelector('.preloader__wordFl'), rl: w.querySelector('.preloader__wordRl') };
  });
  var narrow = false;

  function measure() {
    narrow = false;
    var h1 = sec1.offsetHeight, h2 = sec2.offsetHeight;
    var fw = frame.offsetWidth, w1 = sec1.offsetWidth, w2 = sec2.offsetWidth;
    frame.style.height = h1 + h2 + 'px';
    var hf = fw / 2, hw1 = w1 / 2, hw2 = w2 / 2, diff = hw1 - hw2;
    var longest = Array.prototype.reduce.call(document.querySelectorAll('.preloader__wordRl'), function (m, el) { return Math.max(m, el.offsetWidth); }, 0);
    if (fw + w1 + w2 > window.innerWidth) narrow = true;
    return {
      oneX: diff > 0 ? -(hw1 + hf) : -(hw1 + hf) - diff,
      twoX: diff < 0 ? hw2 + hf : hw2 + hf + diff,
      longest: longest - 50,
      offY: frame.offsetHeight / 2 + 20,
      oneVX: -Math.abs((fw - w1) / 2 + 50),
      twoVX: (fw - w2) / 2 + 50,
    };
  }

  function tlLetters() {
    var m = measure();
    var tl = gsap.timeline();
    tl.set([sec1, sec2], { x: m.longest })
      .set('.preloader__word', { opacity: 1 })
      .from(words[0].fl, { y: 10, filter: 'blur(10px)', opacity: 0, duration: 0.6, ease: 'power4.out' })
      .from([words[1].fl, words[2].fl, words[3].fl], { y: 10, filter: 'blur(10px)', opacity: 0, stagger: 0.2, duration: 0.6, ease: 'power4.out' }, '-=0.2')
      .to([sec1, sec2], { x: 0, duration: 1.3, ease: 'power3.inOut' }, '-=0.3')
      .to(words.map(function (w) { return w.rl; }), { x: 0, duration: 1.3, ease: 'power3.inOut' }, '-=1.5');
    return tl;
  }

  function tlSplit() {
    var m = measure();
    var tl = gsap.timeline();
    if (narrow) {
      tl.to(sec1, { y: -m.offY, x: m.oneVX, duration: 1, ease: 'power3.inOut' })
        .to(sec2, { y: m.offY, x: m.twoVX, duration: 1, ease: 'power3.inOut' }, '<');
    } else {
      tl.to(sec1, { x: m.oneX, duration: 1, ease: 'power3.inOut' })
        .to(sec2, { x: m.twoX, duration: 1, ease: 'power3.inOut' }, '<');
    }
    return tl;
  }

  function tlFrame() {
    var tl = gsap.timeline();
    tl.to(frame, { scale: 1, duration: 1, ease: 'power3.inOut' })
      .to('.preloader__image', { filter: 'brightness(0.42)', duration: 0.8, ease: 'power2.out' }, '-=0.45')
      .fromTo(mark, { opacity: 0, y: 10, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.7, ease: 'power4.out' }, '<0.1')
      .to(frame, { width: 'calc(100vw + 80px)', height: '100vh', duration: 1.5, ease: 'power3.inOut' }, '+=0.55')
      .to([sec1, sec2], { scale: 0.8, opacity: 0, duration: 1, ease: 'power3.inOut' }, '<')
      .to(mark, { opacity: 0, scale: 1.08, filter: 'blur(6px)', duration: 0.9, ease: 'power3.inOut' }, '<');
    return tl;
  }

  function tlReveal() {
    var tl = gsap.timeline();
    // The frame image is already dimmed to the hero's brightness, so the swap is seamless.
    tl.to(preloader, { autoAlpha: 0, duration: 0.1 });
    return tl;
  }

  function tlHeroIn() {
    var tl = gsap.timeline();
    tl.from('.homeHero__detail', { y: 20, opacity: 0, duration: 1, stagger: 0.2, ease: 'power4.out' })
      .from('.homeHero__title', { y: 20, opacity: 0, duration: 1, filter: 'blur(10px)', ease: 'power4.out' }, '-=0.8');
    if (window.matchMedia('(min-width: 768px) and (pointer: fine)').matches) {
      tl.from('.homeHero__categories', { x: '20rem', duration: 1.2, ease: 'power4.out' }, '-=1.2');
    }
    return tl;
  }

  function runPreloader() {
    var once = !CFG.effects || CFG.effects.preloaderOncePerSession !== false;
    var seen = false;
    try { seen = once && sessionStorage.getItem('pvPreloaderShown') === 'true'; } catch (e) {}

    if (reduced || seen || !preloader) {
      if (preloader) preloader.style.display = 'none';
      if (!reduced) tlHeroIn();
      return Promise.resolve();
    }

    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    lockScroll();
    gsap.set(frame, { scale: 0 });

    return new Promise(function (resolve) {
      var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 1800); })]).then(function () {
        setTimeout(function () {
          gsap.timeline({
            onStart: function () { try { sessionStorage.setItem('pvPreloaderShown', 'true'); } catch (e) {} },
            onComplete: function () {
              unlockScroll();
              preloader.style.display = 'none';
              ScrollTrigger.refresh();
              resolve();
            },
          })
            .add(tlLetters())
            .add(tlSplit())
            .add(tlFrame(), '-=1')
            .add(tlReveal())
            .add(tlHeroIn(), '-=0.5');
        }, 150);
      });
    });
  }

  /* ------------------------------------------------------------------------
     Hero + services track
     ------------------------------------------------------------------------ */
  var hero = document.querySelector('.homeHero');
  var heroMain = document.querySelector('.homeHero__main');
  var overlay = document.querySelector('.homeHero__mainOverlay');
  var svcCards = gsap.utils.toArray('.svcCard:not(.svcCard--last)');
  var mm = gsap.matchMedia();

  if (!reduced) {
    mm.add('(min-width: 768px) and (pointer: fine)', function () {
      var items = gsap.utils.toArray('.homeHero__categories > .svcCard');
      var mainFade = gsap.quickTo(heroMain, 'opacity', { duration: 0.3, ease: 'power1.out' });
      var faded = false;

      var track = gsap.timeline({
        scrollTrigger: {
          id: 'homeHero',
          trigger: hero,
          start: 'top top',
          end: function () { return '+=' + hero.offsetWidth * 3; },
          pin: true,
          scrub: 0.5,
          invalidateOnRefresh: true,
          onUpdate: function (self) {
            var f = self.progress > 0.9;
            if (f !== faded) { mainFade(f ? 0 : 1); faded = f; }
          },
        },
      });
      track.to(items, { xPercent: -100 * (items.length - 0.8), ease: 'none', duration: 2 })
        .to(overlay, { backgroundColor: 'rgba(0, 0, 0, 0.6)', ease: 'none', duration: 2 }, '<');
      heroST = track.scrollTrigger;

      svcCards.forEach(function (card, i) {
        var q = gsap.utils.selector(card);
        var text = gsap.timeline({ paused: true });
        text.from(q('.svcCard__title'), { filter: 'blur(10px)', opacity: 0, y: 10, duration: 0.5 })
          .from(q('.svcCard__count'), { opacity: 0, y: 10, duration: 0.5 })
          .from(q('.svcCard__subtitle'), { opacity: 0, y: 10, duration: 0.5 }, '-=0.5')
          .to(q('.svcCard__button'), { opacity: 1, duration: 0.5 });
        var shown = false;

        var t = gsap.timeline({
          scrollTrigger: {
            trigger: card,
            containerAnimation: track,
            start: '10% 90%',
            end: '250% right',
            scrub: 1,
            invalidateOnRefresh: true,
            onUpdate: function (self) {
              var s = self.progress > 0.2;
              if (s !== shown) { s ? text.timeScale(1).play() : text.timeScale(2).reverse(); shown = s; }
            },
          },
        });
        if (i === 0) t.from(card, { filter: 'brightness(0.5)', duration: 0.6, ease: 'power2.out' }, '<');
        t.from(card, { gridTemplateRows: function () { var h = card.offsetHeight / 2; return h + 'px ' + h + 'px'; }, duration: 1 }, '<')
          .from(q('.svcCard__image img'), { scale: 1.3, duration: 2 }, '-=1');
      });

      return function () { heroST = null; gsap.set(heroMain, { clearProps: 'opacity' }); };
    });

    mm.add('(max-width: 767px), (pointer: coarse) and (hover: none), (pointer: coarse)', function () {
      svcCards.forEach(function (card) {
        var q = gsap.utils.selector(card);
        gsap.set(q('.svcCard__image img'), { scale: 1.2 });
        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: card,
            start: '15% 80%',
            toggleActions: 'play none reverse none',
            onEnter: function () { gsap.to(overlay, { backgroundColor: 'rgba(0, 0, 0, 0.3)', duration: 1 }); },
            onLeaveBack: function () { tl.timeScale(2).reverse(); gsap.to(overlay, { backgroundColor: 'rgba(0, 0, 0, 0)', duration: 1 }); },
          },
        });
        tl.from(q('.svcCard__title'), { opacity: 0, y: 10, duration: 0.5 })
          .from(q('.svcCard__count'), { opacity: 0, y: 10, duration: 0.5 })
          .from(q('.svcCard__subtitle'), { opacity: 0, y: 10, duration: 0.5 }, '-=0.5')
          .from(q('.svcCard__thumb'), { opacity: 0, width: 0, duration: 0.8 }, '-=0.2')
          .from(q('.svcCard__image'), { xPercent: 120, duration: 1 }, '-=1.5')
          .to(q('.svcCard__image img'), { scale: 1, duration: 1 }, '-=1');
      });
    });
  }

  // "Scroll to explore"
  var explore = document.querySelector('[data-explore]');
  if (explore) {
    explore.addEventListener('click', function () {
      if (heroST) {
        var w = svcCards[0].offsetWidth;
        var y = window.scrollY + w;
        if (PV.lenis) PV.lenis.scrollTo(y, { duration: 1.4 }); else window.scrollTo({ top: y, behavior: 'smooth' });
      } else {
        PV.scrollTo('#services');
      }
    });
  }

  /* ------------------------------------------------------------------------
     Blob cursor over service images
     ------------------------------------------------------------------------ */
  var blob = document.querySelector('.blob');
  if (blob && window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduced) {
    var bx = gsap.quickTo(blob, 'x', { duration: 0.45, ease: 'power3.out' });
    var by = gsap.quickTo(blob, 'y', { duration: 0.45, ease: 'power3.out' });
    gsap.set(blob, { xPercent: -50, yPercent: -50, x: -200, y: -200, scale: 0, opacity: 0 });
    window.addEventListener('pointermove', function (e) { bx(e.clientX); by(e.clientY); }, { passive: true });
    document.querySelectorAll('[data-blob]').forEach(function (el) {
      el.addEventListener('pointerenter', function () { gsap.to(blob, { scale: 1, opacity: 1, duration: 0.3, ease: 'power3.out' }); });
      el.addEventListener('pointerleave', function () { gsap.to(blob, { scale: 0, opacity: 0, duration: 0.25, ease: 'power3.in' }); });
    });
  }

  /* ------------------------------------------------------------------------
     Header: logo fades after the first scroll
     ------------------------------------------------------------------------ */
  var logo = document.querySelector('.navigationMain__topBarLogo');
  var logoHidden = false;
  function onScrollLogo() {
    var y = window.scrollY;
    if (y > 10 && !logoHidden) { gsap.to(logo, { opacity: 0, duration: 0.2, pointerEvents: 'none' }); logoHidden = true; }
    else if (y <= 10 && logoHidden) { gsap.to(logo, { opacity: 1, duration: 0.2, pointerEvents: 'auto' }); logoHidden = false; }
  }
  window.addEventListener('scroll', onScrollLogo, { passive: true });

  /* ------------------------------------------------------------------------
     Menu overlay
     ------------------------------------------------------------------------ */
  (function menu() {
    var btn = document.querySelector('.buttonMenu');
    var nav = document.getElementById('mainNavigation');
    if (!btn || !nav) return;
    var q = gsap.utils.selector(nav);
    var isOpen = false;

    var mainItems = q('[data-menuitem]');
    var subItems = q('[data-menusub]');
    var heads = q('[data-menuhead]');
    var fades = q('[data-menufade]');
    var line = q('.navigationMain__dropDownLine');

    // Icon morph: lines meet in an X with one broken stroke
    gsap.set('.menuLineThree', { opacity: 0 });
    gsap.set(['.menuLineTwo', '.menuLinesGroup'], { transformOrigin: '50% 50%' });
    var icon = gsap.timeline({ paused: true, defaults: { duration: 0.5, ease: 'power3.inOut' } });
    icon.to('.menuLineTwo', { y: -3.5, rotate: -45 }, 0)
      .to('.menuLinesGroup', { y: 3.5, rotate: 45 }, 0)
      .to('.menuLineOne', { attr: { d: 'M4 11H12' } }, 0)
      .to('.menuLineThree', { opacity: 1, attr: { d: 'M17 11H25' } }, 0);

    gsap.set(nav, { top: '100vh' });
    gsap.set(line, { opacity: 0 });
    gsap.set(subItems, { y: 10, opacity: 0 });
    gsap.set(mainItems, { y: 10, filter: 'blur(5px)', opacity: 0 });
    gsap.set(fades.concat(heads), { opacity: 0 });

    var tl = gsap.timeline({
      paused: true,
      onReverseComplete: function () {
        nav.style.display = 'none';
        nav.setAttribute('inert', '');
        document.body.classList.remove('menu-open');
      },
    });
    tl.fromTo(nav, { top: '100vh' }, { top: '0vh', display: 'grid', duration: reduced ? 0.01 : 1.5, ease: 'power4.inOut' })
      .to(line, { opacity: 0.3, duration: 0.8, ease: 'power2.out' }, '-=0.8')
      .to(heads, { opacity: 1, duration: 0.2, stagger: 0.2 }, '-=0.5')
      .to(mainItems, { y: 0, filter: 'blur(0px)', opacity: 1, duration: 0.5, stagger: 0.1 }, '<')
      .to(subItems, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05 }, '-=1')
      .to(fades, { opacity: 1, duration: 0.5, stagger: 0.1 }, '-=0.8');
    if (reduced) tl.timeScale(20);

    function open() {
      isOpen = true;
      nav.removeAttribute('inert');
      nav.setAttribute('aria-hidden', 'false');
      btn.setAttribute('data-menu', 'open');
      btn.setAttribute('aria-expanded', 'true');
      btn.setAttribute('aria-label', 'Close menu');
      document.body.classList.add('menu-open');
      icon.timeScale(1).play();
      tl.timeScale(reduced ? 20 : 1).play();
      PV.lockScroll();
      setTimeout(function () { var first = nav.querySelector('a'); if (first) first.focus({ preventScroll: true }); }, 100);
    }
    function close(opts) {
      if (!isOpen) return;
      isOpen = false;
      nav.setAttribute('aria-hidden', 'true');
      btn.setAttribute('data-menu', 'closed');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Open menu');
      icon.timeScale(1.5).reverse();
      tl.timeScale(reduced ? 20 : 1.5).reverse();
      PV.unlockScroll();
      if (!opts || opts.restoreFocus !== false) btn.focus({ preventScroll: true });
    }
    PV.closeMenu = close;

    btn.addEventListener('click', function () { isOpen ? close() : open(); });
    document.addEventListener('keydown', function (e) {
      if (!isOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') {
        var f = [btn].concat(Array.prototype.slice.call(nav.querySelectorAll('a[href], button')));
        var idx = f.indexOf(document.activeElement);
        if (e.shiftKey && (idx <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && idx === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });

    // Hovering one link softly blurs its siblings
    if (window.matchMedia('(hover: hover)').matches) {
      [mainItems, subItems].forEach(function (group) {
        group.forEach(function (item) {
          item.addEventListener('mouseenter', function () { group.forEach(function (o) { if (o !== item) o.dataset.blurred = 'true'; }); });
          item.addEventListener('mouseleave', function () { group.forEach(function (o) { delete o.dataset.blurred; }); });
        });
      });
    }
  })();

  /* ------------------------------------------------------------------------
     Scroll reveals
     ------------------------------------------------------------------------ */
  if (!reduced) {
    // About statement block (exact reference timing)
    var intro = document.querySelector('.blockIntro');
    if (intro) {
      var iq = gsap.utils.selector(intro);
      gsap.set(iq('.blockIntro__title'), { y: 50, opacity: 0, filter: 'blur(10px)' });
      gsap.set(iq('.blockIntro__tagline, .blockIntro__text, .blockIntro__button'), { opacity: 0 });
      gsap.timeline({ scrollTrigger: { trigger: intro, start: 'top 75%' } })
        .to(iq('.blockIntro__title'), { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1, ease: 'power2.out' })
        .to(iq('.blockIntro__tagline, .blockIntro__text, .blockIntro__button'), { opacity: 1, duration: 1, ease: 'power2.out' }, '-=0.5');
    }

    gsap.utils.toArray('[data-reveal=""], [data-reveal]:not([data-reveal="step"]):not([data-reveal="card"])').forEach(function (el) {
      gsap.fromTo(el, { y: 30, opacity: 0, filter: 'blur(10px)' }, {
        y: 0, opacity: 1, filter: 'blur(0px)', duration: 1, ease: 'power2.out', clearProps: 'filter',
        scrollTrigger: { trigger: el, start: 'top 85%' },
      });
    });

    ['step', 'card'].forEach(function (kind) {
      var els = document.querySelectorAll('[data-reveal="' + kind + '"]');
      if (!els.length) return;
      gsap.set(els, { y: 40, opacity: 0, filter: 'blur(10px)' });
      ScrollTrigger.batch(els, {
        start: 'top 88%',
        once: true,
        onEnter: function (batch) {
          gsap.to(batch, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1, stagger: 0.15, ease: 'power2.out', clearProps: 'filter' });
        },
      });
    });

    document.querySelectorAll('[data-imageanimate]').forEach(function (el) {
      ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: function () { el.setAttribute('data-imageanimate', 'true'); } });
    });

    // Footer image parallax
    var footer = document.querySelector('.navigationFooter');
    gsap.to('.navigationFooter__mainImage', {
      yPercent: -20, ease: 'none',
      scrollTrigger: { trigger: footer, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  } else {
    document.querySelectorAll('[data-imageanimate]').forEach(function (el) { el.setAttribute('data-imageanimate', 'true'); });
  }

  /* ------------------------------------------------------------------------
     Footer "Explore +" expanding list (desktop)
     ------------------------------------------------------------------------ */
  (function footerMenu() {
    var toggle = document.querySelector('.navigationFooter__toggle');
    if (!toggle) return;
    var icon = toggle.querySelector('.icon');
    var items = gsap.utils.toArray('[data-footeritem]');
    var links = items.map(function (li) { return li.querySelector('a'); });
    var tl = null;
    var openState = false;

    function setup() {
      if (tl) { tl.kill(); tl = null; }
      gsap.set(items, { clearProps: 'all' });
      gsap.set(icon, { clearProps: 'rotate' });
      openState = false;
      toggle.setAttribute('aria-expanded', 'false');
      links.forEach(function (a) { a.removeAttribute('tabindex'); });
      if (window.innerWidth < 768) return;
      gsap.set(items, { width: 0, opacity: 0, marginLeft: -20, marginRight: 0 });
      links.forEach(function (a) { a.setAttribute('tabindex', '-1'); });
      tl = gsap.timeline({ paused: true });
      tl.to(items, { marginLeft: 0, duration: 0.3 }).to(items, { width: 'auto', marginRight: 20, opacity: 1, stagger: 0.1, duration: 0.3 }, '-=0.3');
    }
    setup();
    var rT;
    window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(setup, 200); });

    toggle.addEventListener('mouseenter', function () { if (!openState && tl) gsap.to(icon, { rotate: 90, duration: 0.3, ease: 'power1.inOut' }); });
    toggle.addEventListener('mouseleave', function () { if (!openState && tl) gsap.to(icon, { rotate: 0, duration: 0.3, ease: 'power1.inOut' }); });
    toggle.addEventListener('click', function () {
      if (!tl) return;
      openState = !openState;
      toggle.setAttribute('aria-expanded', String(openState));
      if (openState) {
        gsap.to(icon, { rotate: 135, duration: 0.2, ease: 'power1.inOut' });
        tl.timeScale(1).play();
        links.forEach(function (a) { a.removeAttribute('tabindex'); });
      } else {
        gsap.to(icon, { rotate: 0, duration: 0.2, ease: 'power1.inOut' });
        tl.timeScale(1.5).reverse();
        links.forEach(function (a) { a.setAttribute('tabindex', '-1'); });
      }
    });
  })();

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */
  runPreloader();
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
