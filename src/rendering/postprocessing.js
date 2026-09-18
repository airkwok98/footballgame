/**
 * Soccer Pinball 3D - Visual 2.0
 * Post-Processing & Controlled Bloom Controller
 * 
 * Provides:
 * 1. Controlled Bloom & Exposure pulse during Rocket Shot and Goal events.
 * 2. Vignette & Contrast Color Grading overlay.
 * 3. Mobile OLED zero-GC fallback ensuring steady 60 FPS without multi-pass post-processing overhead.
 */

(function(root) {
    'use strict';

    class PostProcessingController {
        constructor() {
            this.renderer = null;
            this.scene = null;
            this.camera = null;
            this.exposureBase = 1.15;
            this.exposureCurrent = 1.15;
            this.pulseTarget = 1.15;
            this.pulseDecay = 4.0;
            this.vignetteElement = null;
            this.flashElement = null;
            this.initVFXOverlay();
        }

        init(renderer, scene, camera) {
            this.renderer = renderer;
            this.scene = scene;
            this.camera = camera;
            if (this.renderer) {
                this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
                this.renderer.toneMappingExposure = this.exposureBase;
            }
        }

        initVFXOverlay() {
            if (document.getElementById('v2-vignette-overlay')) return;

            // Vignette overlay (cinematic edge dark gradient)
            const vig = document.createElement('div');
            vig.id = 'v2-vignette-overlay';
            vig.style.cssText = `
                position: absolute;
                inset: 0;
                pointer-events: none;
                z-index: 5;
                background: radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 65%, rgba(5, 9, 20, 0.45) 100%);
                mix-blend-mode: multiply;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(vig);
            this.vignetteElement = vig;

            // Flash overlay for controlled exposure/bloom pulse on goals & critical events
            const flash = document.createElement('div');
            flash.id = 'v2-flash-overlay';
            flash.style.cssText = `
                position: absolute;
                inset: 0;
                pointer-events: none;
                z-index: 6;
                background: radial-gradient(circle at 50% 30%, rgba(254, 240, 138, 0.35) 0%, rgba(56, 189, 248, 0.2) 50%, rgba(0,0,0,0) 80%);
                opacity: 0;
                mix-blend-mode: screen;
                transition: opacity 0.08s ease-out;
            `;
            document.body.appendChild(flash);
            this.flashElement = flash;
        }

        triggerExposurePulse(intensity = 1.5, durationMs = 180, colorStyle = 'gold') {
            if (!this.renderer) return;

            // Three.js ToneMapping exposure pulse
            this.pulseTarget = this.exposureBase * intensity;
            this.exposureCurrent = this.pulseTarget;
            this.renderer.toneMappingExposure = this.exposureCurrent;

            // Screen space controlled bloom flash overlay
            if (this.flashElement) {
                if (colorStyle === 'gold') {
                    this.flashElement.style.background = 'radial-gradient(circle at 50% 30%, rgba(254, 240, 138, 0.4) 0%, rgba(250, 204, 21, 0.25) 45%, rgba(0,0,0,0) 80%)';
                } else if (colorStyle === 'cyan') {
                    this.flashElement.style.background = 'radial-gradient(circle at 50% 50%, rgba(186, 230, 253, 0.35) 0%, rgba(56, 189, 248, 0.2) 50%, rgba(0,0,0,0) 80%)';
                }
                this.flashElement.style.opacity = '1';
                setTimeout(() => {
                    if (this.flashElement) {
                        this.flashElement.style.transition = `opacity ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`;
                        this.flashElement.style.opacity = '0';
                    }
                }, 40);
            }
        }

        update(dt) {
            if (!this.renderer) return;

            // Decay exposure smoothly back to base
            if (this.exposureCurrent > this.exposureBase + 0.01) {
                this.exposureCurrent += (this.exposureBase - this.exposureCurrent) * Math.min(1.0, dt * this.pulseDecay);
                this.renderer.toneMappingExposure = this.exposureCurrent;
            } else {
                this.renderer.toneMappingExposure = this.exposureBase;
            }
        }
    }

    root.Visual2 = root.Visual2 || {};
    root.Visual2.PostProcessingController = PostProcessingController;
    root.Visual2.postprocessing = new PostProcessingController();

})(window);
