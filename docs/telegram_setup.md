# 🤖 Telegram Bot Integration & Setup Guide

The **Smart Manhole Guardian System** features direct, zero-dependency integration with the **Telegram Bot API** over HTTPS to instantly dispatch mission-critical alerts to municipal sanitation supervisors and field teams.

---

## 🛠️ Step-by-Step Setup Guide

### Step 1: Create a Telegram Bot via @BotFather
1. Open the Telegram application on your phone or desktop.
2. In the search bar, search for `@BotFather` (verified bot with a blue tick).
3. Start the chat and send the command:
   ```text
   /newbot
   ```
4. Enter a friendly name for your bot (e.g., `City Manhole Guardian Alert`).
5. Enter a unique username ending in `bot` (e.g., `delhi_manhole_guardian_bot`).
6. BotFather will provide an **HTTP API Token**, which looks like:
   ```text
   7182946194:AAHkQe_X5yU43fB7jklMNOpqrsTUVwxyzA
   ```

### Step 2: Obtain your Telegram Chat ID
You can receive alerts in your personal chat or inside a municipal group channel:

#### Method A: Direct Personal Chat
1. Search for your newly created bot in Telegram and click **Start** (or send any text message like `/start` or `hello`).
2. In your web browser, open the following URL (replace `<YOUR_BOT_TOKEN>` with your actual token):
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
3. Locate the JSON field `"chat":{"id":123456789,...}`. The number `123456789` is your **Chat ID**.

#### Method B: Telegram Group Channel
1. Create a new Telegram group (e.g., *Sanitation Emergency Response Team*).
2. Add your bot as a member of the group.
3. Send any message in the group (e.g., `test`).
4. Visit `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`.
5. The chat ID for groups will typically start with a minus sign (e.g., `-100192837465`).

### Step 3: Configure `.env` File
Create or update `.env` in the root of the project:
```env
PORT=3000

# Telegram Bot Credentials
TELEGRAM_BOT_TOKEN=7182946194:AAHkQe_X5yU43fB7jklMNOpqrsTUVwxyzA
TELEGRAM_CHAT_ID=123456789

# Cooldown time in seconds between repeat alerts
ALERT_COOLDOWN_SECONDS=60
```

### Step 4: Restart Server
```powershell
npm run simulate
```
The server will print:
```
🤖 Telegram Service: Configured with active Bot Token and Chat ID: 123456789
```

---

## 💡 Built-In Mock Mode (For Offline Demos & Grading)
If no `.env` file exists or if the token is left as default, the backend automatically operates in **MOCK MODE**:
* Alerts are rendered in the server terminal in full formatted detail:
  ```
  ================== [TELEGRAM MOCK ALERT] ==================
  Target Chat ID: (Mock Chat 987654321)
  🚨🚨🚨 CRITICAL MANHOLE HAZARD 🚨🚨🚨

  🏢 Manhole ID: MH-104
  📍 Location: Shivaji Stadium Terminal
  🔴 STATUS: DANGER
  📋 Event: Critical toxic gas level: 680 ppm

  📊 Current Telemetry:
  • Toxic Gas (MQ-135): 680 ppm
  • Water Level: 28 cm
  • Chamber Lid: 🔒 SECURE / CLOSED
  ...
  ===========================================================
  ```
* This ensures you can successfully demonstrate the complete notification pipeline to professors without requiring an active internet connection or personal Telegram account!
