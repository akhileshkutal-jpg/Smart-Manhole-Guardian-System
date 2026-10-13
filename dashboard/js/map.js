/**
 * Smart Manhole Guardian System - Leaflet GIS Map Engine
 * Manages geographical markers, status pins, pulsing danger waves, and popups.
 */

class ManholeMap {
  constructor(containerId = 'map') {
    this.containerId = containerId;
    this.map = null;
    this.markers = new Map(); // deviceId -> Leaflet marker instance
    this.defaultCenter = [28.6315, 77.2205]; // New Delhi Municipal Council Area
    this.defaultZoom = 15;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;

    // Create Leaflet map instance
    this.map = L.map(this.containerId, {
      zoomControl: true,
      attributionControl: true
    }).setView(this.defaultCenter, this.defaultZoom);

    // Dark styled basemap tiles (CartoDB Dark Matter)
    const darkTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    });

    // Fallback standard OSM layer
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    });

    darkTileLayer.addTo(this.map);

    this.isInitialized = true;
    console.log('🗺️ Leaflet Map initialized.');
  }

  /**
   * Generates a styled custom HTML div icon reflecting status
   */
  createMarkerIcon(status) {
    const isDanger = status === 'DANGER';
    const isWarning = status === 'WARNING';
    const isOffline = status === 'OFFLINE';

    let symbol = '✓';
    if (isDanger) symbol = '!';
    else if (isWarning) symbol = '⚠';
    else if (isOffline) symbol = '✕';

    const pulseRing = isDanger ? '<div class="marker-pulse-ring"></div>' : '';
    const dangerClass = isDanger ? 'pulsing-danger-marker' : '';

    const html = `
      <div class="custom-map-marker ${dangerClass}">
        ${pulseRing}
        <div class="marker-pin ${status}">${symbol}</div>
      </div>
    `;

    return L.divIcon({
      html: html,
      className: 'leaflet-custom-node',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -16]
    });
  }

  /**
   * Update or create a marker for a given manhole device
   */
  updateMarker(device) {
    if (!this.map) return;

    const { deviceId, name, lat, lng, status, gas, water, lidOpen, statusReason } = device;
    const icon = this.createMarkerIcon(status);

    let marker = this.markers.get(deviceId);

    const popupContent = `
      <div class="popup-container">
        <div class="popup-title">${deviceId} - ${name}</div>
        <div class="popup-row"><span>Status:</span> <strong class="device-item-status ${status}">${status}</strong></div>
        <div class="popup-row"><span>Toxic Gas:</span> <strong>${gas} ppm</strong></div>
        <div class="popup-row"><span>Water Level:</span> <strong>${water} cm</strong></div>
        <div class="popup-row"><span>Lid State:</span> <strong>${lidOpen ? '⚠️ OPEN' : '🔒 SECURE'}</strong></div>
        <div class="popup-row" style="margin-top:6px; font-size:0.75rem; color:#9ca3af;"><em>${statusReason || 'All nominal'}</em></div>
      </div>
    `;

    if (!marker) {
      // Create new marker
      marker = L.marker([lat, lng], { icon }).addTo(this.map);
      marker.bindPopup(popupContent);

      marker.on('click', () => {
        if (window.app && typeof window.app.selectDevice === 'function') {
          window.app.selectDevice(deviceId);
        }
      });

      this.markers.set(deviceId, marker);
    } else {
      // Update existing marker
      marker.setLatLng([lat, lng]);
      marker.setIcon(icon);
      marker.setPopupContent(popupContent);
    }
  }

  /**
   * Smoothly pan and zoom to target device coordinates
   */
  focusDevice(deviceId) {
    const marker = this.markers.get(deviceId);
    if (marker && this.map) {
      const latLng = marker.getLatLng();
      this.map.flyTo(latLng, 16, { duration: 1 });
      marker.openPopup();
    }
  }

  /**
   * Fit map bounds to encompass all active markers
   */
  fitAllBounds() {
    if (this.markers.size === 0 || !this.map) return;
    const group = L.featureGroup(Array.from(this.markers.values()));
    this.map.fitBounds(group.getBounds().pad(0.2));
  }
}

window.ManholeMap = ManholeMap;
