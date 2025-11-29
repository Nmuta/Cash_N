import { Script, registerScript, Color, StandardMaterial } from 'playcanvas';

export class MaterialScript extends Script {
    static scriptName = 'materialScript';
    
    /**
    * The color of the material
    * @attribute
    */
    color = new Color(1, 0.5, 0); // Default orange color
    
    initialize() {
        console.log("MaterialScript initialized - setting color:", this.color);
        
        // Wait a frame to ensure render component is fully initialized
        setTimeout(() => {
            const renderComponent = this.entity.render;
            const modelComponent = this.entity.model;

            if (renderComponent || modelComponent) {
                const target = renderComponent || modelComponent;

                let material = target.material;

                if (!material) {
                    console.log("Creating new material for", this.entity.name);
                    material = new StandardMaterial();
                    target.material = material;
                }

                material.diffuse.copy(this.color);
                material.update();

                if (target.meshInstances) {
                    target.meshInstances.forEach(meshInstance => {
                        meshInstance.material = material;
                    });
                }

                console.log("Color applied to material for", this.entity.name, ":", this.color);
            } else {
                console.warn("No render or model component found on", this.entity.name);
            }
        }, 0);
    }
}

 


MaterialScript.swap = function (old) {
  Object.assign(this.prototype, old.prototype);
};

const globalScope = typeof window !== 'undefined' ? window : globalThis;
const registeredScripts =
  globalScope.__pcRegisteredScripts ||
  (globalScope.__pcRegisteredScripts = new Set());

if (!registeredScripts.has(MaterialScript.scriptName)) {
  registerScript(MaterialScript, MaterialScript.scriptName);
  registeredScripts.add(MaterialScript.scriptName);
}
