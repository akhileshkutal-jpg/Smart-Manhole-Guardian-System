/**
 * Smart Manhole Guardian System - Simulation Engine
 * Simulates 5 physical IoT manhole sensor nodes deployed across a city grid.
 * Emulates realistic gas fluctuations, monsoon water rises, lid tampering,
 * recovery phases, and network dropouts for offline detection.
 */

class ManholeSimulator {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || `http://localhost:${options.port || process.env.PORT || 3000}/api/data`;
    this.intervalMs = options.intervalMs || 2000;
    this.isRunning = false;
    this.timer = null;
    this.cycleCount = 0;

    // 5 Geographically distributed manholes (Connaught Place municipal sector, New Delhi)
    this.devices = [
      {
        deviceId: 'MH-101',
        name: 'Connaught Place Radial 1',
        lat: 28.6328,
        lng: 77.2197,
        baseGas: 160,
        baseWater: 22,
        gasVariance: 15,
        waterVariance: 3,
        currentGas: 160,
        currentWater: 22,
        lidOpen: false,
        activeIncident: null,
        incidentTimer: 0,
        pauseTransmissionUntil: 0
      },
      {
        deviceId: 'MH-102',
        name: 'Janpath Market Crossing',
        lat: 28.6276,
        lng: 77.2185,
        baseGas: 210,
        baseWater: 28,
        gasVariance: 20,
        waterVariance: 4,
        currentGas: 210,
        currentWater: 28,
        lidOpen: false,
        activeIncident: null,
        incidentTimer: 0,
        pauseTransmissionUntil: 0
      },
      {
        deviceId: 'MH-103',
        name: 'Barakhamba Metro Gate 3',
        lat: 28.6305,
        lng: 77.2270,
        baseGas: 140,
        baseWater: 18,
        gasVariance: 10,
        waterVariance: 2,
        currentGas: 140,
        currentWater: 18,
        lidOpen: false,
        activeIncident: null,
        incidentTimer: 0,
        pauseTransmissionUntil: 0
      },
      {
        deviceId: 'MH-104',
        name: 'Shivaji Stadium Terminal',
        lat: 28.6335,
        lng: 77.2132,
        baseGas: 190,
        baseWater: 30,
        gasVariance: 15,
        waterVariance: 3,
        currentGas: 190,
        currentWater: 30,
        lidOpen: false,
        activeIncident: null,
        incidentTimer: 0,
        pauseTransmissionUntil: 0
      },
      {
        deviceId: 'MH-105',
        name: 'KG Marg Sewer Trunkline',
        lat: 28.6250,
        lng: 77.2238,
        baseGas: 180,
        baseWater: 25,
        gasVariance: 15,
        waterVariance: 3,
        currentGas: 180,
        currentWater: 25,
        lidOpen: false,
        activeIncident: null,
        incidentTimer: 0,
        pauseTransmissionUntil: 0
      }
    ];
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('📡 [SIMULATOR] Multi-Manhole Simulation Engine started.');
    console.log(`   Simulating 5 smart manholes transmitting telemetry to: ${this.apiUrl}`);

    this.timer = setInterval(() => this.tick(), this.intervalMs);
    // Trigger initial tick immediately
    this.tick();
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    clearInterval(this.timer);
    console.log('🛑 [SIMULATOR] Simulation stopped.');
  }

  tick() {
    this.cycleCount++;
    const now = Date.now();

    // Periodically trigger realistic incidents for faculty demonstration:
    // Every 12 cycles (~24s), trigger an incident on a rotating node
    if (this.cycleCount % 12 === 0) {
      this.triggerRandomIncident();
    }

    // Every 45 cycles (~90s), simulate a temporary 35-second network drop on MH-105
    // to demonstrate the device OFFLINE detection (grey badge on map & dashboard)
    if (this.cycleCount % 45 === 0) {
      const dev5 = this.devices.find(d => d.deviceId === 'MH-105');
      if (dev5) {
        console.log('\n📶 [SIMULATOR] Simulating 35-second IoT network dropout on MH-105 (Offline detection demo)...');
        dev5.pauseTransmissionUntil = now + 35000;
      }
    }

    // Process and dispatch telemetry for each device
    for (const dev of this.devices) {
      // Check if device transmission is currently paused (offline simulation)
      if (dev.pauseTransmissionUntil > now) {
        continue; // Do not send data, allowing server's 30s offline timer to trigger
      }

      this.updateDeviceTelemetry(dev);
      this.sendTelemetry(dev);
    }
  }

  triggerRandomIncident() {
    const incidentTypes = ['GAS_DANGER', 'WATER_DANGER', 'LID_TAMPER', 'GAS_WARNING'];
    const chosenType = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
    
    // Pick an idle device without active incident
    const availableDevices = this.devices.filter(d => !d.activeIncident && d.pauseTransmissionUntil <= Date.now());
    if (availableDevices.length === 0) return;

    const targetDevice = availableDevices[Math.floor(Math.random() * availableDevices.length)];
    targetDevice.activeIncident = chosenType;
    targetDevice.incidentTimer = 7; // Remains active for ~7 cycles (14 seconds)

    console.log(`\n⚡ [SIMULATOR INCIDENT] Triggered ${chosenType} on ${targetDevice.deviceId} (${targetDevice.name})`);
  }

  updateDeviceTelemetry(dev) {
    if (dev.activeIncident) {
      dev.incidentTimer--;

      switch (dev.activeIncident) {
        case 'GAS_DANGER':
          // Toxic gas spike reaching 600 - 750 ppm
          dev.currentGas = 620 + Math.floor(Math.random() * 120);
          dev.currentWater = dev.baseWater + Math.floor(Math.random() * 5);
          dev.lidOpen = false;
          break;

        case 'WATER_DANGER':
          // Monsoon flood rising to 82 - 95 cm
          dev.currentGas = dev.baseGas + Math.floor(Math.random() * 20);
          dev.currentWater = 84 + Math.floor(Math.random() * 12);
          dev.lidOpen = false;
          break;

        case 'LID_TAMPER':
          // Manhole lid opened / stolen / maintenance breach
          dev.currentGas = dev.baseGas + Math.floor(Math.random() * 20);
          dev.currentWater = dev.baseWater + Math.floor(Math.random() * 5);
          dev.lidOpen = true;
          break;

        case 'GAS_WARNING':
          // Elevated gas accumulation (340 - 420 ppm)
          dev.currentGas = 350 + Math.floor(Math.random() * 60);
          dev.currentWater = dev.baseWater + Math.floor(Math.random() * 5);
          dev.lidOpen = false;
          break;
      }

      if (dev.incidentTimer <= 0) {
        console.log(`✅ [SIMULATOR RECOVERY] Incident cleared on ${dev.deviceId}. Returning to SAFE baseline.`);
        dev.activeIncident = null;
        dev.lidOpen = false;
      }
    } else {
      // Normal baseline with slight realistic analog fluctuation
      const gasNoise = Math.floor((Math.random() * dev.gasVariance * 2) - dev.gasVariance);
      const waterNoise = Math.floor((Math.random() * dev.waterVariance * 2) - dev.waterVariance);

      dev.currentGas = Math.max(80, dev.baseGas + gasNoise);
      dev.currentWater = Math.max(5, dev.baseWater + waterNoise);
      dev.lidOpen = false;
    }
  }

  async sendTelemetry(dev) {
    const payload = {
      deviceId: dev.deviceId,
      name: dev.name,
      lat: dev.lat,
      lng: dev.lng,
      gas: dev.currentGas,
      water: dev.currentWater,
      lidOpen: dev.lidOpen
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        console.warn(`[SIMULATOR] Server returned ${response.status} for ${dev.deviceId}`);
      }
    } catch (err) {
      // Silently catch if server is still spinning up
    }
  }
}

// Allow direct execution: `node backend/simulator.js`
if (require.main === module) {
  require('dotenv').config();
  const simulator = new ManholeSimulator();
  simulator.start();
}

module.exports = ManholeSimulator;
