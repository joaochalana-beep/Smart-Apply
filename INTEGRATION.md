# ApplyWise — Integration Guide
=================================

## What You Have Now

| Component | Status |
|-----------|--------|
| Python scraper (API + Browser) | Working |
| 1,463 jobs scraped | Ready |
| Next.js API route | Built |
| Import script | Built |

## Step-by-Step Integration

### 1. Run the scraper (you already did this!)
```powershell
cd C:\Users\barlo\smart-apply
py combined_scraper.py
```
This creates `app_jobs.json` with all jobs in your app's format.

### 2. Copy the API route into your app
Copy `discover-companies-route.ts` to:
```
C:\Users\barlo\smart-apply\app\api\discover-companies\route.ts
```
(Create the `discover-companies` folder if it doesn't exist)

### 3. Check what's available
Start your Next.js dev server:
```powershell
npm run dev
```
Then visit in browser or run:
```powershell
curl http://localhost:3000/api/discover-companies
```
This shows how many jobs are ready to import.

### 4. Import the jobs

**Option A: From your app UI**
Add a button that calls:
```javascript
fetch('/api/discover-companies', { method: 'POST' });
```

**Option B: Via curl**
```powershell
curl -X POST http://localhost:3000/api/discover-companies
  -H "Content-Type: application/json"
  -H "Authorization: Bearer <YOUR_CLERK_TOKEN>"
```

**Option C: Import with limit**
```powershell
curl -X POST http://localhost:3000/api/discover-companies
  -H "Content-Type: application/json"
  -d '{"limit": 100}'
```

### 5. View imported jobs
The jobs will appear in your existing `/jobs` page since they use the same `jobs` table!

## Data Flow

```
Python Scraper  -->  app_jobs.json  -->  /api/discover-companies  -->  Supabase  -->  Your UI
```

## Job Schema (matches your existing table)

```typescript
{
  job_id: string,        // "company_abc123" (prefixed to avoid collisions)
  title: string,
  company: string,
  location: string,
  description: string,
  url: string,
  salary: null,         // Career pages rarely show salary
  remote: boolean,
  source: string,       // "company_careers_greenhouse"
  status: "new",
  score: 0,             // Will be scored by your app
  created_at: string,   // ISO date
  user_id: string,      // Added by API route
  sector: string,       // "tech", "fintech", etc.
  region: string,       // "Europe", "Australia", etc.
  country: string,      // "Germany", "UK", etc.
  department: string,   // "Engineering", "Product", etc.
}
```

## Automation (Optional)

To run the scraper daily and auto-import:

**Windows Task Scheduler:**
1. Create a new task
2. Action: Start a program
3. Program: `py`
4. Arguments: `combined_scraper.py`
5. Start in: `C:\Users\barlo\smart-apply`
6. Then add a second action to call the API

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No scraped jobs file found" | Run `py combined_scraper.py` first |
| "Unauthorized" | Make sure you're logged in (Clerk auth) |
| "Failed to import jobs" | Check Supabase connection and table schema |
| Jobs not showing in UI | They use same `jobs` table — refresh the page |
