/**
 * Soccer Pinball 3D - External Football GLTF Integration
 * Manages External 3D Soccer Ball Model, Automatic Scale & Center, and Energy Shell
 */

(function(root) {
    'use strict';

    class ExternalBallController {
        constructor() {
            this.active = false;
            this.externalGroup = null;
            this.modelScene = null;
            this.energyShell = null;
            this.ballMesh = null;
            this.originalMaterial = null;
            this.originalGeometry = null;
            this.scaleFactor = 1.0;
            this.importedDiameter = 1.0;
            this.targetDiameter = 0.84;
            this.rocketIntensity = 0.0;
            this.targetRocketIntensity = 0.0;
        }

        async init(ballMesh, G) {
            this.ballMesh = ballMesh;
            this.targetDiameter = (G && G.ballR) ? G.ballR * 2 : 0.84;

            if (!root.AssetManager || !root.AssetManager.isExternal) {
                console.log('[ExternalBall] Asset mode is legacy. Skipping external ball load.');
                return;
            }

            console.log('[ExternalBall] Initiating external GLTF ball load...');
            const modelUrl = 'assets/models/ball/perfect_football__soccer_ball_gltf/scene.gltf';

            try {
                const gltf = await root.AssetManager.load(modelUrl);
                this.setupModel(gltf.scene);
                this.active = true;
                console.log(`[ExternalBall] Successfully integrated external football (Scale: ${this.scaleFactor.toFixed(6)})`);
            } catch (err) {
                console.warn('[ExternalBall] Failed to load external football model. Falling back to procedural ball:', err);
                this.active = false;
                if (this.ballMesh) {
                    this.ballMesh.visible = true;
                }
            }
        }

        setupModel(sceneModel) {
            this.modelScene = sceneModel;
            this.modelScene.updateMatrixWorld(true);

            // 0. 按照材质聚合合并 BufferGeometry (将 32 个独立面板合并为 2~3 个网格，大幅削减 Draw Calls)
            let optimizedModel = this.modelScene;
            try {
                if (typeof THREE.BufferGeometryUtils !== 'undefined' && THREE.BufferGeometryUtils.mergeBufferGeometries) {
                    const matGroups = new Map();
                    this.modelScene.traverse(child => {
                        if (child.isMesh && child.material && child.geometry) {
                            const mat = child.material;
                            if (!matGroups.has(mat)) {
                                matGroups.set(mat, []);
                            }
                            const clonedGeom = child.geometry.clone();
                            child.updateWorldMatrix(true, false);
                            clonedGeom.applyMatrix4(child.matrixWorld);
                            matGroups.get(mat).push(clonedGeom);
                        }
                    });

                    if (matGroups.size > 0) {
                        const mergedGroup = new THREE.Group();
                        mergedGroup.name = "MergedBallModel";
                        matGroups.forEach((geoms, mat) => {
                            const mergedGeom = THREE.BufferGeometryUtils.mergeBufferGeometries(geoms, false);
                            if (mergedGeom) {
                                const mesh = new THREE.Mesh(mergedGeom, mat);
                                mesh.castShadow = true;
                                mesh.receiveShadow = true;
                                mergedGroup.add(mesh);
                            }
                        });
                        if (mergedGroup.children.length > 0) {
                            console.log(`[ExternalBall] Geometry Merge: successfully reduced meshes from 32 to ${mergedGroup.children.length} by material!`);
                            optimizedModel = mergedGroup;
                        }
                    }
                }
            } catch (mergeErr) {
                console.warn('[ExternalBall] BufferGeometry merge failed, falling back to original meshes:', mergeErr);
                optimizedModel = this.modelScene;
            }

            this.modelScene = optimizedModel;

            // 1. 计算未变换状态下的原始包围盒与几何中心
            const box = new THREE.Box3().setFromObject(this.modelScene);
            const size = new THREE.Vector3();
            box.getSize(size);
            const center = new THREE.Vector3();
            box.getCenter(center);

            this.importedDiameter = Math.max(size.x, size.y, size.z);
            this.scaleFactor = this.targetDiameter / this.importedDiameter;

            console.log(`[ExternalBall] Auto-Calibration: Imported bounds size=${size.x.toFixed(2)}x${size.y.toFixed(2)}x${size.z.toFixed(2)}, Center=[${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}], Target=${this.targetDiameter}, Scale=${this.scaleFactor.toFixed(6)}`);

            // 2. 创建居中和旋转的专用容器 BallVisualGroup
            this.externalGroup = new THREE.Group();
            this.externalGroup.name = "ExternalBallVisualRoot";

            // 通过平移子模型使几何中心严格对齐 (0, 0, 0)
            this.modelScene.position.set(-center.x, -center.y, -center.z);
            this.externalGroup.add(this.modelScene);

            // 应用缩放以精确匹配 G.ballR * 2
            this.externalGroup.scale.setScalar(this.scaleFactor);

            // 3. 尊重原生 PBR 材质，配置阴影投射与微调反射
            this.modelScene.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (child.material) {
                        child.material.envMapIntensity = 0.85;
                        child.material.roughness = Math.max(0.24, child.material.roughness || 0.3);
                        child.material.needsUpdate = true;
                    }
                }
            });

            // 4. 构建第二阶段 Energy Shell (温暖白光 + 冠军金菲涅尔外壳，不破坏核心材质透明度)
            const shellRadius = (this.targetDiameter * 0.5) * 1.07;
            const shellGeo = new THREE.SphereGeometry(shellRadius, 32, 32);
            const shellMat = new THREE.MeshBasicMaterial({
                color: 0xfef08a,
                transparent: true,
                opacity: 0.0,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                side: THREE.FrontSide
            });
            this.energyShell = new THREE.Mesh(shellGeo, shellMat);
            this.energyShell.name = "BallEnergyShell";
            this.energyShell.visible = false;
            this.externalGroup.add(this.energyShell);

            // 5. 挂载到主球体，并隐藏原有程序化球体视觉网格 (保留物理球体以保持物理与碰撞完整性)
            if (this.ballMesh) {
                // 隐藏原有 procedural 几何表现，使其只作为物理锚点
                if (this.ballMesh.material) {
                    this.ballMesh.material.visible = false;
                }
                this.ballMesh.add(this.externalGroup);
            }
        }

        setRocketState(active, duration) {
            this.targetRocketIntensity = active ? 1.0 : 0.0;
            if (!active) {
                this.rocketIntensity = 0.0;
            }
            if (this.energyShell) {
                this.energyShell.visible = active;
                if (!active) {
                    this.energyShell.material.opacity = 0.0;
                }
            }
        }

        update(dt) {
            if (!this.active || !this.externalGroup) return;

            // 平滑缓动 Energy Shell 强度
            if (this.energyShell && this.energyShell.visible) {
                this.rocketIntensity += (this.targetRocketIntensity - this.rocketIntensity) * Math.min(1.0, dt * 10.0);
                this.energyShell.material.opacity = this.rocketIntensity * 0.42;
                if (this.rocketIntensity < 0.01 && this.targetRocketIntensity <= 0) {
                    this.energyShell.visible = false;
                }
            }
        }
    }

    root.ExternalBall = new ExternalBallController();

})(window);
