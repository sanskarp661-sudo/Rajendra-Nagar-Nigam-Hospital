#!/usr/bin/env python3
"""Build the Rajendra N.N. Hospital website.

    pip install jinja2        (once)
    python3 build.py

Reads   templates/ (Jinja2 page templates) and data/*.json (hospital data)
Writes  dist/ (English pages at /, Hindi pages at /hi/) plus sitemap.xml,
        robots.txt, .htaccess, 404.html and assets/data/data.js for the scripts.

Translations
  * Static text in templates is written once as a pair:
        <h2 data-en="Find a doctor" data-hi="डॉक्टर खोजें"></h2>
    The element must be empty; the build writes the right language into it.
    Attribute pairs work the same way: data-alt-*, data-aria-*, data-ph-*
    (placeholder), data-advice-*, data-tpl-*, data-play-*, data-pause-*.
  * Data in data/*.json uses {"en": "...", "hi": "..."} and the |l filter.
  The build stops if any text is missing a translation.

Set SITE_URL (environment variable or GitHub repository variable) to the
live domain so canonical links, the sitemap and search data are correct.
"""
import datetime
import hashlib
import html
import json
import os
import re
import shutil
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, StrictUndefined, select_autoescape
from markupsafe import Markup

SITE_URL = (os.environ.get("SITE_URL") or "https://rajendra-nn-hospital.khushi-ku25-27.chatgpt.site").rstrip("/")

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"
DATA = ROOT / "data"
LANGS = ("en", "hi")


def load(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


SITE = load("site.json")
DEPTS = load("departments.json")
DOCTORS = load("doctors.json")
PACKAGES = load("packages.json")
TESTS = load("tests.json")
DEPT_BY_SLUG = {d["slug"]: d for d in DEPTS}
for doc in DOCTORS:
    assert doc["dept"] in DEPT_BY_SLUG, f"{doc['slug']}: unknown department {doc['dept']}"

NAV = [
    ("doctors", "doctors/", "Doctors", "डॉक्टर"),
    ("departments", "departments/", "Departments", "विभाग"),
    ("checkups", "health-checkups/", "Check-ups", "चेक-अप"),
    ("labtests", "lab-tests/", "Lab tests", "लैब जाँच"),
    ("patients", "patients-visitors/", "Patients", "मरीज़"),
    ("contact", "contact/", "Contact", "संपर्क"),
]

DAY = {
    "en": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    "hi": ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"],
}
DAY_LONG = {
    "en": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    "hi": ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"],
}

# Strings used by the JavaScript (booking, search, filters...)
JS_STRINGS = {
    "sample": ("Sample", "नमूना"),
    "today": ("Today", "आज"),
    "tomorrow": ("Tomorrow", "कल"),
    "noSlots": ("No slots on this day. Pick another date.", "इस दिन कोई समय उपलब्ध नहीं। दूसरी तारीख़ चुनें।"),
    "notAvailable": ("Not available", "उपलब्ध नहीं"),
    "booked": ("Booked", "बुक"),
    "morning": ("Morning", "सुबह"),
    "afternoon": ("Afternoon", "दोपहर"),
    "evening": ("Evening", "शाम"),
    "chooseDoctor": ("Choose a doctor", "डॉक्टर चुनें"),
    "anyDoctor": ("Any available doctor", "कोई भी उपलब्ध डॉक्टर"),
    "fee": ("Fee", "शुल्क"),
    "yrs": ("yrs experience", "वर्ष अनुभव"),
    "nextAvail": ("Next available", "अगला उपलब्ध"),
    "availToday": ("Available today", "आज उपलब्ध"),
    "walkIn": ("No appointment needed: emergency 24×7", "अपॉइंटमेंट की ज़रूरत नहीं: आपातकालीन सेवा 24×7"),
    "errName": ("Enter the patient’s full name.", "मरीज़ का पूरा नाम लिखें।"),
    "errPhone": ("Enter a 10-digit mobile number starting with 6, 7, 8 or 9.", "6, 7, 8 या 9 से शुरू होने वाला 10 अंकों का मोबाइल नंबर लिखें।"),
    "errAge": ("Enter an age between 0 and 120.", "0 से 120 के बीच उम्र लिखें।"),
    "errGender": ("Choose an option.", "एक विकल्प चुनें।"),
    "errConsent": ("Please confirm to continue.", "आगे बढ़ने के लिए पुष्टि करें।"),
    "errStep": ("Complete this step to continue.", "आगे बढ़ने के लिए यह चरण पूरा करें।"),
    "errSlot": ("Choose a date and time.", "तारीख़ और समय चुनें।"),
    "errTests": ("Add at least one test.", "कम से कम एक जाँच जोड़ें।"),
    "consultation": ("Doctor consultation", "डॉक्टर से परामर्श"),
    "checkup": ("Health check-up", "हेल्थ चेक-अप"),
    "labtests": ("Lab tests", "लैब जाँच"),
    "ref": ("Reference", "संदर्भ संख्या"),
    "patient": ("Patient", "मरीज़"),
    "when": ("Date & time", "तारीख़ और समय"),
    "doctor": ("Doctor", "डॉक्टर"),
    "department": ("Department", "विभाग"),
    "package": ("Package", "पैकेज"),
    "tests": ("Tests", "जाँच"),
    "total": ("Estimated total", "अनुमानित कुल"),
    "status": ("Status", "स्थिति"),
    "pending": ("Waiting for the hospital to confirm", "अस्पताल की पुष्टि का इंतज़ार"),
    "cancelled": ("Cancelled", "रद्द"),
    "past": ("Completed or past", "पूरा या बीत चुका"),
    "cancel": ("Cancel request", "अनुरोध रद्द करें"),
    "cancelConfirm": ("Cancel this appointment request? We’ll open WhatsApp so you can tell the hospital.", "यह अपॉइंटमेंट अनुरोध रद्द करें? हम WhatsApp खोलेंगे ताकि आप अस्पताल को बता सकें।"),
    "sendWa": ("Send to hospital on WhatsApp", "WhatsApp पर अस्पताल को भेजें"),
    "addCal": ("Add to calendar", "कैलेंडर में जोड़ें"),
    "rebook": ("Book again", "फिर से बुक करें"),
    "none": ("No appointment requests on this device yet.", "इस डिवाइस पर अभी कोई अपॉइंटमेंट अनुरोध नहीं है।"),
    "waIntro": ("Hello, I would like to request an appointment at Rajendra N.N. Hospital.", "नमस्ते, मैं राजेन्द्र एन.एन. अस्पताल में अपॉइंटमेंट का अनुरोध करना चाहता/चाहती हूँ।"),
    "waCancel": ("Hello, I would like to cancel my appointment request.", "नमस्ते, मैं अपना अपॉइंटमेंट अनुरोध रद्द करना चाहता/चाहती हूँ।"),
    "waEnquiry": ("Hello, I have an enquiry for Rajendra N.N. Hospital.", "नमस्ते, राजेन्द्र एन.एन. अस्पताल के लिए मेरा एक प्रश्न है।"),
    "age": ("Age", "उम्र"),
    "phone": ("Mobile", "मोबाइल"),
    "notes": ("Notes", "टिप्पणी"),
    "visitType": ("Visit", "विज़िट"),
    "newPatient": ("New patient", "नए मरीज़"),
    "returning": ("Returning patient", "पुराने मरीज़"),
    "male": ("Male", "पुरुष"),
    "female": ("Female", "महिला"),
    "other": ("Other", "अन्य"),
    "calTitle": ("Appointment at Rajendra N.N. Hospital", "राजेन्द्र एन.एन. अस्पताल में अपॉइंटमेंट"),
    "results": ("{n} results", "{n} परिणाम"),
    "noResults": ("No matches. Try another word, or call the hospital.", "कोई परिणाम नहीं। दूसरा शब्द आज़माएँ या अस्पताल में कॉल करें।"),
    "showing": ("Showing {n} doctors", "{n} डॉक्टर दिखाए जा रहे हैं"),
    "showingTests": ("Showing {n} tests", "{n} जाँच दिखाई जा रही हैं"),
    "add": ("Add", "जोड़ें"),
    "added": ("Added", "जुड़ गया"),
    "remove": ("Remove", "हटाएँ"),
    "itemsSelected": ("{n} selected", "{n} चुनी गईं"),
    "grpDoctors": ("Doctors", "डॉक्टर"),
    "grpDepts": ("Departments", "विभाग"),
    "grpTests": ("Lab tests", "लैब जाँच"),
    "grpPackages": ("Health check-ups", "हेल्थ चेक-अप"),
    "grpPages": ("Pages", "पेज"),
    "fasting": ("Fasting", "खाली पेट"),
    "change": ("Change", "बदलें"),
    "step": ("Step {a} of {b}", "चरण {a} / {b}"),
    "copied": ("Copied", "कॉपी हो गया"),
}

PAGE_LINKS = [  # for search
    ("", "Home", "होम"), ("book/", "Book appointment", "अपॉइंटमेंट बुक करें"),
    ("my-appointments/", "My appointments", "मेरे अपॉइंटमेंट"), ("emergency/", "Emergency", "आपातकालीन सेवा"),
    ("patients-visitors/", "Patients & visitors, insurance, visiting hours", "मरीज़ और आगंतुक, बीमा, मिलने का समय"),
    ("contact/", "Contact & location, map, timings", "संपर्क और पता, नक्शा, समय"), ("about/", "About the hospital", "अस्पताल के बारे में"),
]

HTACCESS = """# Generated by build.py for Apache/LiteSpeed hosts such as Hostinger.
AddType font/woff2 .woff2
AddType image/webp .webp
AddDefaultCharset UTF-8
ErrorDocument 404 /404.html
DirectoryIndex index.html

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/css text/xml application/javascript text/javascript application/json application/xml image/svg+xml
</IfModule>

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresDefault "access plus 1 hour"
  ExpiresByType text/html "access plus 0 seconds"
  ExpiresByType text/css "access plus 30 days"
  ExpiresByType application/javascript "access plus 30 days"
  ExpiresByType text/javascript "access plus 30 days"
  ExpiresByType image/webp "access plus 30 days"
  ExpiresByType image/jpeg "access plus 30 days"
  ExpiresByType image/png "access plus 30 days"
  ExpiresByType font/woff2 "access plus 1 year"
</IfModule>

<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
  <FilesMatch "\\.woff2$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>

Options -Indexes
"""

# ---------------------------------------------------------------- helpers

def u(path, lang):
    return "/" + ("hi/" if lang == "hi" else "") + path


def pick(value, lang):
    if isinstance(value, dict) and "en" in value:
        v = value.get(lang)
        if not v:
            raise SystemExit(f"Missing {lang} translation for: {value}")
        return v
    return value


def rupee(n):
    s = str(int(n))
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        head = re.sub(r"(\d)(?=(\d\d)+$)", r"\1,", head)
        s = head + "," + tail
    return "₹" + s


def fmt_time(hhmm, lang):
    h, m = map(int, hhmm.split(":"))
    h12 = h % 12 or 12
    if lang == "hi":
        part = "सुबह" if 4 <= h < 12 else "दोपहर" if 12 <= h < 16 else "शाम" if 16 <= h < 20 else "रात"
        return f"{part} {h12}:{m:02d}"
    return f"{h12}:{m:02d} {'AM' if h < 12 else 'PM'}"


def fmt_days(days, lang):
    days = sorted(days)
    if days == [1, 2, 3, 4, 5, 6]:
        return "सोम–शनि" if lang == "hi" else "Mon–Sat"
    if days == [1, 2, 3, 4, 5]:
        return "सोम–शुक्र" if lang == "hi" else "Mon–Fri"
    if days == list(range(7)):
        return "प्रतिदिन" if lang == "hi" else "Every day"
    return ", ".join(DAY[lang][d] for d in days)


def schedule_lines(doc, lang):
    out = []
    for s in doc["schedule"]:
        out.append(f"{fmt_days(s['days'], lang)} · {fmt_time(s['from'], lang)}–{fmt_time(s['to'], lang)}")
    return out


def week_table(doc, lang):
    rows = []
    for d in [1, 2, 3, 4, 5, 6, 0]:
        times = [f"{fmt_time(s['from'], lang)}–{fmt_time(s['to'], lang)}" for s in doc["schedule"] if d in s["days"]]
        rows.append({"day": d, "name": DAY_LONG[lang][d], "times": times})
    return rows


def initials(name):
    parts = [p for p in re.sub(r"\(.*?\)", "", name).replace("Dr.", "").split() if p]
    return (parts[0][0] + parts[-1][0]).upper() if len(parts) > 1 else parts[0][:2].upper()


def avatar_hue(slug):
    return int(hashlib.md5(slug.encode()).hexdigest()[:2], 16) % 6


ATTRS = r'(?:\s+[\w:-]+(?:="[^"]*")?)*'
CONTENT_RE = re.compile(r'<(\w+)(' + ATTRS + r')\s*></\1>')
PAIR_RE = re.compile(r'\sdata-en="([^"]*)"\s+data-hi="([^"]*)"')
ATTR_PAIR_RE = re.compile(r'\sdata-(alt|aria|advice|tpl|play|pause|ph)-en="([^"]*)"\s+data-\1-hi="([^"]*)"')
ATTR_NAME = {"alt": "alt", "aria": "aria-label", "advice": "data-advice", "tpl": "data-tpl",
             "play": "data-play", "pause": "data-pause", "ph": "placeholder"}


def fill(src, lang, where):
    i = 0 if lang == "en" else 1

    def content(m):
        tag, attrs = m.group(1), m.group(2)
        p = PAIR_RE.search(attrs)
        if not p:
            return m.group(0)
        if not p.group(1) or not p.group(2):
            raise SystemExit(f"[{where}/{lang}] empty translation near: {m.group(0)[:120]}")
        return f"<{tag}{PAIR_RE.sub('', attrs, count=1)}>{p.group(1 + i)}</{tag}>"

    out = CONTENT_RE.sub(content, src)
    out = ATTR_PAIR_RE.sub(lambda m: f' {ATTR_NAME[m.group(1)]}="{m.group(2 + i)}"', out)
    out = out.replace(' class=""', "")
    bad = re.findall(r'.{0,80}(?:data-en=|data-hi=|data-\w+-en=).{0,80}', out)
    if bad:
        raise SystemExit(f"[{where}/{lang}] untranslated markup:\n" + "\n".join(bad[:3]))
    return out


# ---------------------------------------------------------------- pages

def pages():
    """(template, path, section, context, titles) for every page."""
    out = [
        ("home", "", "home", {}, (
            "Rajendra N.N. Hospital • Ratu Road Chowk, Ranchi",
            "राजेन्द्र एन.एन. अस्पताल • रातू रोड चौक, रांची",
            "Rajendra N.N. Hospital, Ratu Road Chowk, Ranchi. 24×7 emergency, ICU & NICU, doctors, lab tests, ultrasound & X-ray. Book an appointment online. Consultation from ₹500.",
            "राजेन्द्र एन.एन. अस्पताल, रातू रोड चौक, रांची। 24×7 आपातकालीन सेवा, ICU और NICU, डॉक्टर, लैब जाँच, अल्ट्रासाउंड और एक्स-रे। ऑनलाइन अपॉइंटमेंट बुक करें। परामर्श ₹500 से।")),
        ("doctors", "doctors/", "doctors", {}, (
            "Find a doctor • Rajendra N.N. Hospital", "डॉक्टर खोजें • राजेन्द्र एन.एन. अस्पताल",
            "Search doctors by name, department or availability, see OPD timings and fees, and book an appointment.",
            "नाम, विभाग या उपलब्धता से डॉक्टर खोजें, OPD समय और शुल्क देखें, और अपॉइंटमेंट बुक करें।")),
        ("departments", "departments/", "departments", {}, (
            "Departments & services • Rajendra N.N. Hospital", "विभाग और सेवाएँ • राजेन्द्र एन.एन. अस्पताल",
            "Emergency, ICU, NICU, medicine, surgery, gynaecology, paediatrics, orthopaedics, diagnostics, physiotherapy and pharmacy.",
            "आपातकालीन सेवा, ICU, NICU, चिकित्सा, सर्जरी, स्त्री रोग, बाल रोग, हड्डी रोग, जाँच, फिजियोथेरेपी और फार्मेसी।")),
        ("book", "book/", "book", {}, (
            "Book an appointment • Rajendra N.N. Hospital", "अपॉइंटमेंट बुक करें • राजेन्द्र एन.एन. अस्पताल",
            "Request a doctor consultation, health check-up or lab test online. Choose a date and time; the hospital confirms by phone.",
            "डॉक्टर परामर्श, हेल्थ चेक-अप या लैब जाँच का ऑनलाइन अनुरोध करें। तारीख़ और समय चुनें; अस्पताल फ़ोन पर पुष्टि करता है।")),
        ("appointments", "my-appointments/", "book", {}, (
            "My appointments • Rajendra N.N. Hospital", "मेरे अपॉइंटमेंट • राजेन्द्र एन.एन. अस्पताल",
            "See and manage the appointment requests you made on this device.",
            "इस डिवाइस से किए गए अपॉइंटमेंट अनुरोध देखें और प्रबंधित करें।")),
        ("checkups", "health-checkups/", "checkups", {}, (
            "Health check-up packages • Rajendra N.N. Hospital", "हेल्थ चेक-अप पैकेज • राजेन्द्र एन.एन. अस्पताल",
            "Health check-up packages for adults, women, seniors, diabetes and heart health, with prices and included tests.",
            "वयस्कों, महिलाओं, बुज़ुर्गों, डायबिटीज़ और हृदय स्वास्थ्य के लिए हेल्थ चेक-अप पैकेज, कीमत और शामिल जाँच के साथ।")),
        ("labtests", "lab-tests/", "labtests", {}, (
            "Lab tests & prices • Rajendra N.N. Hospital", "लैब जाँच और कीमतें • राजेन्द्र एन.एन. अस्पताल",
            "Search lab tests, scans and ECG with prices, preparation and report times, and book a visit.",
            "कीमत, तैयारी और रिपोर्ट समय के साथ लैब जाँच, स्कैन और ECG खोजें, और विज़िट बुक करें।")),
        ("patients", "patients-visitors/", "patients", {}, (
            "Patients & visitors • Rajendra N.N. Hospital", "मरीज़ और आगंतुक • राजेन्द्र एन.एन. अस्पताल",
            "Visiting hours, what to bring, admission and discharge, insurance and Ayushman Bharat, and patient FAQs.",
            "मिलने का समय, क्या साथ लाएँ, भर्ती और डिस्चार्ज, बीमा और आयुष्मान भारत, और मरीज़ों के सामान्य प्रश्न।")),
        ("emergency", "emergency/", "emergency", {}, (
            "Emergency 24×7 • Rajendra N.N. Hospital", "आपातकालीन सेवा 24×7 • राजेन्द्र एन.एन. अस्पताल",
            "24×7 emergency care at Ratu Road Chowk, Ranchi. Call +91 8757731665. What to do and what to bring.",
            "रातू रोड चौक, रांची में 24×7 आपातकालीन सेवा। +91 8757731665 पर कॉल करें। क्या करें और क्या साथ लाएँ।")),
        ("contact", "contact/", "contact", {}, (
            "Contact & location • Rajendra N.N. Hospital", "संपर्क और पता • राजेन्द्र एन.एन. अस्पताल",
            "Address, map and directions, phone and WhatsApp, and department timings for Rajendra N.N. Hospital, Ranchi.",
            "राजेन्द्र एन.एन. अस्पताल, रांची का पता, नक्शा और रास्ता, फ़ोन और WhatsApp, और विभागों का समय।")),
        ("about", "about/", "about", {}, (
            "About us • Rajendra N.N. Hospital", "हमारे बारे में • राजेन्द्र एन.एन. अस्पताल",
            "Rajendra N.N. Hospital brings hospital care, diagnostics and support services together at Ratu Road Chowk, Ranchi.",
            "राजेन्द्र एन.एन. अस्पताल रातू रोड चौक, रांची में अस्पताल, जाँच और सहायक सेवाएँ एक साथ प्रदान करता है।")),
    ]
    for d in DEPTS:
        out.append(("department", f"departments/{d['slug']}/", "departments", {"d": d}, (
            f"{d['name']['en']} • Rajendra N.N. Hospital", f"{d['name']['hi']} • राजेन्द्र एन.एन. अस्पताल",
            d["short"]["en"], d["short"]["hi"])))
    for doc in DOCTORS:
        dept = DEPT_BY_SLUG[doc["dept"]]
        out.append(("doctor", f"doctors/{doc['slug']}/", "doctors", {"doc": doc}, (
            f"{doc['name']['en']}, {dept['name']['en']} • Rajendra N.N. Hospital",
            f"{doc['name']['hi']}, {dept['name']['hi']} • राजेन्द्र एन.एन. अस्पताल",
            f"{doc['name']['en']} ({doc['qual']}): {doc['bio']['en']} OPD timings and appointments.",
            f"{doc['name']['hi']} ({doc['qual']}): {doc['bio']['hi']} OPD समय और अपॉइंटमेंट।")))
    return out


def hospital_ld(lang):
    return {
        "@context": "https://schema.org", "@type": "Hospital",
        "name": SITE["name"][lang], "alternateName": [SITE["name"]["en"], SITE["legal_name"]],
        "url": SITE_URL + u("", lang), "logo": f"{SITE_URL}/assets/logo-160.png", "image": f"{SITE_URL}/assets/og-image.jpg",
        "telephone": SITE["phone_display"].replace(" ", "-"), "priceRange": f"₹{SITE['consultation_from']}+",
        "address": {"@type": "PostalAddress", "streetAddress": "Ratu Road Chowk, Judge Colony", "addressLocality": "Ranchi",
                    "postalCode": "834001", "addressRegion": "Jharkhand", "addressCountry": "IN"},
        "geo": {"@type": "GeoCoordinates", "latitude": SITE["geo"]["lat"], "longitude": SITE["geo"]["lng"]},
        "hasMap": SITE["listing_url"], "sameAs": [SITE["instagram_url"]], "availableLanguage": ["en", "hi"],
        "medicalSpecialty": ["Emergency", "Obstetric", "Pediatric", "Radiography", "Pathology", "PhysicalTherapy"],
    }


def jsonld_for(tpl, ctx, lang, path, title):
    items = []
    if tpl in ("home", "contact"):
        items.append(hospital_ld(lang))
    if tpl == "doctor":
        doc = ctx["doc"]
        items.append({"@context": "https://schema.org", "@type": "Physician", "name": doc["name"][lang],
                      "url": SITE_URL + u(path, lang), "telephone": SITE["phone_display"].replace(" ", "-"),
                      "medicalSpecialty": DEPT_BY_SLUG[doc["dept"]]["name"]["en"],
                      "address": hospital_ld(lang)["address"]})
    if path:
        crumbs = [("", SITE["name"][lang])]
        if tpl == "department":
            crumbs.append(("departments/", "विभाग" if lang == "hi" else "Departments"))
        if tpl == "doctor":
            crumbs.append(("doctors/", "डॉक्टर" if lang == "hi" else "Doctors"))
        crumbs.append((path, title.split(" • ")[0]))
        items.append({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "item": SITE_URL + u(p, lang)} for i, (p, n) in enumerate(crumbs)]})
    if not items:
        return ""
    data = items[0] if len(items) == 1 else items
    return json.dumps(data, ensure_ascii=False).replace("</", "<\\/")


def js_data():
    """Bilingual data for the scripts (search, doctors, booking, lab tests)."""
    docs = []
    for d in DOCTORS:
        docs.append({k: d[k] for k in ("slug", "name", "gender", "dept", "title", "qual", "exp", "fee", "bookable", "schedule", "langs")}
                    | {"initials": initials(d["name"]["en"]), "hue": avatar_hue(d["slug"])})
    depts = [{k: d[k] for k in ("slug", "name", "short", "icon", "category", "sample")} for d in DEPTS]
    return {"doctors": docs, "departments": depts, "packages": PACKAGES, "tests": TESTS,
            "pages": [{"path": p, "name": {"en": e, "hi": h}} for p, e, h in PAGE_LINKS],
            "phone": SITE["phone"], "whatsapp": SITE["whatsapp"], "sample": SITE["sample_mode"],
            "directions": SITE["directions_url"]}


def main():
    env = Environment(loader=FileSystemLoader(str(ROOT / "templates")), autoescape=select_autoescape(["html"]),
                      undefined=StrictUndefined, trim_blocks=True, lstrip_blocks=True)

    # fresh output: keep static assets, rewrite everything generated
    for p in list(DIST.glob("*")):
        if p.name in ("assets",):
            continue
        shutil.rmtree(p) if p.is_dir() else p.unlink()
    for sub in ("css", "js", "data"):
        if (DIST / "assets" / sub).exists():
            shutil.rmtree(DIST / "assets" / sub)
    shutil.copytree(ROOT / "assets" / "css", DIST / "assets" / "css")
    shutil.copytree(ROOT / "assets" / "js", DIST / "assets" / "js")
    (DIST / "assets" / "data").mkdir(parents=True, exist_ok=True)
    (DIST / "assets" / "data" / "data.js").write_text(
        "window.RNH_DATA=" + json.dumps(js_data(), ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")

    hasher = hashlib.md5()
    for f in sorted((ROOT / "assets").rglob("*")):
        if f.is_file():
            hasher.update(f.read_bytes())
    hasher.update((DIST / "assets" / "data" / "data.js").read_bytes())
    version = hasher.hexdigest()[:8]

    year = datetime.date.today().year
    sitemap_urls = []
    count = 0
    for tpl, path, section, ctx, titles in pages():
        for lang in LANGS:
            i = 0 if lang == "en" else 1
            alt = "hi" if lang == "en" else "en"
            title, desc = titles[i], titles[2 + i]
            L = lambda v, _lang=lang: pick(v, _lang)
            scripts = {"doctors": ["doctors"], "book": ["booking-core", "book"], "appointments": ["booking-core", "appointments"],
                       "labtests": ["labtests"], "doctor": ["doctors"], "checkups": [], "home": []}.get(tpl, [])
            js_config = {"lang": lang, "base": u("", lang), "page": tpl, "sample": SITE["sample_mode"],
                         "v": version, "s": {k: v[i] for k, v in JS_STRINGS.items()}}
            context = dict(
                lang=lang, alt_lang=alt, page=tpl, section=section, site=SITE, nav=NAV, year=year, version=version,
                title=title, desc=desc, canonical=SITE_URL + u(path, lang), href_en=SITE_URL + u(path, "en"),
                href_hi=SITE_URL + u(path, "hi"), alt_href=u(path, alt), site_url=SITE_URL,
                jsonld=jsonld_for(tpl, ctx, lang, path, title), scripts=scripts,
                js_config=json.dumps(js_config, ensure_ascii=False).replace("</", "<\\/"),
                u=lambda p, _lang=lang: u(p, _lang),
                depts=DEPTS, doctors=DOCTORS, packages=PACKAGES, tests=TESTS, dept_by_slug=DEPT_BY_SLUG,
                rupee=rupee, schedule_lines=lambda d, _l=lang: schedule_lines(d, _l),
                week_table=lambda d, _l=lang: week_table(d, _l), initials=initials, hue=avatar_hue,
                fmt_time=lambda t, _l=lang: fmt_time(t, _l), day_names=DAY[lang],
                docs_in=lambda slug: [d for d in DOCTORS if d["dept"] == slug],
                **ctx,
            )
            env.filters["l"] = L
            html_out = env.get_template(f"pages/{tpl}.html").render(**context)
            html_out = fill(html_out, lang, path or "home")
            out = DIST / ("hi" if lang == "hi" else "") / path / "index.html"
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(html_out, encoding="utf-8")
            count += 1
        sitemap_urls.append(path)

    # 404 (English page with Hindi line, served for any missing URL)
    lang = "en"
    env.filters["l"] = lambda v: pick(v, "en")
    ctx404 = dict(lang="en", alt_lang="hi", page="404", section="", site=SITE, nav=NAV, year=year, version=version,
                  title="Page not found • Rajendra N.N. Hospital", desc="This page could not be found.",
                  canonical=SITE_URL + "/404.html", href_en=SITE_URL + "/", href_hi=SITE_URL + "/hi/", alt_href="/hi/",
                  site_url=SITE_URL, jsonld="", scripts=[], u=lambda p: u(p, "en"),
                  js_config=json.dumps({"lang": "en", "base": "/", "page": "404", "sample": SITE["sample_mode"], "v": version,
                                        "s": {k: v[0] for k, v in JS_STRINGS.items()}}, ensure_ascii=False))
    (DIST / "404.html").write_text(fill(env.get_template("pages/404.html").render(**ctx404), "en", "404"), encoding="utf-8")

    today = datetime.date.today().isoformat()
    def alts(p):
        return "".join(f'\n    <xhtml:link rel="alternate" hreflang="{l}" href="{SITE_URL}{u(p, l)}"/>' for l in LANGS)
    entries = "".join(f"\n  <url>\n    <loc>{SITE_URL}{u(p, l)}</loc>\n    <lastmod>{today}</lastmod>{alts(p)}\n  </url>"
                      for p in sitemap_urls for l in LANGS)
    (DIST / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
                                      'xmlns:xhtml="http://www.w3.org/1999/xhtml">' + entries + "\n</urlset>\n", encoding="utf-8")
    (DIST / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}/sitemap.xml\n", encoding="utf-8")
    (DIST / ".htaccess").write_text(HTACCESS, encoding="utf-8")
    (DIST / "_headers").write_text("/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n"
                                   "/assets/fonts/*\n  Cache-Control: public, max-age=31536000, immutable\n", encoding="utf-8")
    print(f"Built {count} pages + 404 ({len(sitemap_urls)} per language) for {SITE_URL} · assets v{version}"
          f"{' · SAMPLE MODE' if SITE['sample_mode'] else ''}")


if __name__ == "__main__":
    main()
