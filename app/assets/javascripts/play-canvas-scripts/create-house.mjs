import { Script, registerScript, Entity, StandardMaterial, Color } from 'playcanvas';

export class CreateHouseScript extends Script {
    static scriptName = 'createHouseScript';

    initialize() {
        // Root acts as anchor; spawn sub-entities for posts/beam
        const material = this._buildMaterial();

        const leftPost = this._createBlock('left-post', material, {
            position: [-1, 0, 0],
            scale: [0.4, 3, 0.4],
        });

        const rightPost = this._createBlock('right-post', material, {
            position: [1, 0, 0],
            scale: [0.4, 3, 0.4],
        });

        const beam = this._createBlock('roof-beam', material, {
            position: [0, 1.75, 0],
            scale: [2.4, 0.35, 0.5],
        });

        [leftPost, rightPost, beam].forEach((child) => this.entity.addChild(child));
    }

    _buildMaterial() {
        const mat = new StandardMaterial();
        mat.diffuse = new Color(0.7, 0.7, 0.65); // light stone hue
        mat.update();
        return mat;
    }

    _createBlock(name, material, { position, scale }) {
        const entity = new Entity(name);
        entity.setLocalPosition(...position);
        entity.setLocalScale(...scale);

        entity.addComponent('model', { type: 'box' });
        // No physics components so the structure remains purely visual
        entity.once('model:added', () => {
            if (entity.model?.meshInstances) {
                entity.model.meshInstances.forEach((meshInstance) => {
                    meshInstance.material = material;
                });
            }
        });

        return entity;
    }
}

CreateHouseScript.swap = function (old) {
  Object.assign(this.prototype, old.prototype);
};

const globalScope = typeof window !== 'undefined' ? window : globalThis;
const registeredScripts =
  globalScope.__pcRegisteredScripts ||
  (globalScope.__pcRegisteredScripts = new Set());

if (!registeredScripts.has(CreateHouseScript.scriptName)) {
  registerScript(CreateHouseScript, CreateHouseScript.scriptName);
  registeredScripts.add(CreateHouseScript.scriptName);
}
