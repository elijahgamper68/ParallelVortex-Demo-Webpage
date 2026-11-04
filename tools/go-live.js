#!/usr/bin/env node
/* ==========================================================================
   Launch checker + SEO writer
   Usage:  node tools/go-live.js           check config and write SEO files
           node tools/go-live.js --check   check only, change nothing
   Reads js/config.js, reports what is ready and what is missing, and (when
   siteUrl is set) writes the canonical/share tags, structured data,
   sitemap.xml, robots.txt and the 404 page's base path.
   Exit code 1 means something required for launch is still missing.
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const CHECK_ONLY = process.argv.includes('--check');
const file = (p) => path.join(ROOT, p);
const read = (p) => fs.readFileSync(file(p), 'utf8');

// Load the browser config in a sandbox
const sandbox = { window: {} };
vm.runInNewContext(read('js/config.js'), sandbox, { filename: 'config.js' });
const C = sandbox.window.PV_CONFIG || {};

const https = (u) => /^https:\/\/[^\s"'<>]+$/i.test(u || '');
const results = [];
const ok = (label, detail) => results.push({ s: 'ok', label, detail });
const miss = (label, detail) => results.push({ s: 'missing', label, detail });
const warn = (label, detail) => results.push({ s: 'warn', label, detail });

// --- Mode
if (C.mode === 'live') ok('Mode', 'live');
else miss('Mode', `is '${C.mode}'. Set mode: 'live' in js/config.js when everything below is filled in`);

// --- Site URL
let site = null;
if (https(C.siteUrl)) { site = new URL(C.siteUrl); ok('Site URL', site.href); }
else miss('Site URL', "siteUrl is empty or not https. Needed for search engines and link previews");

// --- Booking
const b = C.booking || {};
if (https(b.calendlyUrl)) {
  if (/^https:\/\/calendly\.com\/[^/]+\/[^/?#]+/i.test(b.calendlyUrl)) ok('Booking', 'Calendly: ' + b.calendlyUrl);
  else warn('Booking', 'calendlyUrl should look like https://calendly.com/name/30min');
} else if (https(b.googleScheduleUrl)) {
  if (/calendar\.google\.com\/calendar\/appointments\/schedules\//i.test(b.googleScheduleUrl) || /calendar\.app\.google\//i.test(b.googleScheduleUrl)) ok('Booking', 'Google appointment schedule');
  else warn('Booking', 'googleScheduleUrl should be a calendar.google.com/calendar/appointments/schedules/... link');
} else miss('Booking', 'no calendlyUrl or googleScheduleUrl. Live visitors will be asked to send a message instead');

// --- Contact
const c = C.contact || {};
if (c.netlify) ok('Contact form', 'Netlify Forms (turn on email notifications in the Netlify dashboard)');
else if (https(c.endpoint)) ok('Contact form', 'endpoint ' + c.endpoint);
else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.formsubmitEmail || '')) ok('Contact form', 'FormSubmit to ' + c.formsubmitEmail + ' (confirm the activation email after the first test message)');
else miss('Contact form', 'no backend set. Messages would not be delivered');

// --- Social
const generic = /^https:\/\/(www\.)?(linkedin|instagram|facebook)\.com\/?$/i;
const social = C.social || {};
for (const k of ['linkedin', 'instagram', 'facebook']) {
  if (https(social[k]) && !generic.test(social[k])) ok('Social: ' + k, social[k]);
  else if (!social[k]) ok('Social: ' + k, 'empty, so the link is hidden');
  else warn('Social: ' + k, 'still points to the platform home page. Add the real profile link or remove the link');
}

// --- Write SEO files
const written = [];
if (site && !CHECK_ONLY) {
  const base = site.href.replace(/\/?$/, '/');
  const abs = (p) => new URL(p, base).href;
  const sameAs = ['linkedin', 'instagram', 'facebook'].map((k) => social[k]).filter((u) => https(u) && !generic.test(u));

  let html = read('index.html');
  const seo = [
    '  <!-- pv:seo (written by tools/go-live.js) -->',
    `  <link rel="canonical" href="${base}">`,
    `  <meta property="og:url" content="${base}">`,
    `  <meta property="og:image" content="${abs('assets/img/og.jpg')}">`,
    '  <meta property="og:image:width" content="1200">',
    '  <meta property="og:image:height" content="630">',
    `  <meta name="twitter:image" content="${abs('assets/img/og.jpg')}">`,
    '  <!-- /pv:seo -->',
  ].join('\n');
  html = html.replace(/  <!-- pv:seo[\s\S]*?<!-- \/pv:seo -->/, seo);

  html = html.replace(/(<script type="application\/ld\+json" id="pv-schema">)([\s\S]*?)(<\/script>)/, (m, a, json, z) => {
    const data = JSON.parse(json);
    data.url = base;
    data.image = abs('assets/img/og.jpg');
    if (sameAs.length) data.sameAs = sameAs; else delete data.sameAs;
    return a + '\n  ' + JSON.stringify(data) + '\n  ' + z;
  });
  fs.writeFileSync(file('index.html'), html);
  written.push('index.html (canonical, share tags, structured data)');

  let priv = read('privacy.html');
  priv = priv.replace(/\s*<link rel="canonical"[^>]*>/, '').replace('</title>', `</title>\n  <link rel="canonical" href="${abs('privacy.html')}">`);
  fs.writeFileSync(file('privacy.html'), priv);
  written.push('privacy.html (canonical)');

  let nf = read('404.html');
  nf = nf.replace(/<!-- pv:base[\s\S]*?<!-- \/pv:base -->/, `<!-- pv:base (written by tools/go-live.js) --><base href="${site.pathname.replace(/\/?$/, '/')}"><!-- /pv:base -->`);
  fs.writeFileSync(file('404.html'), nf);
  written.push('404.html (base path)');

  const today = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(file('sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `  <url><loc>${base}</loc><lastmod>${today}</lastmod><priority>1.0</priority></url>\n` +
    `  <url><loc>${abs('privacy.html')}</loc><lastmod>${today}</lastmod><priority>0.3</priority></url>\n` +
    '</urlset>\n');
  written.push('sitemap.xml');
  fs.writeFileSync(file('robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${abs('sitemap.xml')}\n`);
  written.push('robots.txt');
}

// --- Report
const icon = { ok: '  OK   ', missing: '  TODO ', warn: '  NOTE ' };
console.log('\nParallel Vortex launch check\n');
for (const r of results) console.log(icon[r.s] + r.label.padEnd(26) + r.detail);
if (written.length) console.log('\nUpdated:\n' + written.map((w) => '  - ' + w).join('\n'));
const missing = results.filter((r) => r.s === 'missing').length;
console.log(missing ? `\n${missing} item(s) still needed before launch.\n` : '\nReady to launch.\n');
process.exit(missing ? 1 : 0);
