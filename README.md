# ApplyWise — Company Career Page Scraper

## Phase 1: Curated Company Scraper (~65 companies)

### 📁 Files
| File | Description |
|------|-------------|
| `companies_db.json` | Curated company database with 65 companies across Europe, AU, NZ, South America |
| `scraper.py` | Main scraper engine with platform parsers |
| `test_scraper.py` | Demo/test script with mock data (no API calls) |
| `requirements.txt` | Python dependencies |

### 🚀 Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the demo (uses mock data, no API calls)
python test_scraper.py

# 3. Run live scraper (hits real APIs)
python scraper.py companies_db.json
```

### 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  companies_db   │────▶│  CompanyScraper │────▶│  PlatformParser │
│   (JSON)        │     │  (orchestrator) │     │ (Greenhouse/    │
└─────────────────┘     └─────────────────┘     │  Lever/RSS/     │
                                                │  Workday)       │
                                                └─────────────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │  US Filter      │
                                                │  (auto-exclude) │
                                                └─────────────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │  JobListing     │
                                                │  (normalized)   │
                                                └─────────────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │  DiscoverAPI    │
                                                │  (integration)  │
                                                └─────────────────┘
```

### 🌍 Coverage

| Region | Companies | Sectors |
|--------|-----------|---------|
| Europe | 47 | tech, fintech, health, HR, customer_support |
| Australia | 5 | tech, fintech |
| New Zealand | 3 | tech, fintech |
| South America | 10 | tech, fintech |

### 🔧 Platform Support

| Platform | Status | Method |
|----------|--------|--------|
| Greenhouse | ✅ Ready | Public JSON API |
| Lever | ✅ Ready | Public JSON API |
| RSS/Atom | ✅ Ready | feedparser |
| Workday | ⚠️ Stub | Needs Selenium/Playwright |
| Ashby | ⚠️ Stub | Needs special handling |

### 🛡️ US Filter

Automatically excludes jobs with:
- US state names (California, Texas, etc.)
- US cities (San Francisco, New York, etc.)
- US zip codes
- US timezones (EST, PST, etc.)
- Keywords: "United States", "USA", "US-based"

### 📋 Next Steps (Phase 2)

1. **Workday parser** — Add Selenium/Playwright support
2. **Auto-detect platform** — Given a careers URL, detect if it's Greenhouse/Lever/Workday
3. **Expand to 500+ companies** — Use the auto-detector
4. **Scheduling** — Add cron/APScheduler for periodic scraping
5. **Admin UI** — Web interface to add/remove companies

### 💡 Integration with Discover API

```python
from scraper import CompanyScraper, DiscoverAPI

scraper = CompanyScraper('companies_db.json')
jobs = scraper.scrape_all()
discover_format = DiscoverAPI.transform_batch(jobs)
# POST discover_format to your existing API
```


## Phase 2: Universal Browser Scraper (NEW)

### What it does
Scrapes **Workday**, **SmartRecruiters**, and **custom career pages** using a headless browser.

### Setup (one-time)
```powershell
# Install new dependencies
py -m pip install -r requirements.txt

# Install Playwright browser
py -m playwright install chromium
```

Or run the setup script:
```powershell
setup.bat
```

### Usage
```powershell
# Combined scraper (API + Browser)
py combined_scraper.py

# Or use universal scraper standalone
py universal_scraper.py
```

### Supported Platforms
| Platform | Method | Status |
|----------|--------|--------|
| Greenhouse | API (fast) | ✅ |
| Lever | API (fast) | ✅ |
| RSS/Atom | feedparser | ✅ |
| Workday | Browser (Playwright) | ✅ NEW |
| SmartRecruiters | Browser (Playwright) | ✅ NEW |
| Custom/Unknown | Browser + heuristics | ✅ NEW |

### Files Added in Phase 2
| File | Description |
|------|-------------|
| `universal_scraper.py` | Browser-based scraper for JS-rendered pages |
| `combined_scraper.py` | Runs both API + browser scrapers together |
| `setup.bat` | One-click setup script for Windows |
