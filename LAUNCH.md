# Launching the Parallel Vortex site

The site is built and every connection is wired up. Going live just means creating
a few free accounts, pasting the links into **`js/config.js`**, and switching
`mode` to `'live'`. No other file needs editing.

Check progress at any time:

```
node tools/go-live.js --check
```

It lists what's ready and what's still missing. Run it without `--check` once
`siteUrl` is set, and it also writes the search and link-preview tags
(canonical URL, share image, structured data, `sitemap.xml`, `robots.txt`).

---

## 1. Hosting (pick one)

**Netlify (recommended).** Free, and the contact form works with no extra service.
1. Create a free account at netlify.com and choose *Add new site → Import an existing project → GitHub*.
2. Pick the `ParallelVortex-Demo-Webpage` repo. Leave the build command empty and set the publish directory to `.`.
3. The site goes live at `something.netlify.app`. Add Hansen's own domain under *Domain management* if he has one.

**GitHub Pages.** Also free. In the repo, go to *Settings → Pages → Deploy from a branch → `main` / root*.
The address will be `https://elijahgamper68.github.io/ParallelVortex-Demo-Webpage/`.
The contact form then needs Formspree or FormSubmit (step 4).

Put the final address in `siteUrl`.

## 2. Booking: the free 30-minute Google Meet

**Calendly** (`booking.calendlyUrl`)
1. Sign up free at calendly.com with Hansen's Google account, which connects his Google Calendar.
2. Create a 30-minute event called "Free 30-minute consultation". Set the location to **Google Meet**, hours to weekdays, and the time zone to Eastern.
3. Add booking questions for name, email, and "What do you need help with?".
4. Copy the event link (like `https://calendly.com/hansen/30min`).

Calendly sends the confirmation email and the Meet link automatically.

**Or a Google Calendar appointment schedule** (`booking.googleScheduleUrl`).
In Google Calendar choose *Create → Appointment schedule*, set 30 minutes, and turn on Google Meet video conferencing.
Then open *Open booking page* and copy that link.

## 3. Payments (prices are agreed on the call)

**Stripe** (`payments.stripe.*`)
1. Create an account at stripe.com and finish business verification.
2. For each service (Tech Session, Website Build, Ongoing Support), go to *Payment Links → New*.
   Choose **"Customers choose what to pay"** and set the currency to CAD.
3. Paste each link into `tech`, `website`, and `support`.

**PayPal** (`payments.paypal.*`)
1. Set up a PayPal Business account and create a PayPal.me link (like `https://www.paypal.com/paypalme/parallelvortex`). It lets the customer enter the amount.
2. The same link can go in all three services.

Leave a link empty and that button is hidden. If a service has no links at all, its card shows "Book a free consultation" instead.

> Stripe's website rules ask for a way to contact the business and a refund or cancellation
> policy. The contact form covers the first. Hansen should decide his refund terms. They can go on
> the privacy page or a short new page, and are not filled in yet.

## 4. Contact form (pick one)

- **Netlify Forms**: set `contact.netlify: true`. Then in Netlify open *Site → Forms → Form notifications → Email* and enter Hansen's address.
- **Formspree** (free for 50 messages a month): create a form at formspree.io and paste its endpoint into `contact.endpoint`.
- **FormSubmit** (no account): put Hansen's email in `contact.formsubmitEmail`. The first message sends him a one-time activation email, which he has to click once.

Hansen's email never appears on the page with any of these options. A hidden spam trap is built in.

## 5. Social links

Paste Hansen's real profile links into `social`. Set any he doesn't use to `''` and that link disappears.

## 6. Go live

1. Set `mode: 'live'` in `js/config.js`.
2. Run `node tools/go-live.js` until it says **Ready to launch**.
3. Commit and push. Netlify and GitHub Pages redeploy on their own.

## 7. After launch: a 10-minute test

- [ ] Book a real slot. Confirm it lands in Hansen's calendar with a Meet link, then cancel it.
- [ ] Make a $1 card payment and a $1 PayPal payment, then refund both.
- [ ] Send a contact message and confirm it reaches Hansen's inbox (click the activation link first if using FormSubmit).
- [ ] Share the link in a chat app and check that the preview image shows.
- [ ] Add the site to Google Search Console and submit `sitemap.xml`.
- [ ] Optional: create a Google Business Profile for Ottawa search results.

## For Hansen to review

- **`privacy.html`** is a plain-language privacy notice that matches how the site works. Check that it suits the business before launch.
- **Refund/cancellation terms** for paid sessions (see step 3).
