/**
 * Smart Manhole Guardian System - Data Store
 * In-memory repository managing device states, sensor readings history,
 * alerts, alert acknowledgements, and device offline detection.
 */

class DataStore {
  constructor(options = {}) {
    this.maxReadings = options.maxReadings || 100;
    this.offlineTimeoutMs = (options.offlineTimeoutSeconds || 30) * 1000;

    // Map of deviceId -> Device object
    this.devices = new Map();

    // Ring buffer / array for recent sensor readings
    this.readings = [];

    // Alert records history
    this.alerts = [];

    // Listeners for events: 'alert', 'status_change', 'device_offline'
    this.eventListeners = {
      alert: [],
      status_change: [],
      device_offline: [],
      reading: []
    };

    // Threshold definitions (configurable)
    this.thresholds = {
      gasWarning: 300,   // ppm
      gasDanger: 550,    // ppm
      waterWarning: 50,  // cm
      waterDanger: 80,   // cm
      waterMaxDepth: 100 // cm (depth of manhole chamber)
    };

    // Periodic check for offline devices
    this.offlineCheckInterval = setInterval(() => {
      this.checkOfflineDevices();
    }, 5000);
  }

  on(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].push(callback);
    }
  }

  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in event listener for ${event}:`, err);
        }
      });
    }
  }

  /**
   * Determine status based on sensor values
   */
  computeStatus(gas, water, lidOpen) {
    if (lidOpen) {
      return { status: 'DANGER', reason: 'Manhole lid is OPEN / TAMPERED' };
    }
    if (gas >= this.thresholds.gasDanger) {
      return { status: 'DANGER', reason: `Critical toxic gas level: ${gas} ppm (Danger threshold: ${this.thresholds.gasDanger})` };
    }
    if (water >= this.thresholds.waterDanger) {
      return { status: 'DANGER', reason: `High water flooding: ${water} cm (Danger threshold: ${this.thresholds.waterDanger})` };
    }
    if (gas >= this.thresholds.gasWarning) {
      return { status: 'WARNING', reason: `Elevated toxic gas level: ${gas} ppm (Warning threshold: ${this.thresholds.gasWarning})` };
    }
    if (water >= this.thresholds.waterWarning) {
      return { status: 'WARNING', reason: `Rising water level: ${water} cm (Warning threshold: ${this.thresholds.waterWarning})` };
    }
    return { status: 'SAFE', reason: 'All parameters normal' };
  }

  /**
   * Ingest a reading from a manhole sensor unit
   */
  recordReading(data) {
    const now = Date.now();
    const deviceId = data.deviceId || 'MH-101';
    const name = data.name || `Manhole ${deviceId}`;
    const lat = typeof data.lat === 'number' ? data.lat : 28.6328;
    const lng = typeof data.lng === 'number' ? data.lng : 77.2197;

    const gas = Math.max(0, Math.round(Number(data.gas) || 0));
    const water = Math.max(0, Math.round(Number(data.water) || 0));
    const lidOpen = Boolean(data.lidOpen);

    // Compute or respect supplied status
    const statusAnalysis = this.computeStatus(gas, water, lidOpen);
    const status = data.status && ['SAFE', 'WARNING', 'DANGER'].includes(data.status.toUpperCase()) 
      ? data.status.toUpperCase() 
      : statusAnalysis.status;
    const reason = statusAnalysis.reason;

    // Retrieve previous device state
    const previousDevice = this.devices.get(deviceId);
    const previousStatus = previousDevice ? previousDevice.status : null;

    const deviceData = {
      deviceId,
      name,
      lat,
      lng,
      gas,
      water,
      lidOpen,
      status,
      statusReason: reason,
      lastSeen: now,
      isOffline: false
    };

    this.devices.set(deviceId, deviceData);

    const readingRecord = {
      id: `${deviceId}-${now}`,
      deviceId,
      name,
      lat,
      lng,
      gas,
      water,
      lidOpen,
      status,
      statusReason: reason,
      timestamp: now
    };

    // Add to readings ring buffer
    this.readings.unshift(readingRecord);
    if (this.readings.length > this.maxReadings) {
      this.readings.pop();
    }

    // Check for status transitions & alerts
    let createdAlert = null;
    if (status === 'DANGER' || status === 'WARNING') {
      // Create alert if status transitioned or previous alert wasn't logged recently
      if (previousStatus !== status) {
        createdAlert = {
          id: `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          deviceId,
          name,
          lat,
          lng,
          severity: status,
          reason,
          gas,
          water,
          lidOpen,
          timestamp: now,
          acknowledged: false,
          ackNote: '',
          ackTimestamp: null
        };
        this.alerts.unshift(createdAlert);
        if (this.alerts.length > 200) {
          this.alerts.pop();
        }
        this.emit('alert', createdAlert);
      }
    }

    // Emit status change if altered
    if (previousStatus && previousStatus !== status) {
      this.emit('status_change', {
        deviceId,
        name,
        lat,
        lng,
        previousStatus,
        currentStatus: status,
        reading: readingRecord,
        timestamp: now
      });
    }

    this.emit('reading', readingRecord);

    return {
      reading: readingRecord,
      device: deviceData,
      alert: createdAlert
    };
  }

  /**
   * Check for devices that have not communicated within timeout window
   */
  checkOfflineDevices() {
    const now = Date.now();
    for (const [deviceId, device] of this.devices.entries()) {
      if (!device.isOffline && (now - device.lastSeen) > this.offlineTimeoutMs) {
        device.isOffline = true;
        device.status = 'OFFLINE';
        device.statusReason = `No telemetry received for over ${Math.round(this.offlineTimeoutMs / 1000)}s`;
        this.emit('device_offline', {
          deviceId,
          name: device.name,
          lastSeen: device.lastSeen,
          timestamp: now
        });
      }
    }
  }

  /**
   * Get all devices sorted by severity
   */
  getDevices() {
    const severityOrder = { DANGER: 0, WARNING: 1, SAFE: 2, OFFLINE: 3 };
    return Array.from(this.devices.values()).sort((a, b) => {
      const aSev = severityOrder[a.status] !== undefined ? severityOrder[a.status] : 4;
      const bSev = severityOrder[b.status] !== undefined ? severityOrder[b.status] : 4;
      return aSev - bSev;
    });
  }

  getDevice(deviceId) {
    return this.devices.get(deviceId) || null;
  }

  getReadings(deviceId = null, limit = 100) {
    let result = this.readings;
    if (deviceId) {
      result = result.filter(r => r.deviceId === deviceId);
    }
    return result.slice(0, limit);
  }

  getAlerts(deviceId = null) {
    if (deviceId) {
      return this.alerts.filter(a => a.deviceId === deviceId);
    }
    return this.alerts;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId, note = 'Worker notified and dispatch confirmed') {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) {
      return null;
    }
    alert.acknowledged = true;
    alert.ackNote = note;
    alert.ackTimestamp = Date.now();
    return alert;
  }

  /**
   * Generate CSV representation of all alerts
   */
  getAlertsCsv() {
    const headers = [
      'Alert ID',
      'Timestamp',
      'Date Time (ISO)',
      'Device ID',
      'Location Name',
      'Latitude',
      'Longitude',
      'Severity',
      'Reason',
      'Gas (ppm)',
      'Water (cm)',
      'Lid Status',
      'Acknowledged',
      'Ack Note',
      'Ack Timestamp'
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = this.alerts.map(a => [
      escapeCsv(a.id),
      a.timestamp,
      escapeCsv(new Date(a.timestamp).toISOString()),
      escapeCsv(a.deviceId),
      escapeCsv(a.name),
      a.lat,
      a.lng,
      escapeCsv(a.severity),
      escapeCsv(a.reason),
      a.gas,
      a.water,
      escapeCsv(a.lidOpen ? 'OPEN' : 'CLOSED'),
      a.acknowledged ? 'YES' : 'NO',
      escapeCsv(a.ackNote || ''),
      a.ackTimestamp ? escapeCsv(new Date(a.ackTimestamp).toISOString()) : '""'
    ].join(','));

    return [headers.join(','), ...rows].join('\r\n');
  }

  destroy() {
    if (this.offlineCheckInterval) {
      clearInterval(this.offlineCheckInterval);
    }
  }
}

module.exports = DataStore;
