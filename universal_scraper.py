
"""
Smart Apply — Universal Career Page Scraper (Selenium/Playwright)
==================================================================
Scrapes ANY careers page by detecting the ATS platform automatically.
Falls back to generic HTML parsing if platform is unknown.

Supports:
  - Workday (JS-rendered job listings)
  - SmartRecruiters (Canva, etc.)
  - Greenhouse (fallback for API-blocked boards)
  - Lever (fallback for API-blocked boards)
  - Custom/generic career pages

Usage:
    from universal_scraper import UniversalScraper
    scraper = UniversalScraper()
    jobs = scraper.scrape_company(company_data)
"""

import json
import re
import time
import hashlib
import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict
from urllib.parse import urljoin, urlparse

# Optional imports — graceful degradation
try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.chrome.options import Options as ChromeOptions
    from selenium.webdriver.chrome.service import Service as ChromeService
    from selenium.common.exceptions import TimeoutException, NoSuchElementException
    HAS_SELENIUM = True
except ImportError:
    HAS_SELENIUM = False

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False

try:
    import requests
    from bs4 import BeautifulSoup
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(message)s')
logger = logging.getLogger('smart_apply.universal')


# ============================================================
# REUSED FROM scraper.py (US filter, remote detector)
# ============================================================

US_PATTERNS = [
    r'\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b',
    r'\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b',
    r'\b(San Francisco|New York|Los Angeles|Chicago|Seattle|Austin|Boston|Denver|Portland|Atlanta|Miami|Dallas|Houston|Philadelphia|Phoenix|San Diego|San Jose|Nashville|Detroit|Minneapolis|Raleigh|Charlotte|Salt Lake City|Kansas City|St\. Louis|Cincinnati|Cleveland|Pittsburgh|Indianapolis|Milwaukee|Las Vegas|Orlando|Tampa|Baltimore|Washington DC|Washington, DC|Washington D\.C\.|NYC|SF|LA|SD)\b',
    r'\bUnited States\b', r'\bUSA?\b', r'\bU\.S\.A?\.', r'\bUS-based\b',
    r'\b(EST|PST|MST|CST|EDT|PDT|MDT|CDT)\b',
    r'\b\d{5}(-\d{4})?\b',
]

US_REGEX = re.compile('|'.join(f'({p})' for p in US_PATTERNS), re.IGNORECASE)


def is_us_location(location: str) -> bool:
    if not location:
        return False
    loc_lower = location.lower()
    if any(x in loc_lower for x in ['united states', 'usa', 'u.s.', 'us-based', 'america']):
        return True
    return bool(US_REGEX.search(location))


def is_remote_friendly(location: str) -> bool:
    if not location:
        return False
    remote_keywords = ['remote', 'hybrid', 'work from home', 'wfh', 'anywhere', 'distributed', 'virtual']
    return any(kw in location.lower() for kw in remote_keywords)


def generate_job_id(company: str, title: str, location: str) -> str:
    raw = f"{company}_{title}_{location}".encode('utf-8')
    return hashlib.sha256(raw).hexdigest()[:16]


# ============================================================
# PLATFORM DETECTOR
# ============================================================

class PlatformDetector:
    """Detect which ATS platform a careers page uses."""

    INDICATORS = {
        'greenhouse': [
            'boards.greenhouse.io',
            'greenhouse.io',
            'gh_jid',
            'data-mapped',
            'opening',
        ],
        'lever': [
            'jobs.lever.co',
            'lever.co',
            'lever-job',
            'posting-',
        ],
        'workday': [
            'myworkdayjobs.com',
            'workday',
            'wd-',
            'job-req',
            'css-19midj6',
        ],
        'smartrecruiters': [
            'smartrecruiters.com',
            'sr-job',
            'job-detail',
        ],
        'ashby': [
            'jobs.ashbyhq.com',
            'ashby',
        ],
        'bamboohr': [
            'bamboohr.com',
        ],
        'recruitee': [
            'recruitee.com',
        ],
    }

    @classmethod
    def from_url(cls, url: str) -> Optional[str]:
        """Detect platform from URL patterns."""
        url_lower = url.lower()
        for platform, indicators in cls.INDICATORS.items():
            for indicator in indicators:
                if indicator in url_lower:
                    return platform
        return None

    @classmethod
    def from_html(cls, html: str) -> Optional[str]:
        """Detect platform from HTML content."""
        html_lower = html.lower()
        for platform, indicators in cls.INDICATORS.items():
            for indicator in indicators:
                if indicator in html_lower:
                    return platform
        return None

    @classmethod
    def detect(cls, url: str, html: Optional[str] = None) -> str:
        """Best-effort platform detection."""
        # URL-based detection first
        platform = cls.from_url(url)
        if platform:
            return platform

        # HTML-based detection
        if html:
            platform = cls.from_html(html)
            if platform:
                return platform

        return 'unknown'


# ============================================================
# UNIVERSAL JOB EXTRACTORS (per platform)
# ============================================================

class GreenhouseExtractor:
    """Extract jobs from Greenhouse HTML pages."""

    @staticmethod
    def extract(soup: BeautifulSoup, company_data: Dict) -> List[Dict]:
        jobs = []

        # Greenhouse uses .opening class for job listings
        openings = soup.find_all('div', class_='opening') or soup.find_all('tr', class_='opening')

        for opening in openings:
            # Title
            title_elem = opening.find('a') or opening.find('h2') or opening.find('h3')
            title = title_elem.get_text(strip=True) if title_elem else 'Unknown'

            # URL
            url = ''
            if title_elem and title_elem.get('href'):
                url = urljoin(company_data['careers_url'], title_elem['href'])

            # Location
            location_elem = opening.find('span', class_='location') or opening.find('td', class_='location')
            location = location_elem.get_text(strip=True) if location_elem else ''

            # Department
            dept_elem = opening.find_parent('div', class_='department') or opening.find_previous_sibling('h2')
            department = dept_elem.get_text(strip=True) if dept_elem else None

            if not is_us_location(location):
                jobs.append({
                    'title': title,
                    'location': location,
                    'department': department,
                    'url': url,
                    'description': None,
                })

        return jobs


class LeverExtractor:
    """Extract jobs from Lever HTML pages."""

    @staticmethod
    def extract(soup: BeautifulSoup, company_data: Dict) -> List[Dict]:
        jobs = []

        # Lever uses .posting class
        postings = soup.find_all('div', class_='posting') or soup.find_all('a', class_='posting-btn')

        for posting in postings:
            title_elem = posting.find('h5') or posting.find('h2') or posting.find('span', class_='posting-title')
            title = title_elem.get_text(strip=True) if title_elem else 'Unknown'

            url = ''
            if posting.get('href'):
                url = urljoin(company_data['careers_url'], posting['href'])
            elif posting.find('a'):
                url = urljoin(company_data['careers_url'], posting.find('a')['href'])

            # Location + team
            location = ''
            team = None
            tags = posting.find_all('span', class_='sort-by-time') or posting.find_all('span', class_='posting-tag')
            for tag in tags:
                text = tag.get_text(strip=True)
                if any(kw in text.lower() for kw in ['remote', 'hybrid', 'onsite', 'office']):
                    location = text
                else:
                    team = text

            if not is_us_location(location):
                jobs.append({
                    'title': title,
                    'location': location,
                    'department': team,
                    'url': url,
                    'description': None,
                })

        return jobs


class WorkdayExtractor:
    """Extract jobs from Workday JS-rendered pages."""

    @staticmethod
    def extract(soup: BeautifulSoup, company_data: Dict) -> List[Dict]:
        jobs = []

        # Workday uses various class patterns — try multiple selectors
        selectors = [
            '[data-automation-id="jobPosting"]',
            '.css-19midj6',
            '[class*="job-card"]',
            'li[class*="job"]',
            '.wd-Job',
        ]

        job_elements = []
        for selector in selectors:
            try:
                found = soup.select(selector)
                if found:
                    job_elements = found
                    break
            except:
                continue

        # Fallback: look for links containing job-related text
        if not job_elements:
            for link in soup.find_all('a'):
                href = link.get('href', '')
                text = link.get_text(strip=True)
                if any(kw in href.lower() for kw in ['job', 'req', 'requisition', 'opening']) and len(text) > 5:
                    job_elements.append(link)

        for elem in job_elements:
            title = elem.get_text(strip=True)
            url = urljoin(company_data['careers_url'], elem.get('href', ''))

            # Try to find location in nearby elements or attributes
            location = ''
            parent = elem.find_parent()
            if parent:
                loc_elem = parent.find(string=re.compile(r'(Remote|Hybrid|Onsite|\b[A-Z][a-z]+,?\s*[A-Z]{2}\b)'))
                if loc_elem:
                    location = loc_elem.strip()

            if title and not is_us_location(location):
                jobs.append({
                    'title': title,
                    'location': location,
                    'department': None,
                    'url': url,
                    'description': None,
                })

        return jobs


class SmartRecruitersExtractor:
    """Extract jobs from SmartRecruiters pages."""

    @staticmethod
    def extract(soup: BeautifulSoup, company_data: Dict) -> List[Dict]:
        jobs = []

        # SmartRecruiters uses .job-list-item or data-automation-id
        selectors = [
            '[data-automation-id="job-list-item"]',
            '.job-list-item',
            '.opening-job',
            'li[class*="job"]',
        ]

        job_elements = []
        for selector in selectors:
            try:
                found = soup.select(selector)
                if found:
                    job_elements = found
                    break
            except:
                continue

        for elem in job_elements:
            title_elem = elem.find('h2') or elem.find('h3') or elem.find('a')
            title = title_elem.get_text(strip=True) if title_elem else 'Unknown'

            url = ''
            if title_elem and title_elem.get('href'):
                url = urljoin(company_data['careers_url'], title_elem['href'])

            # Location
            location = ''
            loc_elem = elem.find('span', class_=re.compile('location|city')) or elem.find('div', class_=re.compile('location|city'))
            if loc_elem:
                location = loc_elem.get_text(strip=True)

            if not is_us_location(location):
                jobs.append({
                    'title': title,
                    'location': location,
                    'department': None,
                    'url': url,
                    'description': None,
                })

        return jobs


class GenericExtractor:
    """Fallback extractor for unknown platforms."""

    JOB_KEYWORDS = [
        'engineer', 'developer', 'manager', 'designer', 'analyst', 'director',
        'specialist', 'coordinator', 'lead', 'head of', 'vp', 'cto', 'cio',
        'product', 'data', 'marketing', 'sales', 'operations', 'finance',
        'hr', 'recruiter', 'support', 'consultant', 'architect', 'scientist',
        'administrator', 'associate', 'representative', 'technician', 'intern',
        'graduate', 'senior', 'junior', 'principal', 'staff',
    ]

    # Common job listing container selectors
    CONTAINER_SELECTORS = [
        'article', '[class*="job"]', '[class*="opening"]', '[class*="position"]',
        '[class*="career"]', '[class*="vacancy"]', '[class*="role"]', '[class*="listing"]',
        'li', 'tr', 'div[class*="item"]', 'div[class*="card"]',
    ]

    @classmethod
    def extract(cls, soup: BeautifulSoup, company_data: Dict) -> List[Dict]:
        jobs = []

        # Strategy 1: Look for structured job containers
        for selector in cls.CONTAINER_SELECTORS:
            try:
                containers = soup.select(selector)
                for container in containers:
                    job = cls._extract_from_container(container, company_data)
                    if job:
                        jobs.append(job)
            except:
                continue

        # Strategy 2: If no containers found, look for job-like links
        if not jobs:
            jobs = cls._extract_from_links(soup, company_data)

        # Strategy 3: Look for JSON-LD job postings (structured data)
        json_jobs = cls._extract_jsonld(soup, company_data)
        jobs.extend(json_jobs)

        # Deduplicate by URL
        seen = set()
        unique = []
        for job in jobs:
            if job and job.get('url') and job['url'] not in seen:
                seen.add(job['url'])
                unique.append(job)

        return unique[:100]

    @classmethod
    def _extract_from_container(cls, container, company_data: Dict) -> Optional[Dict]:
        """Extract job from a container element."""
        # Find title
        title_elem = container.find('h2') or container.find('h3') or container.find('h4') or container.find('a')
        if not title_elem:
            return None

        title = title_elem.get_text(strip=True)
        if len(title) < 5 or len(title) > 120:
            return None

        title_lower = title.lower()
        if not any(kw in title_lower for kw in cls.JOB_KEYWORDS):
            return None

        # Find URL
        url = ''
        if title_elem.name == 'a' and title_elem.get('href'):
            url = urljoin(company_data['careers_url'], title_elem['href'])
        else:
            link = container.find('a')
            if link and link.get('href'):
                url = urljoin(company_data['careers_url'], link['href'])

        if not url or any(skip in url.lower() for skip in ['about', 'contact', 'privacy', 'terms', 'login', 'blog']):
            return None

        # Find location
        location = ''
        loc_elem = container.find(string=re.compile(r'(Remote|Hybrid|\b[A-Z][a-z]+,?\s*[A-Za-z]+\b)'))
        if loc_elem:
            location = loc_elem.strip()
        else:
            # Check all text in container for location keywords
            container_text = container.get_text(separator=' ', strip=True)
            loc_match = re.search(r'(Remote|Hybrid|Work from home|\b[A-Z][a-z]+,?\s*[A-Za-z]+\b)', container_text)
            if loc_match:
                location = loc_match.group(1)

        if is_us_location(location):
            return None

        return {
            'title': title,
            'location': location,
            'department': None,
            'url': url,
            'description': None,
        }

    @classmethod
    def _extract_from_links(cls, soup: BeautifulSoup, company_data: Dict) -> List[Dict]:
        """Fallback: extract from job-like links."""
        jobs = []

        for link in soup.find_all('a'):
            href = link.get('href', '')
            text = link.get_text(strip=True)

            if len(text) < 10 or len(text) > 100:
                continue

            text_lower = text.lower()
            if not any(kw in text_lower for kw in cls.JOB_KEYWORDS):
                continue

            if any(skip in href.lower() for skip in ['about', 'contact', 'privacy', 'terms', 'login', 'blog']):
                continue

            url = urljoin(company_data['careers_url'], href)

            location = ''
            parent = link.find_parent('div') or link.find_parent('li') or link.find_parent('tr')
            if parent:
                loc_text = parent.get_text(strip=True)
                loc_match = re.search(r'(Remote|Hybrid|\b[A-Z][a-z]+,?\s*[A-Za-z]+\b)', loc_text)
                if loc_match:
                    location = loc_match.group(1)

            if not is_us_location(location):
                jobs.append({
                    'title': text,
                    'location': location,
                    'department': None,
                    'url': url,
                    'description': None,
                })

        return jobs

    @classmethod
    def _extract_jsonld(cls, soup: BeautifulSoup, company_data: Dict) -> List[Dict]:
        """Extract jobs from JSON-LD structured data."""
        jobs = []

        scripts = soup.find_all('script', type='application/ld+json')
        for script in scripts:
            try:
                data = json.loads(script.string)
                if isinstance(data, list):
                    for item in data:
                        if item.get('@type') == 'JobPosting':
                            location = item.get('jobLocation', {}).get('address', {}).get('addressLocality', '')
                            if is_us_location(location):
                                continue
                            jobs.append({
                                'title': item.get('title', ''),
                                'location': location,
                                'department': None,
                                'url': item.get('url', ''),
                                'description': item.get('description', ''),
                            })
                elif data.get('@type') == 'JobPosting':
                    location = data.get('jobLocation', {}).get('address', {}).get('addressLocality', '')
                    if is_us_location(location):
                        continue
                    jobs.append({
                        'title': data.get('title', ''),
                        'location': location,
                        'department': None,
                        'url': data.get('url', ''),
                        'description': data.get('description', ''),
                    })
            except:
                continue

        return jobs


# ============================================================
# BROWSER ENGINE (Playwright preferred, Selenium fallback)
# ============================================================

class BrowserEngine:
    """Headless browser wrapper with Playwright + Selenium fallback."""

    def __init__(self, use_playwright: bool = True):
        self.use_playwright = use_playwright and HAS_PLAYWRIGHT
        self.driver = None
        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None

    def start(self):
        if self.use_playwright:
            self._start_playwright()
        elif HAS_SELENIUM:
            self._start_selenium()
        else:
            raise RuntimeError("Neither Playwright nor Selenium is installed")

    def _start_playwright(self):
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(headless=True)
        self.context = self.browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        self.page = self.context.new_page()
        logger.info("Playwright browser started")

    def _start_selenium(self):
        options = ChromeOptions()
        options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        options.add_argument('--window-size=1920,1080')
        options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64)')

        self.driver = webdriver.Chrome(options=options)
        self.driver.set_page_load_timeout(30)
        logger.info("Selenium browser started")

    def goto(self, url: str, wait_for: str = 'networkidle', timeout: int = 30000):
        if self.use_playwright:
            self.page.goto(url, wait_until=wait_for, timeout=timeout)
        else:
            self.driver.get(url)
            time.sleep(3)  # Basic wait for JS to load

    def get_html(self) -> str:
        if self.use_playwright:
            return self.page.content()
        else:
            return self.driver.page_source

    def scroll_to_load(self, scroll_times: int = 3):
        """Scroll down to trigger lazy loading."""
        if self.use_playwright:
            for _ in range(scroll_times):
                self.page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
                time.sleep(1)
        else:
            for _ in range(scroll_times):
                self.driver.execute_script('window.scrollTo(0, document.body.scrollHeight)')
                time.sleep(1)

    def click_load_more(self, selector: str = 'button:has-text("Load more")') -> bool:
        """Try to click 'Load more' buttons."""
        try:
            if self.use_playwright:
                btn = self.page.locator(selector).first
                if btn.is_visible():
                    btn.click()
                    time.sleep(2)
                    return True
            else:
                btn = self.driver.find_element(By.CSS_SELECTOR, selector)
                if btn.is_displayed():
                    btn.click()
                    time.sleep(2)
                    return True
        except:
            pass
        return False

    def close(self):
        if self.use_playwright:
            if self.context:
                self.context.close()
            if self.browser:
                self.browser.close()
            if self.playwright:
                self.playwright.stop()
        elif self.driver:
            self.driver.quit()
        logger.info("Browser closed")


# ============================================================
# UNIVERSAL SCRAPER
# ============================================================

class UniversalScraper:
    """
    Universal career page scraper.
    Detects platform, renders JS if needed, extracts jobs.
    """

    EXTRACTORS = {
        'greenhouse': GreenhouseExtractor,
        'lever': LeverExtractor,
        'workday': WorkdayExtractor,
        'smartrecruiters': SmartRecruitersExtractor,
        'unknown': GenericExtractor,
    }

    def __init__(self, use_browser: bool = True, browser_type: str = 'playwright'):
        self.use_browser = use_browser
        self.browser_type = browser_type
        self.browser = None

    def scrape_company(self, company_data: Dict) -> List[Dict]:
        """
        Scrape a single company's careers page.

        Args:
            company_data: Dict with 'careers_url', 'name', 'platform', etc.

        Returns:
            List of normalized job dicts
        """
        url = company_data.get('careers_url')
        if not url:
            logger.warning(f"No careers URL for {company_data['name']}")
            return []

        # Try static fetch first (faster, no browser needed)
        if not self.use_browser:
            return self._scrape_static(url, company_data)

        # Use browser for JS-rendered pages
        return self._scrape_with_browser(url, company_data)

    def _scrape_static(self, url: str, company_data: Dict) -> List[Dict]:
        """Scrape without browser (fast, for static HTML)."""
        if not HAS_REQUESTS:
            logger.warning("requests not installed")
            return []

        try:
            resp = requests.get(url, timeout=15, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            resp.raise_for_status()
            html = resp.text

            # Detect platform from HTML
            platform = PlatformDetector.detect(url, html)
            company_data['detected_platform'] = platform

            soup = BeautifulSoup(html, 'html.parser')
            extractor = self.EXTRACTORS.get(platform, GenericExtractor)
            raw_jobs = extractor.extract(soup, company_data)

            return self._normalize_jobs(raw_jobs, company_data, platform)

        except Exception as e:
            logger.error(f"Static scrape failed for {company_data['name']}: {e}")
            return []

    def _scrape_with_browser(self, url: str, company_data: Dict) -> List[Dict]:
        """Scrape with headless browser (for JS-rendered pages)."""
        browser = None
        try:
            browser = BrowserEngine(use_playwright=(self.browser_type == 'playwright'))
            browser.start()

            logger.info(f"Navigating to {url}")
            browser.goto(url, wait_for='networkidle', timeout=30000)

            # Scroll to load lazy content
            browser.scroll_to_load(scroll_times=3)

            # Try clicking "Load more" a few times
            for _ in range(5):
                if not browser.click_load_more():
                    break
                browser.scroll_to_load(1)

            html = browser.get_html()

            # Detect platform
            platform = PlatformDetector.detect(url, html)
            company_data['detected_platform'] = platform
            logger.info(f"Detected platform for {company_data['name']}: {platform}")

            soup = BeautifulSoup(html, 'html.parser')
            extractor = self.EXTRACTORS.get(platform, GenericExtractor)
            raw_jobs = extractor.extract(soup, company_data)

            return self._normalize_jobs(raw_jobs, company_data, platform)

        except Exception as e:
            logger.error(f"Browser scrape failed for {company_data['name']}: {e}")
            return []
        finally:
            if browser:
                browser.close()

    def _normalize_jobs(self, raw_jobs: List[Dict], company_data: Dict, platform: str) -> List[Dict]:
        """Convert extracted jobs to normalized format."""
        normalized = []
        company_name = company_data['name']

        for job in raw_jobs:
            location = job.get('location', '')

            # Skip US jobs
            if is_us_location(location):
                continue

            job_id = generate_job_id(company_name, job['title'], location)

            normalized.append({
                'id': job_id,
                'title': job['title'],
                'company': company_name,
                'company_id': company_data.get('id', company_name.lower().replace(' ', '_')),
                'location': location,
                'department': job.get('department'),
                'description': job.get('description'),
                'url': job.get('url', ''),
                'platform': platform,
                'sector': company_data.get('sector', 'tech'),
                'region': company_data.get('region', ''),
                'country': company_data.get('country', ''),
                'is_remote': is_remote_friendly(location),
                'is_us_based': False,
                'posted_at': None,
                'scraped_at': datetime.now(timezone.utc).isoformat(),
            })

        logger.info(f"{company_name} ({platform}): {len(normalized)} jobs scraped")
        return normalized

    def scrape_companies(self, companies: List[Dict], delay: float = 2.0) -> List[Dict]:
        """Scrape multiple companies."""
        all_jobs = []
        for company in companies:
            if not company.get('active', True):
                continue
            jobs = self.scrape_company(company)
            all_jobs.extend(jobs)
            if delay > 0:
                time.sleep(delay)
        return all_jobs


# ============================================================
# CLI / STANDALONE
# ============================================================

if __name__ == '__main__':
    import sys

    # Test with a single company
    test_company = {
        'name': 'SAP',
        'careers_url': 'https://jobs.sap.com',
        'region': 'Europe',
        'country': 'Germany',
        'sector': 'tech',
        'platform': 'workday',
        'active': True,
    }

    print("🚀 Smart Apply — Universal Career Page Scraper")
    print("=" * 50)
    print(f"Target: {test_company['name']} ({test_company['careers_url']})")
    print("=" * 50 + "\n")

    scraper = UniversalScraper(use_browser=True)
    jobs = scraper.scrape_company(test_company)

    print(f"\n📊 Results: {len(jobs)} jobs found")
    for job in jobs[:5]:
        remote = " [REMOTE]" if job['is_remote'] else ""
        print(f"  ✅ {job['title']} @ {job['location']}{remote}")

    if len(jobs) > 5:
        print(f"  ... and {len(jobs) - 5} more")
