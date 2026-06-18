
"""
Smart Apply — Combined Scraper (Phase 1 + Phase 2)
==================================================
Outputs jobs in the exact format your Next.js app expects.
"""

import json
import sys
sys.path.insert(0, '.')

from scraper import CompanyScraper, DiscoverAPI, JobListing
from universal_scraper import UniversalScraper
from datetime import datetime, timezone

# Load database
with open('companies_db.json', 'r') as f:
    db = json.load(f)

companies = db['companies']

# Split by platform type
api_companies = [c for c in companies if c.get('platform') in ['greenhouse', 'lever', 'rss'] and c.get('active', True)]
browser_companies = [c for c in companies if c.get('platform') in ['workday', 'smartrecruiters', 'custom', 'unknown'] and c.get('active', True)]
inactive = [c for c in companies if not c.get('active', True)]

print("🚀 Smart Apply — Combined Scraper (Phase 1 + Phase 2)")
print("=" * 60)
print(f"API scraper (Greenhouse/Lever/RSS): {len(api_companies)} companies")
print(f"Browser scraper (Workday/SmartRecruiters/Custom): {len(browser_companies)} companies")
print(f"Inactive (need manual fix): {len(inactive)} companies")
print("=" * 60 + "\n")

# Phase 1: API scraper
print("📡 Phase 1: Scraping via APIs...")
api_scraper = CompanyScraper(db_path='companies_db.json')
api_jobs = api_scraper.scrape_all(delay=1.5)
print(f"   ✅ {len(api_jobs)} jobs from API scraper\n")

# Phase 2: Browser scraper
print("🌐 Phase 2: Scraping via Browser (this may take a few minutes)...")

browser_jobs = []
try:
    browser_scraper = UniversalScraper(use_browser=True)
    for company in browser_companies:
        print(f"   Scraping {company['name']}...", end=' ')
        jobs = browser_scraper.scrape_company(company)
        browser_jobs.extend(jobs)
        print(f"{len(jobs)} jobs")
except Exception as e:
    print(f"\n   ⚠️  Browser scraper failed: {e}")

print(f"\n   ✅ {len(browser_jobs)} jobs from browser scraper\n")

# Normalize browser jobs (dicts) to JobListing objects
normalized_browser_jobs = []
for job in browser_jobs:
    normalized_browser_jobs.append(JobListing(
        id=job['id'],
        title=job['title'],
        company=job['company'],
        company_id=job['company_id'],
        location=job['location'],
        department=job.get('department'),
        description=job.get('description'),
        url=job['url'],
        platform=job['platform'],
        sector=job['sector'],
        region=job['region'],
        country=job['country'],
        is_remote=job['is_remote'],
        is_us_based=job['is_us_based'],
        posted_at=job.get('posted_at'),
        scraped_at=job['scraped_at'],
    ))

# Combine all jobs
all_jobs = api_jobs + normalized_browser_jobs

# Stats
stats = api_scraper.get_stats(all_jobs)

print("📊 Combined Results:")
print(f"  Total jobs: {stats['total']}")
print(f"  Remote jobs: {stats['remote_jobs']}")
print(f"  By region: {stats['by_region']}")
print(f"  By sector: {stats['by_sector']}")
print(f"  By platform: {stats['by_platform']}")

# ============================================================
# OUTPUT IN YOUR APP'S SCHEMA FORMAT
# ============================================================

def transform_to_app_schema(job: JobListing) -> dict:
    """Transform scraped job to match your Next.js jobs table schema."""
    return {
        "job_id": f"company_{job.id}",  # Prefix to avoid collisions with Adzuna/Arbeitnow
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "description": job.description or "",
        "url": job.url,
        "salary": None,  # Career pages rarely show salary
        "remote": job.is_remote,
        "source": f"company_careers_{job.platform}",
        "status": "new",
        "score": 0,  # Will be scored by your app
        "created_at": job.posted_at or job.scraped_at,
        "sector": job.sector,
        "region": job.region,
        "country": job.country,
        "department": job.department,
    }

app_formatted_jobs = [transform_to_app_schema(j) for j in all_jobs]

output = {
    'metadata': {
        'exported_at': datetime.now(timezone.utc).isoformat(),
        'total_jobs': len(all_jobs),
        'api_jobs': len(api_jobs),
        'browser_jobs': len(browser_jobs),
        'us_filtered': True,
        'source': 'smart_apply_combined_scraper'
    },
    'jobs': [j.to_dict() for j in all_jobs],  # Internal format
    'app_jobs': app_formatted_jobs  # Ready for your Next.js app
}

with open('combined_jobs.json', 'w') as f:
    json.dump(output, f, indent=2)

with open('app_jobs.json', 'w') as f:
    json.dump(app_formatted_jobs, f, indent=2)

print(f"\n💾 Exported:")
print(f"   {len(all_jobs)} jobs → combined_jobs.json (internal format)")
print(f"   {len(app_formatted_jobs)} jobs → app_jobs.json (ready for import)")
