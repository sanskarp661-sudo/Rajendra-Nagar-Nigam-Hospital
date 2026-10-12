# Rajendra N.N. Hospital website

Bilingual (English / हिंदी) website for Rajendra N.N. Hospital, Ratu Road Chowk, Ranchi.
It is a static site with no server code, database or third-party scripts.

- `/` is the English page and `/hi/` is the Hindi page.
- Consultation from ₹500 · +91 8757731665 · [Instagram](https://www.instagram.com/rajendra_n_n_hospital/) · [Google listing](https://share.google/dV6MkkXfxDt6fWgJh)

## Repository layout

| Path | What it is |
|---|---|
| `src/index.html` | **The file you edit.** Every visible string appears once with both languages: `data-en="…" data-hi="…"`. |
| `build.py` | Generates the English and Hindi pages, plus the sitemap, robots, `.htaccess` and search data. Standard-library Python 3 only. |
| `dist/` | The built website, ready to serve. `build.py` overwrites it, so don't edit it by hand. |
| `.github/workflows/deploy.yml` | On every push to `main`: builds the site and publishes `dist/` to the **`deploy`** branch. |
| `docs/handoff/` | The original content inventory, image list and design reference from the first version. |
| `CHANGES.md` | What changed in each version. |

## Editing

1. Edit `src/index.html`.
2. Run `python3 build.py`. It stops with an error if any text is missing its Hindi version.
3. Preview with `python3 -m http.server 8000 --directory dist`, then open http://localhost:8000 and http://localhost:8000/hi/.
4. Commit and push to `main`. The workflow publishes to `deploy`, and Hostinger picks it up.

## Deploying on Hostinger (one-time setup)

1. In hPanel, open the website, then go to **Advanced → Git**.
2. Repository: `https://github.com/sanskarp661-sudo/Rajendra-Nagar-Nigam-Hospital.git`. Branch: **`deploy`**. Leave the install directory empty so it deploys into `public_html`. `public_html` must be empty before the first deploy.
3. Click **Create**, then **Deploy**.
4. Turn on **Auto deployment**. Copy the webhook URL that Hostinger shows, and add it in GitHub under **Settings → Webhooks → Add webhook** (content type `application/json`, "Just the push event").
5. In hPanel, turn on SSL and **Force HTTPS** for the domain.

If the repository is private, Hostinger's Git page also gives you an SSH key. Add it in GitHub under **Settings → Deploy keys**, and use the SSH clone URL instead.

## Setting the domain

Canonical links, hreflang, the sitemap, robots, the link-preview image and the search data all use `SITE_URL`.
In GitHub, set it under **Settings → Secrets and variables → Actions → Variables → New repository variable**:
`SITE_URL` = `https://your-domain.in`. Then re-run the workflow, or push any change.
Locally: `SITE_URL=https://your-domain.in python3 build.py`.

## Still needed from the hospital

- Full street address and PIN
- OPD, lab and pharmacy hours
- Doctor names, qualifications and schedules
- Real photographs (all current healthcare images are AI illustrations and are labelled as such)
- WhatsApp and ambulance numbers
- Whether insurance or Ayushman Bharat is accepted

No patient data is collected; appointments are confirmed by phone.
