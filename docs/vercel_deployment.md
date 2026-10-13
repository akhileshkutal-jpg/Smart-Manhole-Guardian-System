# 🌐 How to Deploy Smart Manhole Guardian System to Vercel (Live URL)

This project has been pre-configured with **`vercel.json`**, an **`api/index.js`** serverless router, and an automated **Cloud Simulation Fallback** inside the dashboard. This allows anyone opening your live Vercel URL to view the real-time Leaflet map, telemetry graphs, and incident alerts immediately!

---

## 🚀 Method 1: Deploy in 1 Minute using Vercel CLI (Recommended)

### Step 1: Open Terminal
Open PowerShell or your command prompt in the project root:
```powershell
cd c:\Users\hp\Downloads\manhole-guardian-system-main
```

### Step 2: Run Vercel Deploy Command
Run:
```powershell
npx vercel
```
*(Or install globally once with `npm install -g vercel` then run `vercel`)*

### Step 3: Answer the Quick CLI Prompts
Follow these simple prompts:
1. **Set up and deploy?** $\rightarrow$ Press `Y` and `Enter`.
2. **Which scope?** $\rightarrow$ Select your personal Vercel account.
3. **Link to existing project?** $\rightarrow$ Press `N` and `Enter`.
4. **What's your project's name?** $\rightarrow$ Press `Enter` (or type `smart-manhole-guardian`).
5. **In which directory is your code located?** $\rightarrow$ Press `Enter` (defaults to `./`).
6. **Want to modify these settings?** $\rightarrow$ Press `N` and `Enter`.

### Step 4: Your Live URL is Ready! 🎉
Vercel will output your public live production link:
```
✅ Production: https://smart-manhole-guardian.vercel.app
```
You can now share this link with professors, examiners, or project evaluators!

---

## 🐙 Method 2: Deploy via GitHub (1-Click Import)

If you prefer deploying via your GitHub account:

### Step 1: Push Project to GitHub
1. Create a new repository on [github.com](https://github.com) named `smart-manhole-guardian-system`.
2. In your local project folder, push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Smart Manhole Guardian System"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/smart-manhole-guardian-system.git
   git push -u origin main
   ```

### Step 2: Import into Vercel Dashboard
1. Log in to [vercel.com](https://vercel.com).
2. Click **Add New...** $\rightarrow$ **Project**.
3. Select your `smart-manhole-guardian-system` repository and click **Import**.
4. In the Project Configuration:
   - **Framework Preset**: *Other*
   - **Root Directory**: `./` (leave default)
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
5. Click **Deploy**.

Within 30 seconds, Vercel will build and provide your permanent public HTTPS URL.

---

## ⚙️ Optional: Add Telegram Environment Variables on Vercel
If you want live Telegram notifications sent whenever someone tests the live web version:
1. In your Vercel Project Dashboard, go to **Settings** $\rightarrow$ **Environment Variables**.
2. Add:
   - `TELEGRAM_BOT_TOKEN`: *your_bot_token_from_botfather*
   - `TELEGRAM_CHAT_ID`: *your_telegram_chat_id*
   - `ALERT_COOLDOWN_SECONDS`: `60`
3. Click **Save** and trigger a redeploy.

---

## 💡 How it Works on Vercel (Cloud Architecture)
* **Serverless REST API**: Requests to `/api/*` are handled by `api/index.js` which routes through Express.
* **Auto Cloud Simulation**: Because serverless functions freeze between invocations, the dashboard includes a built-in **Live Cloud Mode** watchdog:
  * When opened in any browser, the dashboard automatically simulates the 5 smart manhole nodes on the Leaflet map.
  * Real-time gas spikes, monsoon floods, and lid tamper alerts trigger with pulsing red pins, browser sirens, and supervisor acknowledgement capabilities!
