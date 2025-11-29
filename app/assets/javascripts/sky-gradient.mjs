import { StandardMaterial, Shader, SEMANTIC_POSITION } from "playcanvas";

export default class GradientSky {
    initialize() {
        const app = this.entity.app;
        const entity = this.entity;

        // Create a simple gradient material
        const material = new StandardMaterial();
        material.shader = this._createGradientShader(app.graphicsDevice);
        material.update();

        // Apply material to the model
        entity.model.material = material;

        // Flip normals inward so we see inside the sphere
        entity.model.meshInstances.forEach(mi => {
            mi.flipFaces = true;
        });
    }

    _createGradientShader(device) {
        const vs = `
            attribute vec3 aPosition;
            varying vec3 vPosition;
            uniform mat4 matrix_model;
            uniform mat4 matrix_viewProjection;
            void main(void) {
                vPosition = (matrix_model * vec4(aPosition, 1.0)).xyz;
                gl_Position = matrix_viewProjection * vec4(aPosition, 1.0);
            }
        `;

        const fs = `
            precision mediump float;
            varying vec3 vPosition;
            void main(void) {
                float h = normalize(vPosition).y * 0.5 + 0.5;
                vec3 topColor = vec3(0.1, 0.4, 0.8);
                vec3 bottomColor = vec3(0.8, 0.9, 1.0);
                gl_FragColor = vec4(mix(bottomColor, topColor, h), 1.0);
            }
        `;

        return new Shader(device, {
            attributes: { aPosition: SEMANTIC_POSITION },
            vshader: vs,
            fshader: fs
        });
    }
}
