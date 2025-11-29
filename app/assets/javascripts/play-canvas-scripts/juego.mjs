import { Script, registerScript } from 'playcanvas';

export class JuegoScript extends Script {
  static scriptName = 'juegoScript';

  initialize() {
    this._hasGeolocation =
      typeof navigator !== 'undefined' && !!navigator.geolocation;

    this._debugElement = null;
    this._pendingRequest = false;
    this._latestLatitude = null;
    this._latestLongitude = null;
    this._lastUpdateAt = null;
    this._accumulator = 0;
    this._pollInterval = Math.max(this.pollIntervalSeconds ?? 1, 0.25);

    if (!this._hasGeolocation) {
      console.warn('[JuegoScript] navigator.geolocation unavailable');
      this._updateHUD(null, null, { message: 'Geolocation unavailable' });
      return;
    }

    this.app.on('update', this._handleUpdate, this);
    this._requestPosition();
  }

  destroy() {
    this.app.off('update', this._handleUpdate, this);
  }

  _handleUpdate(dt) {
    if (!this._hasGeolocation) return;
    this._accumulator += dt;
    if (this._accumulator >= this._pollInterval) {
      this._accumulator = 0;
      this._requestPosition();
    }
  }

  _requestPosition() {
    if (this._pendingRequest) return;
    this._pendingRequest = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this._pendingRequest = false;
        this._onPositionSuccess(position);
      },
      (err) => {
        this._pendingRequest = false;
        console.error('[JuegoScript] getCurrentPosition error', err);
        this._updateHUD(null, null, err);
      },
      {
        enableHighAccuracy: !!this.enableHighAccuracy,
        maximumAge: Math.max(this.maximumAge ?? 0, 0),
        timeout: Math.max(this.timeout ?? 5000, 1000),
      }
    );
  }

  _onPositionSuccess(position) {
    const { latitude, longitude } = position.coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    this._latestLatitude = latitude;
    this._latestLongitude = longitude;
    this._lastUpdateAt = new Date();

    this._updateHUD(latitude, longitude);
  }

  _updateHUD(lat, lon, error = null) {
    if (typeof document === 'undefined') return;
    if (!this._debugElement || !document.body.contains(this._debugElement)) {
      this._debugElement = document.getElementById('debug-text');
    }
    if (!this._debugElement) return;

    const latText = Number.isFinite(lat) ? lat.toFixed(4) : '----';
    const lonText = Number.isFinite(lon) ? lon.toFixed(4) : '----';
    const timestampText = this._lastUpdateAt
      ? this._lastUpdateAt.toLocaleTimeString()
      : '--:--:--';
    const statusText = error
      ? `Error: ${error.message || error.code || 'unknown'}`
      : this._hasGeolocation
      ? 'OK'
      : 'Unavailable';

    // const lines = [
    //   `Lat ${latText}`,
    //   `Lon ${lonText}`,
    //   `Updated ${timestampText}`,
    //   `Status ${statusText}`,
    // ];

    const lines = [
        `Lat ${latText}`,
        `Lon ${lonText}`,
      ];

    this._debugElement.textContent = lines.join('\n');
  }
}

JuegoScript.swap = function (old) {
  Object.assign(this.prototype, old.prototype);
};

const globalScope = typeof window !== 'undefined' ? window : globalThis;
const registeredScripts =
  globalScope.__pcRegisteredScripts ||
  (globalScope.__pcRegisteredScripts = new Set());

if (!registeredScripts.has(JuegoScript.scriptName)) {
  registerScript(JuegoScript, JuegoScript.scriptName);
  registeredScripts.add(JuegoScript.scriptName);
}

const attrs = JuegoScript.attributes;
if (attrs && !attrs.has?.('pollIntervalSeconds')) {
  attrs.add('pollIntervalSeconds', {
    type: 'number',
    default: 1,
    min: 0.25,
    max: 60,
  });
  attrs.add('enableHighAccuracy', {
    type: 'boolean',
    default: true,
  });
  attrs.add('maximumAge', {
    type: 'number',
    default: 0,
    min: 0,
  });
  attrs.add('timeout', {
    type: 'number',
    default: 5000,
    min: 1000,
  });
}
