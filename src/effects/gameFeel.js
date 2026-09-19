/**
 * Soccer Pinball 3D - Game Feel & Layered Impact Engine (VS03-C)
 * 
 * Four-Level Feedback Hierarchy:
 * LEVEL 1: Normal Touch (Flipper / Light wall / Gentle contact)
 * LEVEL 2: Strong Hit (High-speed collision / Goalkeeper save / Defender kick / Ball saver)
 * LEVEL 3: Rocket / Critical Shot (Sweet spot release, 4-stage feel)
 * LEVEL 4: Goal & Match Point (Climax celebration, Normal Goal vs Winning Goal)
 * 
 * Systems:
 * - Unified Screen Shake (max/additive policy, non-compounding)
 * - Unified Camera Punch: impactCameraKick(intensity)
 * - Hit Stop System (20-50ms physically safe, input-preserving)
 * - Single TimeScale Slow Motion Controller
 * - Pre-allocated Object Pools (Sparks, Turf, Trail) with zero runtime GC
 * - Tiered Sound Hierarchy (Volume, pitch, timbre separation)
 * - Escalating Combo presentation (x2, x3, x5+)
 * - A/B Gate (?feel=v2)
 * - Debug Hotkeys F6-F9 (?feelDebug=1)
 */

(function(root) {
    'use strict';

    class GameFeelController {
        constructor() {
            this.version = this.detectVersion();
            this.debugMode = this.detectDebug();

            // Unified screen shake
            this.screenShake = 0;
            this.shakeDecay = 9.0;

            // Hit stop & slow motion
            this.hitStopRemaining = 0;
            this.slowMoTimer = 0;
            this.slowMoScale = 1.0;

            // Ball squash state
            this.squashActive = false;
            this.squashTimer = 0;
            this.squashDuration = 0.05;
            this.squashScale = new THREE.Vector3(1, 1, 1);
            this.squashTarget = new THREE.Vector3(1, 1, 1);

            // Ball highlight flash
            this.ballHighlightTimer = 0;

            // Particle Pools (Zero runtime allocations)
            this.sparksPool = [];
            this.turfPool = [];
            this.trailPool = [];
            this.particlesGroup = null;
            this.poolsInitialized = false;

            // External references
            this.scene = null;
            this.camera = null;
            this.ball = null;
            this.sound = null;

            // Metrics
            this.activeSparksCount = 0;
            this.activeTurfCount = 0;
            this.activeTrailCount = 0;

            if (this.debugMode) {
                this.setupDebugKeys();
            }
        }

        detectVersion() {
            if (typeof window === 'undefined' || !window.location) return 'v1';
            const p = new URLSearchParams(window.location.search);
            const v = (p.get('feel') || '').toLowerCase();
            return (v === 'v2' || v === '2') ? 'v2' : 'v1';
        }

        detectDebug() {
            if (typeof window === 'undefined' || !window.location) return false;
            const p = new URLSearchParams(window.location.search);
            return p.get('feelDebug') === '1' || p.get('feelDebug') === 'true';
        }

        setVersion(v) {
            this.version = (v === 'v2' || v === '2') ? 'v2' : 'v1';
            console.log(`[GameFeel] Switched to version: ${this.version}`);
        }

        init(scene, camera, ball, sound) {
            this.scene = scene;
            this.camera = camera;
            this.ball = ball;
            this.sound = sound;

            this.initParticlePools(scene);
            console.log(`[GameFeel] Initialized. Active mode: ${this.version.toUpperCase()} (Debug: ${this.debugMode})`);
        }

        /* ==========================================================================
           1. 零 GC 粒子对象池 (Sparks, Turf, Trail)
           ========================================================================== */
        initParticlePools(scene) {
            if (this.poolsInitialized || !scene) return;

            this.particlesGroup = new THREE.Group();
            this.particlesGroup.name = "GameFeel_ParticlePools";
            scene.add(this.particlesGroup);

            // 1. Sparks Pool: 36 pre-allocated sphere meshes
            const sparkGeo = new THREE.SphereGeometry(0.11, 5, 5);
            const sparkMaterials = {
                white: new THREE.MeshBasicMaterial({ color: 0xffffff }),
                gold: new THREE.MeshBasicMaterial({ color: 0xfacc15 }),
                cyan: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
                blue: new THREE.MeshBasicMaterial({ color: 0x60a5fa })
            };
            this.sparkMaterials = sparkMaterials;

            for (let i = 0; i < 36; i++) {
                const mesh = new THREE.Mesh(sparkGeo, sparkMaterials.white);
                mesh.visible = false;
                this.particlesGroup.add(mesh);
                this.sparksPool.push({
                    mesh,
                    active: false,
                    vx: 0, vy: 0, vz: 0,
                    life: 0, maxLife: 0.35,
                    gravity: 16.0
                });
            }

            // 2. Turf Pool: 24 pre-allocated box meshes
            const turfGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
            const turfMat = new THREE.MeshBasicMaterial({ color: 0x86efac });
            this.turfMat = turfMat;

            for (let i = 0; i < 24; i++) {
                const mesh = new THREE.Mesh(turfGeo, turfMat);
                mesh.visible = false;
                this.particlesGroup.add(mesh);
                this.turfPool.push({
                    mesh,
                    active: false,
                    vx: 0, vy: 0, vz: 0,
                    rotX: 0, rotY: 0, rotZ: 0,
                    life: 0, maxLife: 0.40,
                    gravity: 18.0
                });
            }

            // 3. Trail Pool: 25 pre-allocated sphere meshes
            const trailGeo = new THREE.SphereGeometry(0.14, 5, 5);
            const trailMat = new THREE.MeshBasicMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.65
            });
            this.trailMat = trailMat;

            for (let i = 0; i < 25; i++) {
                const mesh = new THREE.Mesh(trailGeo, trailMat.clone());
                mesh.visible = false;
                this.particlesGroup.add(mesh);
                this.trailPool.push({
                    mesh,
                    active: false,
                    life: 0,
                    maxLife: 0.28
                });
            }

            this.poolsInitialized = true;
        }

        spawnPooledSparks(x, y, z, count = 6, colorKey = 'white', speedMultiplier = 1.0) {
            const mat = this.sparkMaterials[colorKey] || this.sparkMaterials.white;
            let spawned = 0;

            for (let i = 0; i < this.sparksPool.length && spawned < count; i++) {
                const p = this.sparksPool[i];
                if (p.active) continue;

                p.active = true;
                p.mesh.material = mat;
                p.mesh.position.set(x + (Math.random() - 0.5) * 0.15, y, z + (Math.random() - 0.5) * 0.15);
                p.mesh.scale.setScalar(1.0);
                p.mesh.visible = true;

                const angle = Math.random() * Math.PI * 2;
                const spd = (3.0 + Math.random() * 6.0) * speedMultiplier;
                p.vx = Math.cos(angle) * spd;
                p.vy = (2.0 + Math.random() * 5.0) * speedMultiplier;
                p.vz = Math.sin(angle) * spd;
                p.life = 0.35 + Math.random() * 0.15;
                p.maxLife = p.life;
                spawned++;
            }
        }

        spawnPooledTurf(x, y, z, count = 6, speedMultiplier = 1.0) {
            let spawned = 0;
            for (let i = 0; i < this.turfPool.length && spawned < count; i++) {
                const p = this.turfPool[i];
                if (p.active) continue;

                p.active = true;
                p.mesh.position.set(x + (Math.random() - 0.5) * 0.15, y + 0.05, z + (Math.random() - 0.5) * 0.15);
                p.mesh.scale.setScalar(1.0);
                p.mesh.visible = true;

                p.vx = (Math.random() - 0.5) * 4.5 * speedMultiplier;
                p.vy = (1.8 + Math.random() * 3.5) * speedMultiplier;
                p.vz = (Math.random() - 0.5) * 4.5 * speedMultiplier;
                p.rotX = (Math.random() - 0.5) * 12.0;
                p.rotY = (Math.random() - 0.5) * 12.0;
                p.rotZ = (Math.random() - 0.5) * 12.0;
                p.life = 0.38 + Math.random() * 0.12;
                p.maxLife = p.life;
                spawned++;
            }
        }

        spawnPooledTrail(x, y, z, colorHex = 0x38bdf8) {
            for (let i = 0; i < this.trailPool.length; i++) {
                const p = this.trailPool[i];
                if (p.active) continue;

                p.active = true;
                p.mesh.position.set(x, y, z);
                p.mesh.material.color.setHex(colorHex);
                p.mesh.material.opacity = 0.65;
                p.mesh.scale.setScalar(1.0);
                p.mesh.visible = true;
                p.life = 0.26;
                p.maxLife = 0.26;
                break;
            }
        }

        /* ==========================================================================
           2. 统一相机冲拳与屏幕震颤入口
           ========================================================================== */
        triggerScreenShake(amount, decay = 9.0) {
            // Max / Additive policy to prevent sudden exponential bursts
            this.screenShake = Math.min(0.60, Math.max(this.screenShake, amount * 0.7) + amount * 0.3);
            this.shakeDecay = decay;
        }

        impactCameraKick(intensity = 0.05, dirX = 0, dirZ = 0) {
            if (window.Visual2 && window.Visual2.cameraDirector) {
                window.Visual2.cameraDirector.impactCameraKick(intensity, dirX, dirZ);
            }
        }

        /* ==========================================================================
           3. 物理安全 Hit Stop 与 Slow Motion 协调器
           ========================================================================== */
        triggerHitStop(durationMs = 30) {
            this.hitStopRemaining = Math.max(this.hitStopRemaining, durationMs / 1000.0);
        }

        triggerSlowMotion(scale = 0.35, durationSeconds = 1.2) {
            this.slowMoScale = scale;
            this.slowMoTimer = Math.max(this.slowMoTimer, durationSeconds);
        }

        getSimDt(rawDt) {
            // Hit stop completely pauses physics simulation while keeping camera & audio responsive
            if (this.hitStopRemaining > 0) {
                return 0;
            }
            if (this.slowMoTimer > 0) {
                return rawDt * this.slowMoScale;
            }
            return rawDt;
        }

        /* ==========================================================================
           4. 物理击球形变 (Ball Squash & Stretch Illusion)
           ========================================================================== */
        triggerBallSquash(level = 1, dirX = 0, dirZ = 0) {
            if (!this.ball || !this.ball.mesh) return;

            this.squashActive = true;
            this.squashTimer = 0;

            if (level === 1) {
                // Mild touch: 5% squash
                this.squashDuration = 0.045;
                this.squashTarget.set(1.05, 0.94, 1.05);
            } else if (level === 2) {
                // Strong hit: 10% squash
                this.squashDuration = 0.06;
                this.squashTarget.set(1.10, 0.88, 1.10);
            } else if (level === 3) {
                // Rocket shot: elongated along impulse direction
                this.squashDuration = 0.08;
                this.squashTarget.set(0.86, 0.86, 1.25);
            }
        }

        /* ==========================================================================
           5. 四级打击反馈层级实现 (LEVEL 1 -> LEVEL 4)
           ========================================================================== */

        /** LEVEL 1: Normal Touch (非常轻，无慢动作，低震屏，清脆轻微击球声) */
        triggerNormalTouch(x, y, z, nx = 0, nz = 0) {
            if (this.version !== 'v2') return;

            // 1. Camera: gentle micro kick
            this.impactCameraKick(0.05, nx * 0.3, nz * 0.3);
            this.triggerScreenShake(0.06, 14.0);

            // 2. Sound: light thump with slight pitch randomization
            if (this.sound) {
                const pitch = 1.15 + (Math.random() - 0.5) * 0.06;
                this.sound.play('kick', 0.45, pitch);
            }

            // 3. Particles: 2 tiny white sparks, 0 smoke puffs
            this.spawnPooledSparks(x, y, z, 2, 'white', 0.6);

            // 4. Ball squash
            this.triggerBallSquash(1);

            // 5. Time effect: 0ms hit stop, 0 slowmo
        }

        /** LEVEL 2: Strong Hit (速度/冲量过阈值，明确打击感，很短镜头冲拳，25ms停顿，单一粒子类型) */
        triggerStrongHit(x, y, z, nx = 0, nz = 0, isTurf = false) {
            if (this.version !== 'v2') return;

            // 1. Camera: noticeable but controlled punch
            this.impactCameraKick(0.12, nx * 0.5, nz * 0.5);
            this.triggerScreenShake(0.18, 10.0);

            // 2. Sound: firm energetic strike
            if (this.sound) {
                const pitch = 1.02 + (Math.random() - 0.5) * 0.04;
                this.sound.play('kick', 0.82, pitch);
            }

            // 3. Particles: Turf on grass OR Sparks on metal (NEVER both!)
            if (isTurf) {
                this.spawnPooledTurf(x, y, z, 5, 1.1);
            } else {
                this.spawnPooledSparks(x, y, z, 6, 'cyan', 1.0);
            }

            // 4. Hit stop: 25ms micro freeze
            this.triggerHitStop(25);

            // 5. Ball squash & subtle highlight
            this.triggerBallSquash(2);
            this.ballHighlightTimer = 0.08;
        }

        /** LEVEL 3: Rocket / Critical Shot (招牌机制，清晰 4 段式：Prepare -> Launch -> Flight -> Impact) */
        triggerRocketShot(x, y, z, nx = 0, nz = 0) {
            if (this.version !== 'v2') return;

            // 1. Prepare & Hit Stop: 35ms crisp release freeze
            this.triggerHitStop(35);

            // 2. Launch: Camera punch 0.22, directional recoil
            this.impactCameraKick(0.22, nx, nz);
            this.triggerScreenShake(0.35, 8.0);

            // 3. Sound: deep resonant crit + snappy release
            if (this.sound) {
                this.sound.play('kick_crit', 1.0, 0.98);
            }

            // 4. Controlled VFX: 8 golden sparks + moderate smoke spacing (ball remains visible)
            this.spawnPooledSparks(x, y, z, 8, 'gold', 1.4);

            // 5. Postprocessing: brief gold rim pulse (140ms, no blinding whiteout)
            if (window.Visual2 && window.Visual2.postprocessing) {
                window.Visual2.postprocessing.triggerExposurePulse(1.28, 140, 'gold');
            }

            // 6. Ball Rocket state & stretch
            this.triggerBallSquash(3);
            if (window.Visual2 && window.Visual2.ball) {
                window.Visual2.ball.setRocketState(true, 1.25);
            }
        }

        /** Rocket Flight Contact / Impact */
        triggerRocketImpact(x, y, z) {
            if (this.version !== 'v2') return;

            this.impactCameraKick(0.18);
            this.triggerScreenShake(0.25, 9.0);
            this.spawnPooledSparks(x, y, z, 10, 'gold', 1.3);
            if (this.sound) {
                this.sound.play('bounce', 0.9, 1.25);
            }
        }

        /** LEVEL 4: Goal & Match Point (全场高潮，区分普通进球与绝杀晋级) */
        triggerGoal(isWinningGoal = false) {
            if (this.version !== 'v2') return;

            const kickIntensity = isWinningGoal ? 0.40 : 0.30;
            const shakeIntensity = isWinningGoal ? 0.48 : 0.35;
            const hitStopDuration = isWinningGoal ? 260 : 180;
            const slowMoDuration = isWinningGoal ? 1.8 : 1.25;
            const slowMoScale = isWinningGoal ? 0.28 : 0.38;

            // 1. Hit Stop & Slow Motion
            this.triggerHitStop(hitStopDuration);
            this.triggerSlowMotion(slowMoScale, slowMoDuration);

            // 2. Camera Punch
            this.impactCameraKick(kickIntensity);
            this.triggerScreenShake(shakeIntensity, 6.0);

            if (window.Visual2 && window.Visual2.cameraDirector) {
                window.Visual2.cameraDirector.triggerGoal(isWinningGoal);
            }

            // 3. Audio Climax
            if (this.sound) {
                this.sound.play('goal', 1.0, isWinningGoal ? 0.92 : 1.0);
                setTimeout(() => {
                    if (this.sound) this.sound.play('whistle', isWinningGoal ? 1.0 : 0.85);
                }, 300);
            }

            // 4. Post-processing Exposure Pulse
            if (window.Visual2 && window.Visual2.postprocessing) {
                window.Visual2.postprocessing.triggerExposurePulse(isWinningGoal ? 1.45 : 1.30, 220, 'gold');
            }

            // 5. Goal Net Sparks
            this.spawnPooledSparks(0, 1.5, -12.5, isWinningGoal ? 16 : 10, 'gold', 1.5);
        }

        /* ==========================================================================
           6. 梯次连击反馈 (Combo Hierarchy)
           ========================================================================== */
        triggerCombo(count) {
            if (this.version !== 'v2') return;

            const badge = document.getElementById('combo-badge');
            if (!badge) return;

            // Visual tier styling
            let scale = 1.0;
            let bgColor = 'rgba(56, 189, 248, 0.85)';
            let textColor = '#ffffff';

            if (count >= 5) {
                scale = 1.32;
                bgColor = 'linear-gradient(135deg, #ef4444, #f59e0b)';
                textColor = '#ffffff';
                this.impactCameraKick(0.04);
            } else if (count >= 3) {
                scale = 1.18;
                bgColor = 'linear-gradient(135deg, #f59e0b, #eab308)';
                textColor = '#ffffff';
            } else {
                scale = 1.05;
                bgColor = 'linear-gradient(135deg, #0284c7, #38bdf8)';
            }

            badge.innerText = `🔥 COMBO x${count}`;
            badge.style.transform = `scale(${scale})`;
            badge.style.background = bgColor;
            badge.style.color = textColor;
            badge.style.transition = 'transform 0.15s cubic-bezier(0.22, 1, 0.36, 1)';
            badge.classList.add('show');

            // Audio pitch escalation
            if (this.sound) {
                this.sound.playComboNote(count);
                const bouncePitch = 1.0 + Math.min(0.6, count * 0.06);
                this.sound.play('bounce', 0.65, bouncePitch);
            }
        }

        /* ==========================================================================
           7. 调试热键 (仅在 ?feelDebug=1 时激活)
           ========================================================================== */
        setupDebugKeys() {
            window.addEventListener('keydown', (e) => {
                if (e.key === 'F6') {
                    e.preventDefault();
                    console.log('[FeelDebug] F6: Trigger Level 1 Normal Touch');
                    const bx = this.ball ? this.ball.x : 0;
                    const bz = this.ball ? this.ball.z : 0;
                    this.triggerNormalTouch(bx, 0.5, bz, 0, -1);
                } else if (e.key === 'F7') {
                    e.preventDefault();
                    console.log('[FeelDebug] F7: Trigger Level 2 Strong Hit');
                    const bx = this.ball ? this.ball.x : 0;
                    const bz = this.ball ? this.ball.z : 0;
                    this.triggerStrongHit(bx, 0.5, bz, 0, -1, false);
                } else if (e.key === 'F8') {
                    e.preventDefault();
                    console.log('[FeelDebug] F8: Trigger Level 3 Rocket Shot');
                    const bx = this.ball ? this.ball.x : 0;
                    const bz = this.ball ? this.ball.z : 0;
                    this.triggerRocketShot(bx, 0.5, bz, 0, -1);
                } else if (e.key === 'F9') {
                    e.preventDefault();
                    console.log('[FeelDebug] F9: Trigger Level 4 Goal');
                    this.triggerGoal(false);
                }
            });
            console.log('[GameFeel] Debug hotkeys active: F6 (Normal), F7 (Strong), F8 (Rocket), F9 (Goal)');
        }

        /* ==========================================================================
           8. 每帧更新 (逐帧粒子衰减、形变复原、Hit stop 计时)
           ========================================================================== */
        update(dt) {
            // 1. Hit stop countdown
            if (this.hitStopRemaining > 0) {
                this.hitStopRemaining = Math.max(0, this.hitStopRemaining - dt);
            }

            // 2. Slow motion countdown
            if (this.slowMoTimer > 0) {
                this.slowMoTimer = Math.max(0, this.slowMoTimer - dt);
            }

            // 3. Screen shake decay
            if (this.screenShake > 0.005) {
                this.screenShake *= Math.max(0, 1.0 - dt * this.shakeDecay);
            } else {
                this.screenShake = 0;
            }

            // 4. Ball squash recovery
            if (this.squashActive && this.ball && this.ball.mesh) {
                this.squashTimer += dt;
                const progress = Math.min(1.0, this.squashTimer / this.squashDuration);
                const ease = Math.sin(progress * Math.PI); // 0 -> 1 -> 0
                this.ball.mesh.scale.set(
                    1.0 + (this.squashTarget.x - 1.0) * ease,
                    1.0 + (this.squashTarget.y - 1.0) * ease,
                    1.0 + (this.squashTarget.z - 1.0) * ease
                );
                if (progress >= 1.0) {
                    this.squashActive = false;
                    this.ball.mesh.scale.set(1.0, 1.0, 1.0);
                }
            }

            // 5. Ball highlight recovery
            if (this.ballHighlightTimer > 0) {
                this.ballHighlightTimer -= dt;
            }

            // 6. Update pooled particles
            this.updatePools(dt);
        }

        updatePools(dt) {
            let activeSparks = 0;
            for (let i = 0; i < this.sparksPool.length; i++) {
                const p = this.sparksPool[i];
                if (!p.active) continue;

                p.life -= dt;
                if (p.life <= 0) {
                    p.active = false;
                    p.mesh.visible = false;
                    continue;
                }

                p.mesh.position.x += p.vx * dt;
                p.mesh.position.y += p.vy * dt;
                p.mesh.position.z += p.vz * dt;
                p.vy -= p.gravity * dt;

                const progress = p.life / p.maxLife;
                p.mesh.scale.setScalar(Math.max(0.01, progress));
                activeSparks++;
            }
            this.activeSparksCount = activeSparks;

            let activeTurf = 0;
            for (let i = 0; i < this.turfPool.length; i++) {
                const p = this.turfPool[i];
                if (!p.active) continue;

                p.life -= dt;
                if (p.life <= 0) {
                    p.active = false;
                    p.mesh.visible = false;
                    continue;
                }

                p.mesh.position.x += p.vx * dt;
                p.mesh.position.y += p.vy * dt;
                p.mesh.position.z += p.vz * dt;
                p.vy -= p.gravity * dt;

                p.mesh.rotation.x += p.rotX * dt;
                p.mesh.rotation.y += p.rotY * dt;
                p.mesh.rotation.z += p.rotZ * dt;

                const progress = p.life / p.maxLife;
                p.mesh.scale.setScalar(Math.max(0.01, progress));
                activeTurf++;
            }
            this.activeTurfCount = activeTurf;

            let activeTrail = 0;
            for (let i = 0; i < this.trailPool.length; i++) {
                const p = this.trailPool[i];
                if (!p.active) continue;

                p.life -= dt;
                if (p.life <= 0) {
                    p.active = false;
                    p.mesh.visible = false;
                    continue;
                }

                const progress = p.life / p.maxLife;
                p.mesh.scale.setScalar(Math.max(0.01, progress));
                p.mesh.material.opacity = progress * 0.65;
                activeTrail++;
            }
            this.activeTrailCount = activeTrail;
        }

        getTotalActiveParticles() {
            return this.activeSparksCount + this.activeTurfCount + this.activeTrailCount;
        }
    }

    root.Visual2 = root.Visual2 || {};
    root.Visual2.GameFeelController = GameFeelController;
    root.Visual2.gameFeel = new GameFeelController();

})(window);
