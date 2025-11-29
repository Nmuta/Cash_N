import { Script, registerScript } from 'playcanvas';

export class PlayerController extends Script {
    static scriptName = 'playerController';
    
    /**
     * Default animation to play on start
     * @attribute
     */
    defaultAnimation = 'TreadWater';

    initialize() {
        console.log('PlayerController initializing...');
        
        // Wait for anim component to be ready, then start default animation
        this.waitForAnim();
    }
    
    waitForAnim() {
        if (this.entity.anim) {
            console.log('Anim component ready!');
            this.logAvailableAnimations();
            this.startDefaultAnimation();
        } else {
            setTimeout(() => this.waitForAnim(), 50);
        }
    }

    logAvailableAnimations() {
        console.log('I am here')
        if (!this.entity.anim) {
            console.warn('Anim component missing, cannot list animations.');
            return;
        }

        const available = new Set();
        const animComponent = this.entity.anim;

        if (animComponent.animationsIndex) {
            Object.keys(animComponent.animationsIndex).forEach((key) => available.add(key));
        }

        if (animComponent.animationAssets) {
            Object.keys(animComponent.animationAssets).forEach((key) => available.add(key));
        }

        // Collect any clip names stored on the anim component
        if (animComponent.animationClips) {
            Object.keys(animComponent.animationClips).forEach((key) => available.add(key));
        }

        // Inspect all layers for state names to be safe
        if (animComponent.layers && animComponent.layers.length) {
            animComponent.layers.forEach((layer) => {
                if (layer && layer._controller && layer._controller._states) {
                    layer._controller._states.forEach((state) => {
                        if (state && state.name) {
                            available.add(state.name);
                        }
                    });
                }
            });
        }

        const names = [...available];
        if (names.length) {
            console.log('[PlayerController] Available animations:', names);
        } else {
            console.log('[PlayerController] No animations detected on the player entity.');
        }
    }
    
    startDefaultAnimation() {
        // All animations are already loaded from the GLB file
        // Just play the default one
        if (this.entity.anim && this.defaultAnimation) {
            console.log(`Default animation attribute value: "${this.defaultAnimation}"`);
            console.log('Available animation states:', Object.keys(this.entity.anim.animationsIndex || {}));
            
            // Stop any currently playing animation first
            if (this.entity.anim.baseLayer.activeState) {
                console.log('Currently playing:', this.entity.anim.baseLayer.activeState);
            }
            
            // Activate the anim component and play the desired animation
            this.entity.anim.activate = true;
            console.log(`Attempting to play: ${this.defaultAnimation}`);
            this.entity.anim.baseLayer.play(this.defaultAnimation, 0);
            
            console.log('Animation should now be playing:', this.entity.anim.baseLayer.activeState);
        }
    }

    // Switch to a different animation with smooth transition
    playAnimation(animationName, transitionTime = 0.25) {
        if (this.entity.anim) {
            console.log(`Switching to: ${animationName}`);
            this.entity.anim.baseLayer.transition(animationName, transitionTime);
        }
    }
    
    // Convenience methods for specific animations
    playIdle() {
        this.playAnimation('Idle');
    }
    
    playTread() {
        this.playAnimation('Tread');
    }
}

 


PlayerController.swap = function (old) {
    Object.assign(this.prototype, old.prototype);
  };
  
const globalScope = typeof window !== 'undefined' ? window : globalThis;
const registeredScripts =
  globalScope.__pcRegisteredScripts ||
  (globalScope.__pcRegisteredScripts = new Set());

if (!registeredScripts.has(PlayerController.scriptName)) {
  registerScript(PlayerController, PlayerController.scriptName);
  registeredScripts.add(PlayerController.scriptName);
}