import { Script, registerScript, StandardMaterial, Color } from 'playcanvas';

export class CreateBoxScript extends Script {
    static scriptName = 'createBoxScript';
    
    initialize() {
        
        // Ensure we have a model component
        if (!this.entity.model) {
            this.entity.addComponent('model', {
                type: 'box'
            });
        } else {
            this.entity.model.type = 'box';
        }
        
        // Add collision component (box shape matching the model)
        if (!this.entity.collision) {
            
            this.entity.addComponent('collision', {
                type: 'box',
                halfExtents: [0.5, 0.5, 0.5] // Will be scaled by entity scale
            });
            
        }
        
        // Add rigidbody component (static = immovable)
        // MUST be added AFTER collision component
        if (!this.entity.rigidbody) {
            this.entity.addComponent('rigidbody', {
                type: 'static',
                friction: 0.8,
                restitution: 0.1
            });
            
            // Force the static body to be part of collision detection
            setTimeout(() => {
                if (this.entity.rigidbody && this.entity.rigidbody.body) {
                    this.entity.rigidbody.body.forceActivationState(4); // DISABLE_DEACTIVATION
                }
            }, 100);
        }
        
        // Create a bright red material so it's visible
        const material = new StandardMaterial();
        material.diffuse = new Color(1, 0, 0); // Bright red
        material.update();
        
        // Wait a frame for the model to be ready
        setTimeout(() => {
            if (this.entity.model && this.entity.model.meshInstances) {
                this.entity.model.meshInstances.forEach(meshInstance => {
                    meshInstance.material = material;
                });
            } else {
                console.warn("No mesh instances found on", this.entity.name);
            }
        }, 100);
    }
}

CreateBoxScript.swap = function (old) {
  Object.assign(this.prototype, old.prototype);
};

const globalScope = typeof window !== 'undefined' ? window : globalThis;
const registeredScripts =
  globalScope.__pcRegisteredScripts ||
  (globalScope.__pcRegisteredScripts = new Set());

if (!registeredScripts.has(CreateBoxScript.scriptName)) {
  registerScript(CreateBoxScript, CreateBoxScript.scriptName);
  registeredScripts.add(CreateBoxScript.scriptName);
}

