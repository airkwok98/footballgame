/**
 * Soccer Pinball 3D - Visual 2.0
 * Camera Director & Cinematic Feedback Language
 * 
 * Provides:
 * 1. Micro-impulse screen shake on Sweet Spot strikes.
 * 2. FOV micro-punch and directional recoil on Rocket Shots.
 * 3. Multi-phase goal sequence (Hit-stop -> Push forward to net -> Ease back).
 */

(function(root) {
    'use strict';

    class CameraDirector {
        constructor() {
            this.camera = null;
            this.basePos = new THREE.Vector3();
            this.baseTarget = new THREE.Vector3();
            this.baseFov = 48;

            this.offsetPos = new THREE.Vector3();
            this.offsetTarget = new THREE.Vector3();
            this.shakeIntensity = 0;
            this.fovPunch = 0;

            this.goalSequenceActive = false;
            this.goalTimer = 0;
            this.hitStopRemaining = 0;
        }

        init(camera, basePos, baseTarget, baseFov) {
            this.camera = camera;
            if (basePos) this.basePos.copy(basePos);
            if (baseTarget) this.baseTarget.copy(baseTarget);
            if (baseFov) this.baseFov = baseFov;
        }

        setBase(pos, target, fov) {
            this.basePos.copy(pos);
            this.baseTarget.copy(target);
            this.baseFov = fov;
        }

        triggerSweetSpot(impulse = 0.12) {
            this.shakeIntensity = Math.max(this.shakeIntensity, impulse);
        }

        triggerRocketShot(dirX, dirZ, impulse = 0.28) {
            this.shakeIntensity = Math.max(this.shakeIntensity, impulse);
            this.fovPunch = 2.0; // drops FOV by 2 degrees (zoom punch)
            if (dirX !== undefined && dirZ !== undefined) {
                this.offsetPos.x -= dirX * 0.35;
                this.offsetPos.z -= dirZ * 0.35;
            }
        }

        triggerGoal() {
            this.goalSequenceActive = true;
            this.goalTimer = 0;
            this.hitStopRemaining = 0.05; // 50ms hit stop
            this.shakeIntensity = 0.35;
            this.fovPunch = 3.2;
        }

        update(dt) {
            if (!this.camera) return;

            // Hit stop logic
            if (this.hitStopRemaining > 0) {
                this.hitStopRemaining -= dt;
                // during hit stop, pause substantial physics / motion
            }

            // Goal sequence animation
            if (this.goalSequenceActive) {
                this.goalTimer += dt;
                if (this.goalTimer < 0.65) {
                    // Push forward towards top goal
                    const t = this.goalTimer / 0.65;
                    const ease = Math.sin(t * Math.PI * 0.5);
                    this.offsetPos.z = -1.8 * ease;
                    this.offsetPos.y = -0.8 * ease;
                } else if (this.goalTimer < 2.0) {
                    // Smooth ease back
                    const t = (this.goalTimer - 0.65) / 1.35;
                    const ease = 1.0 - Math.sin(t * Math.PI * 0.5);
                    this.offsetPos.z = -1.8 * ease;
                    this.offsetPos.y = -0.8 * ease;
                } else {
                    this.goalSequenceActive = false;
                    this.offsetPos.set(0, 0, 0);
                }
            } else {
                // Return positional offset to zero smoothly
                this.offsetPos.multiplyScalar(Math.max(0, 1.0 - dt * 6.0));
            }

            // Shake decay
            let shakeX = 0;
            let shakeY = 0;
            let shakeZ = 0;
            if (this.shakeIntensity > 0.005) {
                const angle = Math.random() * Math.PI * 2;
                shakeX = Math.cos(angle) * this.shakeIntensity;
                shakeY = Math.sin(angle) * this.shakeIntensity * 0.6;
                shakeZ = (Math.random() - 0.5) * this.shakeIntensity * 0.5;
                this.shakeIntensity *= Math.max(0, 1.0 - dt * 9.0);
            } else {
                this.shakeIntensity = 0;
            }

            // FOV punch recovery
            if (this.fovPunch > 0.01) {
                this.fovPunch *= Math.max(0, 1.0 - dt * 6.0);
            } else {
                this.fovPunch = 0;
            }

            // Apply to actual camera
            this.camera.position.x = this.basePos.x + this.offsetPos.x + shakeX;
            this.camera.position.y = this.basePos.y + this.offsetPos.y + shakeY;
            this.camera.position.z = this.basePos.z + this.offsetPos.z + shakeZ;

            this.camera.fov = this.baseFov - this.fovPunch;
            this.camera.updateProjectionMatrix();

            const lookX = this.baseTarget.x + shakeX * 0.2;
            const lookY = this.baseTarget.y;
            const lookZ = this.baseTarget.z + (this.goalSequenceActive ? -1.0 : 0);
            this.camera.lookAt(lookX, lookY, lookZ);
        }
    }

    root.Visual2 = root.Visual2 || {};
    root.Visual2.CameraDirector = CameraDirector;
    root.Visual2.cameraDirector = new CameraDirector();

})(window);
