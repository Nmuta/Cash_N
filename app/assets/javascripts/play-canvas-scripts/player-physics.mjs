// player-physics.mjs
import {
    Script, registerScript, Vec3, Quat, Keyboard,
    KEY_A, KEY_D, KEY_W, KEY_LEFT, KEY_RIGHT, KEY_SPACE,
    BODYTYPE_STATIC
  } from 'playcanvas';
  
  export class PlayerPhysics extends Script {
    static scriptName = 'playerPhysics';
  
    initialize() {
      this._animationsLogged = false;
      this._waitingForAnimLog = false;
      this.animEntity = null;
      this._facingDirection = 1; // 1 = right, -1 = left
    this._allowInput = this.allowInput !== false;

    const walkAttr = Number.isFinite(this.walkSpeed) ? this.walkSpeed : null;
    const jumpAttr = Number.isFinite(this.jumpImpulse) ? this.jumpImpulse : null;

    this.speed = walkAttr ?? 6;
    this.jumpSpeed = jumpAttr ?? 4;

    if (!this._allowInput) {
      this.speed = 0;
      this.jumpSpeed = 0;
    }

    if (this._allowInput) {
      if (!this.app.keyboard) this.app.keyboard = new Keyboard(window);
      this.app.keyboard.preventDefault = true;
    }
  
      // Capsule collider (stable for characters)
      if (!this.entity.collision) {
        this.entity.addComponent('collision', { type: 'capsule', radius: 0.35, height: 1.1 });
      }
      if (!this.entity.rigidbody) {
        this.entity.addComponent('rigidbody', {
          type: 'dynamic',
          mass: 90,
          friction: 0.4,
          restitution: 0,
          linearDamping: 0.25,
          angularDamping: 1.0
        });
      }
  
      const rb = this.entity.rigidbody;
      rb.angularFactor.set(0, 0, 0);   // no rotation
      rb.linearFactor.set(1, 1, 0);    // X/Y only movement
  
      // Track if we're in the air
      this.wasGrounded = true;
  
      // Contact-based grounding
      this._groundContacts = 0;
      this.entity.on('collisionstart', (e) => {
        if (e?.other?.rigidbody?.type === BODYTYPE_STATIC) this._groundContacts++;
      });
      this.entity.on('collisionend', (e) => {
        if (e?.other?.rigidbody?.type === BODYTYPE_STATIC) {
          this._groundContacts = Math.max(0, this._groundContacts - 1);
        }
      });
  
      // Temps
      this._tmpPos = new Vec3();
      this._tmpVel = new Vec3();
      this._upright = new Quat();
      this._zero = new Vec3(0, 0, 0);
  
      // Optional: stop browser scroll on these keys
    if (this._allowInput) {
      this._preventScroll = (evt) => {
        const k = evt.code || evt.key;
        if (k === 'Space' || k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight') evt.preventDefault();
      };
      window.addEventListener('keydown', this._preventScroll, { passive: false });

      // Focus canvas so keys go to the game
      const canvas = this.app.graphicsDevice?.canvas;
      if (canvas) { canvas.setAttribute('tabindex', '0'); canvas.focus(); }
    } else {
      this._preventScroll = null;
    }
    }
  
    postInitialize() {
      // Find the visual child entity with the animation component
      // This runs after all components are initialized
      console.log('I am here in post initialize');
      this.visualEntity = this.entity.findByName('player-visual');
      if (this.visualEntity) {
        console.log('Found player-visual entity, has anim:', !!this.visualEntity.anim);
        this.animEntity = this.findAnimEntity(this.visualEntity);
        this.logAnimationsIfReady('postInitialize');
      } else {
        console.warn('player-visual child not found!');
      }
    }

    findAnimEntity(root) {
      if (!root) return null;
      if (root.anim) return root;
      for (let i = 0; i < root.children.length; i++) {
        const child = root.children[i];
        const found = this.findAnimEntity(child);
        if (found) return found;
      }
      return null;
    }

    logAnimationsIfReady(sourceTag = 'runtime') {
      if (this._animationsLogged) return;
      if (!this.animEntity && this.visualEntity) {
        this.animEntity = this.findAnimEntity(this.visualEntity);
      }

      const animComponent = this.animEntity?.anim || this.visualEntity?.anim;
      if (!animComponent) {
        if (!this._waitingForAnimLog) {
          console.warn(`[${sourceTag}] Anim component not ready yet, will keep waiting...`);
          this._waitingForAnimLog = true;
        }
        return;
      }
      this._waitingForAnimLog = false;

      const names = new Set();
      if (animComponent.animationsIndex) {
        Object.keys(animComponent.animationsIndex).forEach((key) => names.add(key));
      }
      if (animComponent.animationAssets) {
        Object.keys(animComponent.animationAssets).forEach((key) => names.add(key));
      }
      if (animComponent.animationClips) {
        Object.keys(animComponent.animationClips).forEach((key) => names.add(key));
      }
      if (animComponent.layers && animComponent.layers.length) {
        animComponent.layers.forEach((layer) => {
          const states = layer?._controller?._states;
          if (states?.length) {
            states.forEach((state) => state?.name && names.add(state.name));
          }
        });
      }

      console.log(`[${sourceTag}] Available animations:`, [...names]);
      this._animationsLogged = true;
    }

    destroy() {
      if (this._preventScroll) {
        window.removeEventListener('keydown', this._preventScroll);
        this._preventScroll = null;
      }
    }
  
    // Robust grounded check: contact OR a short downward raycast
    get grounded() {
      if (this._groundContacts > 0) return true;
  
      // Raycast ~10–15cm below the feet
      const rbSys = this.app.systems.rigidbody;
      const from = this.entity.getPosition().clone();
      // Our capsule total height ≈ height + 2*radius = 1.1 + 0.7 = 1.8; half ≈ 0.9
      // Start a bit above center, cast slightly below bottom
      const to = from.clone();
      from.y += 0.6;
      to.y   -= 0.7;
  
      const hit = rbSys?.raycastFirst(from, to);
      return !!hit && hit.entity?.rigidbody?.type === BODYTYPE_STATIC;
    }
  
    update(dt) {
      // Lazy load visual entity if not found yet
      if (!this.visualEntity) {
        this.visualEntity = this.entity.findByName('player-visual');
        console.log('Animation component will now find anim..');
        if (this.visualEntity && this._facingDirection) {
          const yaw = this._facingDirection > 0 ? 90 : -90;
          this.visualEntity.setLocalEulerAngles(0, yaw, 0);
        }
      }

      if (this.visualEntity && !this._animationsLogged) {
        this.animEntity = this.animEntity || this.findAnimEntity(this.visualEntity);
        this.logAnimationsIfReady('update');
      }

      const kb = this._allowInput ? this.app.keyboard : null;

      const left  =
        this._allowInput && kb
          ? kb.isPressed(KEY_A) || kb.isPressed(KEY_LEFT) || kb.isPressed('a') || kb.isPressed('ArrowLeft')
          : false;
      const right =
        this._allowInput && kb
          ? kb.isPressed(KEY_D) || kb.isPressed(KEY_RIGHT) || kb.isPressed('d') || kb.isPressed('ArrowRight')
          : false;
      const jumpPressed =
        this._allowInput && kb
          ? kb.wasPressed(KEY_W) || kb.wasPressed(KEY_SPACE) || kb.wasPressed('w') || kb.wasPressed(' ')
          : false;
  
      const rb = this.entity.rigidbody;
  
      // Kill any spin instantly
      rb.angularVelocity = this._zero;
  
      // Horizontal velocity (X only)
      const v = rb.linearVelocity;
      const dirX = (right ? 1 : 0) + (left ? -1 : 0);
      v.x = dirX * this.speed;
      v.z = 0;

      // Flip the visual so the character faces movement direction
      if (dirX !== 0 && dirX !== this._facingDirection) {
        this._facingDirection = dirX;
        const yaw = -dirX > 0 ? 180 : 0;
        // Rotate visual child if present, else rotate whole entity
        (this.visualEntity || this.entity).setLocalEulerAngles(0, yaw, 0);
      }
  
      // Jump (set upward velocity)
      if (jumpPressed) {
        if (this.grounded) {
          v.y = this.jumpSpeed;
          
          // Play TreadWater animation when jumping
          if (this.visualEntity?.anim) {
            console.log("Playing TreadWater animation");
            this.visualEntity.anim.play('TreadWater', 0.2); // 0.2 = blend time
          }
        } else {
          v.y = this.jumpSpeed;
        }
      }
      
      // Stop animation when landing
      const isGrounded = this.grounded;
      if (!this.wasGrounded && isGrounded) {
        // Just landed
        if (this.visualEntity?.anim) {
          console.log("Landed - stopping TreadWater animation");
          this.visualEntity.anim.stop('TreadWater', 0.2);
        }
      }
      this.wasGrounded = isGrounded;
    
      rb.linearVelocity = v;
    }
  
    // Clamp upright AFTER physics, but preserve linear velocity across teleport
    postUpdate(dt) {
      const rb = this.entity.rigidbody;
  
      // Only correct if there is noticeable tilt to avoid needless teleports
      const e = this.entity.getEulerAngles();
      const needsUpright = (Math.abs(e.x) > 0.05 || Math.abs(e.z) > 0.05);
      if (!needsUpright) return;
  
      // Save current velocity, correct rotation, then restore velocity
      this._tmpVel.copy(rb.linearVelocity);
  
      const yawOnly = this._upright.setFromEulerAngles(0, e.y, 0);
      this._tmpPos.copy(this.entity.getPosition());
      rb.teleport(this._tmpPos, yawOnly);
  
      rb.linearVelocity = this._tmpVel;   // <-- preserves jump impulse
      rb.angularVelocity = this._zero;
    }
  }
  
  registerScript(PlayerPhysics, 'playerPhysics');

  const attrs = PlayerPhysics.attributes;
  if (attrs && !attrs.has?.('allowInput')) {
    attrs.add('allowInput', {
      type: 'boolean',
      default: true,
    });
    attrs.add('walkSpeed', {
      type: 'number',
      default: 6,
    });
    attrs.add('jumpImpulse', {
      type: 'number',
      default: 4,
    });
  }
  
