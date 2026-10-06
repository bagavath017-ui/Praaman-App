# Pramaan — standalone app

This is the real, independent version: your own small server + a plain website. It works in **any** browser, on **any** device, for **anyone** — no Claude account required, because the AI calls go through your own server using your own API key, not through claude.ai.

## What changed from the Claude-artifact demo
- **Works anywhere**, because nothing here depends on being opened inside claude.ai.
- **Screenshots embed directly in the downloaded PDF**, pulled from this device's local storage, not from a cloud asset store.
- **Data lives on the device's browser only** (via IndexedDB), not in any shared place — each person who opens this on their own computer has their own private ledger, automatically. (This also means: no cross-device sync yet — logging on your phone and your laptop gives you two separate ledgers. See "What's next" below.)
- **You now pay for AI usage directly** — see the cost section below before you share this with anyone.

## 1. Set up (one time)
1. Install [Node.js](https://nodejs.org) (version 18 or later) if you don't have it.
2. Open a terminal in this folder and run:
   ```
   npm install
   ```
3. Get an API key from [console.anthropic.com](https://console.anthropic.com) (API Keys section). You'll need to add a billing method there — see cost estimate below before this worries you.
4. Copy `.env.example` to a new file named `.env`, and paste your key in:
   ```
   cp .env.example .env
   ```
   Then open `.env` and replace the placeholder with your real key.

## 2. Run it locally (free — just your own computer)
```
npm start
```
Open **http://localhost:3000** in your browser. This is enough to test everything yourself right now, including the full validation round we planned — paste screenshots, use voice, process, download the PDF.

**To let someone else test it on the same local network** (e.g. your phone, while your laptop runs the server): find your computer's local IP address (on Mac: System Settings → Wi-Fi → Details; on Windows: `ipconfig` in Command Prompt) and open `http://<that-ip>:3000` on the other device, as long as both are on the same Wi-Fi.

## 3. Put it on the internet (so anyone, anywhere can open it)
Running only on your laptop means it stops working the moment you close your laptop or lose wifi. To give people a real link that works anytime:

1. Push this folder to a GitHub repository (free).
2. Create a free account at [Render.com](https://render.com) (or Railway.app — either works similarly).
3. Create a new **Web Service**, connect your GitHub repo.
4. Set the build command to `npm install` and the start command to `npm start`.
5. In the service's **Environment** settings, add `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`) exactly as in your `.env` file. Never put your real key directly in the code or in GitHub.
6. Deploy. Render gives you a public URL like `https://pramaan-yourname.onrender.com` — that's your real, shareable link.

Render's free tier is genuinely free, but the free tier sleeps after about 15 minutes of no traffic and takes a few seconds to "wake up" on the next visit — fine for an early test with 15-20 people, worth upgrading to a small paid tier (a few dollars a month) once you have steady real users.

## 4. The honest cost picture — read this before sharing the link widely
- **Hosting**: free on Render's free tier for testing; a few dollars a month once you want it always-on and faster.
- **AI usage**: billed per use through your Anthropic API key. Using the cheap Haiku model (already set as the default here), a typical screenshot read, a process/summary generation, or a chat message each cost a small fraction of a rupee — realistically, one person's entire month of normal use (a few screenshots, one or two "Process" runs) costs you single-digit rupees, not hundreds. This is genuinely affordable even at a low subscription price, but it is **not literally zero** the way the Claude-artifact demo was — budget for it, don't promise yourself it's free forever.
- **Nothing else costs money** at this stage — no database service, no extra storage service, since everything is stored in each visitor's own browser.

## What's deliberately not built yet (be clear-eyed about this before showing it to many people)
- **No accounts/login.** Anyone with the link can use it, but their data stays only on the device they used — there's no way to log in and see the same ledger from a different device yet. That's fine for your validation round, not fine as the final product.
- **No cross-device sync.** Logging on a phone and a laptop currently creates two separate ledgers. Fixing this needs real accounts + a proper database (e.g. Postgres via Render or Supabase's free tier) — a good next build once the core idea is validated, not before.
- **Voice capture depends on the browser.** It uses the Web Speech API, which works well in Chrome-based browsers (including on Android) but has weaker or no support in some other browsers (notably Safari/iOS has limited support) — test on your actual target devices before relying on it.
- **No redaction tool** for screenshots that might contain other people's private messages — flagged before, still true, still worth building before this goes beyond your own small test group.

## Suggested next step
Run it locally first, confirm the whole loop works for you end to end (paste a screenshot, process, download the PDF, check the screenshot actually appears in it). Then deploy to Render and run the real 15-20 person validation test we planned — this build is finally capable of supporting that properly, since anyone can open the link without needing a Claude account.
