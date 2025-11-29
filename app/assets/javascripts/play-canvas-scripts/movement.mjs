import { Script, registerScript, KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN } from 'playcanvas';

export class MovementScript extends Script {
    static scriptName = 'movementScript';
   
    update(dt) {
        // get which keys are pressed
        const keyboard = this.app.keyboard;
        const left  = keyboard.isPressed("a");
        const right = keyboard.isPressed("d");
        const up    = keyboard.isPressed("s");
        const down  = keyboard.isPressed("w");
        const inn    = keyboard.isPressed("e");
        const outt  = keyboard.isPressed("q");

        // move this entity based on which keys are pressed
        // dt is the time in seconds since the last frame and stands for 'delta time'
        if (left) {
            this.entity.translate(-dt, 0, 0);
        }
        if (right) {
            this.entity.translate(dt, 0, 0);
        }
        if (up) {
            this.entity.translate(0, -dt, 0);
        }
        if (down) {
            this.entity.translate(0, dt,0);
        }
        if (inn) {
            this.entity.translate(0, 0, -dt);
        }
        if (outt) {
            this.entity.translate(0, 0, dt);
        }
    }
}


MovementScript.swap = function (old) {
    Object.assign(this.prototype, old.prototype);
  };
  
registerScript(MovementScript, 'movementScript');
