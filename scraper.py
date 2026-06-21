
"""
ApplyWise — Company Career Page Scraper
========================================
Modular scraper for Greenhouse, Lever, Workday, RSS/Atom feeds.
Filters out US jobs, normalizes data, integrates with Discover API.

Usage:
    from scraper import CompanyScraper
    scraper = CompanyScraper()
    jobs = scraper.scrape_all()
"""

import json
import re
import time
import hashlib
from datetime import datetime
from typing import List, Dict, Optional, Callable
from dataclasses import dataclass, asdict
from urllib.parse import urljoin, urlparse
import logging

# Optional imports — graceful degradation if not installed
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

try:
    import feedparser
    HAS_FEEDPARSER = True
except ImportError:
    HAS_FEEDPARSER = False

# Logging setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(message)s')
logger = logging.getLogger('smart_apply.scraper')


# ============================================================
# DATA MODELS
# ============================================================

@dataclass
class JobListing:
    """Normalized job listing across all platforms."""
    id: str                          # Unique hash-based ID
    title: str
    company: str
    company_id: str                  # Reference to companies_db
    location: str
    department: Optional[str]
    description: Optional[str]
    url: str
    platform: str                    # greenhouse, lever, workday, rss
    sector: str
    region: str                      # Europe, Australia, NZ, South America
    country: str
    is_remote: bool
    is_us_based: bool                # Filtered out if True
    posted_at: Optional[str]
    scraped_at: str
    raw_data: Optional[Dict] = None  # Original platform data

    def to_dict(self) -> Dict:
        d = asdict(self)
        return d


# ============================================================
# US LOCATION DETECTOR
# ============================================================

US_PATTERNS = [
    # US states
    r'\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b',
    r'\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b',
    # US cities
    r'\b(San Francisco|New York|Los Angeles|Chicago|Seattle|Austin|Boston|Denver|Portland|Atlanta|Miami|Dallas|Houston|Philadelphia|Phoenix|San Diego|San Jose|Nashville|Detroit|Minneapolis|Raleigh|Charlotte|Salt Lake City|Kansas City|St\. Louis|Cincinnati|Cleveland|Pittsburgh|Indianapolis|Milwaukee|Las Vegas|Orlando|Tampa|Baltimore|Washington DC|Washington, DC|Washington D\.C\.|NYC|SF|LA|SD)\b',
    # Country references
    r'\bUnited States\b', r'\bUSA?\b', r'\bU\.S\.A?\.', r'\bUS-based\b',
    # Timezones
    r'\b(EST|PST|MST|CST|EDT|PDT|MDT|CDT)\b',
    # Zip codes
    r'\b\d{5}(-\d{4})?\b',
]

US_REGEX = re.compile('|'.join(f'({p})' for p in US_PATTERNS), re.IGNORECASE)


def is_us_location(location: str) -> bool:
    """Check if a location string indicates a US-based position."""
    if not location:
        return False
    # Quick checks
    loc_lower = location.lower()
    if any(x in loc_lower for x in ['united states', 'usa', 'u.s.', 'us-based', 'america']):
        return True
    return bool(US_REGEX.search(location))


def is_remote_friendly(location: str) -> bool:
    """Detect if job is remote/hybrid."""
    if not location:
        return False
    remote_keywords = ['remote', 'hybrid', 'work from home', 'wfh', 'anywhere', 'distributed', 'virtual']
    return any(kw in location.lower() for kw in remote_keywords)


# ============================================================
# PLATFORM PARSERS
# ============================================================

class GreenhouseParser:
    """Parse Greenhouse JSON API."""

    PLATFORM = 'greenhouse'

    @classmethod
    def parse(cls, company_data: Dict, raw_response: Dict) -> List[JobListing]:
        jobs = []
        company_name = company_data['name']
        company_id = company_data.get('id', company_name.lower().replace(' ', '_'))

        for job in raw_response.get('jobs', []):
            location_str = job.get('location', {}).get('name', '')

            # Skip US jobs
            if is_us_location(location_str):
                continue

            # Generate stable ID
            job_id_raw = f"{company_name}_{job.get('id', '')}_{job.get('title', '')}"
            job_hash = hashlib.sha256(job_id_raw.encode()).hexdigest()[:16]

            jobs.append(JobListing(
                id=job_hash,
                title=job.get('title', 'Unknown'),
                company=company_name,
                company_id=company_id,
                location=location_str,
                department=job.get('departments', [{}])[0].get('name') if job.get('departments') else None,
                description=job.get('content', ''),
                url=job.get('absolute_url', ''),
                platform=cls.PLATFORM,
                sector=company_data.get('sector', 'tech'),
                region=company_data.get('region', ''),
                country=company_data.get('country', ''),
                is_remote=is_remote_friendly(location_str),
                is_us_based=False,
                posted_at=job.get('updated_at'),
                scraped_at=datetime.utcnow().isoformat(),
                raw_data=job
            ))

        return jobs

    @classmethod
    def fetch(cls, company_data: Dict) -> Optional[Dict]:
        """Fetch jobs from Greenhouse API."""
        if not HAS_REQUESTS:
            logger.warning("requests not installed, cannot fetch Greenhouse jobs")
            return None

        endpoint = company_data.get('api_endpoint')
        if not endpoint:
            return None

        try:
            resp = requests.get(endpoint, timeout=15, headers={
                'User-Agent': 'SmartApplyBot/1.0 (Job Discovery Platform)'
            })
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.error(f"Greenhouse fetch failed for {company_data['name']}: {e}")
            return None


class LeverParser:
    """Parse Lever JSON API."""

    PLATFORM = 'lever'
    LEVER_API_BASE = 'https://api.lever.co/v0/postings/'

    @classmethod
    def parse(cls, company_data: Dict, raw_response: List[Dict]) -> List[JobListing]:
        jobs = []
        company_name = company_data['name']
        company_id = company_data.get('id', company_name.lower().replace(' ', '_'))

        for job in raw_response:
            location_parts = []
            if job.get('categories', {}).get('location'):
                location_parts.append(job['categories']['location'])
            if job.get('categories', {}).get('commitment'):
                location_parts.append(job['categories']['commitment'])
            location_str = ', '.join(location_parts) if location_parts else 'Remote/Unspecified'

            if is_us_location(location_str):
                continue

            job_id_raw = f"{company_name}_{job.get('id', '')}_{job.get('text', '')}"
            job_hash = hashlib.sha256(job_id_raw.encode()).hexdigest()[:16]

            jobs.append(JobListing(
                id=job_hash,
                title=job.get('text', 'Unknown'),
                company=company_name,
                company_id=company_id,
                location=location_str,
                department=job.get('categories', {}).get('team'),
                description=job.get('description', ''),
                url=job.get('applyUrl', job.get('hostedUrl', '')),
                platform=cls.PLATFORM,
                sector=company_data.get('sector', 'tech'),
                region=company_data.get('region', ''),
                country=company_data.get('country', ''),
                is_remote=is_remote_friendly(location_str),
                is_us_based=False,
                posted_at=job.get('createdAt'),
                scraped_at=datetime.utcnow().isoformat(),
                raw_data=job
            ))

        return jobs

    @classmethod
    def fetch(cls, company_data: Dict) -> Optional[List[Dict]]:
        if not HAS_REQUESTS:
            logger.warning("requests not installed, cannot fetch Lever jobs")
            return None

        # Extract lever board name from careers URL or use company name
        board_name = company_data.get('lever_board', company_data['name'].lower().replace(' ', ''))
        endpoint = f"{cls.LEVER_API_BASE}{board_name}"

        try:
            resp = requests.get(endpoint, timeout=15, headers={
                'User-Agent': 'SmartApplyBot/1.0 (Job Discovery Platform)'
            })
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.error(f"Lever fetch failed for {company_data['name']}: {e}")
            return None


class RSSParser:
    """Parse RSS/Atom feeds."""

    PLATFORM = 'rss'

    @classmethod
    def parse(cls, company_data: Dict, feed_data) -> List[JobListing]:
        jobs = []
        company_name = company_data['name']
        company_id = company_data.get('id', company_name.lower().replace(' ', '_'))

        entries = getattr(feed_data, 'entries', [])

        for entry in entries:
            # RSS location is tricky — try common fields
            location_str = ''
            if hasattr(entry, 'location'):
                location_str = entry.location
            elif hasattr(entry, 'where'):
                location_str = entry.where
            else:
                # Try to extract from title/description
                location_str = entry.get('title', '') + ' ' + entry.get('summary', '')

            if is_us_location(location_str):
                continue

            job_id_raw = f"{company_name}_{entry.get('id', entry.get('link', ''))}"
            job_hash = hashlib.sha256(job_id_raw.encode()).hexdigest()[:16]

            jobs.append(JobListing(
                id=job_hash,
                title=entry.get('title', 'Unknown'),
                company=company_name,
                company_id=company_id,
                location=location_str[:200] if location_str else 'See listing',
                department=None,
                description=entry.get('summary', entry.get('description', '')),
                url=entry.get('link', ''),
                platform=cls.PLATFORM,
                sector=company_data.get('sector', 'tech'),
                region=company_data.get('region', ''),
                country=company_data.get('country', ''),
                is_remote=is_remote_friendly(location_str),
                is_us_based=False,
                posted_at=entry.get('published') or entry.get('updated'),
                scraped_at=datetime.utcnow().isoformat(),
                raw_data=dict(entry) if hasattr(entry, 'keys') else None
            ))

        return jobs

    @classmethod
    def fetch(cls, company_data: Dict):
        if not HAS_FEEDPARSER:
            logger.warning("feedparser not installed, cannot fetch RSS feeds")
            return None

        feed_url = company_data.get('rss_url') or company_data.get('api_endpoint')
        if not feed_url:
            return None

        try:
            return feedparser.parse(feed_url)
        except Exception as e:
            logger.error(f"RSS fetch failed for {company_data['name']}: {e}")
            return None


class WorkdayParser:
    """
    Workday parser — Workday doesn't have a simple public JSON API.
    We'll use a fallback: scrape the careers page or use RSS if available.
    For now, this is a stub that logs and returns empty.
    """

    PLATFORM = 'workday'

    @classmethod
    def parse(cls, company_data: Dict, raw_response) -> List[JobListing]:
        logger.warning(f"Workday parsing not yet implemented for {company_data['name']}. "
                      f"Consider adding RSS fallback or manual job entry.")
        return []

    @classmethod
    def fetch(cls, company_data: Dict):
        logger.info(f"Workday fetch skipped for {company_data['name']} — "
                   f"requires Selenium/Playwright or RSS fallback")
        return None


# ============================================================
# MAIN SCRAPER ENGINE
# ============================================================

class CompanyScraper:
    """
    Main scraper orchestrator.
    Loads company DB, dispatches to correct parser, filters US jobs.
    """

    PARSERS = {
        'greenhouse': GreenhouseParser,
        'lever': LeverParser,
        'rss': RSSParser,
        'workday': WorkdayParser,
        'ashby': WorkdayParser,  # Ashby also needs special handling
    }

    def __init__(self, db_path: str = 'companies_db.json'):
        self.db_path = db_path
        self.companies = []
        self.load_database()

    def load_database(self):
        """Load the curated company database."""
        try:
            with open(self.db_path, 'r') as f:
                data = json.load(f)
                self.companies = data.get('companies', [])
                logger.info(f"Loaded {len(self.companies)} companies from database")
        except FileNotFoundError:
            logger.error(f"Database not found at {self.db_path}")
            self.companies = []

    def scrape_company(self, company: Dict) -> List[JobListing]:
        """Scrape jobs for a single company."""
        platform = company.get('platform', 'greenhouse')
        parser = self.PARSERS.get(platform)

        if not parser:
            logger.warning(f"No parser for platform: {platform}")
            return []

        if not company.get('active', True):
            logger.info(f"Skipping inactive company: {company['name']}")
            return []

        # Fetch raw data
        raw = parser.fetch(company)
        if raw is None:
            return []

        # Parse into normalized jobs
        jobs = parser.parse(company, raw)
        logger.info(f"{company['name']} ({platform}): {len(jobs)} jobs scraped")

        return jobs

    def scrape_all(self, delay: float = 1.0) -> List[JobListing]:
        """
        Scrape all active companies.

        Args:
            delay: Seconds between requests (be nice to APIs)

        Returns:
            List of normalized JobListing objects
        """
        all_jobs = []
        stats = {'success': 0, 'failed': 0, 'total_jobs': 0}

        for company in self.companies:
            try:
                jobs = self.scrape_company(company)
                all_jobs.extend(jobs)
                stats['success'] += 1
                stats['total_jobs'] += len(jobs)

                if delay > 0:
                    time.sleep(delay)

            except Exception as e:
                logger.error(f"Failed to scrape {company['name']}: {e}")
                stats['failed'] += 1

        logger.info(f"Scraping complete: {stats['success']} succeeded, "
                   f"{stats['failed']} failed, {stats['total_jobs']} jobs found")

        return all_jobs

    def scrape_by_region(self, region: str) -> List[JobListing]:
        """Scrape only companies in a specific region."""
        companies = [c for c in self.companies if c.get('region') == region]
        jobs = []
        for c in companies:
            jobs.extend(self.scrape_company(c))
            time.sleep(1.0)
        return jobs

    def scrape_by_sector(self, sector: str) -> List[JobListing]:
        """Scrape only companies in a specific sector."""
        companies = [c for c in self.companies if c.get('sector') == sector]
        jobs = []
        for c in companies:
            jobs.extend(self.scrape_company(c))
            time.sleep(1.0)
        return jobs

    def export_to_json(self, jobs: List[JobListing], filepath: str):
        """Export scraped jobs to JSON."""
        data = {
            'metadata': {
                'exported_at': datetime.utcnow().isoformat(),
                'total_jobs': len(jobs),
                'us_filtered': True,
                'source': 'smart_apply_scraper'
            },
            'jobs': [j.to_dict() for j in jobs]
        }
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        logger.info(f"Exported {len(jobs)} jobs to {filepath}")

    def get_stats(self, jobs: List[JobListing]) -> Dict:
        """Get statistics about scraped jobs."""
        stats = {
            'total': len(jobs),
            'by_platform': {},
            'by_region': {},
            'by_sector': {},
            'by_company': {},
            'remote_jobs': 0,
        }
        for job in jobs:
            stats['by_platform'][job.platform] = stats['by_platform'].get(job.platform, 0) + 1
            stats['by_region'][job.region] = stats['by_region'].get(job.region, 0) + 1
            stats['by_sector'][job.sector] = stats['by_sector'].get(job.sector, 0) + 1
            stats['by_company'][job.company] = stats['by_company'].get(job.company, 0) + 1
            if job.is_remote:
                stats['remote_jobs'] += 1
        return stats


# ============================================================
# DISCOVER API INTEGRATION
# ============================================================

class DiscoverAPI:
    """
    Integration layer for the existing Discover API.
    Transforms scraped jobs into the format expected by your API.
    """

    @staticmethod
    def transform_job(job: JobListing) -> Dict:
        """Transform JobListing to Discover API format."""
        return {
            'external_id': job.id,
            'title': job.title,
            'company': job.company,
            'location': job.location,
            'description': job.description or '',
            'url': job.url,
            'source': f"company_careers_{job.platform}",
            'sector': job.sector,
            'region': job.region,
            'country': job.country,
            'is_remote': job.is_remote,
            'posted_at': job.posted_at,
            'scraped_at': job.scraped_at,
            'metadata': {
                'platform': job.platform,
                'department': job.department,
            }
        }

    @classmethod
    def transform_batch(cls, jobs: List[JobListing]) -> List[Dict]:
        """Transform a batch of jobs."""
        return [cls.transform_job(j) for j in jobs]


# ============================================================
# CLI / SCRIPT ENTRY POINT
# ============================================================

if __name__ == '__main__':
    import sys

    db_path = sys.argv[1] if len(sys.argv) > 1 else 'companies_db.json'

    scraper = CompanyScraper(db_path=db_path)

    print("\n🚀 ApplyWise — Company Career Page Scraper")
    print("=" * 50)
    print(f"Companies loaded: {len(scraper.companies)}")
    print(f"Platforms: {', '.join(scraper.PARSERS.keys())}")
    print(f"US filter: ACTIVE")
    print("=" * 50 + "\n")

    # Scrape all
    jobs = scraper.scrape_all(delay=1.5)

    # Stats
    stats = scraper.get_stats(jobs)
    print(f"\n📊 Results:")
    print(f"  Total jobs scraped: {stats['total']}")
    print(f"  Remote jobs: {stats['remote_jobs']}")
    print(f"  By region: {stats['by_region']}")
    print(f"  By sector: {stats['by_sector']}")
    print(f"  By platform: {stats['by_platform']}")

    # Export
    scraper.export_to_json(jobs, 'scraped_jobs.json')
    print(f"\n💾 Exported to scraped_jobs.json")
