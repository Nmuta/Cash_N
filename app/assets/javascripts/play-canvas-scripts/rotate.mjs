import { Script, registerScript, Color, StandardMaterial } from 'playcanvas';

export class RotateScript extends Script {
    static scriptName = 'rotateScript';
    
    /**
    * The speed of the rotation in degrees per second
    * @attribute
    */
    speed = 90;
    
    /**
    * The color of the cube
    * @attribute
    */
    color = new Color(1, 0.5, 0); // Default orange color
    
    initialize() {
        console.log("Script initialized - setting color:", this.color);
    }
   
    update(dt) {
        // Rotate the entity 90 degrees per second around the world-space Y axis
        const innerCube = this.entity.findByName("innerCube");
        innerCube.rotate(0, dt * this.speed, 0);
    }

    doSomething(){
        console.log("Doing something!");
    }
}

// Register the script with PlayCanvas
registerScript(RotateScript, 'rotateScript');