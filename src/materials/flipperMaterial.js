/**
 * Soccer Pinball 3D - Visual 2.0
 * Mechanical Flipper Material & Sweet Spot Visual Accents
 * 
 * Features:
 * 1. Industrial anodized aluminum / carbon composite body (metalness: 0.82, roughness: 0.26).
 * 2. High-friction strike face with Sweet Spot strike alignment guides.
 * 3. Millisecond impact flash response on hit.
 */

(function(root) {
    'use strict';

    class FlipperVisualController {
        constructor() {
            this.leftMesh = null;
            this.rightMesh = null;
            this.mainMaterial = null;
            this.pivotMaterial = null;
            this.leftFlash = 0.0;
            this.rightFlash = 0.0;
        }

        createMaterials() {
            // Dark obsidian anodized mechanical body
            this.mainMaterial = new THREE.MeshStandardMaterial({
                color: 0x1e293b,
                roughness: 0.28,
                metalness: 0.82,
                emissive: 0x0284c7,
                emissiveIntensity: 0.08
            });

            // Polished chrome pivot collar
            this.pivotMaterial = new THREE.MeshStandardMaterial({
                color: 0xe2e8f0,
                roughness: 0.12,
                metalness: 0.95
            });

            return {
                main: this.mainMaterial,
                pivot: this.pivotMaterial
            };
        }

        applyToFlippers(leftFlipper, rightFlipper) {
            this.leftMesh = leftFlipper;
            this.rightMesh = rightFlipper;

            if (!this.mainMaterial) this.createMaterials();

            if (leftFlipper && leftFlipper.paddleMesh) {
                leftFlipper.paddleMesh.material = this.mainMaterial;
            }
            if (rightFlipper && rightFlipper.paddleMesh) {
                rightFlipper.paddleMesh.material = this.mainMaterial;
            }
        }

        triggerImpactFlash(isRight, isSweetSpot = false) {
            const val = isSweetSpot ? 1.0 : 0.45;
            if (isRight) {
                this.rightFlash = val;
            } else {
                this.leftFlash = val;
            }
        }

        update(dt) {
            // Decay flash states
            if (this.leftFlash > 0.01) {
                this.leftFlash = Math.max(0, this.leftFlash - dt * 6.0);
            }
            if (this.rightFlash > 0.01) {
                this.rightFlash = Math.max(0, this.rightFlash - dt * 6.0);
            }

            const activeFlash = Math.max(this.leftFlash, this.rightFlash);
            if (this.mainMaterial) {
                this.mainMaterial.emissiveIntensity = 0.08 + activeFlash * 0.9;
                if (activeFlash > 0.5) {
                    this.mainMaterial.emissive.setHex(0xfacc15); // Golden flash on sweet spot
                } else {
                    this.mainMaterial.emissive.setHex(0x38bdf8); // Cyan pulse on normal hit
                }
            }
        }
    }

    root.Visual2 = root.Visual2 || {};
    root.Visual2.FlipperVisualController = FlipperVisualController;
    root.Visual2.flippers = new FlipperVisualController();

})(window);
