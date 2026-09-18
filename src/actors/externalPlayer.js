/**
 * externalPlayer.js — External Humanoid Animation Pipeline Hardening
 * 
 * 职责：
 * 1. 纯工程 Technical Dummy (Alien Soldier / Mixamo 66-Joint Skeleton)
 * 2. 验证 SkinnedMesh、SkeletonUtils clone、AnimationMixer、In-Place 动画转换
 * 3. 严格实现 Gameplay 刚体物理与 Visual 视觉外皮的完全解耦
 * 4. 100% 维持 Legacy Player 对象接口契约 (不破坏 updateCPUDefender 与锦标赛)
 * 5. 确立 Mixamo-Compatible Replacement Path Established
 */

(function (root) {
    'use strict';

    // 辅助工具：骨骼名称规范化 (抹平 mixamorig:、mixamorig、_01、.001 命名差异)
    function normalizeMixamoBoneName(name) {
        if (!name) return '';
        let clean = name.replace(/^mixamorig:?/i, '');
        clean = clean.replace(/_\d+$/, '').replace(/\.\d+$/, '');
        return clean;
    }

    // 辅助工具：材质数组安全遍历
    function forEachMaterial(material, fn) {
        if (!material) return;
        if (Array.isArray(material)) {
            for (let i = 0; i < material.length; i++) {
                if (material[i]) fn(material[i]);
            }
        } else {
            fn(material);
        }
    }

    // 辅助工具：全属性深度纹理收集 (支持任意材质属性与材质数组)
    function collectMaterialTextures(material, texSet) {
        if (!material || !texSet) return;
        forEachMaterial(material, (mat) => {
            for (let prop in mat) {
                try {
                    const val = mat[prop];
                    if (val && (val.isTexture || (typeof THREE !== 'undefined' && val instanceof THREE.Texture))) {
                        texSet.add(val);
                    }
                } catch (e) {}
            }
        });
    }

    // 辅助工具：稳健动画轨道节点名解析
    function extractTrackNodeName(trackName) {
        if (!trackName) return '';
        if (typeof THREE !== 'undefined' && THREE.PropertyBinding && THREE.PropertyBinding.parseTrackName) {
            try {
                const parsed = THREE.PropertyBinding.parseTrackName(trackName);
                if (parsed) {
                    if (parsed.objectName === 'bones' && parsed.objectIndex) {
                        return parsed.objectIndex;
                    }
                    if (parsed.nodeName) {
                        return parsed.nodeName;
                    }
                    if (parsed.objectIndex) {
                        return parsed.objectIndex;
                    }
                    if (parsed.objectName) {
                        return parsed.objectName;
                    }
                }
            } catch (e) {}
        }
        // Fallback: 支持 .bones[Name].position, Armature/Name.position, Name.position
        const bracketMatch = trackName.match(/\[([^\]]+)\]/);
        if (bracketMatch && bracketMatch[1]) {
            return bracketMatch[1];
        }
        const dotIdx = trackName.indexOf('.');
        if (dotIdx !== -1) {
            const pre = trackName.substring(0, dotIdx);
            const slashIdx = pre.lastIndexOf('/');
            return slashIdx !== -1 ? pre.substring(slashIdx + 1) : pre;
        }
        return trackName;
    }

    class ExternalPlayerAsset {
        constructor() {
            this.loaded = false;
            this.sourceScene = null;
            this.sourceClips = [];
            this.runInPlaceClip = null;

            // 共享 Contact Shadow 资源 (Manager/Asset 级单例，全员复用)
            this.sharedShadowTexture = null;
            this.sharedShadowGeometry = null;
            this.sharedShadowMaterial = null;

            this.stats = {
                triangles: 0,
                vertices: 0,
                skinnedMeshes: 0,
                materials: 0,
                textures: 0,
                bones: 0,
                scale: 1.0,
                footOffsetY: 0.0,
                rawHeight: 1.71,
                targetHeight: 1.88,
                hipsBoneName: '',
                rootMotionOriginalDeltaZ: 0,
                rootMotionInPlaceDeltaZ: 0,
                rootMotionPreservedDeltaY: 0
            };
        }

        initSharedContactShadow() {
            if (this.sharedShadowMaterial) return;
            const canvas = document.createElement('canvas');
            canvas.width = 64; canvas.height = 64;
            const ctx = canvas.getContext('2d');
            const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
            grad.addColorStop(0.0, 'rgba(5, 10, 20, 0.75)');
            grad.addColorStop(0.5, 'rgba(5, 10, 20, 0.35)');
            grad.addColorStop(1.0, 'rgba(5, 10, 20, 0.0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 64, 64);

            this.sharedShadowTexture = new THREE.CanvasTexture(canvas);
            this.sharedShadowGeometry = new THREE.PlaneGeometry(0.95, 0.95);
            this.sharedShadowMaterial = new THREE.MeshBasicMaterial({
                map: this.sharedShadowTexture,
                transparent: true,
                opacity: 0.85,
                depthWrite: false
            });
        }

        async load(modelUrl) {
            return new Promise((resolve, reject) => {
                const loader = new THREE.GLTFLoader();
                loader.load(
                    modelUrl,
                    (gltf) => {
                        try {
                            this.processGltf(gltf);
                            this.initSharedContactShadow();
                            this.loaded = true;
                            resolve(this);
                        } catch (err) {
                            reject(err);
                        }
                    },
                    undefined,
                    (err) => reject(err)
                );
            });
        }

        processGltf(gltf) {
            this.sourceScene = gltf.scene;
            this.sourceClips = gltf.animations || [];

            let totalTris = 0;
            let totalVerts = 0;
            let skinnedMeshCount = 0;
            let boneCount = 0;
            const matSet = new Set();
            const texSet = new Set();
            let candidateHips = null;
            let candidateRoot = null;

            this.sourceScene.traverse((child) => {
                if (child.isSkinnedMesh) {
                    skinnedMeshCount++;
                    forEachMaterial(child.material, (mat) => {
                        matSet.add(mat);
                        collectMaterialTextures(mat, texSet);
                    });
                    const geo = child.geometry;
                    if (geo) {
                        const tris = geo.index ? geo.index.count / 3 : (geo.attributes.position ? geo.attributes.position.count / 3 : 0);
                        const verts = geo.attributes.position ? geo.attributes.position.count : 0;
                        totalTris += tris;
                        totalVerts += verts;
                    }
                }
                if (child.isBone) {
                    boneCount++;
                    const norm = normalizeMixamoBoneName(child.name).toLowerCase();
                    // 优先级 1: 规范化骨骼名精确匹配 hips
                    if (norm === 'hips' && !candidateHips) {
                        candidateHips = child;
                    } else if (norm === 'root' && !candidateRoot) {
                        // 优先级 2: root 备选
                        candidateRoot = child;
                    }
                }
            });

            const hipsBone = candidateHips || candidateRoot;
            this.stats.triangles = totalTris;
            this.stats.vertices = totalVerts;
            this.stats.skinnedMeshes = skinnedMeshCount;
            this.stats.materials = matSet.size;
            this.stats.textures = texSet.size;
            this.stats.bones = boneCount;
            this.stats.hipsBoneName = hipsBone ? hipsBone.name : 'mixamorigHips_01';

            // 1. Box3 自动计算成年人视觉身高与脚底贴地基准
            this.sourceScene.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(this.sourceScene);
            const rawHeight = box.max.y - box.min.y;
            this.stats.rawHeight = rawHeight;
            this.stats.targetHeight = 1.88; // 真实成年足球运动员标准身姿高度
            this.stats.scale = this.stats.targetHeight / (rawHeight || 1.0);
            this.stats.footOffsetY = -box.min.y * this.stats.scale; // 消除模型离地或穿地误差

            // 2. 动画轨道深度审计与 Root Motion -> In-Place 安全转换
            if (this.sourceClips.length > 0) {
                const rawClip = this.sourceClips[0];
                this.runInPlaceClip = this.buildInPlaceClip(rawClip, this.stats.hipsBoneName);
            }

            console.log(`[ExternalPlayer] Template Loaded: ${this.stats.triangles.toLocaleString()} tris, ${this.stats.bones} bones, Scale: ${this.stats.scale.toFixed(4)}, FootY: ${this.stats.footOffsetY.toFixed(4)}, Hips: ${this.stats.hipsBoneName}`);
        }

        buildInPlaceClip(originalClip, hipsBoneName) {
            const clipClone = originalClip.clone();
            clipClone.name = 'run_in_place';

            let hipsPosTrack = null;
            for (let track of clipClone.tracks) {
                if (track.name.endsWith('.position')) {
                    const nodeName = extractTrackNodeName(track.name);
                    if (nodeName === hipsBoneName || normalizeMixamoBoneName(nodeName).toLowerCase() === 'hips') {
                        hipsPosTrack = track;
                        break;
                    }
                }
            }

            if (hipsPosTrack && hipsPosTrack.values) {
                const values = hipsPosTrack.values; // Float32Array [x0, y0, z0, x1, y1, z1, ...]
                const firstX = values[0];
                const firstZ = values[2];

                let minZ = Infinity, maxZ = -Infinity;
                let minY = Infinity, maxY = -Infinity;

                for (let i = 0; i < values.length; i += 3) {
                    const curY = values[i + 1];
                    const curZ = values[i + 2];
                    if (curZ < minZ) minZ = curZ;
                    if (curZ > maxZ) maxZ = curZ;
                    if (curY < minY) minY = curY;
                    if (curY > maxY) maxY = curY;

                    // 核心算法：冻结水平 X 和 Z，完全保留垂直 Y 轴真实奔跑步态重心起伏
                    values[i + 0] = firstX;
                    values[i + 2] = firstZ;
                }

                this.stats.rootMotionOriginalDeltaZ = maxZ - minZ;
                this.stats.rootMotionPreservedDeltaY = maxY - minY;
                this.stats.rootMotionInPlaceDeltaZ = 0.0;
                console.log(`[ExternalPlayer] Root-Motion converted to In-Place: Original ΔZ=${(maxZ - minZ).toFixed(2)}, Preserved Bounce ΔY=${(maxY - minY).toFixed(2)}`);
            }

            return clipClone;
        }
    }

    class ExternalPlayerInstance {
        constructor(asset, role, cfg, scene) {
            this.asset = asset;
            this.role = role;
            this.cfg = cfg || {};
            this.scene = scene;

            // 1. 使用 THREE.SkeletonUtils.clone 复制独立骨骼实例
            if (!THREE.SkeletonUtils || !THREE.SkeletonUtils.clone) {
                throw new Error('THREE.SkeletonUtils.clone not available! Ensure SkeletonUtils.js is loaded.');
            }
            this.clonedModel = THREE.SkeletonUtils.clone(asset.sourceScene);

            // 2. 建立 Gameplay 与 Visual 分离的层级结构
            this.actorRoot = new THREE.Group();
            this.actorRoot.name = `ExternalPlayer_ActorRoot_${cfg.number || role}`;
            this.actorRoot.position.set(cfg.baseX || 0, 0, cfg.baseZ || 0);

            // ExternalVisualRoot (纯视觉偏置，处理缩放、脚底对齐与朝向)
            this.visualRoot = new THREE.Group();
            this.visualRoot.name = `ExternalVisualRoot`;
            this.visualRoot.position.set(0, asset.stats.footOffsetY, 0);
            this.visualRoot.scale.setScalar(asset.stats.scale);
            this.visualRoot.rotation.y = 0; // 默认面向比赛前方 (+Z)
            this.visualRoot.add(this.clonedModel);
            this.actorRoot.add(this.visualRoot);

            // 3. 性能优化：关闭高面角色产生阴影 (castShadow=false)，保留接收阴影 (receiveShadow=true)
            this.clonedModel.traverse((child) => {
                if (child.isSkinnedMesh) {
                    child.castShadow = false;
                    child.receiveShadow = true;
                    forEachMaterial(child.material, (mat) => {
                        mat.roughness = Math.max(0.4, mat.roughness || 0.5);
                    });
                }
            });

            // 4. 脚底柔和接触阴影圆盘 (共享 Geometry / Material / Texture)
            this.addContactShadowDisc();

            // 5. 建立不可见的 Proxy 节点，满足 Legacy updateCPUDefender 接口契约
            this.torsoProxy = new THREE.Object3D();
            this.headProxy = new THREE.Object3D();
            this.lArmProxy = new THREE.Object3D();
            this.rArmProxy = new THREE.Object3D();
            this.lLegProxy = new THREE.Object3D();
            this.rLegProxy = new THREE.Object3D();
            this.actorRoot.add(this.torsoProxy);
            this.actorRoot.add(this.headProxy);
            this.actorRoot.add(this.lArmProxy);
            this.actorRoot.add(this.rArmProxy);
            this.actorRoot.add(this.lLegProxy);
            this.actorRoot.add(this.rLegProxy);

            // 6. 独立动画状态机与 AnimationMixer
            this.mixer = new THREE.AnimationMixer(this.clonedModel);
            this.runAction = null;
            if (asset.runInPlaceClip) {
                this.runAction = this.mixer.clipAction(asset.runInPlaceClip);
                this.runAction.setLoop(THREE.LoopRepeat);
                this.runAction.clampWhenFinished = false;
            }

            this.currentState = 'IDLE'; // 'IDLE' | 'RUN' | 'ACTION_FALLBACK'
            this.prevWorldPos = new THREE.Vector3().copy(this.actorRoot.position);

            // 7. 构造完全兼容 characters[] 的数据契约对象
            this.actorData = {
                group: this.actorRoot,
                torso: this.torsoProxy,
                head: this.headProxy,
                lArm: this.lArmProxy,
                rArm: this.rArmProxy,
                lLeg: this.lLegProxy,
                rLeg: this.rLegProxy,
                role: role,
                title: cfg.title || role,
                number: cfg.number || 0,
                baseX: cfg.baseX || 0,
                baseZ: cfg.baseZ || 0,
                amplitude: cfg.amplitude || 0,
                speed: cfg.speed || 1.2,
                phase: cfg.phase || 0,
                time: cfg.phase || 0,
                runPhase: (cfg.phase || 0) * 3.0,
                isSliding: false,
                kickCooldown: 0,
                actionType: 'none',
                actionTimer: 0,
                actionDuration: 0.45,
                _externalInstance: this
            };
        }

        addContactShadowDisc() {
            this.asset.initSharedContactShadow();
            const shadowDisc = new THREE.Mesh(
                this.asset.sharedShadowGeometry,
                this.asset.sharedShadowMaterial
            );
            shadowDisc.rotation.x = -Math.PI / 2;
            shadowDisc.position.set(0, 0.02, 0);
            this.actorRoot.add(shadowDisc);
        }

        update(dt) {
            const currentPos = this.actorRoot.position;
            const dx = currentPos.x - this.prevWorldPos.x;
            const dz = currentPos.z - this.prevWorldPos.z;
            const speed = Math.sqrt(dx * dx + dz * dz) / Math.max(0.0001, dt);
            this.prevWorldPos.copy(currentPos);

            // 状态机切换逻辑
            if (this.actorData.actionType !== 'none') {
                if (this.currentState !== 'ACTION_FALLBACK') {
                    if (this.runAction) this.runAction.fadeOut(0.12);
                    this.currentState = 'ACTION_FALLBACK';
                }
            } else if (speed > 0.15) {
                if (this.currentState !== 'RUN') {
                    if (this.runAction) {
                        this.runAction.reset().fadeIn(0.18).play();
                    }
                    this.currentState = 'RUN';
                }
                if (this.runAction) {
                    this.runAction.timeScale = Math.max(0.7, Math.min(1.8, speed * 0.45));
                }
            } else {
                if (this.currentState !== 'IDLE') {
                    if (this.runAction) this.runAction.fadeOut(0.25);
                    this.currentState = 'IDLE';
                }
            }

            if (this.mixer) {
                this.mixer.update(dt);
            }
        }
    }

    class ExternalPlayerManager {
        constructor() {
            this.active = false;
            this.asset = new ExternalPlayerAsset();
            this.instances = [];
            this.initialized = false;
            this.initPromise = null;
        }

        checkUrlGate() {
            const params = new URLSearchParams(window.location.search);
            const playerParam = (params.get('players') || 'legacy').toLowerCase();
            return playerParam === 'external';
        }

        async init(scene, onDone) {
            this.active = this.checkUrlGate();
            if (!this.active) {
                console.log('[ExternalPlayers] Using Legacy Procedural Players (Gate: ?players=legacy)');
                if (onDone) onDone(false);
                return;
            }

            console.log('[ExternalPlayers] Initializing External Skinned Humanoid Pipeline (?players=external)...');
            const modelUrl = 'assets/models/player/644230060__alien_soldier_football/scene.gltf';

            try {
                await this.asset.load(modelUrl);
                this.initialized = true;
                console.log('[ExternalPlayers] Mixamo-Compatible Replacement Path Established! External Humanoid Pipeline Ready.');
                this.setupDebugBridge();
                if (onDone) onDone(true);
            } catch (err) {
                console.warn('[ExternalPlayers] Failed to load external player model, falling back to legacy:', err);
                this.active = false;
                if (onDone) onDone(false);
            }
        }

        isReady() {
            return this.active && this.initialized && this.asset.loaded;
        }

        clearInstances() {
            const disposedSkeletons = new Set();
            for (let inst of this.instances) {
                if (inst.mixer) {
                    inst.mixer.stopAllAction();
                    inst.mixer.uncacheRoot(inst.clonedModel);
                }
                if (inst.actorRoot && inst.actorRoot.parent) {
                    inst.actorRoot.parent.remove(inst.actorRoot);
                }
                if (inst.clonedModel) {
                    inst.clonedModel.traverse((child) => {
                        if (child.isSkinnedMesh && child.skeleton && !disposedSkeletons.has(child.skeleton.uuid)) {
                            child.skeleton.dispose();
                            disposedSkeletons.add(child.skeleton.uuid);
                        }
                    });
                }
            }
            this.instances.length = 0;
        }

        createPlayer(jerseyColor, shortsColor, bootsColor, role, cfg) {
            if (!this.isReady()) {
                throw new Error('[ExternalPlayers] Manager not ready, cannot create external player!');
            }
            const instance = new ExternalPlayerInstance(this.asset, role, cfg);
            this.instances.push(instance);
            return instance.actorData;
        }

        update(dt) {
            if (!this.active || this.instances.length === 0) return;
            for (let i = 0; i < this.instances.length; i++) {
                this.instances[i].update(dt);
            }
        }

        setupDebugBridge() {
            window.__externalPlayerDebug = () => {
                const geoSet = new Set();
                const matSet = new Set();
                const texSet = new Set();
                const skelSet = new Set();
                const boneSet = new Set();

                for (let inst of this.instances) {
                    inst.actorRoot.traverse((child) => {
                        if (child.isSkinnedMesh) {
                            if (child.geometry) geoSet.add(child.geometry.uuid);
                            forEachMaterial(child.material, (mat) => {
                                matSet.add(mat.uuid);
                                collectMaterialTextures(mat, texSet);
                            });
                            if (child.skeleton) {
                                skelSet.add(child.skeleton.uuid);
                                child.skeleton.bones.forEach((b) => boneSet.add(b.uuid));
                            }
                        }
                    });
                }

                // 独立性验证测试 (使用完整原始四元数备份与恢复，零副作用)
                let isIndependent = false;
                if (this.instances.length >= 2) {
                    let b0 = null, b1 = null;
                    this.instances[0].clonedModel.traverse((c) => { if (c.isBone && c.name.includes('LeftArm')) b0 = c; });
                    this.instances[1].clonedModel.traverse((c) => { if (c.isBone && c.name.includes('LeftArm')) b1 = c; });
                    if (b0 && b1 && b0 !== b1) {
                        const savedQuat0 = b0.quaternion.clone();
                        const savedQuat1 = b1.quaternion.clone();
                        
                        b0.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), 1.25);
                        b0.updateMatrixWorld(true);
                        
                        isIndependent = (b1.quaternion.x === savedQuat1.x &&
                                         b1.quaternion.y === savedQuat1.y &&
                                         b1.quaternion.z === savedQuat1.z &&
                                         b1.quaternion.w === savedQuat1.w);
                                         
                        b0.quaternion.copy(savedQuat0);
                        b0.updateMatrixWorld(true);
                    }
                }

                return {
                    pipelineStatus: 'Mixamo-Compatible Replacement Path Established',
                    replacementReady: true,
                    instanceCount: this.instances.length,
                    sourceTriangles: this.asset.stats.triangles,
                    sourceMeshes: this.asset.stats.skinnedMeshes,
                    sourceMaterials: this.asset.stats.materials,
                    sourceTextures: this.asset.stats.textures,
                    boneCount: this.asset.stats.bones,
                    scale: this.asset.stats.scale,
                    footOffsetY: this.asset.stats.footOffsetY,
                    currentStates: this.instances.map((i) => i.currentState),
                    sharedGeometryCount: geoSet.size,
                    sharedMaterialCount: matSet.size,
                    sharedTextureCount: texSet.size,
                    uniqueSkeletonCount: skelSet.size,
                    uniqueBoneCount: boneSet.size,
                    isSkeletonIndependent: isIndependent
                };
            };
        }
    }

    root.ExternalPlayers = new ExternalPlayerManager();

})(window);
