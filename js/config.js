/* ==========================================================================
   Parallel Vortex site settings
   This is the only file that needs editing to go live. See LAUNCH.md.

   Any service filled in below is used straight away, in either mode.
   mode: 'demo' fills the gaps with built-in demo screens (no accounts needed).
         'live' never shows demo screens: anything still empty falls back
         gracefully (e.g. no booking link shows "Request a time").
   After editing, run:  node tools/go-live.js   to check everything is ready.
   ========================================================================== */
window.PV_CONFIG = {
  mode: 'demo',

  // The public address of the site, e.g. 'https://parallelvortex.ca'
  siteUrl: '',

  booking: {
    // Use ONE of these. Calendly wins if both are filled.
    // Calendly: the event link, e.g. 'https://calendly.com/parallel-vortex/30min'
    calendlyUrl: 'https://calendly.com/vortextemp67/30min',
    // Google Calendar appointment schedule booking page link,
    // e.g. 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ...'
    googleScheduleUrl: '',
  },

  contact: {
    // Pick one way to receive contact-form messages:
    // 1. Hosting on Netlify? Set netlify: true. Messages appear in the Netlify
    //    dashboard and can be emailed to you (Site > Forms > Notifications).
    netlify: false,
    // 2. Any form service that accepts JSON, e.g. Formspree:
    //    'https://formspree.io/f/abcdwxyz'
    endpoint: '',
    // 3. FormSubmit (no account): just the email address that should receive
    //    messages. The first message triggers a one-time confirmation email.
    formsubmitEmail: '',
  },

  // Real profile links. Leave one as '' to hide that link everywhere.
  social: {
    linkedin: 'https://www.linkedin.com/',
    instagram: 'https://www.instagram.com/',
    facebook: 'https://www.facebook.com/',
  },

  // Demo booking availability
  timezone: 'America/Toronto',
  slots: { start: '09:00', end: '17:00', stepMin: 30, weeksAhead: 6, minNoticeMin: 120 },

  effects: {
    vortexOverlay: true, // very subtle slow swirl over the hero
    preloaderOncePerSession: true,
  },
};
