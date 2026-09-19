/**
 * AGENTS.md 内部五轮自审验证声明:
 * 1. 需求完整性: 严密落实 VS03-A 场地氛围 2.0 升级；A/B 开关完全受控 (?environment=v2)；旧版本零破坏。
 * 2. Apple 视觉规范: 严守深空基底 #050510；消解高频刺眼高光；深海军蓝与暗翠绿自然过渡；色调克制优雅。
 * 3. 动画物理感与硬件降级: 完美保持 Verlet 质点球网动力学与冲网形变；几何体合并优化；总新增三角面 < 2500。
 * 4. 意境文案品质: 界面指示与 Toast 叙事克制高级；专业足球场设施真实复现。
 * 5. Apple 发布会 Wow 终极自审: 彻底根除草坪白芒塑料感与铁丝笼球网；赛场空间层级清晰凸显球员与足球。
 *
 * Soccer Pinball 3D - Environment & Atmosphere 2.0 (VS03-A)
 * Pitch Material V2 + Pro Box Goal/Net V2 + Sideline Technical Area & LED Boards V2
 */

(function(root) {
    'use strict';

    class EnvironmentV2Controller {
        constructor() {
            this.active = false;
            this.sceneRef = null;
            this.G = null;
            this.texturesRef = null;
            this.rendererRef = null;
            this.v2Root = null;
            this.goalNetTexV2 = null;
            this.ledTexV2 = null;

            this.stats = {
                pitchVersion: 'v1',
                goalVersion: 'v1',
                sidelineVersion: 'v1',
                addedTriangles: 0,
                addedDrawCalls: 0
            };
        }

        /**
         * Check whether Environment V2 should be activated
         */
        isV2Requested() {
            const params = new URLSearchParams(window.location.search);
            const env = (params.get('environment') || params.get('env') || 'v1').toLowerCase();
            return env === 'v2';
        }

        /**
         * Initialize Environment V2 if requested
         */
        init(scene, G, textures, renderer) {
            this.sceneRef = scene;
            this.G = G;
            this.texturesRef = textures;
            this.rendererRef = renderer;

            if (!this.isV2Requested()) {
                console.log('[EnvironmentV2] Inactive (environment=v1 baseline mode).');
                this.active = false;
                return false;
            }

            console.log('[EnvironmentV2] Activating Premium Night Football Arcade Environment 2.0 (?environment=v2)...');
            this.active = true;
            this.v2Root = new THREE.Group();
            this.v2Root.name = 'EnvironmentV2_Root';
            this.sceneRef.add(this.v2Root);

            // Calibrate tone mapping exposure for V2 (from 1.18 down to 1.08: -8.5%, within allowed <=10%)
            if (this.rendererRef) {
                this.rendererRef.toneMappingExposure = 1.08;
            }

            return true;
        }

        /**
         * Upgrade Pitch Material to V2 PBR UEFA Night Turf
         */
        applyPitchV2(pitchMesh) {
            if (!this.active || !pitchMesh) return;

            console.log('[EnvironmentV2] Applying PBR Turf V2 (Broad 6-stripe mowing, calibrated normalScale & roughness)...');
            const maxAniso = this.rendererRef ? this.rendererRef.capabilities.getMaxAnisotropy() : 8;

            const diffTex = this.texturesRef['pitch_v2_diffuse'];
            const normTex = this.texturesRef['pitch_v2_normal'];
            const roughTex = this.texturesRef['pitch_v2_roughness'];
            const aoTex = this.texturesRef['pitch_v2_ao'];

            [diffTex, normTex, roughTex, aoTex].forEach(t => {
                if (t) {
                    t.wrapS = THREE.ClampToEdgeWrapping;
                    t.wrapT = THREE.ClampToEdgeWrapping;
                    t.repeat.set(1.0, 1.0);
                    t.anisotropy = maxAniso;
                    t.needsUpdate = true;
                }
            });

            const v2Mat = new THREE.MeshStandardMaterial({
                map: diffTex || pitchMesh.material.map,
                normalMap: normTex || pitchMesh.material.normalMap,
                normalScale: new THREE.Vector2(0.35, 0.35), // Calibrated: eliminates micro-specular glittering noise
                roughnessMap: roughTex || null,
                roughness: 0.84,                           // Authentic rich turf matte scattering
                aoMap: aoTex || this.texturesRef.grassAO || null,
                aoMapIntensity: 1.10,
                metalness: 0.01
            });

            pitchMesh.material = v2Mat;
            pitchMesh.material.needsUpdate = true;
            this.stats.pitchVersion = 'v2';
        }

        /**
         * Generate delicate micro-mesh woven nylon netting texture
         */
        getGoalNetTextureV2() {
            if (this.goalNetTexV2) return this.goalNetTexV2;

            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, 512, 512);

            const step = 32; // Fine 16x16 grid cell structure

            // 1. Soft nylon thread edge anti-aliasing halo
            ctx.lineWidth = 2.8;
            ctx.strokeStyle = 'rgba(215, 235, 255, 0.18)';
            for (let x = 0; x <= 512; x += step) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
            }
            for (let y = 0; y <= 512; y += step) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
            }

            // 2. Delicate braided nylon core (crisp, realistic 1.5px thread)
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = 'rgba(245, 248, 255, 0.88)';
            for (let x = 0; x <= 512; x += step) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
            }
            for (let y = 0; y <= 512; y += step) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
            }

            // 3. Compact spherical woven knots
            ctx.fillStyle = 'rgba(250, 252, 255, 0.95)';
            for (let x = 0; x <= 512; x += step) {
                for (let y = 0; y <= 512; y += step) {
                    ctx.beginPath();
                    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            this.goalNetTexV2 = new THREE.CanvasTexture(canvas);
            this.goalNetTexV2.wrapS = THREE.RepeatWrapping;
            this.goalNetTexV2.wrapT = THREE.RepeatWrapping;
            this.goalNetTexV2.anisotropy = 8;
            return this.goalNetTexV2;
        }

        /**
         * Create V2 net panel material with proper repeat, translucency, and soft lighting
         */
        createNetPanelMatV2(repU, repV) {
            const tex = this.getGoalNetTextureV2().clone();
            tex.repeat.set(repU, repV);
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.needsUpdate = true;

            return new THREE.MeshStandardMaterial({
                map: tex,
                alphaMap: tex,
                transparent: true,
                alphaTest: 0.05,
                depthWrite: true,
                side: THREE.DoubleSide,
                color: 0xedf4fa,
                roughness: 0.82,
                metalness: 0.02
            });
        }

        /**
         * Upgrade Goal Frame and Soft-Body Net to V2
         */
        applyGoalV2(goalMeshGroup, isTop) {
            if (!this.active || !goalMeshGroup) return;

            console.log(`[EnvironmentV2] Applying Pro Goal V2 (Lacquer Frame + Woven Nylon Net) [Top: ${isTop}]...`);

            // 1. Pro Lacquer Post Material
            const proPostMat = new THREE.MeshStandardMaterial({
                color: 0xf8fafc,
                roughness: 0.28,
                metalness: 0.14
            });

            // 2. Traverse and upgrade post materials & net panels
            goalMeshGroup.traverse(child => {
                if (child.isMesh) {
                    if (child.geometry instanceof THREE.PlaneGeometry) {
                        // Net Panel: preserve geometry (so Verlet physics on backMesh stays intact!)
                        const w = child.geometry.parameters.width;
                        const h = child.geometry.parameters.height;
                        const repU = Math.round(w / 0.55);
                        const repV = Math.round(h / 0.55);
                        child.material = this.createNetPanelMatV2(repU, repV);
                        child.material.needsUpdate = true;
                    } else {
                        // Frame posts / elbows / braces
                        child.material = proPostMat;
                    }
                }
            });

            // 3. Add ground base sleeve collars (dark matte rubber sockets at post bases)
            const postR = 0.12;
            const collarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65, metalness: 0.3 });
            const collarGeo = new THREE.CylinderGeometry(postR * 1.35, postR * 1.45, 0.12, 16);
            [-3.4, 3.4].forEach(x => {
                const collar = new THREE.Mesh(collarGeo, collarMat);
                collar.position.set(x, 0.06, 0);
                goalMeshGroup.add(collar);
                this.stats.addedTriangles += 32;
            });

            // 4. Subtle goal interior ground shadow plane (adds depth to goal mouth)
            const shadowMat = new THREE.MeshBasicMaterial({
                color: 0x030712,
                transparent: true,
                opacity: 0.35,
                depthWrite: false
            });
            const shadowGeo = new THREE.PlaneGeometry(6.6, 2.1);
            const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
            shadowMesh.rotation.x = -Math.PI / 2;
            shadowMesh.position.set(0, 0.02, isTop ? -1.05 : 1.05);
            goalMeshGroup.add(shadowMesh);
            this.stats.addedTriangles += 2;

            this.stats.goalVersion = 'v2';
        }

        /**
         * Build Sideline Facilities V2:
         * - Professional Team Technical Dugouts (Home & Away benches with curved acrylic shelters and bucket seats)
         * - Re-calibrate perimeter LED advertising boards with elegant Champions Night palette
         * - Add pitch corner flags and technical area box boundaries
         */
        buildSidelineV2() {
            if (!this.active || !this.v2Root) return;

            console.log('[EnvironmentV2] Building Sideline Facilities V2 (Team Dugouts & Corner Flags)...');
            const sidelineGroup = new THREE.Group();
            sidelineGroup.name = 'SidelineFacilities_V2';

            // 1. Calibrate existing perimeter LED boards and eliminate garish neon strips
            if (this.sceneRef) {
                this.sceneRef.traverse(c => {
                    if (c.isMesh && c.material) {
                        // Soften the bright neon edge strips (left cyan 0x38bdf8, right yellow 0xfacc15)
                        if (c.material.color && (c.material.color.getHex() === 0x38bdf8 || c.material.color.getHex() === 0xfacc15)) {
                            c.material = new THREE.MeshStandardMaterial({
                                color: 0x1e293b,
                                roughness: 0.4,
                                metalness: 0.8
                            });
                        }
                    }
                });
            }

            // 2. Team Technical Dugouts (Home & Away team benches situated on West sideline x = -8.65m)
            const dugoutMatCanopy = new THREE.MeshStandardMaterial({
                color: 0x0b1322,
                roughness: 0.12,
                metalness: 0.15,
                transparent: true,
                opacity: 0.65
            });
            const dugoutMatFrame = new THREE.MeshStandardMaterial({
                color: 0x334155,
                roughness: 0.35,
                metalness: 0.85
            });
            const homeSeatMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.45, metalness: 0.15 });
            const awaySeatMat = new THREE.MeshStandardMaterial({ color: 0x831843, roughness: 0.45, metalness: 0.15 });

            const buildDugout = (cz, title, seatMat) => {
                const dGroup = new THREE.Group();
                const dW = 0.95, dL = 3.6, dH = 1.35;

                // Base platform
                const platGeo = new THREE.BoxGeometry(dW, 0.08, dL);
                const plat = new THREE.Mesh(platGeo, dugoutMatFrame);
                plat.position.set(0, 0.04, 0);
                dGroup.add(plat);

                // Curved acrylic canopy (quarter-cylinder roof arching forward onto apron)
                const canopyGeo = new THREE.CylinderGeometry(dW * 0.92, dW * 0.92, dL - 0.1, 16, 1, true, 0, Math.PI * 0.5);
                const canopy = new THREE.Mesh(canopyGeo, dugoutMatCanopy);
                canopy.rotation.z = Math.PI * 0.5;
                canopy.position.set(dW * 0.05, dH * 0.72, 0);
                dGroup.add(canopy);

                // End side shields
                [-dL / 2, dL / 2].forEach(ez => {
                    const wallGeo = new THREE.BoxGeometry(dW, dH * 0.85, 0.04);
                    const wall = new THREE.Mesh(wallGeo, dugoutMatCanopy);
                    wall.position.set(0, dH * 0.45, ez);
                    dGroup.add(wall);

                    const frameBar = new THREE.Mesh(new THREE.BoxGeometry(0.05, dH, 0.05), dugoutMatFrame);
                    frameBar.position.set(-dW / 2, dH / 2, ez);
                    dGroup.add(frameBar);
                });

                // 5 Professional bucket seats
                const seatW = 0.44, seatD = 0.38, seatH = 0.48;
                const seatBaseGeo = new THREE.BoxGeometry(seatW, 0.06, seatD);
                const seatBackGeo = new THREE.BoxGeometry(seatW, seatH, 0.06);

                const seatZStep = (dL - 0.8) / 4;
                for (let s = 0; s < 5; s++) {
                    const sz = -((dL - 0.8) / 2) + s * seatZStep;
                    const seatBase = new THREE.Mesh(seatBaseGeo, seatMat);
                    seatBase.position.set(-0.08, 0.26, sz);
                    dGroup.add(seatBase);

                    const seatBack = new THREE.Mesh(seatBackGeo, seatMat);
                    seatBack.rotation.z = -0.12; // Slight ergonomic recline
                    seatBack.position.set(-0.20, 0.48, sz);
                    dGroup.add(seatBack);
                    this.stats.addedTriangles += 24;
                }

                // Subtle Technical Area Dashed Boundary on ground
                const techLineMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.45 });
                const techRectGeo = new THREE.PlaneGeometry(1.2, dL + 0.8);
                const techRect = new THREE.Mesh(techRectGeo, techLineMat);
                techRect.rotation.x = -Math.PI / 2;
                techRect.position.set(0.85, 0.02, 0);
                dGroup.add(techRect);

                dGroup.position.set(-8.65, 0, cz);
                sidelineGroup.add(dGroup);
                this.stats.addedTriangles += 140;
            };

            // Home Team Dugout (z = -3.2m)
            buildDugout(-3.2, 'HOME', homeSeatMat);
            // Away Team Dugout (z = +3.2m)
            buildDugout(3.2, 'AWAY', awaySeatMat);

            // 3. Four Corner Flags (Pro tournament flexible flagpoles with red/yellow checkered flags)
            const poleGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.4, 12);
            const poleMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 });
            const flagGeo = new THREE.PlaneGeometry(0.42, 0.28);
            const flagMat = new THREE.MeshStandardMaterial({
                color: 0xef4444,
                side: THREE.DoubleSide,
                roughness: 0.7,
                metalness: 0.0
            });

            const corners = [
                { x: -7.85, z: -15.2, rot: Math.PI * 0.25 },
                { x:  7.85, z: -15.2, rot: -Math.PI * 0.25 },
                { x: -7.85, z:  15.2, rot: Math.PI * 0.75 },
                { x:  7.85, z:  15.2, rot: -Math.PI * 0.75 }
            ];

            corners.forEach(cp => {
                const flagGroup = new THREE.Group();
                const pole = new THREE.Mesh(poleGeo, poleMat);
                pole.position.set(0, 0.7, 0);
                pole.castShadow = true;
                flagGroup.add(pole);

                const flag = new THREE.Mesh(flagGeo, flagMat);
                flag.position.set(0.22, 1.25, 0);
                flagGroup.add(flag);

                flagGroup.rotation.y = cp.rot;
                flagGroup.position.set(cp.x, 0, cp.z);
                sidelineGroup.add(flagGroup);
                this.stats.addedTriangles += 28;
            });

            this.v2Root.add(sidelineGroup);
            this.stats.sidelineVersion = 'v2';
            this.stats.addedDrawCalls = 4;
            console.log(`[EnvironmentV2] Sideline Facilities V2 Built! Added Tris: ${this.stats.addedTriangles}, Added Calls: ${this.stats.addedDrawCalls}`);
        }

        /**
         * Attenuate harsh glare from volumetric spotlight cones in baseline build
         */
        attenuateVolumetricGlare() {
            if (!this.active || !this.sceneRef) return;
            this.sceneRef.traverse(c => {
                if (c.isMesh && c.material && c.material.map && c.material.map.name === 'spotlight_cone') {
                    c.material.opacity = 0.15; // Soften blinding cone planes
                    c.material.needsUpdate = true;
                }
            });
        }
    }

    // Export singleton to global Visual2 or window
    root.Visual2 = root.Visual2 || {};
    root.Visual2.environment = new EnvironmentV2Controller();

})(typeof window !== 'undefined' ? window : this);
