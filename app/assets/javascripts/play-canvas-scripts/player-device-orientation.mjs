import { Script, registerScript, math } from 'playcanvas';

const clamp01 = (value) => {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
};

const wrapDegrees = (deg) => {
  const result = ((deg % 360) + 360) % 360;
  return result === 360 ? 0 : result;
};

const shortestAngleDelta = (from, to) => {
  const difference = wrapDegrees(to) - wrapDegrees(from);
  if (difference > 180) return difference - 360;
  if (difference < -180) return difference + 360;
  return difference;
};

export class PlayerDeviceOrientation extends Script {
  static scriptName = 'playerDeviceOrientation';

  initialize() {
    this._hasSensor =
      typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;

    this._listenerActive = false;
    this._permissionState = 'unknown';
    this._orientationHandler = this._handleOrientation.bind(this);
    this._visibilityHandler = this._handleVisibilityChange.bind(this);
    this._pendingPermissionHandler = null;

    this._targetHeading = this.entity.getLocalEulerAngles().y || 0;
    this._currentHeading = this._targetHeading;

    this._smoothing = clamp01(this.smoothing ?? 0.35);
    this._deadZone = Math.max(0, this.deadZoneDegrees ?? 1.0);

    if (!this._hasSensor) {
      console.warn('[PlayerDeviceOrientation] DeviceOrientationEvent unavailable');
      return;
    }

    this.app.on('update', this._updateRotation, this);
    document.addEventListener('visibilitychange', this._visibilityHandler);

    this._setupSensor();
  }

  destroy() {
    this.app.off('update', this._updateRotation, this);
    document.removeEventListener('visibilitychange', this._visibilityHandler);
    this._removePermissionListeners();
    this._disableListener();
  }

  _setupSensor() {
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      this._preparePermissionRequest();
    } else {
      this._permissionState = 'granted';
      this._enableListener();
    }
  }

  _preparePermissionRequest() {
    if (this._pendingPermissionHandler) return;

    this._pendingPermissionHandler = async () => {
      try {
        const response = await DeviceOrientationEvent.requestPermission();
        this._permissionState = response;
        if (response === 'granted') {
          this._enableListener();
        } else {
          console.warn(
            `[PlayerDeviceOrientation] Motion permission ${response}. Rotation will not update.`
          );
          this._disableListener();
        }
      } catch (err) {
        this._permissionState = 'denied';
        console.error(
          '[PlayerDeviceOrientation] Failed to request motion permission',
          err
        );
      } finally {
        this._removePermissionListeners();
      }
    };

    const opts = { passive: true };
    window.addEventListener('pointerdown', this._pendingPermissionHandler, opts);
    window.addEventListener('touchend', this._pendingPermissionHandler, opts);
    window.addEventListener('keyup', this._pendingPermissionHandler, opts);
  }

  _removePermissionListeners() {
    if (!this._pendingPermissionHandler) return;
    window.removeEventListener('pointerdown', this._pendingPermissionHandler);
    window.removeEventListener('touchend', this._pendingPermissionHandler);
    window.removeEventListener('keyup', this._pendingPermissionHandler);
    this._pendingPermissionHandler = null;
  }

  _enableListener() {
    if (this._listenerActive) return;
    window.addEventListener('deviceorientation', this._orientationHandler);
    this._listenerActive = true;
  }

  _disableListener() {
    if (!this._listenerActive) return;
    window.removeEventListener('deviceorientation', this._orientationHandler);
    this._listenerActive = false;
  }

  _handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      this._disableListener();
    } else if (
      this._hasSensor &&
      (this._permissionState === 'granted' || this._permissionState === 'unknown')
    ) {
      this._enableListener();
    }
  }

  _handleOrientation(event) {
    let heading = null;

    if (typeof event.webkitCompassHeading === 'number') {
      heading = event.webkitCompassHeading;
    } else if (
      event.absolute === true &&
      typeof event.alpha === 'number' &&
      Number.isFinite(event.alpha)
    ) {
      heading = 360 - event.alpha;
    } else if (
      this.allowRelativeHeading &&
      typeof event.alpha === 'number' &&
      Number.isFinite(event.alpha)
    ) {
      heading = 360 - event.alpha;
    }

    if (!Number.isFinite(heading)) {
      return;
    }

    heading = wrapDegrees(heading + (this.headingOffset || 0));
    this._targetHeading = heading;

    if (!Number.isFinite(this._currentHeading)) {
      this._currentHeading = heading;
    }
  }

  _updateRotation() {
    if (!Number.isFinite(this._targetHeading)) {
      return;
    }

    if (!Number.isFinite(this._currentHeading)) {
      this._currentHeading = this._targetHeading;
    }

    const delta = shortestAngleDelta(this._currentHeading, this._targetHeading);
    if (Math.abs(delta) < this._deadZone) {
      return;
    }

    const factor = this._smoothing;
    if (factor <= 0) {
      this._currentHeading = this._targetHeading;
    } else if (factor >= 1) {
      this._currentHeading = this._targetHeading;
    } else {
      this._currentHeading = math.lerpAngle(
        this._currentHeading,
        this._targetHeading,
        factor
      );
    }

    this.entity.setLocalEulerAngles(0, this._currentHeading, 0);
  }
}

PlayerDeviceOrientation.swap = function (old) {
  Object.assign(this.prototype, old.prototype);
};

const globalScope = typeof window !== 'undefined' ? window : globalThis;
const registeredScripts =
  globalScope.__pcRegisteredScripts ||
  (globalScope.__pcRegisteredScripts = new Set());

if (!registeredScripts.has(PlayerDeviceOrientation.scriptName)) {
  registerScript(PlayerDeviceOrientation, PlayerDeviceOrientation.scriptName);
  registeredScripts.add(PlayerDeviceOrientation.scriptName);
}

const attrs = PlayerDeviceOrientation.attributes;
if (attrs && !attrs.has?.('headingOffset')) {
  attrs.add('headingOffset', {
    type: 'number',
    default: 0,
  });
  attrs.add('smoothing', {
    type: 'number',
    default: 0.35,
    min: 0,
    max: 1,
  });
  attrs.add('deadZoneDegrees', {
    type: 'number',
    default: 1,
    min: 0,
  });
  attrs.add('allowRelativeHeading', {
    type: 'boolean',
    default: false,
  });
}


