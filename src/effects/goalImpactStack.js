/**
 * Soccer Pinball 3D - Visual 2.0
 * Goal Impact Stack & Multi-Stage Celebration Pipeline
 * 
 * Orchestrates:
 * 1. Ball Crosses Goal Line -> 50ms Hit-Stop (Micro Freeze).
 * 2. Camera Punch towards net back.
 * 3. Net Material Stress Flash & Bulge physics.
 * 4. Controlled Exposure & Bloom Pulse.
 * 5. Crowd Standing Ovation trigger.
 * 6. 3D Confetti gold ribbon shower.
 * 7. Cinematic ease back.
 */

(function(root) {
    'use strict';

    class GoalImpactStack {
        constructor() {
            this.active = false;
            this.timer = 0;
            this.hitStopActive = false;
            this.callbacks = {};
        }

        registerCallbacks(cbs = {}) {
            this.callbacks = Object.assign(this.callbacks, cbs);
        }

        execute(ball, netSystem) {
            this.active = true;
            this.timer = 0;

            // 1. Trigger 50ms Hit Stop
            if (window.Visual2 && window.Visual2.cameraDirector) {
                window.Visual2.cameraDirector.triggerGoal();
            }

            // 2. Trigger Post-Processing Exposure / Bloom Pulse
            if (window.Visual2 && window.Visual2.postprocessing) {
                window.Visual2.postprocessing.triggerExposurePulse(1.45, 240, 'gold');
            }

            // 3. Trigger Net impact flash
            if (this.callbacks.onNetFlash) {
                this.callbacks.onNetFlash();
            }

            // 4. Trigger Crowd Reaction
            if (this.callbacks.onCrowdCheer) {
                this.callbacks.onCrowdCheer();
            }

            // 5. Trigger Confetti
            if (this.callbacks.onConfetti) {
                this.callbacks.onConfetti();
            }
        }

        update(dt) {
            if (!this.active) return;
            this.timer += dt;
            if (this.timer > 2.5) {
                this.active = false;
            }
        }
    }

    root.Visual2 = root.Visual2 || {};
    root.Visual2.GoalImpactStack = GoalImpactStack;
    root.Visual2.goalImpact = new GoalImpactStack();

})(window);
