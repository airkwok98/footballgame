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
        'court_Red_Tribune_0',    // 31,200 tris - Tiered red folding spectator seats
        'court_Black_Tribune_0',  // 27,542 tris - Concrete grandstand stepped risers
        'court_proof_0',          //    152 tris - High cantilever canopy roof
        'court_spot_light_0'      //     32 tris - Modern floodlight pylon fixtures
    ];

    class FootballCourtStadiumController {
        constructor() {
            this.active = false;
            this.stadiumRoot = null;
            this.modelScene = null;
            this.sceneRef = null;
            this.scaleFactor = 1.45;
            this.stats = {
                importedFullTris: 137257,
                selectedTris: 58926,
                rejectedTris: 78331,
                selectedMeshes: 4,
                drawCalls: 4
            };
        }

        async init(scene, G, proceduralAtmosphere = {}) {
            this.sceneRef = scene;

            const params = new URLSearchParams(window.location.search);
            const stadiumParam = (params.get('stadium') || '').toLowerCase();
            const allowCourt = (stadiumParam === 'football_court');
            this.seatTheme = (params.get('seats') || 'navy').toLowerCase();

            if (!allowCourt) {
                // Not requested; keep disabled so procedural stadium remains active
                this.active = false;
                return;
            }

            console.log(`[FootballCourt] Initiating modular stadium integration (?stadium=football_court, seats=${this.seatTheme})...`);
            const modelUrl = 'assets/models/stadium/football_court/scene.gltf';

            try {
                const gltf = await root.AssetManager.load(modelUrl);
                this.setupModel(gltf, G, proceduralAtmosphere);
                this.active = true;
                console.log(`[FootballCourt] Successfully integrated modular stadium! Selected Tris: ${this.stats.selectedTris.toLocaleString()}, Meshes: ${this.stats.selectedMeshes}, Scale: ${this.scaleFactor.toFixed(3)}, Seats: ${this.seatTheme}`);
            } catch (err) {
                console.warn('[FootballCourt] Failed to load modular football court model:', err);
                this.active = false;
            }
        }

        setupModel(gltf, G, proceduralAtmosphere) {
            this.modelScene = gltf.scene;

            // 1. Traverse and apply strict Whitelist filtering
            let actualSelectedTris = 0;
            let actualSelectedMeshes = 0;
            let rejectedMeshes = 0;

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

                        // PBR Material Calibration
                        child.castShadow = false; // Stadium background does not cast shadows for performance
                        child.receiveShadow = true;

                        if (child.material) {
                            child.material.roughness = Math.max(0.45, child.material.roughness || 0.6);
                            child.material.metalness = Math.min(0.4, child.material.metalness || 0.1);
                            child.material.envMapIntensity = 0.85;

                            // Seat color theme calibration (avoids aggressive red clashing with blue/gold night arcade)
                            if (child.name === 'court_Red_Tribune_0') {
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

                            // Subtle floodlight head emissive enhancement
                            if (child.name === 'court_spot_light_0') {
                                child.material.emissive = new THREE.Color(0xfffaed);
                                child.material.emissiveIntensity = 0.85;
                            }
                            child.material.needsUpdate = true;
                        }

                        console.log(`[FootballCourt] ALLOWED: ${child.name} | Tris: ${tris.toLocaleString()} | Mat: ${child.material ? child.material.name : 'none'}`);
                    } else {
                        rejectedMeshes++;
                        console.log(`[FootballCourt] REJECTED (Hidden): ${child.name} | Mat: ${child.material ? child.material.name : 'none'}`);
                    }
                }
            });

            this.stats.selectedTris = actualSelectedTris;
            this.stats.selectedMeshes = actualSelectedMeshes;

            // 2. Compute Transform, Scale and Positioning
            // Game area dimensions: Width = G.halfW * 2 (15.2), Length = G.pivotZ - G.topZ (27.0)
            // Grandstand in football_court spans X: -10.87 to +10.93 (width 21.8).
            // Scale factor 1.45 gives a grandstand width of ~31.6 units, comfortably framing the pinball arena.
            this.scaleFactor = 1.45;

            this.stadiumRoot = new THREE.Group();
            this.stadiumRoot.name = "FootballCourtModularRoot";

            this.modelScene.position.set(0, 0, 0);
            this.stadiumRoot.add(this.modelScene);

            this.stadiumRoot.scale.setScalar(this.scaleFactor);

            // Ground alignment:
            // Lowest foundation in court_Black_Tribune_0 sits at Y = -0.001 in model space.
            // When positioned at Y = 0.0, the foundation touches the arena turf level naturally.
            // In Z, positioning at -2.8 places the front tribune riser at Z ~ -14.4 (just behind top goal at Z = -12.5).
            this.stadiumRoot.position.set(0, 0.0, -2.8);

            this.sceneRef.add(this.stadiumRoot);

            // 3. Hide redundant procedural elements cleanly without deletion
            if (proceduralAtmosphere.backdrop) {
                proceduralAtmosphere.backdrop.visible = false;
            }
            if (proceduralAtmosphere.topCrowd) {
                proceduralAtmosphere.topCrowd.visible = false;
            }
            if (window.proceduralTopGrandstandGroup) {
                window.proceduralTopGrandstandGroup.visible = false;
            }
        }
    }

    root.FootballCourtStadium = new FootballCourtStadiumController();

})(window);
