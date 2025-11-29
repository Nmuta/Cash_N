import { Script, registerScript, Color, Vec3, StandardMaterial, Entity, Texture } from 'playcanvas';

export class ViceSpawnerScript extends Script {
    static scriptName = 'viceSpawnerScript';
    
    /**
     * Array of vice data from Rails
     * @attribute
     */
    viceData = '[]'; // JSON string of vices
    
    /**
     * Radius around player to spawn vices
     * @attribute
     */
    spawnRadius = 3;
    
    /**
     * Minimum distance between spheres
     * @attribute
     */
    minDistance = 1.5;
    
    initialize() {
        console.log("ViceSpawnerScript initialized");
        console.log("Raw viceData:", this.viceData);
        
        // Parse the vice data
        let vices = [];
        try {
            if (typeof this.viceData === 'string') {
                vices = JSON.parse(this.viceData);
            } else {
                vices = this.viceData;
            }
        } catch (e) {
            console.error("Failed to parse vice data:", e);
            return;
        }
        
        console.log("Parsed vices:", vices);
        
        // Wait a frame to ensure the scene is fully loaded
        setTimeout(() => {
            this.spawnViceSpheres(vices);
        }, 100);
    }
    
    spawnViceSpheres(vices) {
        console.log("Spawning", vices.length, "vice spheres");
        
        const positions = this.generateNonOverlappingPositions(vices.length);
        
        vices.forEach((vice, index) => {
            this.createViceSphere(vice, positions[index]);
        });
    }
    
    generateNonOverlappingPositions(count) {
        const positions = [];
        const maxAttempts = 100;
        
        for (let i = 0; i < count; i++) {
            let validPosition = false;
            let attempts = 0;
            let pos;
            
            while (!validPosition && attempts < maxAttempts) {
                // Generate random position in a circle around the camera/player
                const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.3;
                const distance = this.spawnRadius * (0.6 + Math.random() * 0.4);
                const height = (Math.random() - 0.5) * 1; // Vary height slightly around eye level
                
                pos = new Vec3(
                    Math.cos(angle) * distance,
                    height,
                    -distance // In front of the camera
                );
                
                // Check if position is far enough from all existing positions
                validPosition = true;
                for (let j = 0; j < positions.length; j++) {
                    const dist = pos.distance(positions[j]);
                    if (dist < this.minDistance) {
                        validPosition = false;
                        break;
                    }
                }
                
                attempts++;
            }
            
            positions.push(pos);
        }
        
        return positions;
    }
    
    createViceSphere(vice, position) {
        console.log("Creating sphere for vice:", vice.name, "at position:", position);
        
        // Create entity for the vice sphere
        const sphereEntity = new Entity(`vice_${vice.id}_${vice.name}`, this.app);
        
        // Add render component with sphere
        sphereEntity.addComponent('render', {
            type: 'sphere'
        });
        
        // Create and apply material with random color
        const material = new StandardMaterial();
        const color = this.generateColorFromName(vice.name);
        material.diffuse.copy(color);
        material.emissive.copy(new Color(color.r * 0.2, color.g * 0.2, color.b * 0.2));
        material.update();
        
        sphereEntity.render.material = material;
        
        // Set position and scale (make them bigger so they're more visible)
        sphereEntity.setPosition(position);
        sphereEntity.setLocalScale(1, 1, 1);
        
        // Add to scene
        this.app.root.addChild(sphereEntity);
        
        // Add text label above the sphere
        this.addTextLabel(sphereEntity, vice.name);
        
        console.log(`Created vice sphere: ${vice.name} at`, position.toString());
        console.log(`Camera is at: (0, 0, 5), Sphere is at: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
        
        // Optional: Add a floating animation
        this.addFloatingAnimation(sphereEntity);
    }
    
    addTextLabel(sphereEntity, viceName) {
        try {
            console.log(`Creating canvas-based label for ${viceName}`);
            
            // Create a canvas to render text
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            
            // Draw text on canvas
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.font = 'bold 48px Arial';
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 4;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Draw text with outline
            ctx.strokeText(viceName, canvas.width / 2, canvas.height / 2);
            ctx.fillText(viceName, canvas.width / 2, canvas.height / 2);
            
            // Create texture from canvas
            const texture = new Texture(this.app.graphicsDevice, {
                name: `${viceName}_label_texture`
            });
            texture.setSource(canvas);
            texture.minFilter = 1; // LINEAR
            texture.magFilter = 1; // LINEAR
            texture.addressU = 0; // CLAMP
            texture.addressV = 0; // CLAMP
            
            // Create material with the texture
            const material = new StandardMaterial();
            material.emissiveMap = texture;
            material.emissive = new Color(1, 1, 1);
            material.opacity = 0.9;
            material.blendType = 2; // BLEND_NORMAL
            material.update();
            
            // Create plane entity for the label
            const labelEntity = new Entity(`${sphereEntity.name}_label`, this.app);
            labelEntity.addComponent('render', {
                type: 'plane'
            });
            labelEntity.render.material = material;
            
            // Position above sphere and scale appropriately
            labelEntity.setLocalPosition(0, 1.5, 0);
            labelEntity.setLocalScale(2, 0.5, 1);
            
            // Add to sphere
            sphereEntity.addChild(labelEntity);
            
            // Store reference for billboard rotation
            labelEntity.labelData = {
                isBillboard: true,
                viceName: viceName
            };
            
            console.log(`Created canvas label for ${viceName}`);
        } catch (error) {
            console.error(`Failed to create canvas label for ${viceName}:`, error);
        }
    }
    
    generateColorFromName(name) {
        // Generate a consistent color from the vice name
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        // Convert hash to RGB values (bright colors)
        const r = ((hash & 0xFF0000) >> 16) / 255;
        const g = ((hash & 0x00FF00) >> 8) / 255;
        const b = (hash & 0x0000FF) / 255;
        
        // Ensure colors are vibrant (boost saturation)
        return new Color(
            0.3 + r * 0.7,
            0.3 + g * 0.7,
            0.3 + b * 0.7
        );
    }
    
    addFloatingAnimation(entity) {
        const startY = entity.getPosition().y;
        const floatAmount = 0.3;
        const floatSpeed = 1 + Math.random();
        
        let time = Math.random() * Math.PI * 2; // Random start time
        
        entity.script = entity.script || {};
        entity.script.update = (dt) => {
            time += dt * floatSpeed;
            const pos = entity.getPosition();
            entity.setPosition(pos.x, startY + Math.sin(time) * floatAmount, pos.z);
        };
    }
    
    update(dt) {
        // Safety checks
        if (!this.app || !this.app.root) return;
        
        // Get camera position
        const camera = this.app.root.findByName('camera');
        if (!camera) return;
        
        try {
            const cameraPos = camera.getPosition();
            
            // Update all vice sphere entities
            const children = this.app.root.children;
            if (!children) return;
            
            children.forEach(entity => {
                if (!entity || !entity.name || !entity.name.startsWith('vice_')) return;
                
                // Update floating animation
                if (entity.script && entity.script.update) {
                    entity.script.update(dt);
                }
                
                // Update billboard labels to face camera
                if (entity.children) {
                    entity.children.forEach(child => {
                        if (!child || !child.labelData || !child.labelData.isBillboard) return;
                        
                        try {
                            // Make label face the camera (billboard effect)
                            child.lookAt(cameraPos);
                            // Keep label upright by zeroing out the roll
                            const euler = child.getEulerAngles();
                            child.setEulerAngles(0, euler.y, 0);
                        } catch (e) {
                            // Silently ignore label rotation errors
                        }
                    });
                }
            });
        } catch (error) {
            // Silently ignore update errors
        }
    }
}

registerScript(ViceSpawnerScript, 'viceSpawnerScript');

