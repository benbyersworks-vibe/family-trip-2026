# Family Trip 2026 - Flight Tracker ✈️

Existing features:
- **Flight Fetcher**: Scrapes Amadeus & Google Flights (SerpAPI).
- **Google Sheets**: Auto-saves data to your Sheet.
- **Web UI**: Local interface at `http://localhost:3000`.

## 🚀 Deployment Guide (GitHub Actions)

Since `git` isn't installed in this terminal, you'll need to do this part manually.

### 1. Initialize Git
Open your terminal (PowerShell or Command Prompt) in this folder and run:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
```

### 2. Push to GitHub
1. Create a **new repository** on GitHub (e.g., `family-trip-2026`).
2. Run:
```bash
git remote add origin https://github.com/YOUR_USERNAME/family-trip-2026.git
git push -u origin main
```

### 3. Add Secrets 🔑
Go to **Settings** > **Secrets and variables** > **Actions** > **New repository secret**.
Add these 5 secrets:

| Secret Name | Value |
|-------------|-------|
| `SERPAPI_KEY` | (From .env) |
| `AMADEUS_CLIENT_ID` | (From .env) |
| `AMADEUS_CLIENT_SECRET` | (From .env) |
| `GOOGLE_SHEET_ID` | (From .env) |
| `GCP_CREDENTIALS` | **Copy the entire content of `credentials.json`** |

### 4. Test It
Go to the **Actions** tab on GitHub, select **Daily Flight Check**, and click **Run workflow**.
