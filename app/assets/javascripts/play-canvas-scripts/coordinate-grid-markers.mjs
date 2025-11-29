import {
  Script,
  registerScript,
  Entity,
  StandardMaterial,
  Color,
  ADDRESS_CLAMP_TO_EDGE,
} from 'playcanvas';

const DEFAULT_SPRITE_SHEET_URL = '/sprites/coordinateSpriteSheet.png';

export class CoordinateGridMarkers extends Script {
  static scriptName = 'coordinateGridMarkers';

  initialize() {
    this.gridMin = Number.isFinite(this.gridMin) ? this.gridMin : -100;
    this.gridMax = Number.isFinite(this.gridMax) ? this.gridMax : 100;
    this.gridStep = Number.isFinite(this.gridStep) && this.gridStep > 0 ? this.gridStep : 10;
    this.markerSize = Number.isFinite(this.markerSize) && this.markerSize > 0 ? this.markerSize : 0.5;
    this.markerHeight = Number.isFinite(this.markerHeight) && this.markerHeight > 0 ? this.markerHeight : 0.15;
    this.markerYOffset = Number.isFinite(this.markerYOffset) ? this.markerYOffset : 0.05;
    this.spriteSheetUrl = this.spriteSheetUrl || DEFAULT_SPRITE_SHEET_URL;
    this.useSpriteSheet =
      this.useSpriteSheet === undefined ? true : Boolean(this.useSpriteSheet);
    this.useGradientColor =
      this.useGradientColor === undefined ? !this.useSpriteSheet : Boolean(this.useGradientColor);

    this.skipRadius = Number.isFinite(this.skipRadius) ? Math.max(0, this.skipRadius) : 0;
    this.skipCenterX = Number.isFinite(this.skipCenterX) ? this.skipCenterX : 0;
    this.skipCenterZ = Number.isFinite(this.skipCenterZ) ? this.skipCenterZ : 0;

    this._columnCount = Math.floor((this.gridMax - this.gridMin) / this.gridStep) + 1;
    if (this._columnCount <= 0) {
      console.warn('[CoordinateGridMarkers] Invalid grid configuration.');
      return;
    }

    this._tileSize = 1 / this._columnCount;
    this._range = Math.max(1, this.gridMax - this.gridMin);
    this._markersRoot = new Entity('coordinate-markers-root');
    this.entity.addChild(this._markersRoot);

    this._useTexture = this.useSpriteSheet && !this.useGradientColor;
    if (this._useTexture) {
      this._loadSpriteSheet(this.spriteSheetUrl);
    } else {
      this._spawnMarkers();
    }
  }

  destroy() {
    if (this._markersRoot && !this._markersRoot.destroyed) {
      this._markersRoot.destroy();
    }
  }

  _loadSpriteSheet(url) {
    this.app.assets.loadFromUrl(url, 'texture', (err, asset) => {
      if (err) {
        console.error('[CoordinateGridMarkers] Failed to load sprite sheet:', err);
        this._useTexture = false;
        this._spawnMarkers();
        return;
      }

      this._textureAsset = asset;
      this._texture = asset.resource;
      if (!this._texture) {
        console.error('[CoordinateGridMarkers] Texture resource missing.');
        this._useTexture = false;
        this._spawnMarkers();
        return;
      }

      this._texture.addressU = ADDRESS_CLAMP_TO_EDGE;
      this._texture.addressV = ADDRESS_CLAMP_TO_EDGE;
      this._baseMaterial = this._buildBaseMaterial(this._texture);
      this._spawnMarkers();
    });
  }

  _buildBaseMaterial(texture) {
    const mat = new StandardMaterial();
    mat.diffuseMap = texture;
    mat.diffuse.set(1, 1, 1);
    mat.useLighting = true;
    mat.update();
    return mat;
  }

  _spawnMarkers() {
    for (let zi = 0; zi < this._columnCount; zi++) {
      const z = this.gridMin + zi * this.gridStep;
      for (let xi = 0; xi < this._columnCount; xi++) {
        const x = this.gridMin + xi * this.gridStep;
        if (this._shouldSkipMarker(x, z)) {
          continue;
        }
        const marker = this._createMarkerEntity(x, z, xi, zi);
        this._markersRoot.addChild(marker);
      }
    }
  }

  _shouldSkipMarker(x, z) {
    if (this.skipRadius <= 0) return false;
    const dx = x - this.skipCenterX;
    const dz = z - this.skipCenterZ;
    return dx * dx + dz * dz <= this.skipRadius * this.skipRadius;
  }

  _createMarkerEntity(x, z, xi, zi) {
    const entity = new Entity(`marker_x${x}_z${z}`);
    entity.setLocalPosition(x, this.markerYOffset, z);
    entity.setLocalScale(this.markerSize, this.markerHeight, this.markerSize);

    entity.once('model:added', () => {
      const material = this._useTexture
        ? this._createTiledMaterial(xi, zi)
        : this._createGradientMaterial(x, z);
      this._applyMaterialToEntity(entity, material);
    });

    entity.addComponent('model', { type: 'box' });

    return entity;
  }

  _applyMaterialToEntity(entity, material) {
    const meshInstances = entity.model?.meshInstances;
    if (!meshInstances || !meshInstances.length) {
      console.warn('[CoordinateGridMarkers] No mesh instances on', entity.name);
      return;
    }
    meshInstances.forEach((meshInstance) => {
      meshInstance.material = material;
    });
  }

  _createTiledMaterial(column, row) {
    const mat = this._baseMaterial.clone();

    const offsetU = column * this._tileSize;
    const offsetV = 1 - this._tileSize - row * this._tileSize;

    mat.diffuseMapTiling.set(this._tileSize, this._tileSize);
    mat.diffuseMapOffset.set(offsetU, Math.max(0, offsetV));
    mat.update();
    return mat;
  }

  _createGradientMaterial(x, z) {
    const mat = new StandardMaterial();
    const redIntensity = this._normalizeValue(z);
    const blueIntensity = this._normalizeValue(x);
    const greenIntensity = 0.15 + 0.4 * (1 - Math.abs(redIntensity - blueIntensity));

    const r = Math.min(1, Math.max(0, redIntensity));
    const g = Math.min(1, Math.max(0, greenIntensity));
    const b = Math.min(1, Math.max(0, blueIntensity));

    const color = new Color(r, g, b);
    mat.diffuse = color.clone();
    mat.emissive = color.clone();
    mat.emissiveIntensity = 0.5;
    mat.useLighting = false;
    mat.update();
    return mat;
  }

  _normalizeValue(value) {
    return (value - this.gridMin) / this._range;
  }
}

CoordinateGridMarkers.swap = function (old) {
  Object.assign(this.prototype, old.prototype);
};

const globalScope = typeof window !== 'undefined' ? window : globalThis;
const registeredScripts =
  globalScope.__pcRegisteredScripts ||
  (globalScope.__pcRegisteredScripts = new Set());

if (!registeredScripts.has(CoordinateGridMarkers.scriptName)) {
  registerScript(CoordinateGridMarkers, CoordinateGridMarkers.scriptName);
  registeredScripts.add(CoordinateGridMarkers.scriptName);
}

const attrs = CoordinateGridMarkers.attributes;
if (attrs && !attrs.has?.('gridMin')) {
  attrs.add('gridMin', {
    type: 'number',
    default: -100,
  });
  attrs.add('gridMax', {
    type: 'number',
    default: 100,
  });
  attrs.add('gridStep', {
    type: 'number',
    default: 10,
    min: 1,
  });
  attrs.add('markerSize', {
    type: 'number',
    default: 1,
    min: 0.1,
  });
  attrs.add('markerHeight', {
    type: 'number',
    default: 0.15,
    min: 0.05,
  });
  attrs.add('markerYOffset', {
    type: 'number',
    default: 0.05,
  });
  attrs.add('spriteSheetUrl', {
    type: 'string',
    default: DEFAULT_SPRITE_SHEET_URL,
  });
  attrs.add('useSpriteSheet', {
    type: 'boolean',
    default: true,
  });
  attrs.add('useGradientColor', {
    type: 'boolean',
    default: false,
  });
  attrs.add('skipRadius', {
    type: 'number',
    default: 0,
    min: 0,
  });
  attrs.add('skipCenterX', {
    type: 'number',
    default: 0,
  });
  attrs.add('skipCenterZ', {
    type: 'number',
    default: 0,
  });
}
