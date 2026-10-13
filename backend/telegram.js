/**
 * Smart Manhole Guardian System - Telegram Bot Service
 * Integrates directly with Telegram Bot API over HTTPS using native fetch.
 * Zero external bot dependencies. Features cooldown throttling and mock mode.
 */

class TelegramService {
  constructor(options = {}) {
    this.token = options.token || process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = options.chatId || process.env.TELEGRAM_CHAT_ID;
    this.cooldownSeconds = parseInt(options.cooldownSeconds || process.env.ALERT_COOLDOWN_SECONDS || 60, 10);

    // Track last alert time and last status per device to prevent spam
    this.deviceAlertHistory = new Map();

    // Check if real token is provided
    this.isMock = this.checkIfMockMode();

    if (this.isMock) {
      console.log('🤖 Telegram Service: Running in MOCK MODE (No real bot token/chat ID provided).');
      console.log('   Simulated Telegram alerts will be logged to this console.');
    } else {
      console.log(`🤖 Telegram Service: Configured with active Bot Token and Chat ID: ${this.chatId}`);
    }
  }

  checkIfMockMode() {
    if (!this.token || !this.chatId) return true;
    const cleanToken = this.token.trim();
    const cleanChat = this.chatId.trim();
    if (cleanToken === '' || cleanToken.includes('your_telegram_bot_token') || cleanToken.length < 15) return true;
    if (cleanChat === '' || cleanChat.includes('your_chat_or_group_id')) return true;
    return false;
  }

  /**
   * Determine if an alert should be throttled based on cooldown
   */
  shouldThrottle(deviceId, currentStatus) {
    const record = this.deviceAlertHistory.get(deviceId);
    const now = Date.now();

    if (!record) {
      this.deviceAlertHistory.set(deviceId, { lastAlertTime: now, lastStatus: currentStatus });
      return false;
    }

    // Always send if transitioning back to SAFE after a hazard
    if (currentStatus === 'SAFE' && (record.lastStatus === 'WARNING' || record.lastStatus === 'DANGER')) {
      this.deviceAlertHistory.set(deviceId, { lastAlertTime: now, lastStatus: currentStatus });
      return false;
    }

    // If status escalated from WARNING to DANGER, send immediately
    if (record.lastStatus === 'WARNING' && currentStatus === 'DANGER') {
      this.deviceAlertHistory.set(deviceId, { lastAlertTime: now, lastStatus: currentStatus });
      return false;
    }

    // Check cooldown window for same or lower severity
    const elapsedSeconds = (now - record.lastAlertTime) / 1000;
    if (elapsedSeconds < this.cooldownSeconds) {
      console.log(`⏳ Telegram cooldown active for ${deviceId} (${Math.round(elapsedSeconds)}s / ${this.cooldownSeconds}s). Skipping repeat alert.`);
      return true;
    }

    this.deviceAlertHistory.set(deviceId, { lastAlertTime: now, lastStatus: currentStatus });
    return false;
  }

  /**
   * Formats a clean, readable telegram message for sanitation workers and municipal officers
   */
  formatMessage(data) {
    const { deviceId, name, status, gas, water, lidOpen, timestamp, reason } = data;
    const timeStr = new Date(timestamp || Date.now()).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'medium'
    });

    let statusHeader = '';
    let emojiBanner = '';

    if (status === 'DANGER') {
      emojiBanner = '🚨🚨🚨 CRITICAL MANHOLE HAZARD 🚨🚨🚨';
      statusHeader = '🔴 STATUS: DANGER';
    } else if (status === 'WARNING') {
      emojiBanner = '⚠️⚠️ ATTENTION: ELEVATED RISK ⚠️⚠️';
      statusHeader = '🟡 STATUS: WARNING';
    } else {
      emojiBanner = '✅✅ ALL CLEAR - NORMALCY RESTORED ✅✅';
      statusHeader = '🟢 STATUS: SAFE';
    }

    const lidText = lidOpen ? '⚠️ OPEN / TAMPERED' : '🔒 SECURE / CLOSED';

    return `${emojiBanner}

🏢 Manhole ID: ${deviceId}
📍 Location: ${name || 'Zone Node'}
${statusHeader}
📋 Event: ${reason || 'Status condition changed'}

📊 Current Telemetry:
• Toxic Gas (MQ-135): ${gas} ppm
• Water Level: ${water} cm
• Chamber Lid: ${lidText}

🕒 Timestamp: ${timeStr}

⚠️ Sanitation Workers Alert: Please inspect safety protocols before chamber entry!`;
  }

  /**
   * Send notification via Telegram API or mock logger
   */
  async sendMessage(telemetryData) {
    const { deviceId, status } = telemetryData;

    // Check cooldown
    if (this.shouldThrottle(deviceId, status)) {
      return { throttled: true };
    }

    const messageText = this.formatMessage(telemetryData);

    if (this.isMock) {
      console.log('\n================== [TELEGRAM MOCK ALERT] ==================');
      console.log(`Target Chat ID: ${this.chatId || '(Mock Chat 987654321)'}`);
      console.log(messageText);
      console.log('===========================================================\n');
      return { success: true, mock: true, message: messageText };
    }

    try {
      const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: messageText
        })
      });

      const result = await response.json();
      if (!result.ok) {
        console.error('❌ Telegram API error response:', result);
        return { success: false, error: result.description };
      }

      console.log(`✅ Telegram alert sent successfully to chat ${this.chatId} for ${deviceId}`);
      return { success: true, messageId: result.result?.message_id };
    } catch (err) {
      console.error('❌ Failed to dispatch Telegram alert:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Hook into store events
   */
  handleStatusChange(eventData) {
    const { previousStatus, currentStatus, reading } = eventData;

    // Only send when entering WARNING, DANGER, or transitioning back to SAFE from hazard
    if (currentStatus === 'DANGER' || currentStatus === 'WARNING') {
      this.sendMessage(reading);
    } else if (currentStatus === 'SAFE' && (previousStatus === 'WARNING' || previousStatus === 'DANGER')) {
      this.sendMessage({
        ...reading,
        reason: 'Parameters normalized below hazard thresholds. Safe for operations.'
      });
    }
  }
}

module.exports = TelegramService;
