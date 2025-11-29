import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["wm"]

  tally = 0

  connect() {
    if (this.hasWmTarget) {
      this.wmTarget.textContent = `Current score ${this.tally}`
    }
  }

  bump() {
    this.tally += 1
    if (this.hasWmTarget) {
      this.wmTarget.textContent = `Current score ${this.tally}`
    } else {
      // Fallback: update the controller element if no target provided
      this.element.textContent = `Current score ${this.tally}`
    }
  }

  

  async colorChange(event) {
   
    const paramData = event.currentTarget.dataset.helloColorchangeParam
    const colorValues = JSON.parse(paramData);
    console.log(colorValues.r, colorValues.g, colorValues.b);

    const appElement =  await document.querySelector('pc-app').ready();
    const appi = appElement.app;

    if (appi && appi.root && appi.root.children[0]) {
      const hierarchy = appi.root.children;
      const cube = hierarchy.find(entity => entity.name === 'fast spinning cube');
      const sphere = hierarchy.find(entity => entity.name === 'sphere');
      if (cube && sphere) {
          let diffuse = cube.render._material._diffuse;
          diffuse.r = colorValues.r;
          diffuse.g = colorValues.g;
          diffuse.b = colorValues.b;
          cube.render._material.update();
          
          let sphereDiffuse = sphere.render._material._diffuse;
          sphereDiffuse.r = colorValues.g;
          sphereDiffuse.g = colorValues.b;
          sphereDiffuse.b = colorValues.r;
          sphere.render._material.update();
        }
    }
  }
}
