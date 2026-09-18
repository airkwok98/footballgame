/**
 * Soccer Pinball 3D - Football Court Modular Stadium Environment
 * 
 * Manages modular extraction, whitelist node filtering, scale, positioning,
 * and environment integration of the game-ready 'football_court' asset.
 * 
 * Strict Budget:
 * - Full Model Triangles:     137,257
 * - Whitelist Selected Tris:   58,926 (Target: 55k–65k)
 * - Rejected Module Tris:      78,331 (Excluded: pitch, goals, nets, wire fences)
 * - Selected Meshes:                4
 * - Draw Calls:                     4
 */

(function(root) {
    'use strict';

    // Strict Whitelist of approved stadium architectural components
    const STADIUM_ALLOWED_NODES = [
        'court_Red_Tribune_0',    // 31,200 tris - Tiered folding spectator seats
        'court_Black_Tribune_0',  // 27,542 tris - Concrete grandstand stepped risers
        'court_proof_0',          //    152 tris - High cantilever canopy roof
        'court_spot_light_0'      //     32 tris - Modern floodlight pylon fixtures
    ];

    // High-performance deterministic PRNG (Mulberry32) for reproducible visual benchmark
    function createPRNG(seed) {
        let s = (seed >>> 0) || 20260918;
        return function() {
            s = (s + 0x6D2B79F5) | 0;
            let t = Math.imul(s ^ (s >>> 15), 1 | s);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t >>> 0) / 4294967296);
        };
    }

    class FootballCourtStadiumController {
        constructor() {
            this.active = false;
            this.stadiumRoot = null;
            this.standWest = null;
            this.standEast = null;
            this.enclosureRoot = null;
            this.goalBaseRoot = null;
            this.crowdRoot = null;
            this.modelScene = null;
            this.sceneRef = null;
            this.scaleFactor = 1.45;
            this.seatTheme = 'navy';
            this.crowdSeed = 20260918;

            // Mesh references
            this.seatsMeshRef = null;
            this.concreteMeshRef = null;

            this.stats = {
                importedFullTris: 137257,
                northTris: 58926,
                westTris: 58742,
                eastTris: 58742,
                generatedEnvTris: 0,
                crowdTris: 0,
                totalStadiumTris: 0,
                crowdCount: 0,
                crowdSeed: 20260918,
                selectedMeshes: 4,
                drawCalls: 0
            };
        }

        async init(scene, G, proceduralAtmosphere = {}) {
            this.sceneRef = scene;

            const params = new URLSearchParams(window.location.search);
            const stadiumParam = (params.get('stadium') || '').toLowerCase();
            const allowCourt = (stadiumParam === 'football_court');
            this.seatTheme = (params.get('seats') || 'navy').toLowerCase();

            const seedParam = parseInt(params.get('crowdSeed') || '20260918', 10);
            this.crowdSeed = isNaN(seedParam) ? 20260918 : seedParam;
            this.stats.crowdSeed = this.crowdSeed;

            if (!allowCourt) {
                this.active = false;
                return;
            }

            console.log(`[FootballCourt] Initiating Cohesive Stadium Environment (?stadium=football_court, seats=${this.seatTheme}, seed=${this.crowdSeed})...`);
            const modelUrl = 'assets/models/stadium/football_court/scene.gltf';

            try {
                const gltf = await root.AssetManager.load(modelUrl);
                this.setupCohesiveStadium(gltf, G, proceduralAtmosphere);
                this.active = true;
                console.log(`[FootballCourt] Cohesive Stadium Active! Total Stadium Tris: ${this.stats.totalStadiumTris.toLocaleString()} (N:${this.stats.northTris} W:${this.stats.westTris} E:${this.stats.eastTris} Env:${this.stats.generatedEnvTris} Crowd:${this.stats.crowdTris}), Seats Theme: ${this.seatTheme}, Crowd Count: ${this.stats.crowdCount}`);
            } catch (err) {
                console.warn('[FootballCourt] Failed to load modular football court model:', err);
                this.active = false;
            }
        }

        setupCohesiveStadium(gltf, G, proceduralAtmosphere) {
            this.modelScene = gltf.scene;

            // 1. Traverse and apply strict Whitelist filtering & PBR calibration
            let actualSelectedTris = 0;
            let actualSelectedMeshes = 0;

            this.modelScene.traverse(child => {
                if (child.isCamera || child.isLight) {
                    child.visible = false;
                    child.parent && child.parent.remove(child);
                    return;
                }

                if (child.isMesh) {
                    const isAllowed = STADIUM_ALLOWED_NODES.includes(child.name);
                    child.visible = isAllowed;

                    if (isAllowed) {
                        actualSelectedMeshes++;
                        const tris = child.geometry.index ? 
                            child.geometry.index.count / 3 : 
                            (child.geometry.attributes.position ? child.geometry.attributes.position.count / 3 : 0);
                        actualSelectedTris += tris;

                        child.castShadow = false;
                        child.receiveShadow = true;

                        if (child.material) {
                            child.material.roughness = Math.max(0.45, child.material.roughness || 0.6);
                            child.material.metalness = Math.min(0.4, child.material.metalness || 0.1);
                            child.material.envMapIntensity = 0.85;

                            // Seat color theme calibration (Default: Deep Navy Blue)
                            if (child.name === 'court_Red_Tribune_0') {
                                this.seatsMeshRef = child;
                                if (this.seatTheme === 'navy') {
                                    child.material.color.setHex(0x1e40af);
                                    child.material.roughness = 0.55;
                                    child.material.metalness = 0.15;
                                } else if (this.seatTheme === 'wine') {
                                    child.material.color.setHex(0x7f1d1d);
                                    child.material.roughness = 0.55;
                                    child.material.metalness = 0.15;
                                }
                            }

                            if (child.name === 'court_Black_Tribune_0') {
                                this.concreteMeshRef = child;
                                child.material.color.setHex(0x162032);
                                child.material.roughness = 0.85;
                                child.material.metalness = 0.15;
                            }

                            // Subtle floodlight head emissive enhancement
                            if (child.name === 'court_spot_light_0') {
                                child.material.emissive = new THREE.Color(0xfffaed);
                                child.material.emissiveIntensity = 0.85;
                            }
                            child.material.needsUpdate = true;
                        }
                    }
                }
            });

            this.stats.selectedTris = actualSelectedTris;
            this.stats.selectedMeshes = actualSelectedMeshes;

            // 2. Main North Stand (Behind Top Goal)
            this.stadiumRoot = new THREE.Group();
            this.stadiumRoot.name = "Stadium_North_Root";
            this.modelScene.position.set(0, 0, 0);
            this.stadiumRoot.add(this.modelScene);
            this.stadiumRoot.scale.setScalar(this.scaleFactor);
            this.stadiumRoot.position.set(0, 0.0, -2.8);
            this.sceneRef.add(this.stadiumRoot);

            // 3. Side Stands (West & East Enclosure)
            this.buildSideStands();

            // 4. Goal-End Concourse Platform & Player Tunnel (Bridges black gap under goal)
            this.buildGoalEndBase(G);

            // 5. Background Outer Enclosure & Structural Silhouettes (Eliminates black void)
            this.buildBackgroundEnclosure(G);

            // 6. Instanced Modern Crowd System (Classy Champions League palette, 70% occupancy)
            this.buildInstancedCrowd();

            // 7. Subtle Atmospheric Depth Fog (Only distant background fades, pitch stays 100% crisp)
            this.sceneRef.fog = new THREE.Fog(0x090e1a, 38, 96);

            // 8. Cleanly hide legacy procedural components to eliminate visual clashes & floating lights
            if (proceduralAtmosphere.backdrop) proceduralAtmosphere.backdrop.visible = false;
            if (proceduralAtmosphere.topCrowd) proceduralAtmosphere.topCrowd.visible = false;
            if (window.proceduralTopGrandstandGroup) window.proceduralTopGrandstandGroup.visible = false;
            if (window.proceduralSideGrandstandGroup) window.proceduralSideGrandstandGroup.visible = false;
            if (window.legacyRoofTrussGroup) window.legacyRoofTrussGroup.visible = false;

            // 9. Accurately calculate stadium triangle budget metrics
            let genTris = 0;
            const countMeshTris = (root) => {
                if (!root) return;
                root.traverse(child => {
                    if (child.isMesh && child.geometry) {
                        const count = child.geometry.index ?
                            child.geometry.index.count / 3 :
                            (child.geometry.attributes.position ? child.geometry.attributes.position.count / 3 : 0);
                        genTris += count;
                    }
                });
            };
            countMeshTris(this.goalBaseRoot);
            countMeshTris(this.enclosureRoot);

            this.stats.northTris = actualSelectedTris; // 58,926
            this.stats.westTris = 58742;               // court_Red_Tribune_0 (31,200) + court_Black_Tribune_0 (27,542)
            this.stats.eastTris = 58742;               // court_Red_Tribune_0 (31,200) + court_Black_Tribune_0 (27,542)
            this.stats.generatedEnvTris = genTris;
            this.stats.totalStadiumTris = this.stats.northTris + this.stats.westTris + this.stats.eastTris + this.stats.generatedEnvTris + this.stats.crowdTris;
        }

        buildSideStands() {
            if (!this.seatsMeshRef || !this.concreteMeshRef) return;

            const seatsGeo = this.seatsMeshRef.geometry;
            const concreteGeo = this.concreteMeshRef.geometry;
            const concreteMat = this.concreteMeshRef.material;

            // Subtle albedo variation (±3%) for side seats to reflect natural arena stadium lighting
            const sideSeatMat = this.seatsMeshRef.material.clone();
            if (this.seatTheme === 'navy') {
                sideSeatMat.color.setHex(0x1d4ed8);
            }
            sideSeatMat.roughness = 0.55;
            sideSeatMat.metalness = 0.15;

            // --- WEST STAND (Left Sideline, rotated +90 deg around Y) ---
            this.standWest = new THREE.Group();
            this.standWest.name = "Stadium_West_Stand";

            const westConcrete = new THREE.Mesh(concreteGeo, concreteMat);
            const westSeats = new THREE.Mesh(seatsGeo, sideSeatMat);
            westConcrete.receiveShadow = true;
            westSeats.receiveShadow = true;
            this.standWest.add(westConcrete);
            this.standWest.add(westSeats);

            this.standWest.scale.setScalar(this.scaleFactor);
            this.standWest.rotation.y = Math.PI / 2;
            // Front riser begins at X = -9.20, back reaches X = -26.15, Z covers -16.8 to +14.8
            this.standWest.position.set(2.38, 0.0, -1.0);
            this.sceneRef.add(this.standWest);

            // --- EAST STAND (Right Sideline, rotated -90 deg around Y) ---
            this.standEast = new THREE.Group();
            this.standEast.name = "Stadium_East_Stand";

            const eastConcrete = new THREE.Mesh(concreteGeo, concreteMat);
            const eastSeats = new THREE.Mesh(seatsGeo, sideSeatMat);
            eastConcrete.receiveShadow = true;
            eastSeats.receiveShadow = true;
            this.standEast.add(eastConcrete);
            this.standEast.add(eastSeats);

            this.standEast.scale.setScalar(this.scaleFactor);
            this.standEast.rotation.y = -Math.PI / 2;
            // Front riser begins at X = +9.20, back reaches X = +26.15, Z covers -16.8 to +14.8
            this.standEast.position.set(-2.38, 0.0, -1.0);
            this.sceneRef.add(this.standEast);
        }

        buildGoalEndBase(G) {
            this.goalBaseRoot = new THREE.Group();
            this.goalBaseRoot.name = "Stadium_GoalEnd_Base";

            const concourseMat = new THREE.MeshStandardMaterial({
                color: 0x162032,
                roughness: 0.85,
                metalness: 0.15
            });

            // 1. Broad concrete concourse platform bridging turf apron to stand front
            const apronGeo = new THREE.BoxGeometry(18.6, 0.55, 2.4);
            const apron = new THREE.Mesh(apronGeo, concourseMat);
            apron.position.set(0, 0.27, -13.7);
            apron.receiveShadow = true;
            this.goalBaseRoot.add(apron);

            // 2. Concourse Step Riser to eliminate under-seat gap
            const riserGeo = new THREE.BoxGeometry(19.2, 0.95, 1.4);
            const riser = new THREE.Mesh(riserGeo, concourseMat);
            riser.position.set(0, 0.50, -14.8);
            riser.receiveShadow = true;
            this.goalBaseRoot.add(riser);

            // 3. Stainless Steel Pitch-Boundary Safety Railing
            const railMat = new THREE.MeshStandardMaterial({
                color: 0x64748b,
                metalness: 0.85,
                roughness: 0.25
            });
            // Top horizontal handrail
            const handrailGeo = new THREE.CylinderGeometry(0.035, 0.035, 18.0, 8);
            const handrail = new THREE.Mesh(handrailGeo, railMat);
            handrail.rotation.z = Math.PI / 2;
            handrail.position.set(0, 0.92, -12.95);
            this.goalBaseRoot.add(handrail);

            // Mid horizontal knee rail
            const kneeRail = new THREE.Mesh(handrailGeo, railMat);
            kneeRail.rotation.z = Math.PI / 2;
            kneeRail.position.set(0, 0.62, -12.95);
            this.goalBaseRoot.add(kneeRail);

            // Vertical stanchions
            const postGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.70, 8);
            for (let x = -8.0; x <= 8.0; x += 2.0) {
                if (Math.abs(x) < 2.5) continue; // Skip goal opening
                const post = new THREE.Mesh(postGeo, railMat);
                post.position.set(x, 0.60, -12.95);
                this.goalBaseRoot.add(post);
            }

            // 4. Central VIP / Player Access Tunnel Portal
            const tunnelFrameGeo = new THREE.BoxGeometry(3.6, 1.35, 0.5);
            const tunnelFrameMat = new THREE.MeshStandardMaterial({
                color: 0x0f172a,
                roughness: 0.5,
                metalness: 0.8
            });
            const tunnelFrame = new THREE.Mesh(tunnelFrameGeo, tunnelFrameMat);
            tunnelFrame.position.set(0, 0.68, -14.65);
            this.goalBaseRoot.add(tunnelFrame);

            // Recessed tunnel interior with soft navy accent illumination
            const tunnelInteriorGeo = new THREE.BoxGeometry(3.1, 1.15, 1.6);
            const tunnelInteriorMat = new THREE.MeshStandardMaterial({
                color: 0x090d16,
                emissive: new THREE.Color(0x1e3a8a),
                emissiveIntensity: 0.55,
                roughness: 0.9
            });
            const tunnelInterior = new THREE.Mesh(tunnelInteriorGeo, tunnelInteriorMat);
            tunnelInterior.position.set(0, 0.58, -15.3);
            this.goalBaseRoot.add(tunnelInterior);

            this.sceneRef.add(this.goalBaseRoot);
        }

        buildBackgroundEnclosure(G) {
            this.enclosureRoot = new THREE.Group();
            this.enclosureRoot.name = "Stadium_Background_Enclosure";

            const wallMat = new THREE.MeshStandardMaterial({
                color: 0x0a101d,
                roughness: 0.92,
                metalness: 0.1
            });

            // 1. North Outer Stand Silhouette Wall
            const northWall = new THREE.Mesh(new THREE.BoxGeometry(42.0, 14.0, 1.2), wallMat);
            northWall.position.set(0, 7.0, -32.0);
            this.enclosureRoot.add(northWall);

            // 2. West Outer Stand Silhouette Wall
            const westWall = new THREE.Mesh(new THREE.BoxGeometry(1.2, 14.0, 42.0), wallMat);
            westWall.position.set(-28.5, 7.0, -1.0);
            this.enclosureRoot.add(westWall);

            // 3. East Outer Stand Silhouette Wall
            const eastWall = new THREE.Mesh(new THREE.BoxGeometry(1.2, 14.0, 42.0), wallMat);
            eastWall.position.set(28.5, 7.0, -1.0);
            this.enclosureRoot.add(eastWall);

            // 4. Upper Concourse VIP Skybox Glass Facade
            const glassMat = new THREE.MeshStandardMaterial({
                color: 0x0f172a,
                roughness: 0.2,
                metalness: 0.85,
                transparent: true,
                opacity: 0.88
            });

            const northGlass = new THREE.Mesh(new THREE.BoxGeometry(38.0, 2.6, 0.4), glassMat);
            northGlass.position.set(0, 9.8, -31.2);
            this.enclosureRoot.add(northGlass);

            const sideGlassGeo = new THREE.BoxGeometry(0.4, 2.6, 36.0);
            const westGlass = new THREE.Mesh(sideGlassGeo, glassMat);
            westGlass.position.set(-27.8, 9.8, -1.0);
            this.enclosureRoot.add(westGlass);

            const eastGlass = new THREE.Mesh(sideGlassGeo, glassMat);
            eastGlass.position.set(27.8, 9.8, -1.0);
            this.enclosureRoot.add(eastGlass);

            // 5. Sleek UEFA Champions Cyan Ribbon Accent on Mid-Fascia
            const ribbonMat = new THREE.MeshBasicMaterial({
                color: 0x0284c7,
                transparent: true,
                opacity: 0.75
            });
            const northRibbon = new THREE.Mesh(new THREE.PlaneGeometry(36.0, 0.45), ribbonMat);
            northRibbon.position.set(0, 5.2, -26.5);
            this.enclosureRoot.add(northRibbon);

            const sideRibbonGeo = new THREE.PlaneGeometry(32.0, 0.45);
            const westRibbon = new THREE.Mesh(sideRibbonGeo, ribbonMat);
            westRibbon.position.set(-21.5, 5.2, -1.0);
            westRibbon.rotation.y = Math.PI / 2;
            this.enclosureRoot.add(westRibbon);

            const eastRibbon = new THREE.Mesh(sideRibbonGeo, ribbonMat);
            eastRibbon.position.set(21.5, 5.2, -1.0);
            eastRibbon.rotation.y = -Math.PI / 2;
            this.enclosureRoot.add(eastRibbon);

            // 6. Structural Roof Trusses (Anchors corner light towers into the stadium structure)
            const trussMat = new THREE.MeshStandardMaterial({
                color: 0x1e293b,
                metalness: 0.8,
                roughness: 0.3
            });
            const beamGeoX = new THREE.BoxGeometry(40.0, 0.35, 0.35);
            const northBeam = new THREE.Mesh(beamGeoX, trussMat);
            northBeam.position.set(0, 13.8, -26.0);
            this.enclosureRoot.add(northBeam);

            const beamGeoZ = new THREE.BoxGeometry(0.35, 0.35, 38.0);
            const westBeam = new THREE.Mesh(beamGeoZ, trussMat);
            westBeam.position.set(-22.0, 13.8, -1.0);
            this.enclosureRoot.add(westBeam);

            const eastBeam = new THREE.Mesh(beamGeoZ, trussMat);
            eastBeam.position.set(22.0, 13.8, -1.0);
            this.enclosureRoot.add(eastBeam);

            this.sceneRef.add(this.enclosureRoot);
        }

        buildInstancedCrowd() {
            this.crowdRoot = new THREE.Group();
            this.crowdRoot.name = "Stadium_Instanced_Crowd";

            const rng = createPRNG(this.crowdSeed);

            // Classy European Night Palette (Navy, Slate, White, Cyan, Gold, Heather Grey - NO rainbow candy)
            const palette = [
                new THREE.Color(0x1e3a8a), // 30% Chelsea / UEFA Navy Blue
                new THREE.Color(0x0f172a), // 25% Midnight Slate
                new THREE.Color(0xf8fafc), // 20% Real Madrid White
                new THREE.Color(0x0284c7), // 10% Sky Blue
                new THREE.Color(0xeab308), //  8% Gold Accent
                new THREE.Color(0x64748b)  //  7% Heather Slate Grey
            ];

            const skinColors = [
                new THREE.Color(0xfbcfe8), // Fair
                new THREE.Color(0xf5d0b5), // Wheat
                new THREE.Color(0xc68642), // Tan
                new THREE.Color(0x78350f)  // Deep
            ];

            // 1. Gather all valid spectator seat coordinate positions across North, West, East
            const crowdPosList = [];

            // North Stand: Rows step in -Z, seats step in X
            for (let row = 0; row < 6; row++) {
                const rowZ = -16.2 - row * 1.55;
                const rowY = 1.85 + row * 0.72;
                for (let s = 0; s < 26; s++) {
                    // Leave aisles (gaps) every 7 seats
                    if (s === 6 || s === 7 || s === 19 || s === 20) continue;
                    // 70% occupancy ratio via deterministic seeded PRNG
                    if (rng() > 0.72) continue;

                    const posX = -11.5 + s * 0.92 + (rng() - 0.5) * 0.08;
                    crowdPosList.push({
                        pos: new THREE.Vector3(posX, rowY, rowZ),
                        rotY: 0.0 + (rng() - 0.5) * 0.15
                    });
                }
            }

            // West Stand: Rows step in -X, seats step in Z
            for (let row = 0; row < 5; row++) {
                const rowX = -11.2 - row * 1.55;
                const rowY = 1.85 + row * 0.72;
                for (let s = 0; s < 28; s++) {
                    if (s === 7 || s === 8 || s === 20 || s === 21) continue;
                    if (rng() > 0.70) continue;

                    const posZ = -13.0 + s * 0.95 + (rng() - 0.5) * 0.08;
                    crowdPosList.push({
                        pos: new THREE.Vector3(rowX, rowY, posZ),
                        rotY: Math.PI / 2 + (rng() - 0.5) * 0.15
                    });
                }
            }

            // East Stand: Rows step in +X, seats step in Z
            for (let row = 0; row < 5; row++) {
                const rowX = 11.2 + row * 1.55;
                const rowY = 1.85 + row * 0.72;
                for (let s = 0; s < 28; s++) {
                    if (s === 7 || s === 8 || s === 20 || s === 21) continue;
                    if (rng() > 0.70) continue;

                    const posZ = -13.0 + s * 0.95 + (rng() - 0.5) * 0.08;
                    crowdPosList.push({
                        pos: new THREE.Vector3(rowX, rowY, posZ),
                        rotY: -Math.PI / 2 + (rng() - 0.5) * 0.15
                    });
                }
            }

            const totalCount = crowdPosList.length;
            this.stats.crowdCount = totalCount;

            // 2. Build 2 InstancedMeshes (Torso + Head = 2 Draw Calls total!)
            const torsoGeo = new THREE.CylinderGeometry(0.18, 0.15, 0.44, 6);
            const headGeo = new THREE.SphereGeometry(0.12, 6, 5);

            const torsoTris = torsoGeo.index ? torsoGeo.index.count / 3 : torsoGeo.attributes.position.count / 3;
            const headTris = headGeo.index ? headGeo.index.count / 3 : headGeo.attributes.position.count / 3;
            this.stats.crowdTris = totalCount * (torsoTris + headTris);

            console.log(`[FootballCourt] Instancing ${totalCount} stadium crowd members (Seed: ${this.crowdSeed}, Crowd Tris: ${this.stats.crowdTris.toLocaleString()}, Budget: 2 Draw Calls)...`);

            const torsoMat = new THREE.MeshStandardMaterial({
                roughness: 0.55,
                metalness: 0.15
            });
            const headMat = new THREE.MeshStandardMaterial({
                roughness: 0.6,
                metalness: 0.05
            });

            const torsoInstanced = new THREE.InstancedMesh(torsoGeo, torsoMat, totalCount);
            const headInstanced = new THREE.InstancedMesh(headGeo, headMat, totalCount);
            torsoInstanced.castShadow = false;
            torsoInstanced.receiveShadow = true;
            headInstanced.castShadow = false;
            headInstanced.receiveShadow = true;

            const dummy = new THREE.Object3D();
            const colorDummy = new THREE.Color();

            for (let i = 0; i < totalCount; i++) {
                const c = crowdPosList[i];

                // Torso transform
                dummy.position.copy(c.pos);
                dummy.position.y += 0.22;
                dummy.rotation.set(0, c.rotY, 0);
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                torsoInstanced.setMatrixAt(i, dummy.matrix);

                // Torso color (UEFA club palette distribution via seeded PRNG)
                const rnd = rng();
                if (rnd < 0.30) colorDummy.copy(palette[0]);
                else if (rnd < 0.55) colorDummy.copy(palette[1]);
                else if (rnd < 0.75) colorDummy.copy(palette[2]);
                else if (rnd < 0.85) colorDummy.copy(palette[3]);
                else if (rnd < 0.93) colorDummy.copy(palette[4]);
                else colorDummy.copy(palette[5]);
                torsoInstanced.setColorAt(i, colorDummy);

                // Head transform
                dummy.position.copy(c.pos);
                dummy.position.y += 0.52;
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                headInstanced.setMatrixAt(i, dummy.matrix);

                // Head skin tone via seeded PRNG
                const skinTone = skinColors[Math.floor(rng() * skinColors.length)];
                headInstanced.setColorAt(i, skinTone);
            }

            torsoInstanced.instanceMatrix.needsUpdate = true;
            if (torsoInstanced.instanceColor) torsoInstanced.instanceColor.needsUpdate = true;

            headInstanced.instanceMatrix.needsUpdate = true;
            if (headInstanced.instanceColor) headInstanced.instanceColor.needsUpdate = true;

            this.crowdRoot.add(torsoInstanced);
            this.crowdRoot.add(headInstanced);
            this.sceneRef.add(this.crowdRoot);
        }
    }

    root.FootballCourtStadium = new FootballCourtStadiumController();

})(window);
