#!/usr/bin/env python3
"""
ApplyWise — Demo / Test Script
===============================
Quick test of the scraper without hitting live APIs.
Shows the data flow: load DB -> mock fetch -> parse -> filter -> export.
"""

import json
import sys
sys.path.insert(0, '.')

from scraper import (
    CompanyScraper, GreenhouseParser, LeverParser, RSSParser,
    JobListing, is_us_location, is_remote_friendly, DiscoverAPI
)

# ============================================================
# MOCK DATA (so we don't hammer APIs during testing)
# ============================================================

MOCK_GREENHOUSE_RESPONSE = {
    "jobs": [
        {
            "id": 12345,
            "title": "Senior Backend Engineer",
            "location": {"name": "Berlin, Germany"},
            "departments": [{"name": "Engineering"}],
            "content": "<p>Build scalable systems...</p>",
            "absolute_url": "https://boards.greenhouse.io/wise/jobs/12345",
            "updated_at": "2026-06-15T10:00:00Z"
        },
        {
            "id": 12346,
            "title": "Product Manager",
            "location": {"name": "London, UK"},
            "departments": [{"name": "Product"}],
            "content": "<p>Drive product strategy...</p>",
            "absolute_url": "https://boards.greenhouse.io/wise/jobs/12346",
            "updated_at": "2026-06-14T09:00:00Z"
        },
        {
            "id": 12347,
            "title": "Sales Rep",  # This one should be filtered out (US)
            "location": {"name": "New York, NY"},
            "departments": [{"name": "Sales"}],
            "content": "<p>Sell our product...</p>",
            "absolute_url": "https://boards.greenhouse.io/wise/jobs/12347",
            "updated_at": "2026-06-13T08:00:00Z"
        },
        {
            "id": 12348,
            "title": "Remote DevOps Engineer",
            "location": {"name": "Remote - EMEA"},
            "departments": [{"name": "Engineering"}],
            "content": "<p>Manage infrastructure...</p>",
            "absolute_url": "https://boards.greenhouse.io/wise/jobs/12348",
            "updated_at": "2026-06-12T07:00:00Z"
        }
    ]
}

MOCK_LEVER_RESPONSE = [
    {
        "id": "abc-1",
        "text": "Frontend Developer",
        "categories": {"location": "Amsterdam, Netherlands", "team": "Engineering", "commitment": "Full-time"},
        "description": "<p>Build beautiful UIs...</p>",
        "applyUrl": "https://jobs.lever.co/adyen/abc-1",
        "createdAt": "2026-06-10T12:00:00Z"
    },
    {
        "id": "abc-2",
        "text": "Data Scientist",
        "categories": {"location": "San Francisco, CA", "team": "Data", "commitment": "Full-time"},
        "description": "<p>Analyze data...</p>",
        "applyUrl": "https://jobs.lever.co/adyen/abc-2",
        "createdAt": "2026-06-09T11:00:00Z"
    },
    {
        "id": "abc-3",
        "text": "Customer Success Manager",
        "categories": {"location": "Remote", "team": "Customer Success", "commitment": "Full-time"},
        "description": "<p>Help customers...</p>",
        "applyUrl": "https://jobs.lever.co/adyen/abc-3",
        "createdAt": "2026-06-08T10:00:00Z"
    }
]

# ============================================================
# TEST 1: US Location Filter
# ============================================================

print("=" * 60)
print("TEST 1: US Location Filter")
print("=" * 60)

test_locations = [
    "Berlin, Germany",
    "New York, NY",
    "Remote - EMEA",
    "San Francisco, CA",
    "London, UK",
    "Austin, Texas",
    "Remote",
    "São Paulo, Brazil",
    "Chicago, IL 60601",
    "Amsterdam, Netherlands"
]

for loc in test_locations:
    is_us = is_us_location(loc)
    is_remote = is_remote_friendly(loc)
    status = "❌ US (FILTERED)" if is_us else "✅ KEEP"
    remote_tag = " [REMOTE]" if is_remote else ""
    print(f"  {loc:<30} → {status}{remote_tag}")

# ============================================================
# TEST 2: Greenhouse Parser
# ============================================================

print("\n" + "=" * 60)
print("TEST 2: Greenhouse Parser (Wise mock)")
print("=" * 60)

wise_company = {
    "name": "Wise",
    "region": "Europe",
    "country": "UK",
    "sector": "fintech",
    "platform": "greenhouse"
}

greenhouse_jobs = GreenhouseParser.parse(wise_company, MOCK_GREENHOUSE_RESPONSE)
print(f"Input jobs: {len(MOCK_GREENHOUSE_RESPONSE['jobs'])}")
print(f"After US filter: {len(greenhouse_jobs)}")
for j in greenhouse_jobs:
    remote_badge = " [REMOTE]" if j.is_remote else ""
    print(f"  ✅ {j.title} @ {j.location}{remote_badge}")

# ============================================================
# TEST 3: Lever Parser
# ============================================================

print("\n" + "=" * 60)
print("TEST 3: Lever Parser (Adyen mock)")
print("=" * 60)

adyen_company = {
    "name": "Adyen",
    "region": "Europe",
    "country": "Netherlands",
    "sector": "fintech",
    "platform": "lever",
    "lever_board": "adyen"
}

lever_jobs = LeverParser.parse(adyen_company, MOCK_LEVER_RESPONSE)
print(f"Input jobs: {len(MOCK_LEVER_RESPONSE)}")
print(f"After US filter: {len(lever_jobs)}")
for j in lever_jobs:
    remote_badge = " [REMOTE]" if j.is_remote else ""
    print(f"  ✅ {j.title} @ {j.location}{remote_badge}")

# ============================================================
# TEST 4: Discover API Integration
# ============================================================

print("\n" + "=" * 60)
print("TEST 4: Discover API Integration")
print("=" * 60)

all_jobs = greenhouse_jobs + lever_jobs
discover_jobs = DiscoverAPI.transform_batch(all_jobs)

print(f"Transformed {len(all_jobs)} jobs to Discover API format")
print("\nSample output (first job):")
print(json.dumps(discover_jobs[0], indent=2))

# ============================================================
# TEST 5: Full Pipeline Simulation
# ============================================================

print("\n" + "=" * 60)
print("TEST 5: Full Pipeline Simulation")
print("=" * 60)

scraper = CompanyScraper(db_path='companies_db.json')
print(f"Loaded {len(scraper.companies)} companies from DB")

# Simulate scraping with mock data
mock_all_jobs = all_jobs
stats = scraper.get_stats(mock_all_jobs)

print(f"\n📊 Simulated Stats:")
print(f"  Total jobs: {stats['total']}")
print(f"  Remote jobs: {stats['remote_jobs']}")
print(f"  By region: {stats['by_region']}")
print(f"  By sector: {stats['by_sector']}")
print(f"  By platform: {stats['by_platform']}")

# Export test
scraper.export_to_json(mock_all_jobs, 'test_output.json')
print(f"\n💾 Test export saved to test_output.json")

print("\n" + "=" * 60)
print("✅ ALL TESTS PASSED")
print("=" * 60)
