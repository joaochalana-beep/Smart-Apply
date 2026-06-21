import json
import re

with open("companies_db.json", "r", encoding="utf-8") as f:
    db = json.load(f)

# Specific HR emails for top companies
hr_emails = {
    "Feedzai": "careers@feedzai.com",
    "Sumsub": "careers@sumsub.com",
    "Stripe": "jobs@stripe.com",
    "Revolut": "join@revolut.com",
    "N26": "careers@n26.com",
    "Wise": "jobs@wise.com",
    "Talkdesk": "careers@talkdesk.com",
    "MongoDB": "careers@mongodb.com",
    "Datadog": "jobs@datadoghq.com",
}

# Company type overrides / classifications
fintech = {"Feedzai", "Stripe", "N26", "Revolut", "Klarna", "Adyen", "Wise", "SumUp", "Sumsub", "Monzo", "Bunq"}
banking = {"Caixa Geral de Depositos", "Millennium BCP", "Novo Banco", "Banco BPI", "Montepio", "Deutsche Bank"}
startup = {"Talkdesk", "Unbabel", "Sword Health", "Landing.jobs"}
tech = {"Google", "Microsoft", "Amazon", "Meta", "MongoDB", "Datadog", "Elastic", "Twilio", "Vercel", "Figma", "Canonical", "Wolt", "Doctolib", "Contentful", "PandaDoc", "Cabify", "GetYourGuide", "HelloFresh"}
corporate = {"Pfizer", "Siemens", "Philips", "Accenture", "McKinsey"}


def slugify(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def classify_type(name, sector):
    if name in fintech:
        return "fintech"
    if name in banking:
        return "banking"
    if name in startup:
        return "startup"
    if name in tech:
        return "tech"
    if name in corporate:
        return "corporate"

    sector_lower = (sector or "").lower()
    if sector_lower == "fintech":
        return "fintech"
    if sector_lower == "banking":
        return "banking"
    if sector_lower == "tech":
        return "tech"
    if sector_lower in {"health", "pharmaceuticals", "biotech", "medical"}:
        return "corporate"
    if sector_lower in {"telecommunications", "energy", "insurance", "real estate", "consulting"}:
        return "corporate"
    return "tech"  # default for most companies in this DB


updated = 0
for company in db.get("companies", []):
    name = company.get("name", "")
    if name in hr_emails:
        company["hrEmail"] = hr_emails[name]
    else:
        company["hrEmail"] = f"careers@{slugify(name)}.com"

    company["type"] = classify_type(name, company.get("sector"))
    updated += 1

print(f"Updated {updated} companies")

with open("companies_db.json", "w", encoding="utf-8") as f:
    json.dump(db, f, indent=2, ensure_ascii=False)
