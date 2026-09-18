/**
 * Soccer Pinball 3D - Visual 2.0
 * Ball 2.0 Material & Rocket Shot Energy Shader
 * 
 * Features:
 * 1. Regular State: PBR leather roughness, subtle stadium environment reflection, zero self-illumination.
 * 2. Rocket Shot State: Custom Fresnel edge rim glow, golden core energy pulse, dynamic tail integration.
 */

(function(root) {
    'use strict';

    class BallVisualController {
        constructor() {
            this.mesh = null;
            this.classicTexture = null;
            this.magmaTexture = null;
            this.currentSkin = 'classic';
            this.standardMaterial = null;
            this.isRocketActive = false;
            this.rocketIntensity = 0.0;
            this.trailMesh = null;
            this.trailPositions = [];
            this.maxTrailLength = 16;
        }

        init(ballMesh, textures = {}) {
            this.mesh = ballMesh;
            this.classicTexture = textures.classic || null;
            this.magmaTexture = textures.magma || null;

            // Build Visual 2.0 PBR Ball Material with custom Fresnel rim injection
            const mat = new THREE.MeshStandardMaterial({
                map: this.classicTexture,
                roughness: 0.35,
                metalness: 0.15,
                roughnessMap: null,
                envMapIntensity: 0.85
            });

            // Inject Custom GLSL for Fresnel Edge Glow during Rocket Shot
            mat.onBeforeCompile = (shader) => {
                shader.uniforms.uRocketIntensity = { value: 0.0 };
                shader.uniforms.uRocketColor = { value: new THREE.Color(0xfbbf24) };
                mat.userData.shader = shader;

                shader.vertexShader = shader.vertexShader.replace(
                    '#include <common>',
                    `#include <common>
                    varying vec3 vViewNormal;
                    varying vec3 vWorldPosition;`
                );

                shader.vertexShader = shader.vertexShader.replace(
                    '#include <defaultnormal_vertex>',
                    `#include <defaultnormal_vertex>
                    vViewNormal = normalize(normalMatrix * transformedNormal);
                    vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;`
                );

                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <common>',
                    `#include <common>
                    varying vec3 vViewNormal;
                    varying vec3 vWorldPosition;
                    uniform float uRocketIntensity;
                    uniform vec3 uRocketColor;`
                );

                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <dithering_fragment>',
                    `#include <dithering_fragment>
                    if (uRocketIntensity > 0.01) {
                        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
                        vec3 normal = normalize(vViewNormal);
                        float fresnel = 1.0 - max(dot(viewDir, normal), 0.0);
                        fresnel = pow(fresnel, 2.8);
                        vec3 rimGlow = uRocketColor * fresnel * uRocketIntensity * 1.8;
                        vec3 coreGlow = uRocketColor * 0.25 * uRocketIntensity;
                        gl_FragColor.rgb += rimGlow + coreGlow;
                    }`
                );
            };

            this.standardMaterial = mat;
            if (this.mesh) {
                this.mesh.material = this.standardMaterial;
            }

            this.initEnergyTrail();
        }

        initEnergyTrail() {
            if (!this.mesh || !this.mesh.parent) return;
            const geom = new THREE.BufferGeometry();
            const posArray = new Float32Array(this.maxTrailLength * 3);
            const alphaArray = new Float32Array(this.maxTrailLength);
            geom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
            geom.setAttribute('alpha', new THREE.BufferAttribute(alphaArray, 1));

            const trailMat = new THREE.ShaderMaterial({
                uniforms: {
                    uColor: { value: new THREE.Color(0xfbbf24) }
                },
                vertexShader: `
                    attribute float alpha;
                    varying float vAlpha;
                    void main() {
                        vAlpha = alpha;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 uColor;
                    varying float vAlpha;
                    void main() {
                        gl_FragColor = vec4(uColor, vAlpha * 0.7);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            const trailLine = new THREE.Line(geom, trailMat);
            trailLine.frustumCulled = false;
            this.mesh.parent.add(trailLine);
            this.trailMesh = trailLine;
        }

        setRocketState(active, speedFactor = 1.0) {
            this.isRocketActive = active;
            this.targetIntensity = active ? Math.min(1.5, 0.8 + speedFactor * 0.4) : 0.0;
        }

        update(dt) {
            // Smoothly interpolate intensity
            const target = this.isRocketActive ? (this.targetIntensity || 1.0) : 0.0;
            this.rocketIntensity += (target - this.rocketIntensity) * Math.min(1.0, dt * 10.0);

            if (this.standardMaterial && this.standardMaterial.userData.shader) {
                this.standardMaterial.userData.shader.uniforms.uRocketIntensity.value = this.rocketIntensity;
            }

            // Update trail
            if (this.mesh && this.trailMesh) {
                if (this.rocketIntensity > 0.05) {
                    this.trailPositions.unshift({
                        x: this.mesh.position.x,
                        y: this.mesh.position.y,
                        z: this.mesh.position.z
                    });
                    if (this.trailPositions.length > this.maxTrailLength) {
                        this.trailPositions.pop();
                    }
                    this.trailMesh.visible = true;
                } else {
                    if (this.trailPositions.length > 0) {
                        this.trailPositions.pop();
                    }
                    if (this.trailPositions.length === 0) {
                        this.trailMesh.visible = false;
                    }
                }

                const posAttr = this.trailMesh.geometry.attributes.position;
                const alphaAttr = this.trailMesh.geometry.attributes.alpha;
                for (let i = 0; i < this.maxTrailLength; i++) {
                    const pt = this.trailPositions[i] || (this.mesh.position);
                    posAttr.setXYZ(i, pt.x, pt.y, pt.z);
                    const a = i < this.trailPositions.length ? (1.0 - i / this.maxTrailLength) * this.rocketIntensity : 0.0;
                    alphaAttr.setX(i, a);
                }
                posAttr.needsUpdate = true;
                alphaAttr.needsUpdate = true;
            }
        }
    }

    root.Visual2 = root.Visual2 || {};
    root.Visual2.BallVisualController = BallVisualController;
    root.Visual2.ball = new BallVisualController();

})(window);
