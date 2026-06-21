
@echo off
echo ============================================
echo ApplyWise — Setup Script
echo ============================================
echo.

echo [1/3] Installing Python dependencies...
py -m pip install -r requirements.txt

echo.
echo [2/3] Installing Playwright browser (Chromium)...
py -m playwright install chromium

echo.
echo [3/3] Testing installation...
py -c "import playwright; print('Playwright OK')"
py -c "from bs4 import BeautifulSoup; print('BeautifulSoup OK')"

echo.
echo ============================================
echo Setup complete! Run the scraper with:
echo   py combined_scraper.py
echo ============================================
pause
