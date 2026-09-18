/**
 * Soccer Pinball 3D - Visual 2.0
 * Athletic Player Visual Pipeline & Fake Rim Light Shader
 * 
 * Features:
 * 1. Athletic Low-Poly Humanoid Geometry with improved anatomical proportions (shoulders, torso taper, athletic limbs).
 * 2. Custom GLSL Fake Rim Light to separate players from the dark stadium background without adding realtime point lights.
 * 3. Distinct visual hierarchy: Goalkeeper (radiant high-vis safety orange) vs Field Defenders (azure / navy kit with squad numbers).
 */

(function(root) {
    'use strict';

    class PlayerVisualPipeline {
        constructor() {
            this.rimColor = new THREE.Color(0xdbeafe);
            this.materials = new Map();
        }

        createRimLitMaterial(params = {}) {
            const baseColor = params.color || 0x3b82f6;
            const roughness = params.roughness !== undefined ? params.roughness : 0.4;
            const metalness = params.metalness !== undefined ? params.metalness : 0.1;
            const rimIntensity = params.rimIntensity !== undefined ? params.rimIntensity : 0.85;

            const mat = new THREE.MeshStandardMaterial({
                color: baseColor,
                roughness: roughness,
                metalness: metalness
            });

            mat.onBeforeCompile = (shader) => {
                shader.uniforms.uRimColor = { value: this.rimColor };
                shader.uniforms.uRimIntensity = { value: rimIntensity };

                shader.vertexShader = shader.vertexShader.replace(
                    '#include <common>',
                    `#include <common>
                    varying vec3 vRimViewNormal;
                    varying vec3 vRimWorldPos;`
                );

                shader.vertexShader = shader.vertexShader.replace(
                    '#include <defaultnormal_vertex>',
                    `#include <defaultnormal_vertex>
                    vRimViewNormal = normalize(normalMatrix * transformedNormal);
                    vRimWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
                );

                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <common>',
                    `#include <common>
                    varying vec3 vRimViewNormal;
                    varying vec3 vRimWorldPos;
                    uniform vec3 uRimColor;
                    uniform float uRimIntensity;`
                );

                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <dithering_fragment>',
                    `#include <dithering_fragment>
                    vec3 vDir = normalize(cameraPosition - vRimWorldPos);
                    float rimDot = 1.0 - max(dot(vDir, normalize(vRimViewNormal)), 0.0);
                    float rimFactor = pow(rimDot, 2.5) * uRimIntensity;
                    gl_FragColor.rgb += uRimColor * rimFactor * 0.45;`
                );
            };

            return mat;
        }

        buildAthleticPlayerMesh(role = 'defender', kitConfig = {}) {
            const group = new THREE.Group();
            const isKeeper = (role === 'keeper');

            const jerseyColor = kitConfig.jersey || (isKeeper ? 0xf97316 : 0x0284c7);
            const shortsColor = kitConfig.shorts || (isKeeper ? 0x1e293b : 0xffffff);
            const bootsColor = kitConfig.boots || (isKeeper ? 0x0284c7 : 0xfacc15);
            const skinColor = kitConfig.skin || 0xf6d7b0;

            const jerseyMat = this.createRimLitMaterial({ color: jerseyColor, roughness: 0.35, rimIntensity: 0.9 });
            const shortsMat = this.createRimLitMaterial({ color: shortsColor, roughness: 0.45, rimIntensity: 0.6 });
            const skinMat = this.createRimLitMaterial({ color: skinColor, roughness: 0.65, rimIntensity: 0.4 });
            const bootsMat = this.createRimLitMaterial({ color: bootsColor, roughness: 0.25, metalness: 0.4, rimIntensity: 0.5 });

            // 1. Tapered Athletic Torso (Inverted trapezoid / tapered cylinder)
            const torsoGeom = new THREE.CylinderGeometry(0.34, 0.24, 0.68, 12);
            const torsoMesh = new THREE.Mesh(torsoGeom, jerseyMat);
            torsoMesh.position.y = 1.05;
            torsoMesh.castShadow = true;
            group.add(torsoMesh);

            // 2. Athletic Pelvis & Shorts
            const shortsGeom = new THREE.CylinderGeometry(0.25, 0.23, 0.32, 12);
            const shortsMesh = new THREE.Mesh(shortsGeom, shortsMat);
            shortsMesh.position.y = 0.68;
            shortsMesh.castShadow = true;
            group.add(shortsMesh);

            // 3. Proportional Head & Neck
            const neckGeom = new THREE.CylinderGeometry(0.1, 0.12, 0.12, 8);
            const neckMesh = new THREE.Mesh(neckGeom, skinMat);
            neckMesh.position.y = 1.44;
            group.add(neckMesh);

            const headGeom = new THREE.SphereGeometry(0.18, 14, 14);
            const headMesh = new THREE.Mesh(headGeom, skinMat);
            headMesh.position.y = 1.62;
            headMesh.castShadow = true;
            group.add(headMesh);

            // Hair cap / hairstyle
            const hairGeom = new THREE.SphereGeometry(0.185, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
            const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.9 });
            const hairMesh = new THREE.Mesh(hairGeom, hairMat);
            hairMesh.position.y = 1.63;
            hairMesh.rotation.x = -0.1;
            group.add(hairMesh);

            // 4. Athletic Arms with distinct shoulder cap
            const armGeom = new THREE.CylinderGeometry(0.08, 0.07, 0.52, 8);
            
            const leftArm = new THREE.Mesh(armGeom, isKeeper ? jerseyMat : skinMat);
            leftArm.position.set(-0.40, 1.08, 0);
            leftArm.rotation.z = 0.25;
            leftArm.castShadow = true;
            group.add(leftArm);

            const rightArm = new THREE.Mesh(armGeom, isKeeper ? jerseyMat : skinMat);
            rightArm.position.set(0.40, 1.08, 0);
            rightArm.rotation.z = -0.25;
            rightArm.castShadow = true;
            group.add(rightArm);

            // 5. Athletic Legs with football socks and boots
            const legGeom = new THREE.CylinderGeometry(0.09, 0.08, 0.58, 8);
            
            const leftLeg = new THREE.Mesh(legGeom, jerseyMat); // socks match jersey
            leftLeg.position.set(-0.16, 0.32, 0);
            leftLeg.castShadow = true;
            group.add(leftLeg);

            const rightLeg = new THREE.Mesh(legGeom, jerseyMat);
            rightLeg.position.set(0.16, 0.32, 0);
            rightLeg.castShadow = true;
            group.add(rightLeg);

            // Cleats / Boots
            const bootGeom = new THREE.BoxGeometry(0.12, 0.10, 0.24);
            const leftBoot = new THREE.Mesh(bootGeom, bootsMat);
            leftBoot.position.set(-0.16, 0.05, 0.04);
            group.add(leftBoot);

            const rightBoot = new THREE.Mesh(bootGeom, bootsMat);
            rightBoot.position.set(0.16, 0.05, 0.04);
            group.add(rightBoot);

            group.userData = {
                role: role,
                leftLeg: leftLeg,
                rightLeg: rightLeg,
                leftArm: leftArm,
                rightArm: rightArm,
                torso: torsoMesh
            };

            return group;
        }
    }

    root.Visual2 = root.Visual2 || {};
    root.Visual2.PlayerVisualPipeline = PlayerVisualPipeline;
    root.Visual2.players = new PlayerVisualPipeline();

})(window);
