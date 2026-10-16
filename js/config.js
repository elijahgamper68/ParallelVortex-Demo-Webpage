/* ==========================================================================
   Parallel Vortex site settings
   Everything runs in demo mode with nothing filled in.
   To go live, fill in the values below. No other file needs to change.
   ========================================================================== */
window.PV_CONFIG = {
  booking: {
    // 'demo'     = built-in calendar, time slots, form and confirmation
    // 'calendly' = swaps the widget for a Calendly inline embed
    mode: 'demo',
    calendlyUrl: '', // e.g. https://calendly.com/parallel-vortex/30min
  },

  // Leave a link empty to use the demo checkout for that button.
  // Paste a Stripe Payment Link / PayPal link to send visitors there instead.
  payments: {
    stripe: { tech: '', website: '', support: '' },
    paypal: { tech: '', website: '', support: '' },
  },

  contact: {
    // Empty = demo success message. Otherwise the form POSTs JSON here
    // (works with Formspree, Getform, Basin, or your own endpoint).
    endpoint: '',
  },

  social: {
    linkedin: 'https://www.linkedin.com/',
    instagram: 'https://www.instagram.com/',
    facebook: 'https://www.facebook.com/',
  },

  // Booking availability (demo mode)
  timezone: 'America/Toronto',
  slots: { start: '09:00', end: '17:00', stepMin: 30, weeksAhead: 6, minNoticeMin: 120 },

  effects: {
    vortexOverlay: true, // very subtle slow swirl over the hero
    preloaderOncePerSession: true,
  },
};
