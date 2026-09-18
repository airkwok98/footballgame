/**
 * Soccer Pinball 3D - Visual 2.0
 * Quality Profiles & Rendering Budget Management
 * 
 * Supports Desktop High, Mobile Medium, and Mobile Low presets.
 * Auto-detects URL parameters: ?quality=high|medium|low&debug=1
 */

(function(root) {
    'use strict';

    const PROFILES = {
        high: {
            name: 'High (Desktop / OLED Flagship)',
            pixelRatio: 2.0,
            antialias: true,
            shadowMapEnabled: true,
            shadowMapSize: 2048,
            shadowType: 'PCFSoft',
            toneMappingExposure: 1.18,
            bloomEnabled: true,
            rimLightingEnabled: true,
            particleScale: 1.0,
            maxParticles: 300,
            crowdQuality: 'layered', // 3D front + billboard rear
            spectatorPhysicsRate: 1.0
        },
        medium: {
            name: 'Medium (Mobile Standard)',
            pixelRatio: 1.5,
            antialias: true,
            shadowMapEnabled: true,
            shadowMapSize: 1024,
            shadowType: 'PCF',
            toneMappingExposure: 1.12,
            bloomEnabled: false, // fallback to Additive Blending pulse
            rimLightingEnabled: true,
            particleScale: 0.75,
            maxParticles: 150,
            crowdQuality: 'optimized',
            spectatorPhysicsRate: 0.5
        },
        low: {
            name: 'Low (Power Saver / Lite)',
            pixelRatio: 1.0,
            antialias: false,
            shadowMapEnabled: false,
            shadowMapSize: 512,
            shadowType: 'Basic',
            toneMappingExposure: 1.05,
            bloomEnabled: false,
            rimLightingEnabled: false,
            particleScale: 0.5,
            maxParticles: 80,
            crowdQuality: 'minimal',
            spectatorPhysicsRate: 0.25
        }
    };

    class QualityManager {
        constructor() {
            this.currentTier = this.detectOptimalTier();
            this.config = Object.assign({}, PROFILES[this.currentTier]);
            this.debugActive = this.detectDebug();
            this.stats = {
                fps: 60,
                frameTime: 16.6,
                drawCalls: 0,
                triangles: 0,
                geometries: 0,
                textures: 0,
                lights: 0,
                shadowPasses: 1
            };
            this._frameCount = 0;
            this._lastTime = performance.now();
            this.debugPanel = null;
            if (this.debugActive) {
                this.initDebugUI();
            }
        }

        detectOptimalTier() {
            const urlParams = new URLSearchParams(window.location.search);
            const q = (urlParams.get('quality') || '').toLowerCase();
            if (PROFILES[q]) return q;

            // Auto-detect mobile devices or high-DPI displays
            const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (window.innerWidth < 768);
            if (isMobile) {
                const isFlagship = (window.devicePixelRatio >= 2.5 && (navigator.hardwareConcurrency || 4) >= 6);
                return isFlagship ? 'medium' : 'low';
            }
            return 'high';
        }

        detectDebug() {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('debug') === '1' || urlParams.get('debug') === 'true';
        }

        setTier(tier) {
            if (!PROFILES[tier]) return;
            this.currentTier = tier;
            this.config = Object.assign({}, PROFILES[tier]);
            if (this.onTierChange) this.onTierChange(this.config);
            if (this.debugPanel) this.updateDebugUI();
        }

        applyToRenderer(renderer) {
            if (!renderer) return;
            const pr = Math.min(window.devicePixelRatio || 1, this.config.pixelRatio);
            renderer.setPixelRatio(pr);

            renderer.shadowMap.enabled = this.config.shadowMapEnabled;
            if (this.config.shadowMapEnabled) {
                if (this.config.shadowType === 'PCFSoft' && THREE.PCFSoftShadowMap) {
                    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                } else if (THREE.PCFShadowMap) {
                    renderer.shadowMap.type = THREE.PCFShadowMap;
                } else {
                    renderer.shadowMap.type = THREE.BasicShadowMap;
                }
            }
            renderer.toneMappingExposure = this.config.toneMappingExposure;
        }

        beginFrame() {
            this._frameCount++;
            const now = performance.now();
            if (now - this._lastTime >= 500) {
                this.stats.fps = Math.round((this._frameCount * 1000) / (now - this._lastTime));
                this.stats.frameTime = ((now - this._lastTime) / this._frameCount).toFixed(1);
                this._frameCount = 0;
                this._lastTime = now;
                if (this.debugPanel) this.renderStatsToUI();
            }
        }

        recordRendererInfo(renderer, lightCount = 0) {
            if (!renderer || !renderer.info) return;
            this.stats.drawCalls = renderer.info.render.calls;
            this.stats.triangles = renderer.info.render.triangles;
            this.stats.geometries = renderer.info.memory.geometries;
            this.stats.textures = renderer.info.memory.textures;
            this.stats.lights = lightCount;
        }

        initDebugUI() {
            if (document.getElementById('v2-debug-panel')) return;
            const panel = document.createElement('div');
            panel.id = 'v2-debug-panel';
            panel.style.cssText = `
                position: absolute;
                bottom: 12px;
                left: 12px;
                z-index: 9999;
                background: rgba(5, 9, 20, 0.88);
                border: 1px solid rgba(56, 189, 248, 0.35);
                border-radius: 8px;
                padding: 8px 12px;
                font-family: ui-monospace, "SF Mono", Menlo, Monaco, monospace;
                font-size: 11px;
                color: #e2e8f0;
                pointer-events: auto;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(8px);
                line-height: 1.4;
            `;
            panel.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:3px;">
                    <span style="font-weight:bold; color:#38bdf8;">VISUAL 2.0 // STATS</span>
                    <span id="v2-tier-badge" style="background:#0284c7; color:#fff; padding:1px 6px; border-radius:4px; font-size:10px; text-transform:uppercase;">${this.currentTier}</span>
                </div>
                <div id="v2-metrics-content">Loading metrics...</div>
                <div style="margin-top:6px; display:flex; gap:4px;">
                    <button id="v2-btn-high" style="background:#1e293b; color:#fff; border:1px solid #475569; border-radius:4px; padding:2px 6px; font-size:10px; cursor:pointer;">HIGH</button>
                    <button id="v2-btn-med" style="background:#1e293b; color:#fff; border:1px solid #475569; border-radius:4px; padding:2px 6px; font-size:10px; cursor:pointer;">MED</button>
                    <button id="v2-btn-low" style="background:#1e293b; color:#fff; border:1px solid #475569; border-radius:4px; padding:2px 6px; font-size:10px; cursor:pointer;">LOW</button>
                </div>
            `;
            document.body.appendChild(panel);
            this.debugPanel = panel;

            document.getElementById('v2-btn-high').onclick = () => this.setTier('high');
            document.getElementById('v2-btn-med').onclick = () => this.setTier('medium');
            document.getElementById('v2-btn-low').onclick = () => this.setTier('low');
        }

        renderStatsToUI() {
            const el = document.getElementById('v2-metrics-content');
            const badge = document.getElementById('v2-tier-badge');
            if (badge) badge.innerText = this.currentTier.toUpperCase();
            if (!el) return;
            const fpsColor = this.stats.fps >= 55 ? '#4ade80' : (this.stats.fps >= 30 ? '#facc15' : '#ef4444');
            el.innerHTML = `
                <div>FPS: <span style="color:${fpsColor}; font-weight:bold;">${this.stats.fps}</span> (${this.stats.frameTime}ms)</div>
                <div>Calls: <span style="color:#38bdf8;">${this.stats.drawCalls}</span> | Tris: <span style="color:#facc15;">${this.stats.triangles.toLocaleString()}</span></div>
                <div>Shadow Passes: <span style="color:#fb7185;">${this.config.shadowMapEnabled ? this.stats.shadowPasses : 0}</span> (${this.config.shadowMapSize}px)</div>
                <div>Geom: ${this.stats.geometries} | Tex: ${this.stats.textures}</div>
            `;
        }

        toggleDebug() {
            this.debugActive = !this.debugActive;
            if (this.debugActive) {
                this.initDebugUI();
            } else if (this.debugPanel) {
                this.debugPanel.remove();
                this.debugPanel = null;
            }
        }
    }

    root.Visual2 = root.Visual2 || {};
    root.Visual2.QualityManager = QualityManager;
    root.Visual2.quality = new QualityManager();

})(window);
