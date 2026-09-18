/**
 * Soccer Pinball 3D - Visual 2.0
 * 2.5D Stadium & Layered Crowd Architecture
 * 
 * Layering:
 * - Layer A (Foreground / Sidelines): High-impact 3D animated spectators on first tiers.
 * - Layer B (Mid-distance): Low-poly instanced seated blocks.
 * - Layer C (Far background): Pre-baked high-res stadium backdrop texture with atmospheric depth.
 */

(function(root) {
    'use strict';

    class LayeredCrowdSystem {
        constructor() {
            this.frontSpectators = [];
            this.cheeringActive = false;
            this.cheerTimer = 0;
        }

        registerSpectator(spectator) {
            this.frontSpectators.push(spectator);
        }

        triggerCheer() {
            this.cheeringActive = true;
            this.cheerTimer = 0;
            this.frontSpectators.forEach(sp => {
                if (sp.onGoalCheer) sp.onGoalCheer();
            });
        }

        update(dt, time) {
            if (this.cheeringActive) {
                this.cheerTimer += dt;
                if (this.cheerTimer > 3.0) {
                    this.cheeringActive = false;
                }
            }

            // Animate front spectators
            for (let i = 0; i < this.frontSpectators.length; i++) {
                const sp = this.frontSpectators[i];
                if (sp.update) {
                    sp.update(dt, time, this.cheeringActive);
                }
            }
        }
    }

    root.Visual2 = root.Visual2 || {};
    root.Visual2.LayeredCrowdSystem = LayeredCrowdSystem;
    root.Visual2.crowd = new LayeredCrowdSystem();

})(window);
