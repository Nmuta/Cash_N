import * as pc from 'playcanvas';

const {
  Script,
  registerScript,
  Vec3,
  Entity,
  Color,
  StandardMaterial,
  Texture,
} = pc;

export class BallSpawn extends Script {
  static scriptName = 'ballSpawn';

  chooseRandomVice(viceDataDecoded) {
    const randomVice = viceDataDecoded[Math.floor(Math.random() * viceDataDecoded.length)];
    console.log('randomVice ', randomVice);
    return  randomVice.name.toLowerCase()+"Texture";
  }

  initialize() {

    console.log('my vice data ', this.viceData);
    console.log('my explosion texture ', this.explosionTexture);
    this._explosionTextureRef = this.explosionTexture || null;
    this._explosionTextureAsset = null;
    this._explosionTextureResource = null;

    this._spawnTimer = 0;
    this._activeBalls = [];
    this._playerEntity = null;
    this._modelAsset = null;
    this._spawnOffset = new Vec3(
      this.spawnOffsetX ?? 0,
      this.spawnOffsetY ?? 3,
      this.spawnOffsetZ ?? 2
    );

    this._spawnInterval = Math.max(this.spawnIntervalSeconds ?? 3, 0.3);
    this._maxBalls = Math.max(this.maxActiveBalls ?? 10, 1);
    this._ballRadius = Math.max(this.ballRadius ?? 0.35, 0.05);
    this._ballMass = Math.max(this.ballMass ?? 1, 0.01);
    this._ballRestitution = Math.max(Math.min(this.ballRestitution ?? 0.3, 1), 0);
    this._ballFriction = Math.max(this.ballFriction ?? 0.6, 0);
    this._ballLifetime = Math.max(this.ballLifetimeSeconds ?? 15, 1);
    this._playerHitRadius = Math.max(this.playerHitRadius ?? 0.9, 0.05);

    this._playerName = this.playerName || 'player';
    this._ballEntityPrefix = 'spawned-ball';
    const viceDataDecoded = JSON.parse(this.viceData);
    this._materialAssetId =  this.chooseRandomVice(viceDataDecoded);
   

    this._modelAssetId = this.modelAssetId || null;
    this._materialAsset = null;
    this._materialResource = null;
    this._materialResourceSource = null;
    if (this._explosionTextureRef?.resource) {
      this._explosionTextureAsset = this._explosionTextureRef;
      this._explosionTextureResource = this._extractTextureFromAsset(
        this._explosionTextureRef
      );
    }

    this._lookupPlayer();
    this._ensureAssets();

    this._playerWorldPos = new Vec3();
    this._ballWorldPos = new Vec3();
    this._impactPos = new Vec3();
    this._diff = new Vec3();
    this._playerDebugLogged = false;

    this.on('destroy', this._cleanup, this);
    this.app.on('update', this._handleUpdate, this);
  }

  _lookupPlayer() {
    const root = this.app?.root;
    if (!root) return;
    const found = root.findByName(this._playerName);
    if (found) {
      this._playerEntity = found;
      this._playerDebugLogged = false;
    } else {
      if (!this._playerDebugLogged) {
        this._playerDebugLogged = true;
      }
    }
  }

  _ensureAssets(materialAssetId=null) {
    const assetRegistry = this.app?.assets;
    console.log('my asset registry ', assetRegistry);
    if (!assetRegistry) return;

    if (this._modelAssetId && !this._modelAsset) {
      this._modelAsset = this._resolveAssetReference(this._modelAssetId);
      if (!this._modelAsset && assetRegistry.once) {
        assetRegistry.once('add', (asset) => {
          if (this._matchesAssetRef(asset, this._modelAssetId)) {
            this._modelAsset = asset;
          }
        });
      }
    }

    if (this._materialAssetId && !this._materialAsset) {
      this._materialAsset = this._resolveAssetReference(this._materialAssetId);
      if (!this._materialAsset && assetRegistry.once) {
        assetRegistry.once('add', (asset) => {
          if (this._matchesAssetRef(asset, this._materialAssetId)) {
            this._materialAsset = asset;
            this._ensureMaterialReady(asset);
          }
        });
      } else if (this._materialAsset) {
        this._ensureMaterialReady(this._materialAsset);
      }
    }

    // if value is passed in 
    if (materialAssetId) {
        console.log('passed in materialAssetId ', materialAssetId);
        this._materialAsset = this._resolveAssetReference(materialAssetId);
        if (!this._materialAsset && assetRegistry.once) {
          assetRegistry.once('add', (asset) => {
            if (this._matchesAssetRef(asset, materialAssetId)) {
              this._materialAsset = asset;
              this._ensureMaterialReady(asset);
            }
          });
        } else if (this._materialAsset) {
          this._ensureMaterialReady(this._materialAsset);
        }
      }

    if (this._explosionTextureRef && !this._explosionTextureAsset) {
      this._explosionTextureAsset = this._resolveAssetReference(
        this._explosionTextureRef
      );
      if (!this._explosionTextureAsset && assetRegistry.once) {
        assetRegistry.once('add', (asset) => {
          if (this._matchesAssetRef(asset, this._explosionTextureRef)) {
            this._explosionTextureAsset = asset;
            this._ensureExplosionTextureReady(asset);
          }
        });
      } else if (this._explosionTextureAsset) {
        this._ensureExplosionTextureReady(this._explosionTextureAsset);
      }
    } else if (this._explosionTextureAsset) {
      this._ensureExplosionTextureReady(this._explosionTextureAsset);
    }
  }

  _handleUpdate(dt) {
    this._spawnTimer += dt;

    this._cullExpiredBalls();
    this._checkPlayerImpacts();

    if (this._spawnTimer >= this._spawnInterval) {
      this._spawnTimer = 0;
      this._spawnBall();
    }
  }

  _spawnBall() {
    const viceDataDecoded = JSON.parse(this.viceData);
    const materialAssetId = this.chooseRandomVice(viceDataDecoded);
    this._ensureAssets(materialAssetId);

    if (!this._playerEntity) {
      this._lookupPlayer();
    }
    if (!this._playerEntity) return;

    if (this._activeBalls.length >= this._maxBalls) {
      const oldest = this._activeBalls.shift();
      oldest?.destroy();
    }

    const spawnParent = this.app.root;
    const ball = new Entity(`${this._ballEntityPrefix}-${Date.now()}`);

    const spawnPos = this._computeSpawnPosition();
    ball.setLocalPosition(spawnPos);

    // Model
    const modelConfig = {
      castShadows: true,
      receiveShadows: true,
    };

    if (this._modelAsset) {
      modelConfig.type = 'asset';
      modelConfig.asset = this._modelAsset;
    } else {
      modelConfig.type = 'sphere';
    }

    ball.addComponent('model', modelConfig);

    // Material override
    this._applyMaterialToBall(ball);

    // Collision + physics
    ball.addComponent('collision', {
      type: 'sphere',
      radius: this._ballRadius,
    });
    ball.collision.contactEvents = true;

    ball.addComponent('rigidbody', {
      type: 'dynamic',
      mass: this._ballMass,
      restitution: this._ballRestitution,
      friction: this._ballFriction,
      linearDamping: this.ballLinearDamping ?? 0.1,
      angularDamping: this.ballAngularDamping ?? 0.05,
    });

    ball.rigidbody.linearVelocity = new Vec3(0, 0, 0);
    ball.rigidbody.angularVelocity = new Vec3(0, 0, 0);

    spawnParent.addChild(ball);
    ball.enabled = true;

    const record = {
      entity: ball,
      spawnTime: this.app.time ?? Date.now() / 1000,
      hit: false,
      debugLogged: false,
    };
    ball.__spawnRecord = record;

    ball.on('destroy', () => {
      this._removeBallRecord(ball);
    });

    this._registerBallEvents(ball);

    this._activeBalls.push(record);
  }

  _computeSpawnPosition() {
    const worldPos = new Vec3();
    const playerPos = this._playerEntity.getPosition().clone();
    worldPos.add2(playerPos, this._spawnOffset);

    if (this.sphericalSpawnRadius > 0) {
      const radius = this.sphericalSpawnRadius;
      const randomOffset = new Vec3(
        (Math.random() * 2 - 1),
        (Math.random() * 2 - 1),
        (Math.random() * 2 - 1)
      );
      randomOffset.normalize().scale(radius);
      worldPos.add(randomOffset);
    }

    return worldPos;
  }

  _cullExpiredBalls() {
    const now = this.app.time ?? Date.now() / 1000;
    const lifetime = this._ballLifetime;

    for (let i = this._activeBalls.length - 1; i >= 0; i--) {
      const record = this._activeBalls[i];
      const entity = record?.entity;
      if (!entity || entity.destroyed) {
        this._activeBalls.splice(i, 1);
        continue;
      }
      if (now - record.spawnTime > lifetime) {
        entity.destroy();
      }
    }
  }

  _registerBallEvents(ball) {
    if (!ball?.collision) return;

    const handler = (event) => {
      const other = event?.other;
      const otherKeys = other ? Object.keys(other) : null;
 
      this._handleBallCollision(ball, event);
    };

    ball.collision.on('collisionstart', handler);
    ball.once('destroy', () => {
      ball.collision?.off('collisionstart', handler);
    });
  }

  _resolveAssetReference(ref) {
    if (!ref) return null;
    if (typeof ref === 'object') return ref;
    const registry = this.app?.assets;
    if (!registry) return null;

    let asset = registry.get(ref);

    if (!asset && typeof registry.find === 'function') {
      const found = registry.find(ref);
      if (Array.isArray(found)) {
        asset = found[0] || null;
      } else {
        asset = found || null;
      }
    }

    return asset || null;
  }

  _matchesAssetRef(asset, ref) {
    if (!asset || ref == null) return false;
    return (
      asset.id === ref ||
      asset.name === ref ||
      asset.name === String(ref) ||
      asset.id === Number(ref)
    );
  }

  _ensureMaterialReady(asset) {
    if (!asset) return;


    const handleReady = (loadedAsset) => {
      this._materialResource = this._buildMaterialFromAsset(loadedAsset);
      this._materialResourceSource =
        loadedAsset?.id ?? loadedAsset?.name ?? this._materialAssetId;
      if (this._materialResource) {
        this._applyMaterialToExistingBalls();
      }
    };

    if (asset.resource) {
      handleReady(asset);
      return;
    }

    asset.once?.('load', handleReady);
    this.app?.assets?.load?.(asset);
  }

  _buildMaterialFromAsset(asset) {
    if (!asset?.resource) return null;

    if (asset.resource instanceof StandardMaterial) {
      return asset.resource;
    }

    if (asset.resource instanceof Texture) {
      const material = new StandardMaterial();
      material.diffuse.set(1, 1, 1);
      material.diffuseMap = asset.resource;
      material.useFog = false;
      material.cull = pc.CULLFACE_BACK;
      material.useLighting = true;
      material.emissive.set(0.5, 0.5, 0.5);
      material.emissiveMap = asset.resource;
      material.diffuseMap = asset.resource;
      material.update();
      return material;
    }

    return null;
  }

  _ensureExplosionTextureReady(asset) {
    if (!asset) return;

    const finalize = (loadedAsset) => {
      this._explosionTextureResource = this._extractTextureFromAsset(
        loadedAsset
      );
    };

    if (asset.resource) {
      finalize(asset);
      return;
    }

    asset.once?.('load', finalize);
    this.app?.assets?.load?.(asset);
  }

  _extractTextureFromAsset(asset) {
    if (!asset?.resource) return null;
    if (asset.resource instanceof Texture) {
      return asset.resource;
    }
    if (asset.resource?.diffuseMap instanceof Texture) {
      return asset.resource.diffuseMap;
    }
    return null;
  }

  _applyMaterialToBall(ball) {
    if (!ball?.model?.meshInstances?.length) return;

    if (!this._materialResource && this._materialAssetId) {
      if (!this._materialAsset) {
        this._materialAsset = this._resolveAssetReference(
          this._materialAssetId
        );
      }
      if (this._materialAsset) {
        this._ensureMaterialReady(this._materialAsset);
      }

     
    }

    const material = this._materialResource;
    if (!material) return;

    ball.model.meshInstances.forEach((mi) => {
      mi.material = material;
      mi.receiveShadows = false;
      mi.castShadows = false;
    });
  }

  _applyMaterialToExistingBalls() {
    if (!this._materialResource) return;
    this._activeBalls.forEach((record) => {
      if (record?.entity && !record.entity.destroyed) {
        this._applyMaterialToBall(record.entity);
      }
    });
  }

  _isPlayerEntity(entity) {
    let current = entity;
    while (current) {
      if (current === this._playerEntity) {
     
        return true;
      }
      if (current.name === this._playerName) {
    
        return true;
      }
      current = current.parent;
    }
 
    return false;
  }

  _handleBallCollision(ball, event) {
    if (!ball || ball.destroyed) return;
    if (!this._playerEntity || this._playerEntity.destroyed) {
      this._lookupPlayer();
      if (!this._playerEntity || this._playerEntity.destroyed) return;
    }

    const record = ball.__spawnRecord;
    if (record?.hit) return;

    const other = event?.other;
    const isPlayer = other ? this._isPlayerEntity(other) : false;
 

    if (!other || !isPlayer) {
      if (!record?.nonPlayerLogged) {
        record.nonPlayerLogged = true;
  
      }
      return;
    }

    record.hit = true;
    const impactPoint = this._impactPos.copy(ball.getPosition());

  

    this._spawnExplosion(impactPoint);
    this._removeBallRecord(ball);
    if (ball.model) ball.model.enabled = false;
    if (ball.collision) ball.collision.enabled = false;
    if (ball.rigidbody) {
      ball.rigidbody.linearVelocity = new Vec3(0, 0, 0);
      ball.rigidbody.angularVelocity = new Vec3(0, 0, 0);
      ball.rigidbody.enabled = false;
    }
    if (ball.rigidbody) {
      ball.rigidbody.linearVelocity = new Vec3(0, 0, 0);
      ball.rigidbody.angularVelocity = new Vec3(0, 0, 0);
      ball.rigidbody.enabled = false;
    }
    ball.enabled = false;
    this.app.once('postUpdate', () => {
      if (!ball.destroyed) {
        ball.destroy();
      }
    });
  }

  _checkPlayerImpacts() {
    if (!this._playerEntity || this._playerEntity.destroyed || !this._playerEntity.getPosition) {
      this._lookupPlayer();
      if (!this._playerEntity || this._playerEntity.destroyed || !this._playerEntity.getPosition) return;
    }

    this._playerWorldPos.copy(this._playerEntity.getPosition());

    if (!this._playerDebugLogged) {
      this._playerDebugLogged = true;
 
    }

    const radiusSum = this._playerHitRadius + this._ballRadius;
    const radiusSq = radiusSum * radiusSum;

    for (let i = this._activeBalls.length - 1; i >= 0; i--) {
      const record = this._activeBalls[i];
      const ballEntity = record?.entity;
      if (!ballEntity || ballEntity.destroyed || record.hit) continue;

      this._ballWorldPos.copy(ballEntity.getPosition());
      this._diff.sub2(this._ballWorldPos, this._playerWorldPos);
      const distanceSq = this._diff.lengthSq();
      const distance = Math.sqrt(distanceSq);

      if (!record.debugLogged && distanceSq <= radiusSq * 4) {
        record.debugLogged = true;
 
      }

      if (distanceSq <= radiusSq) {
        record.hit = true;

        const impactPoint = this._impactPos.copy(this._ballWorldPos);
        console.log('&&&&!!!!!! >>>> [BallSpawn] Ball collided with player', {
          ball: ballEntity.name,
          distanceSq: distanceSq.toFixed(4),
          radiusSq: radiusSq.toFixed(4),
          impact: {
            x: impactPoint.x.toFixed(3),
            y: impactPoint.y.toFixed(3),
            z: impactPoint.z.toFixed(3),
          },
        });
        console.log('anss');
        this._spawnExplosion(impactPoint);
        console.log('anss2');
        this._removeBallRecord(ballEntity);
        console.log('anss3');
        if (ballEntity.model) ballEntity.model.enabled = false;
        if (ballEntity.collision) ballEntity.collision.enabled = false;
        if (ballEntity.rigidbody) {
          ballEntity.rigidbody.linearVelocity = new pc.Vec3(0, 0, 0);
          ballEntity.rigidbody.angularVelocity =new pc.Vec3(0, 0, 0);
          ballEntity.rigidbody.enabled = false;
        }
        console.log('anss4');
        ballEntity.enabled = false;
     
        if (!ballEntity.destroyed) {
            ballEntity.destroy();
          }
    
      }
    }
  }

  _cleanup() {
    this.app.off('update', this._handleUpdate, this);
    this._activeBalls.forEach((record) => record.entity?.destroy());
    this._activeBalls.length = 0;
  }

  _spawnExplosion(position) {
    console.log('spawnExplosion');
    const explosion = new Entity('ball-hit-explosion');
    explosion.setPosition(position.x, position.y, position.z);
    this.app.root.addChild(explosion);
    const colorMap = this._getExplosionTexture();
    console.log('colorMap', colorMap);
    explosion.addComponent('particlesystem', {
      numParticles: 48,
      lifetime: 1,
      lifetime2: 0.6,
      rate: 0,
      rate2: 0,
      initialVelocity: 3,
      emitterShape: pc.EMITTERSHAPE_SPHERE,
      emitterExtents: new Vec3(0.2, 0.2, 0.2),
      oneShot: true,
      startSize: 0.35,
      startSize2: 0.5,
      endSize: 0.05,
      startColor: new Color(1, 0.75, 0.25, 1),
      endColor: new Color(1, 0.3, 0.05, 0),
      blendType: pc.BLEND_NORMAL,
      stretch: 0,
      animSpeed: 0,
      loop: false,
    });

    explosion.particlesystem.play();
    explosion.particlesystem.on('stop', () => {
      console.log('destroy booma');
      explosion.destroy();
    });
  }

  _getExplosionTexture() {
    if (this._explosionTextureResource) {
      return this._explosionTextureResource;
    }

    if (this._explosionTextureAsset) {
      this._ensureExplosionTextureReady(this._explosionTextureAsset);
      return this._explosionTextureResource;
    }

    if (this._explosionTextureRef) {
      this._explosionTextureAsset = this._resolveAssetReference(
        this._explosionTextureRef
      );
      if (this._explosionTextureAsset) {
        this._ensureExplosionTextureReady(this._explosionTextureAsset);
      }
    }

    return this._explosionTextureResource;
  }

  _removeBallRecord(ball) {
    const index = this._activeBalls.findIndex((record) => record.entity === ball);
    if (index !== -1) {
      this._activeBalls.splice(index, 1);
    }
  }
}

BallSpawn.swap = function (old) {
  Object.assign(this.prototype, old.prototype);
};

const globalScope = typeof window !== 'undefined' ? window : globalThis;
const registeredScripts =
  globalScope.__pcRegisteredScripts ||
  (globalScope.__pcRegisteredScripts = new Set());

if (!registeredScripts.has(BallSpawn.scriptName)) {
  registerScript(BallSpawn, BallSpawn.scriptName);
  registeredScripts.add(BallSpawn.scriptName);
}

const attrs = BallSpawn.attributes;
if (attrs && !attrs.has?.('spawnIntervalSeconds')) {
  attrs.add('playerName', {
    type: 'string',
    default: 'player',
  });
  attrs.add('spawnIntervalSeconds', {
    type: 'number',
    default: 3,
    min: 0.2,
  });
  attrs.add('maxActiveBalls', {
    type: 'number',
    default: 10,
    min: 1,
  });
  attrs.add('ballRadius', {
    type: 'number',
    default: 0.35,
    min: 0.05,
  });
  attrs.add('ballMass', {
    type: 'number',
    default: 1,
    min: 0.01,
  });
  attrs.add('ballRestitution', {
    type: 'number',
    default: 0.3,
    min: 0,
    max: 1,
  });
  attrs.add('ballFriction', {
    type: 'number',
    default: 0.6,
    min: 0,
  });
  attrs.add('ballLinearDamping', {
    type: 'number',
    default: 0.1,
    min: 0,
  });
  attrs.add('ballAngularDamping', {
    type: 'number',
    default: 0.05,
    min: 0,
  });
  attrs.add('ballLifetimeSeconds', {
    type: 'number',
    default: 15,
    min: 1,
  });
  attrs.add('playerHitRadius', {
    type: 'number',
    default: 0.9,
    min: 0,
  });
  attrs.add('spawnOffsetX', {
    type: 'number',
    default: 2,
  });
  attrs.add('spawnOffsetY', {
    type: 'number',
    default: 3,
  });
  attrs.add('spawnOffsetZ', {
    type: 'number',
    default: 0,
  });
  attrs.add('sphericalSpawnRadius', {
    type: 'number',
    default: 0,
    min: 0,
  });
  attrs.add('materialAssetId', {
    type: 'number',
    default: null,
  });
  attrs.add('modelAssetId', {
    type: 'number',
    default: null,
  });
  attrs.add('explosionTexture', {
    type: 'asset',
    assetType: 'texture'
  });
}
