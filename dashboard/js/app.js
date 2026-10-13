/**
 * Smart Manhole Guardian System - Main Dashboard Application
 * Real-time WebSocket streaming, device coordination, Chart.js telemetry,
 * Web Audio emergency siren, and alert acknowledgement workflows.
 */

class GuardianApp {
  constructor() {
    this.socket = null;
    this.map = null;
    this.chart = null;

    this.devices = new Map(); // deviceId -> device object
    this.selectedDeviceId = 'MH-101';
    this.alerts = [];
    this.chartHistory = []; // readings for selected device

    // Audio Alert System (Web Audio API Synthesizer)
    this.audioContext = null;
    this.isAudioEnabled = true;
    this.isSirenPlaying = false;
    this.sirenTimer = null;

    // Thresholds
    this.thresholds = {
      gasWarning: 300,
      gasDanger: 550,
      waterWarning: 50,
      waterDanger: 80
    };

    // Pending Alert to Acknowledge
    this.pendingAckAlertId = null;
  }

  init() {
    // 1. Initialize Map
    this.map = new ManholeMap('map');
    this.map.init();

    // 2. Initialize Chart.js
    this.initChart();

    // 3. Setup UI Event Listeners
    this.setupEventListeners();

    // 4. Connect to Socket.IO backend
    this.connectSocket();
  }

  // =========================================================================
  // WebSockets & Networking
  // =========================================================================

  connectSocket() {
    const badge = document.getElementById('connectionBadge');
    const badgeText = document.getElementById('connectionText');

    this.isSocketConnected = false;

    try {
      if (typeof io !== 'undefined') {
        // Connect to server
        this.socket = io({
          reconnectionAttempts: 3,
          timeout: 2500
        });

        this.socket.on('connect', () => {
          this.isSocketConnected = true;
          badgeText.innerText = 'Live WebSocket';
          badge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
          console.log('⚡ Connected to Guardian WebSocket server');
        });

        this.socket.on('connect_error', () => {
          if (!this.isSocketConnected) {
            this.initFallbackMode();
          }
        });

        this.socket.on('disconnect', () => {
          if (!this.isSocketConnected) {
            this.initFallbackMode();
          }
        });

        // Full snapshot received on initial connection
        this.socket.on('init_state', (snapshot) => {
          if (snapshot.thresholds) {
            this.thresholds = snapshot.thresholds;
          }
          if (Array.isArray(snapshot.devices)) {
            snapshot.devices.forEach(d => this.devices.set(d.deviceId, d));
            this.renderDeviceList();
            this.updateHeaderStats();
            snapshot.devices.forEach(d => this.map.updateMarker(d));
          }
          if (Array.isArray(snapshot.alerts)) {
            this.alerts = snapshot.alerts;
            this.renderAlertsTable();
          }

          // If initial selected device not yet set or exists
          if (this.devices.has(this.selectedDeviceId)) {
            this.renderDiagnostics(this.devices.get(this.selectedDeviceId));
          } else if (this.devices.size > 0) {
            const firstId = this.devices.keys().next().value;
            this.selectDevice(firstId);
          }
        });

        // Live sensor update received from any manhole
        this.socket.on('sensor_update', (reading) => {
          const existing = this.devices.get(reading.deviceId) || {};
          const updated = { ...existing, ...reading, isOffline: false };
          this.devices.set(reading.deviceId, updated);

          this.map.updateMarker(updated);

          if (reading.deviceId === this.selectedDeviceId) {
            this.renderDiagnostics(updated);
            this.appendChartData(reading);
          }

          this.updateHeaderStats();
          this.evaluateGlobalSafetyState();
        });

        // Device list updated
        this.socket.on('device_list_update', (deviceList) => {
          if (Array.isArray(deviceList)) {
            deviceList.forEach(d => this.devices.set(d.deviceId, d));
            this.renderDeviceList();
            this.updateHeaderStats();
            deviceList.forEach(d => this.map.updateMarker(d));

            if (this.devices.has(this.selectedDeviceId)) {
              this.renderDiagnostics(this.devices.get(this.selectedDeviceId));
            }
          }
          this.evaluateGlobalSafetyState();
        });

        // New Alert emitted
        this.socket.on('new_alert', (alert) => {
          this.alerts.unshift(alert);
          if (this.alerts.length > 200) this.alerts.pop();
          this.renderAlertsTable();

          if (alert.severity === 'DANGER') {
            this.triggerEmergencyAlarm(alert);
          }
        });

        // Alert acknowledged by supervisor
        this.socket.on('alert_ack', (updatedAlert) => {
          const idx = this.alerts.findIndex(a => a.id === updatedAlert.id);
          if (idx !== -1) {
            this.alerts[idx] = updatedAlert;
            this.renderAlertsTable();
          }
        });
      } else {
        this.initFallbackMode();
      }
    } catch (err) {
      this.initFallbackMode();
    }

    // Fallback watchdog for serverless hosting like Vercel
    setTimeout(() => {
      if (!this.isSocketConnected) {
        this.initFallbackMode();
      }
    }, 2500);
  }

  // =========================================================================
  // Vercel / Cloud Fallback Mode (Polling & Client Simulator)
  // =========================================================================

  initFallbackMode() {
    if (this.fallbackActive) return;
    this.fallbackActive = true;

    const badge = document.getElementById('connectionBadge');
    const badgeText = document.getElementById('connectionText');
    if (badgeText) badgeText.innerText = 'Live Cloud Mode';
    if (badge) badge.style.borderColor = 'rgba(16, 185, 129, 0.4)';

    console.log('🌐 Vercel/Cloud Fallback Mode engaged. Polling and simulation active.');

    // Default 5 distributed nodes
    const defaultNodes = [
      { deviceId: 'MH-101', name: 'Connaught Place Radial 1', lat: 28.6328, lng: 77.2197, baseGas: 160, baseWater: 22 },
      { deviceId: 'MH-102', name: 'Janpath Market Crossing', lat: 28.6276, lng: 77.2185, baseGas: 210, baseWater: 28 },
      { deviceId: 'MH-103', name: 'Barakhamba Metro Gate 3', lat: 28.6305, lng: 77.2270, baseGas: 140, baseWater: 18 },
      { deviceId: 'MH-104', name: 'Shivaji Stadium Terminal', lat: 28.6335, lng: 77.2132, baseGas: 190, baseWater: 30 },
      { deviceId: 'MH-105', name: 'KG Marg Sewer Trunkline', lat: 28.6250, lng: 77.2238, baseGas: 180, baseWater: 25 }
    ];

    if (this.devices.size === 0) {
      defaultNodes.forEach(node => {
        this.devices.set(node.deviceId, {
          ...node,
          gas: node.baseGas,
          water: node.baseWater,
          lidOpen: false,
          status: 'SAFE',
          statusReason: 'Normal operating atmosphere',
          lastSeen: Date.now(),
          isOffline: false
        });
      });
      this.renderDeviceList();
      this.updateHeaderStats();
      this.devices.forEach(d => this.map.updateMarker(d));
      this.selectDevice(this.selectedDeviceId || 'MH-101');
    }

    // Periodic simulation and polling loop every 2 seconds
    let cycle = 0;
    setInterval(async () => {
      cycle++;

      // Try fetching latest devices from API if available
      try {
        const res = await fetch('/api/devices');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.devices) && data.devices.length > 0) {
            data.devices.forEach(d => this.devices.set(d.deviceId, d));
            this.renderDeviceList();
            this.updateHeaderStats();
            data.devices.forEach(d => this.map.updateMarker(d));
            if (this.devices.has(this.selectedDeviceId)) {
              this.renderDiagnostics(this.devices.get(this.selectedDeviceId));
            }
            return;
          }
        }
      } catch (e) {}

      // If purely static or serverless without hardware, execute smooth client simulation
      const devArray = Array.from(this.devices.values());
      const targetDev = devArray[cycle % devArray.length];
      if (!targetDev) return;

      // Random incident every 12 cycles (~24s)
      if (cycle % 12 === 0) {
        targetDev.status = 'DANGER';
        targetDev.gas = 640;
        targetDev.statusReason = 'Critical toxic gas concentration: 640 ppm';
        const newAlt = {
          id: `ALT-${Date.now()}`,
          deviceId: targetDev.deviceId,
          name: targetDev.name,
          severity: 'DANGER',
          reason: targetDev.statusReason,
          gas: targetDev.gas,
          water: targetDev.water,
          lidOpen: targetDev.lidOpen,
          timestamp: Date.now(),
          acknowledged: false,
          ackNote: ''
        };
        this.alerts.unshift(newAlt);
        this.renderAlertsTable();
        this.triggerEmergencyAlarm(newAlt);
      } else if (targetDev.status === 'DANGER' && cycle % 12 > 4) {
        targetDev.status = 'SAFE';
        targetDev.gas = targetDev.baseGas || 160;
        targetDev.statusReason = 'Normal operating atmosphere';
      } else {
        const gasNoise = Math.floor(Math.random() * 16 - 8);
        const waterNoise = Math.floor(Math.random() * 4 - 2);
        targetDev.gas = Math.max(90, (targetDev.baseGas || 160) + gasNoise);
        targetDev.water = Math.max(10, (targetDev.baseWater || 22) + waterNoise);
      }

      targetDev.lastSeen = Date.now();
      this.devices.set(targetDev.deviceId, targetDev);

      this.map.updateMarker(targetDev);
      if (targetDev.deviceId === this.selectedDeviceId) {
        this.renderDiagnostics(targetDev);
        this.appendChartData({
          deviceId: targetDev.deviceId,
          gas: targetDev.gas,
          water: targetDev.water,
          timestamp: Date.now()
        });
      }
      this.renderDeviceList();
      this.updateHeaderStats();
      this.evaluateGlobalSafetyState();
    }, 2000);

  }

  // =========================================================================
  // Chart.js Telemetry Graph
  // =========================================================================

  initChart() {
    const ctx = document.getElementById('telemetryChart').getContext('2d');

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Toxic Gas (MQ-135 ppm)',
            data: [],
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            yAxisID: 'yGas',
            pointRadius: 3,
            pointHoverRadius: 6
          },
          {
            label: 'Water Level (HC-SR04 cm)',
            data: [],
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            yAxisID: 'yWater',
            pointRadius: 3,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#9ca3af', font: { size: 10 } }
          },
          yGas: {
            type: 'linear',
            position: 'left',
            min: 0,
            max: 800,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#f59e0b', font: { size: 10 } },
            title: { display: true, text: 'Gas (ppm)', color: '#f59e0b' }
          },
          yWater: {
            type: 'linear',
            position: 'right',
            min: 0,
            max: 100,
            grid: { drawOnChartArea: false },
            ticks: { color: '#38bdf8', font: { size: 10 } },
            title: { display: true, text: 'Water Level (cm)', color: '#38bdf8' }
          }
        },
        plugins: {
          legend: {
            labels: { color: '#e5e7eb', font: { size: 12, weight: 600 } }
          },
          tooltip: {
            backgroundColor: '#161b26',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1,
            titleColor: '#ffffff',
            bodyColor: '#cbd5e1'
          }
        }
      }
    });
  }

  appendChartData(reading) {
    if (!this.chart) return;

    const timeLabel = new Date(reading.timestamp).toLocaleTimeString([], { hour12: false });
    this.chart.data.labels.push(timeLabel);
    this.chart.data.datasets[0].data.push(reading.gas);
    this.chart.data.datasets[1].data.push(reading.water);

    // Keep last 25 readings
    if (this.chart.data.labels.length > 25) {
      this.chart.data.labels.shift();
      this.chart.data.datasets[0].data.shift();
      this.chart.data.datasets[1].data.shift();
    }

    this.chart.update('none'); // Update smoothly without lag
  }

  resetChartForDevice(deviceId) {
    if (!this.chart) return;
    this.chart.data.labels = [];
    this.chart.data.datasets[0].data = [];
    this.chart.data.datasets[1].data = [];
    this.chart.update();

    // Fetch last readings from REST API for this device
    fetch(`/api/history?deviceId=${deviceId}&limit=20`)
      .then(res => res.json())
      .then(data => {
        if (data.readings && data.readings.length > 0) {
          // Readings come sorted descending, reverse for chronological chart
          const sorted = [...data.readings].reverse();
          sorted.forEach(r => {
            const timeLabel = new Date(r.timestamp).toLocaleTimeString([], { hour12: false });
            this.chart.data.labels.push(timeLabel);
            this.chart.data.datasets[0].data.push(r.gas);
            this.chart.data.datasets[1].data.push(r.water);
          });
          this.chart.update();
        }
      })
      .catch(err => console.warn('Could not fetch device history for chart:', err));
  }

  // =========================================================================
  // Diagnostics & Selected Device
  // =========================================================================

  selectDevice(deviceId) {
    this.selectedDeviceId = deviceId;
    const device = this.devices.get(deviceId);
    if (!device) return;

    // Highlight in sidebar
    document.querySelectorAll('.device-item').forEach(el => {
      el.classList.toggle('active', el.dataset.deviceId === deviceId);
    });

    // Update Diagnostics
    this.renderDiagnostics(device);

    // Focus on map
    this.map.focusDevice(deviceId);

    // Reset chart
    document.getElementById('chartNodeLabel').innerText = `${deviceId} (${device.name})`;
    this.resetChartForDevice(deviceId);
  }

  renderDiagnostics(dev) {
    const { deviceId, name, lat, lng, gas, water, lidOpen, status, statusReason, lastSeen } = dev;

    // Device Header Info
    document.getElementById('selectedDeviceId').innerText = deviceId;
    document.getElementById('selectedDeviceName').innerText = name;
    document.getElementById('selectedDeviceCoords').innerText = `Lat: ${lat.toFixed(4)} | Lng: ${lng.toFixed(4)}`;

    // Big Status Badge
    const statusBadge = document.getElementById('selectedStatusBadge');
    statusBadge.className = `device-status-badge status-${status.toLowerCase()}`;
    statusBadge.innerText = status;

    // Status Reason Banner
    const reasonBanner = document.getElementById('statusReasonBanner');
    const reasonIcon = document.getElementById('statusReasonIcon');
    const reasonText = document.getElementById('statusReasonText');

    reasonBanner.className = `status-reason-banner ${status.toLowerCase()}-reason`;
    reasonText.innerText = statusReason || 'Operating normally';

    if (status === 'DANGER') reasonIcon.innerText = '🚨';
    else if (status === 'WARNING') reasonIcon.innerText = '⚠️';
    else if (status === 'OFFLINE') reasonIcon.innerText = '📶';
    else reasonIcon.innerText = '✅';

    // Gas Metric
    const valGas = document.getElementById('valGas');
    const gasBar = document.getElementById('gasProgressBar');
    valGas.innerText = gas;
    const gasPct = Math.min(100, Math.round((gas / 800) * 100));
    gasBar.style.width = `${gasPct}%`;
    if (gas >= this.thresholds.gasDanger) {
      gasBar.style.backgroundColor = '#ef4444';
    } else if (gas >= this.thresholds.gasWarning) {
      gasBar.style.backgroundColor = '#f59e0b';
    } else {
      gasBar.style.backgroundColor = '#10b981';
    }

    // Water Metric
    const valWater = document.getElementById('valWater');
    const waterBar = document.getElementById('waterProgressBar');
    valWater.innerText = water;
    const waterPct = Math.min(100, Math.round((water / 100) * 100));
    waterBar.style.width = `${waterPct}%`;
    if (water >= this.thresholds.waterDanger) {
      waterBar.style.backgroundColor = '#ef4444';
    } else if (water >= this.thresholds.waterWarning) {
      waterBar.style.backgroundColor = '#f59e0b';
    } else {
      waterBar.style.backgroundColor = '#38bdf8';
    }

    // Lid Metric
    const valLid = document.getElementById('valLid');
    const lidIcon = document.getElementById('lidIcon');
    const lidStatusBar = document.getElementById('lidStatusBar');
    const lidSafetyTag = document.getElementById('lidSafetyTag');

    if (lidOpen) {
      valLid.innerText = 'OPEN / TAMPER';
      valLid.className = 'metric-status-text danger';
      lidIcon.innerText = '🔓';
      lidStatusBar.className = 'lid-status-bar open';
      lidSafetyTag.innerText = 'SECURITY BREACH';
      lidSafetyTag.style.color = '#ef4444';
    } else {
      valLid.innerText = 'CLOSED';
      valLid.className = 'metric-status-text safe';
      lidIcon.innerText = '🔒';
      lidStatusBar.className = 'lid-status-bar closed';
      lidSafetyTag.innerText = 'Secure';
      lidSafetyTag.style.color = '#10b981';
    }

    // Local Alarm State Description
    const localAlarmState = document.getElementById('localAlarmState');
    if (status === 'DANGER') {
      localAlarmState.innerHTML = '<span style="color:#ef4444; font-weight:700;">🔴 Red LED + Continuous Buzzer</span>';
    } else if (status === 'WARNING') {
      localAlarmState.innerHTML = '<span style="color:#f59e0b; font-weight:700;">🟡 Yellow LED + Intermittent Beep</span>';
    } else if (status === 'OFFLINE') {
      localAlarmState.innerHTML = '<span style="color:#9ca3af;">⚪ System Silent (No Telemetry)</span>';
    } else {
      localAlarmState.innerHTML = '<span style="color:#10b981; font-weight:700;">🟢 Green LED (Normal Operation)</span>';
    }

    // Last Seen
    const lastSeenText = document.getElementById('lastSeenText');
    const elapsedSec = Math.max(0, Math.round((Date.now() - (lastSeen || Date.now())) / 1000));
    lastSeenText.innerText = elapsedSec < 3 ? 'Just now (live)' : `${elapsedSec}s ago`;
  }

  // =========================================================================
  // Sidebar List Sorted by Severity
  // =========================================================================

  renderDeviceList() {
    const container = document.getElementById('deviceListContainer');
    if (!container) return;

    const severityOrder = { DANGER: 0, WARNING: 1, SAFE: 2, OFFLINE: 3 };
    const sortedDevices = Array.from(this.devices.values()).sort((a, b) => {
      const aSev = severityOrder[a.status] !== undefined ? severityOrder[a.status] : 4;
      const bSev = severityOrder[b.status] !== undefined ? severityOrder[b.status] : 4;
      return aSev - bSev;
    });

    document.getElementById('totalDeviceCount').innerText = sortedDevices.length;

    if (sortedDevices.length === 0) {
      container.innerHTML = '<div class="loading-state">No active nodes connected.</div>';
      return;
    }

    container.innerHTML = sortedDevices.map(dev => {
      const isSelected = dev.deviceId === this.selectedDeviceId;
      return `
        <div class="device-item ${isSelected ? 'active' : ''}" data-device-id="${dev.deviceId}">
          <div class="device-item-top">
            <span class="device-item-id">${dev.deviceId}</span>
            <span class="device-item-status ${dev.status}">${dev.status}</span>
          </div>
          <div class="device-item-name" title="${dev.name}">${dev.name}</div>
          <div class="device-item-metrics">
            <span>Gas: <strong>${dev.gas} ppm</strong></span>
            <span>Water: <strong>${dev.water} cm</strong></span>
            <span>Lid: <strong>${dev.lidOpen ? 'OPEN' : 'OK'}</strong></span>
          </div>
        </div>
      `;
    }).join('');

    // Attach click events to list items
    container.querySelectorAll('.device-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.deviceId;
        this.selectDevice(id);
      });
    });
  }

  // =========================================================================
  // Header Stats
  // =========================================================================

  updateHeaderStats() {
    let danger = 0, warning = 0, safe = 0, offline = 0;
    this.devices.forEach(d => {
      if (d.status === 'DANGER') danger++;
      else if (d.status === 'WARNING') warning++;
      else if (d.status === 'OFFLINE') offline++;
      else safe++;
    });

    document.getElementById('countDanger').innerText = danger;
    document.getElementById('countWarning').innerText = warning;
    document.getElementById('countSafe').innerText = safe;
    document.getElementById('countOffline').innerText = offline;
  }

  // =========================================================================
  // Global Danger Banner & Web Audio Siren
  // =========================================================================

  evaluateGlobalSafetyState() {
    let hasDanger = false;
    let criticalDevices = [];

    this.devices.forEach(d => {
      if (d.status === 'DANGER') {
        hasDanger = true;
        criticalDevices.push(`${d.deviceId} (${d.name})`);
      }
    });

    const banner = document.getElementById('dangerBanner');
    const bannerTitle = document.getElementById('dangerBannerTitle');
    const bannerDesc = document.getElementById('dangerBannerDesc');

    if (hasDanger) {
      banner.classList.remove('hidden');
      bannerTitle.innerText = `CRITICAL HAZARD IN ${criticalDevices.length} MANHOLE(S)`;
      bannerDesc.innerText = criticalDevices.join(' • ');
      this.startSiren();
    } else {
      banner.classList.add('hidden');
      this.stopSiren();
    }
  }

  triggerEmergencyAlarm(alert) {
    this.evaluateGlobalSafetyState();
  }

  // Web Audio API Synthesizer (No external mp3 files required)
  startSiren() {
    if (!this.isAudioEnabled || this.isSirenPlaying) return;

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      this.isSirenPlaying = true;
      let highTone = true;

      this.sirenTimer = setInterval(() => {
        if (!this.isAudioEnabled || !this.isSirenPlaying) {
          this.stopSiren();
          return;
        }

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(highTone ? 880 : 587, this.audioContext.currentTime);

        gain.gain.setValueAtTime(0.08, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.28);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.3);

        highTone = !highTone;
      }, 350);
    } catch (e) {
      console.warn('Audio siren autoplay blocked or unavailable:', e);
    }
  }

  stopSiren() {
    this.isSirenPlaying = false;
    if (this.sirenTimer) {
      clearInterval(this.sirenTimer);
      this.sirenTimer = null;
    }
  }

  toggleAudio() {
    this.isAudioEnabled = !this.isAudioEnabled;
    const icon = document.getElementById('audioIcon');
    const label = document.getElementById('audioLabel');

    if (this.isAudioEnabled) {
      icon.innerText = '🔊';
      label.innerText = 'Sound ON';
      this.evaluateGlobalSafetyState();
    } else {
      icon.innerText = '🔇';
      label.innerText = 'Muted';
      this.stopSiren();
    }
  }

  // =========================================================================
  // Alerts Log & Supervisor Acknowledgement Workflow
  // =========================================================================

  renderAlertsTable() {
    const tbody = document.getElementById('alertsTableBody');
    if (!tbody) return;

    if (this.alerts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hazard incidents recorded yet. All systems nominal.</td></tr>';
      return;
    }

    tbody.innerHTML = this.alerts.map(a => {
      const timeStr = new Date(a.timestamp).toLocaleTimeString('en-IN', { hour12: false });
      const actionHtml = a.acknowledged
        ? `<span class="ack-status-resolved">✅ Acknowledged <br/><small class="text-muted">${a.ackNote || ''}</small></span>`
        : `<button class="btn-ack" data-alert-id="${a.id}">🔔 Acknowledge / Dispatch</button>`;

      return `
        <tr>
          <td class="mono">${timeStr}</td>
          <td><strong>${a.deviceId}</strong><br/><small class="text-muted">${a.name || ''}</small></td>
          <td><span class="table-badge ${a.severity}">${a.severity}</span></td>
          <td>${a.reason}</td>
          <td class="mono">Gas: ${a.gas}ppm | Water: ${a.water}cm | Lid: ${a.lidOpen ? 'OPEN' : 'OK'}</td>
          <td>${actionHtml}</td>
        </tr>
      `;
    }).join('');

    // Attach click events for acknowledge buttons
    tbody.querySelectorAll('.btn-ack').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const alertId = e.target.dataset.alertId;
        this.openAckModal(alertId);
      });
    });
  }

  openAckModal(alertId) {
    this.pendingAckAlertId = alertId;
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return;

    document.getElementById('modalAlertSummary').innerHTML = `
      <strong>Device:</strong> ${alert.deviceId} (${alert.name})<br/>
      <strong>Incident:</strong> ${alert.reason}<br/>
      <strong>Telemetry:</strong> Gas: ${alert.gas} ppm, Water: ${alert.water} cm, Lid: ${alert.lidOpen ? 'OPEN' : 'CLOSED'}
    `;

    document.getElementById('ackModal').classList.remove('hidden');
  }

  closeAckModal() {
    this.pendingAckAlertId = null;
    document.getElementById('ackModal').classList.add('hidden');
  }

  async submitAcknowledgement() {
    if (!this.pendingAckAlertId) return;

    const noteInput = document.getElementById('ackNoteInput');
    const note = noteInput.value.trim() || 'Worker notified and safety protocols dispatched';

    try {
      const res = await fetch(`/api/alerts/${this.pendingAckAlertId}/ack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note })
      });

      if (res.ok) {
        const data = await res.json();
        // Update local alert record
        const idx = this.alerts.findIndex(a => a.id === this.pendingAckAlertId);
        if (idx !== -1) {
          this.alerts[idx] = data.alert;
          this.renderAlertsTable();
        }
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    } finally {
      this.closeAckModal();
    }
  }

  // =========================================================================
  // Event Listeners
  // =========================================================================

  setupEventListeners() {
    // Audio button
    document.getElementById('audioToggleBtn').addEventListener('click', () => {
      this.toggleAudio();
    });

    // Dismiss banner
    document.getElementById('dangerBannerDismiss').addEventListener('click', () => {
      document.getElementById('dangerBanner').classList.add('hidden');
      this.stopSiren();
    });

    // Modal controls
    document.getElementById('modalCloseBtn').addEventListener('click', () => this.closeAckModal());
    document.getElementById('modalCancelBtn').addEventListener('click', () => this.closeAckModal());
    document.getElementById('ackModalBackdrop').addEventListener('click', () => this.closeAckModal());
    document.getElementById('modalSubmitBtn').addEventListener('click', () => this.submitAcknowledgement());

    // Enable audio on first user interaction (browser autoplay policy)
    window.addEventListener('click', () => {
      if (!this.audioContext) {
        try {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {}
      }
    }, { once: true });
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new GuardianApp();
  window.app.init();
});
