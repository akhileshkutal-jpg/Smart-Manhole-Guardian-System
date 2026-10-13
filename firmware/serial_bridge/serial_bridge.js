/**
 * Smart Manhole Guardian System - USB Serial Bridge
 * Reads live JSON telemetry from Arduino Uno over USB Serial Port (COM / tty)
 * and forwards it via HTTP POST to the local Express backend.
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const SERVER_URL = process.env.API_URL || 'http://localhost:3000/api/data';
const BAUD_RATE = 9600;
const SPECIFIED_PORT = process.env.SERIAL_PORT || null;

async function startBridge() {
  console.log('\n=============================================================');
  console.log('🔌 SMART MANHOLE GUARDIAN - USB SERIAL BRIDGE');
  console.log('=============================================================');

  // List available serial ports
  const ports = await SerialPort.list();
  console.log(`Discovered ${ports.length} serial device(s):`);
  ports.forEach(p => console.log(` - Port: ${p.path} | Manufacturer: ${p.manufacturer || 'N/A'}`));

  let targetPortPath = SPECIFIED_PORT;

  if (!targetPortPath) {
    // Attempt auto-detection of Arduino
    const arduino = ports.find(p => 
      (p.manufacturer && p.manufacturer.toLowerCase().includes('arduino')) ||
      (p.path && p.path.toLowerCase().includes('usb'))
    );

    if (arduino) {
      targetPortPath = arduino.path;
      console.log(`🎯 Auto-selected detected Arduino port: ${targetPortPath}`);
    } else if (ports.length > 0) {
      targetPortPath = ports[0].path;
      console.log(`⚠️ Defaulting to first available port: ${targetPortPath}`);
    } else {
      console.error('\n❌ No USB Serial devices found!');
      console.log('Please connect your Arduino Uno via USB, or specify port:');
      console.log('Example: SERIAL_PORT=COM3 node serial_bridge.js\n');
      process.exit(1);
    }
  }

  const port = new SerialPort({ path: targetPortPath, baudRate: BAUD_RATE });
  const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

  port.on('open', () => {
    console.log(`✅ Serial connection opened on ${targetPortPath} at ${BAUD_RATE} baud.`);
    console.log(`📡 Forwarding incoming JSON packets to: ${SERVER_URL}\n`);
  });

  parser.on('data', async (line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
      console.log(`[RAW SERIAL] ${trimmed}`);
      return;
    }

    try {
      const parsed = JSON.parse(trimmed);
      console.log(`📥 Telemetry [${parsed.deviceId || 'DEV'}]: Gas=${parsed.gas}ppm | Water=${parsed.water}cm | Lid=${parsed.lidOpen} | Status=${parsed.status}`);

      // Forward to backend
      const res = await fetch(SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: trimmed
      });

      if (!res.ok) {
        console.warn(`⚠️ Backend responded with HTTP status ${res.status}`);
      }
    } catch (err) {
      console.error('❌ Error processing/forwarding packet:', err.message);
    }
  });

  port.on('error', (err) => {
    console.error('❌ Serial port error:', err.message);
  });
}

startBridge();
