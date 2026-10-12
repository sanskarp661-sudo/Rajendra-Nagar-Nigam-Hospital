# Rajendra N.N. Hospital website

A bilingual (English / हिंदी) hospital website for Rajendra N.N. Hospital, Ratu Road Chowk, Judge Colony, Ranchi.
It's a static site with no server, database or third-party scripts, so it runs on any web host, including Hostinger.

> **Preview data.** Doctor names, OPD timings, prices, packages and the insurer list are **sample data** and are
> labelled "Sample" on the site. Replace them with details confirmed by the hospital (see "Editing data" below),
> then set `"sample_mode": false` in `data/site.json`.

## What's on the site

| Page | URL | What it does |
|---|---|---|
| Home | `/` | Hero slideshow, live "emergency open" clock, task tiles, services explorer, featured doctors, packages, visit steps, map, FAQs |
| Find a doctor | `/doctors/` | Search by name, department or condition; filter by day ("available today") and doctor gender; next available slot |
| Doctor profile | `/doctors/<name>/` | Qualifications, languages, fee, weekly OPD table with today highlighted, next slot, book button |
| Departments | `/departments/`, `/departments/<name>/` | 14 departments: conditions treated, services, timings, what to bring, doctors |
| Book appointment | `/book/` | 5-step booking for consultations, check-ups or lab tests, with real slots from the doctor's schedule (Indian Standard Time) and validation. Ends in a reference number, a ready-to-send WhatsApp message, a calendar (.ics) file and print. |
| My appointments | `/my-appointments/` | Requests saved on the device: resend on WhatsApp, add to calendar, cancel, book again |
| Health check-ups | `/health-checkups/` | Packages with prices, included tests and preparation |
| Lab tests & prices | `/lab-tests/` | 35 tests and scans: search, category filter, fasting and report time, and a test list with a running total that carries into booking |
| Patients & visitors | `/patients-visitors/` | Timings, what to bring, admission and discharge, insurance & TPA, visiting rules, patient rights |
| Emergency | `/emergency/` | Large call button, when to come in, what to bring, 112/108 |
| Contact | `/contact/` | Phone, WhatsApp, address, Google Map (loads on request), department hours, enquiry form that opens in WhatsApp |
| About | `/about/` | Overview, figures, values |

Every page also exists in Hindi under `/hi/…`. There's a site-wide search (press **/**), and the 404 page is `404.html`.

**How booking works:** there's no server, so a request is saved in the visitor's browser and **sent by the visitor on WhatsApp**
to the hospital's number. The hospital then calls to confirm. Nothing is sent until the visitor presses send in WhatsApp.

## Repository layout

| Path | What it is |
|---|---|
| `data/site.json` | Phone, WhatsApp, address, map, hours, insurers, figures, `sample_mode` |
| `data/departments.json` | Departments (bilingual) |
| `data/doctors.json` | Doctors: qualifications, fee, `schedule` (days 0=Sun…6=Sat, `from`/`to` in 24h), bio |
| `data/packages.json`, `data/tests.json` | Health check-up packages; lab tests and scans with prices |
| `templates/` | Jinja2 page templates (`base.html`, `pages/*.html`, `partials/*.html`) |
| `assets/css/site.css`, `assets/js/*.js` | Styles and scripts (no frameworks) |
| `build.py` | Builds everything into `dist/` |
| `dist/` | The finished website. Generated, so don't edit it by hand. |
| `.github/workflows/deploy.yml` | On every push to `main`: builds and publishes `dist/` to the **`deploy`** branch |

## Editing

```bash
pip install -r requirements.txt        # once (Jinja2)
python3 build.py                       # builds dist/ and stops if any text lacks a translation
python3 -m http.server 8000 --directory dist   # preview at http://localhost:8000 and /hi/
```

**Editing data:** change the JSON files in `data/`. Every visible field has `"en"` and `"hi"` versions. To add a doctor,
copy an entry in `doctors.json`, give it a unique `slug` and an existing department `dept`, and rebuild. A profile page,
directory card, booking option and search entry are all created automatically.

**Editing page text:** text in templates is written once as a pair, for example `<h2 data-en="Our doctors" data-hi="हमारे डॉक्टर"></h2>`.
Leave the element empty; the build fills it in for each language.

Push to `main` and the GitHub workflow rebuilds and updates the `deploy` branch.

## Deploying on Hostinger (one-time setup)

1. In hPanel, open the website, then go to **Advanced → Git**.
2. Repository: `https://github.com/sanskarp661-sudo/Rajendra-Nagar-Nigam-Hospital.git`. Branch: **`deploy`**. Leave the install directory empty (`public_html`, which must be empty before the first deploy).
3. Click **Create**, then **Deploy**. Turn on **Auto deployment**, and add the webhook URL that Hostinger shows in GitHub under **Settings → Webhooks** (content type `application/json`).
4. Turn on SSL and **Force HTTPS**.
5. Set the domain: in GitHub, go to **Settings → Secrets and variables → Actions → Variables** and add `SITE_URL` = `https://your-domain.in`. Re-run the workflow.
   This updates canonical links, hreflang, the sitemap, robots and the search data.

`dist/.htaccess` sets compression, caching, security headers and the 404 page for Hostinger (Apache/LiteSpeed).

## Before going live: replace the sample data

- [ ] Doctors: names, qualifications, OPD days and times, fees (`data/doctors.json`)
- [ ] Department timings and the department list (`data/departments.json`)
- [ ] Hours, WhatsApp number, insurers/TPA, figures such as beds (`data/site.json`)
- [ ] Package and lab test prices (`data/packages.json`, `data/tests.json`)
- [ ] Real photographs of the hospital (all current healthcare images are AI illustrations, labelled as such)
- [ ] Then set `"sample_mode": false` and rebuild
