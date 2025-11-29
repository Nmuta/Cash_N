import { Script, registerScript, Vec3, math } from 'playcanvas';

const EARTH_RADIUS_METERS = 6378137;
const DEG_TO_RAD = Math.PI / 180;

export class PlayerGeolocation extends Script {
  static scriptName = 'playerGeolocation';

  initialize() {
    this._hasGeolocation =
      typeof navigator !== 'undefined' && !!navigator.geolocation;

    this.baseHeight = this.entity.getLocalPosition().y;
    this._emaPos = this.entity.getLocalPosition().clone();
    this._cameraTarget = new Vec3();
    this._cameraPos = new Vec3();
    this._currentLatitude = null;
    this._currentLongitude = null;
    this._latestAccuracy = null;
    this._latestSpeed = null;
    this._lastStepMeters = null;
    this._lastGateMeters = null;
    this._lastMoveAccepted = false;
    this._targetXZ = { x: this._emaPos.x, z: this._emaPos.z };
    this._smoothedXZ = { x: this._emaPos.x, z: this._emaPos.z };
    this._predictedXZ = { x: this._emaPos.x, z: this._emaPos.z };
    this._velocityXZ = { x: 0, z: 0 };
    this._deadReckonedVelocity = { x: 0, z: 0 };
    this._lastDerivedSpeed = 0;
    this._cameraLastOffset = { x: 0, y: 0, z: 0 };
    this._framesSinceFix = null;
    this._msSinceFix = null;
    this._lastFixTimestamp = null;
    this._lastHeadingSource = 'n/a';
    this._lastHeadingDeg = this.entity.getLocalEulerAngles().y || 0;
    this._lastFixData = null;
    this._prevFixData = null;

    this.origin = null;
    this.lastXZ = null;
    this.watchId = null;

    this.cameraEntity = null;
    this._debugElement = null;
    this._resolveCamera();
    this.app.on('update', this._ensureCamera, this);
    this.app.on('update', this._handleUpdate, this);

    if (!this._hasGeolocation) {
      console.warn('[PlayerGeolocation] navigator.geolocation unavailable');
      return;
    }

    this._successHandler = this._onPositionUpdate.bind(this);
    this._errorHandler = this._onPositionError.bind(this);

    try {
      this.watchId = navigator.geolocation.watchPosition(
        this._successHandler,
        this._errorHandler,
        {
          enableHighAccuracy: this.enableHighAccuracy,
          maximumAge: this.maximumAge,
          timeout: this.timeout,
        }
      );
    } catch (err) {
      console.error('[PlayerGeolocation] Failed to start watchPosition', err);
    }
  }

  destroy() {
    this.app.off('update', this._ensureCamera, this);
    this.app.off('update', this._handleUpdate, this);
    if (this.watchId !== null && navigator.geolocation?.clearWatch) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  _ensureCamera() {
    if (!this.cameraEntity) {
      this._resolveCamera();
    }
  }

  _resolveCamera() {
    const name = this.cameraEntityName || 'camera';
    const entity = this.app.root.findByName(name);
    if (!entity) {
      return;
    }

    this.cameraEntity = entity;
    this._cameraPos.copy(this.cameraEntity.getLocalPosition());
  }

  _latLonToXZ(lat0, lon0, lat, lon) {
    const lat0r = lat0 * DEG_TO_RAD;
    const x =
      (lon - lon0) * DEG_TO_RAD * Math.cos(lat0r) * EARTH_RADIUS_METERS;
    const z = -(lat - lat0) * DEG_TO_RAD * EARTH_RADIUS_METERS;
    return { x, z };
  }

  _setPlayerXZ(x, z) {
    this._applySmoothedPosition(x, z, this.smoothing);
  }

  _applySmoothedPosition(targetX, targetZ, factor = this.smoothing) {
    const lerpFactor = math.clamp(
      Number.isFinite(factor) ? factor : this.smoothing,
      0,
      1
    );
    const blendedX = math.lerp(this._emaPos.x, targetX, lerpFactor);
    const blendedZ = math.lerp(this._emaPos.z, targetZ, lerpFactor);

    this._emaPos.set(blendedX, this.baseHeight, blendedZ);
    this.entity.setLocalPosition(this._emaPos);
    if (this._smoothedXZ) {
      this._smoothedXZ.x = this._emaPos.x;
      this._smoothedXZ.z = this._emaPos.z;
    }
    this._updateCamera();
  }

  _updateCamera() {
    if (!this.cameraEntity) return;

    const targetX = this._emaPos.x + this.cameraHorizontalOffset;
    const targetY = this.baseHeight + this.cameraHeight;
    const targetZ = this._emaPos.z + this.cameraDistance;
    this._cameraTarget.set(targetX, targetY, targetZ);

    if (this.cameraFollowLerp > 0 && this.cameraFollowLerp < 1) {
      const currentPos = this.cameraEntity.getLocalPosition();
      this._cameraPos.lerp(currentPos, this._cameraTarget, this.cameraFollowLerp);
      this.cameraEntity.setLocalPosition(this._cameraPos);
    } else {
      this.cameraEntity.setLocalPosition(this._cameraTarget);
    }

    this.cameraEntity.lookAt(
      this._emaPos.x,
      this.baseHeight + this.cameraLookAtOffset,
      this._emaPos.z
    );

    const camPos = this.cameraEntity.getLocalPosition();
    if (this._cameraLastOffset) {
      this._cameraLastOffset.x = camPos.x - this._emaPos.x;
      this._cameraLastOffset.y = camPos.y - this._emaPos.y;
      this._cameraLastOffset.z = camPos.z - this._emaPos.z;
    }
  }

  _updateHeading(dx, dz, coords) {
    let yawDeg;
    let source;
    if (
      Number.isFinite(coords.heading) &&
      (coords.speed || 0) > this.headingSpeedThreshold
    ) {
      yawDeg = coords.heading;
      source = 'gps';
    } else {
      yawDeg = (Math.atan2(dx, -dz) * 180) / Math.PI;
      source = 'vector';
    }
    if (!Number.isFinite(yawDeg)) return;

    const finalYaw = yawDeg + this.headingOffset;
    this.entity.setLocalEulerAngles(0, finalYaw, 0);
    this._lastHeadingDeg = finalYaw;
    this._lastHeadingSource = source;
  }

  _onPositionUpdate(position) {
    const { latitude, longitude, accuracy, heading, speed } = position.coords;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    const timestamp =
      typeof position.timestamp === 'number' ? position.timestamp : Date.now();

    this._currentLatitude = latitude;
    this._currentLongitude = longitude;
    this._latestAccuracy = Number.isFinite(accuracy) ? accuracy : null;
    this._latestSpeed = Number.isFinite(speed) ? speed : null;
    this._lastFixTimestamp = timestamp;
    this._framesSinceFix = 0;
    this._msSinceFix = 0;
    this._updateDebugDisplay(latitude, longitude);

    if (!this.origin) {
      this.origin = { lat: latitude, lon: longitude };
      const current = this.entity.getLocalPosition();
      this.lastXZ = { x: current.x, z: current.z };
      if (this._targetXZ) {
        this._targetXZ.x = current.x;
        this._targetXZ.z = current.z;
      }
      if (this._predictedXZ) {
        this._predictedXZ.x = current.x;
        this._predictedXZ.z = current.z;
      }
      this._velocityXZ.x = 0;
      this._velocityXZ.z = 0;
      this._lastDerivedSpeed = 0;
      this._setPlayerXZ(current.x, current.z);
      this._lastMoveAccepted = true;
      this._lastFixData = {
        timestamp,
        latitude,
        longitude,
        x: current.x,
        z: current.z,
        accuracy: accuracy ?? null,
        heading: heading ?? null,
        speed: speed ?? null,
      };
      this._prevFixData = null;
      return;
    }

    const { x, z } = this._latLonToXZ(
      this.origin.lat,
      this.origin.lon,
      latitude,
      longitude
    );

    const prevAccepted = this.lastXZ || { x, z };
    const dxAccepted = x - prevAccepted.x;
    const dzAccepted = z - prevAccepted.z;
    const step = Math.hypot(dxAccepted, dzAccepted);
    const gate = Math.max(this.minMoveMeters, (accuracy || 0) * this.accuracyGateFactor);
    this._lastStepMeters = step;
    this._lastGateMeters = gate;

    const prevFix = this._lastFixData;
    const dtSeconds =
      prevFix && Number.isFinite(prevFix.timestamp)
        ? Math.max((timestamp - prevFix.timestamp) / 1000, 0)
        : 0;

    let velocityX = 0;
    let velocityZ = 0;
    let derivedSpeed = 0;

    if (prevFix && dtSeconds > 0) {
      const vxRaw = (x - prevFix.x) / dtSeconds;
      const vzRaw = (z - prevFix.z) / dtSeconds;
      const measuredSpeed = Math.hypot(vxRaw, vzRaw);
      let blendedSpeed = measuredSpeed;

      if (Number.isFinite(speed) && speed >= 0) {
        const blendFactor = math.clamp(this.speedBlendFactor ?? 0.5, 0, 1);
        blendedSpeed = math.lerp(measuredSpeed, speed, blendFactor);
      }

      if (blendedSpeed > 0 && measuredSpeed > 0) {
        const scale = blendedSpeed / measuredSpeed;
        velocityX = vxRaw * scale;
        velocityZ = vzRaw * scale;
      }

      derivedSpeed = blendedSpeed;
    }

    let moveAccepted = false;

    if (step >= gate) {
      this.lastXZ = { x, z };
      moveAccepted = true;

      this._velocityXZ.x = velocityX;
      this._velocityXZ.z = velocityZ;
      this._lastDerivedSpeed = derivedSpeed;

      if (this._predictedXZ) {
        this._predictedXZ.x = x;
        this._predictedXZ.z = z;
      }

      this._setPlayerXZ(x, z);
      this._updateHeading(dxAccepted, dzAccepted, { heading, speed });
    } else {
      this._velocityXZ.x = 0;
      this._velocityXZ.z = 0;
      this._lastDerivedSpeed = 0;
    }

    this._lastMoveAccepted = moveAccepted;
    this._prevFixData = prevFix ? { ...prevFix } : null;
    this._lastFixData = {
      timestamp,
      latitude,
      longitude,
      x,
      z,
      accuracy: accuracy ?? null,
      heading: heading ?? null,
      speed: speed ?? null,
    };

    if (this._targetXZ) {
      this._targetXZ.x = this._lastFixData.x;
      this._targetXZ.z = this._lastFixData.z;
    }
  }

  _handleUpdate(dt) {
    this._advanceDeadReckoning(dt);
    this._updateFixCounters(dt);
    this._updateDebugDisplay(this._currentLatitude, this._currentLongitude);
  }

  _advanceDeadReckoning() {
    if (!this._lastFixData) return;

    const maxSeconds = Math.max(this.deadReckonMaxSeconds ?? 3, 0);
    const decaySeconds = math.clamp(
      this.deadReckonDecaySeconds ?? 1.5,
      0,
      maxSeconds > 0 ? maxSeconds : 0
    );
    const correctionLerp =
      this.deadReckonCorrectionLerp ?? this.smoothing ?? 0.25;
    const snapMeters = Math.max(this.deadReckonSnapMeters ?? 2, 0);
    const minHeadingSpeed = Math.max(this.minSpeedForHeading ?? 0, 0);

    const timeSinceFixSeconds = Number.isFinite(this._msSinceFix)
      ? Math.min((this._msSinceFix || 0) / 1000, maxSeconds || Number.POSITIVE_INFINITY)
      : 0;

    let velocityX = this._velocityXZ.x;
    let velocityZ = this._velocityXZ.z;

    if (
      timeSinceFixSeconds > decaySeconds &&
      maxSeconds > decaySeconds &&
      decaySeconds >= 0
    ) {
      const excess = timeSinceFixSeconds - decaySeconds;
      const decayRange = Math.max(maxSeconds - decaySeconds, 0.0001);
      const decayFactor = Math.max(0, 1 - excess / decayRange);
      velocityX *= decayFactor;
      velocityZ *= decayFactor;
    }

    const predictedX = this._lastFixData.x + velocityX * timeSinceFixSeconds;
    const predictedZ = this._lastFixData.z + velocityZ * timeSinceFixSeconds;

    if (this._predictedXZ) {
      this._predictedXZ.x = predictedX;
      this._predictedXZ.z = predictedZ;
    }
    if (this._targetXZ) {
      this._targetXZ.x = predictedX;
      this._targetXZ.z = predictedZ;
    }

    const dx = predictedX - this._emaPos.x;
    const dz = predictedZ - this._emaPos.z;
    const dist = Math.hypot(dx, dz);

    const factor =
      snapMeters > 0 && dist > snapMeters
        ? 1
        : correctionLerp;

    this._applySmoothedPosition(predictedX, predictedZ, factor);

    const speed = Math.hypot(velocityX, velocityZ);
    this._deadReckonedVelocity.x = velocityX;
    this._deadReckonedVelocity.z = velocityZ;
    this._lastDerivedSpeed = speed;

    if (speed >= minHeadingSpeed) {
      this._updateHeading(velocityX, velocityZ, { heading: NaN, speed });
    }
  }

  _updateFixCounters(dt) {
    if (this._lastFixData?.timestamp) {
      if (typeof this._framesSinceFix === 'number') {
        this._framesSinceFix += 1;
      } else {
        this._framesSinceFix = 1;
      }
      if (Number.isFinite(dt)) {
        if (!Number.isFinite(this._msSinceFix)) {
          this._msSinceFix = 0;
        }
        this._msSinceFix += dt * 1000;
      }
    } else {
      this._framesSinceFix = null;
      this._msSinceFix = null;
    }
  }

  _updateDebugDisplay(latitude, longitude) {
    if (typeof document === 'undefined') return;
    if (!this._debugElement || !document.body.contains(this._debugElement)) {
      this._debugElement = document.getElementById('debug-text');
    }
    if (this._debugElement) {
      const latText = Number.isFinite(latitude) ? latitude.toFixed(4) : '----';
      const lonText = Number.isFinite(longitude) ? longitude.toFixed(4) : '----';
      const accText = Number.isFinite(this._latestAccuracy)
        ? `${this._latestAccuracy.toFixed(1)}m`
        : '----';
      const speedText = Number.isFinite(this._latestSpeed)
        ? `${this._latestSpeed.toFixed(2)}m/s`
        : '----';
      const stepText = Number.isFinite(this._lastStepMeters)
        ? `${this._lastStepMeters.toFixed(2)}`
        : '----';
      const gateText = Number.isFinite(this._lastGateMeters)
        ? `${this._lastGateMeters.toFixed(2)}`
        : '----';
      const moveText = this._lastMoveAccepted ? 'YES' : 'no';
      const targetXText = Number.isFinite(this._targetXZ?.x)
        ? this._targetXZ.x.toFixed(2)
        : '----';
      const targetZText = Number.isFinite(this._targetXZ?.z)
        ? this._targetXZ.z.toFixed(2)
        : '----';
      const smoothXText = Number.isFinite(this._smoothedXZ?.x)
        ? this._smoothedXZ.x.toFixed(2)
        : '----';
      const smoothZText = Number.isFinite(this._smoothedXZ?.z)
        ? this._smoothedXZ.z.toFixed(2)
        : '----';
      const predictedXText = Number.isFinite(this._predictedXZ?.x)
        ? this._predictedXZ.x.toFixed(2)
        : '----';
      const predictedZText = Number.isFinite(this._predictedXZ?.z)
        ? this._predictedXZ.z.toFixed(2)
        : '----';
      const velXText = Number.isFinite(this._deadReckonedVelocity?.x)
        ? this._deadReckonedVelocity.x.toFixed(2)
        : '----';
      const velZText = Number.isFinite(this._deadReckonedVelocity?.z)
        ? this._deadReckonedVelocity.z.toFixed(2)
        : '----';
      const speedEstimateText = Number.isFinite(this._lastDerivedSpeed)
        ? `${this._lastDerivedSpeed.toFixed(2)}`
        : '----';
      const camDxText = Number.isFinite(this._cameraLastOffset?.x)
        ? this._cameraLastOffset.x.toFixed(2)
        : '----';
      const camDyText = Number.isFinite(this._cameraLastOffset?.y)
        ? this._cameraLastOffset.y.toFixed(2)
        : '----';
      const camDzText = Number.isFinite(this._cameraLastOffset?.z)
        ? this._cameraLastOffset.z.toFixed(2)
        : '----';
      const framesText = Number.isFinite(this._framesSinceFix)
        ? `${this._framesSinceFix}`
        : '----';
      const msText = Number.isFinite(this._msSinceFix)
        ? `${Math.round(this._msSinceFix)}`
        : '----';
      const headingText = Number.isFinite(this._lastHeadingDeg)
        ? `${this._lastHeadingDeg.toFixed(1)}°`
        : '----';
      const headingSource = this._lastHeadingSource || 'n/a';

      const lines = [
        `GPS lat ${latText}, lon ${lonText}`,
        `Acc ${accText} | Speed ${speedText}`,
        `Step ${stepText}m | Gate ${gateText}m | Move ${moveText}`,
        `Target XZ ${targetXText}, ${targetZText}`,
        `Smooth XZ ${smoothXText}, ${smoothZText}`,
        `Predicted XZ ${predictedXText}, ${predictedZText}`,
        `Velocity XZ ${velXText}, ${velZText} | Speed ${speedEstimateText}m/s`,
        `Cam Δ xyz ${camDxText}, ${camDyText}, ${camDzText}`,
        `Since fix ${framesText}f / ${msText}ms`,
        `Heading ${headingText} (${headingSource})`,
      ];

      this._debugElement.textContent = lines.join('\n');
    }
  }

  _onPositionError(err) {
    console.error('[PlayerGeolocation] GPS error:', err);
  }

  debugTeleportMeters(dx = 0, dz = 0) {
    if (!this.origin) {
      console.warn('Geolocation not initialised yet.');
      return;
    }
    const x = (this.lastXZ?.x || 0) + dx;
    const z = (this.lastXZ?.z || 0) + dz;
    this._setPlayerXZ(x, z);
    this.lastXZ = { x, z };
  }
  
}

PlayerGeolocation.swap = function (old) {
  Object.assign(this.prototype, old.prototype);
};

const globalScope = typeof window !== 'undefined' ? window : globalThis;
const registeredScripts =
  globalScope.__pcRegisteredScripts ||
  (globalScope.__pcRegisteredScripts = new Set());

if (!registeredScripts.has(PlayerGeolocation.scriptName)) {
  registerScript(PlayerGeolocation, PlayerGeolocation.scriptName);
  registeredScripts.add(PlayerGeolocation.scriptName);
}

const attrs = PlayerGeolocation.attributes;
if (attrs && !attrs.has?.('cameraEntityName')) {
  attrs.add('cameraEntityName', {
    type: 'string',
    default: 'camera',
  });
  attrs.add('smoothing', {
    type: 'number',
    default: 0.25,
    min: 0,
    max: 1,
  });
  attrs.add('minMoveMeters', {
    type: 'number',
    default: 0.35,
    min: 0,
  });
  attrs.add('accuracyGateFactor', {
    type: 'number',
    default: 0.3,
    min: 0,
  });
  attrs.add('headingSpeedThreshold', {
    type: 'number',
    default: 0.5,
    min: 0,
  });
  attrs.add('headingOffset', {
    type: 'number',
    default: 0,
  });
  attrs.add('cameraHeight', {
    type: 'number',
    default: 8,
  });
  attrs.add('cameraDistance', {
    type: 'number',
    default: 6,
  });
  attrs.add('cameraHorizontalOffset', {
    type: 'number',
    default: 0,
  });
  attrs.add('cameraLookAtOffset', {
    type: 'number',
    default: 1.5,
  });
  attrs.add('cameraFollowLerp', {
    type: 'number',
    default: 0.15,
    min: 0,
    max: 1,
  });
  attrs.add('speedBlendFactor', {
    type: 'number',
    default: 0.5,
    min: 0,
    max: 1,
  });
  attrs.add('deadReckonMaxSeconds', {
    type: 'number',
    default: 4,
    min: 0,
  });
  attrs.add('deadReckonDecaySeconds', {
    type: 'number',
    default: 1.5,
    min: 0,
  });
  attrs.add('deadReckonCorrectionLerp', {
    type: 'number',
    default: 0.35,
    min: 0,
    max: 1,
  });
  attrs.add('deadReckonSnapMeters', {
    type: 'number',
    default: 3,
    min: 0,
  });
  attrs.add('minSpeedForHeading', {
    type: 'number',
    default: 0.2,
    min: 0,
  });
  attrs.add('enableHighAccuracy', {
    type: 'boolean',
    default: true,
  });
  attrs.add('maximumAge', {
    type: 'number',
    default: 50,
  });
  attrs.add('timeout', {
    type: 'number',
    default: 1500,
  });
}

