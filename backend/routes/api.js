/**
 * Smart Manhole Guardian System - REST API Routes
 */

const express = require('express');

function createApiRouter(store, telegramService, io) {
  const router = express.Router();

  /**
   * POST /api/data
   * Ingest telemetry from physical Arduino/ESP8266 units or simulator
   * Body: { deviceId, name, lat, lng, gas, water, lidOpen, status }
   */
  router.post('/data', (req, res) => {
    try {
      const payload = req.body;
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ error: 'Invalid JSON payload' });
      }

      // Record reading in store
      const result = store.recordReading(payload);

      // Broadcast telemetry to connected dashboard clients
      if (io) {
        io.emit('sensor_update', result.reading);
        io.emit('device_list_update', store.getDevices());
        if (result.alert) {
          io.emit('new_alert', result.alert);
        }
      }

      return res.status(200).json({
        success: true,
        data: result.reading,
        alert: result.alert
      });
    } catch (err) {
      console.error('Error handling /api/data:', err);
      return res.status(500).json({ error: 'Internal server error processing sensor data' });
    }
  });

  /**
   * GET /api/devices
   * Retrieve list of all registered manholes sorted by severity
   */
  router.get('/devices', (req, res) => {
    try {
      const devices = store.getDevices();
      return res.json({
        count: devices.length,
        devices
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/devices/:id
   * Retrieve telemetry for a specific manhole
   */
  router.get('/devices/:id', (req, res) => {
    const device = store.getDevice(req.params.id);
    if (!device) {
      return res.status(404).json({ error: 'Manhole device not found' });
    }
    return res.json(device);
  });

  /**
   * GET /api/history
   * Retrieve recent readings history
   * Optional queries: ?deviceId=MH-101&limit=50
   */
  router.get('/history', (req, res) => {
    const deviceId = req.query.deviceId || null;
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);
    const readings = store.getReadings(deviceId, limit);
    return res.json({
      count: readings.length,
      readings
    });
  });

  /**
   * GET /api/alerts
   * Retrieve all logged alerts
   */
  router.get('/alerts', (req, res) => {
    const deviceId = req.query.deviceId || null;
    const alerts = store.getAlerts(deviceId);
    return res.json({
      count: alerts.length,
      alerts
    });
  });

  /**
   * POST /api/alerts/:id/ack
   * Acknowledge an alert ("worker notified / resolved")
   * Body: { note: "Worker team dispatched to site with ventilation blower" }
   */
  router.post('/alerts/:id/ack', (req, res) => {
    const alertId = req.params.id;
    const note = req.body.note || 'Worker notified and safety protocol initiated';
    const updated = store.acknowledgeAlert(alertId, note);

    if (!updated) {
      return res.status(404).json({ error: 'Alert ID not found' });
    }

    if (io) {
      io.emit('alert_ack', updated);
      io.emit('device_list_update', store.getDevices());
    }

    return res.json({
      success: true,
      alert: updated
    });
  });

  /**
   * GET /api/alerts/export
   * Export alert history as CSV
   */
  router.get('/alerts/export', (req, res) => {
    try {
      const csvData = store.getAlertsCsv();
      const filename = `manhole_alerts_${Date.now()}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csvData);
    } catch (err) {
      console.error('Error generating CSV export:', err);
      return res.status(500).json({ error: 'Failed to generate alert CSV' });
    }
  });

  /**
   * GET /api/config
   * Return server metadata and system configuration
   */
  router.get('/config', (req, res) => {
    return res.json({
      name: 'Smart Manhole Guardian System API',
      version: '1.0.0',
      telegram: {
        isMock: telegramService.isMock,
        cooldownSeconds: telegramService.cooldownSeconds
      },
      thresholds: store.thresholds,
      offlineTimeoutSeconds: Math.round(store.offlineTimeoutMs / 1000)
    });
  });

  return router;
}

module.exports = createApiRouter;
