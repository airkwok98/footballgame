/**
 * Soccer Pinball 3D - External Stadium GLTF Integration
 * 
 * POC STATUS: POC_REJECTED_PHOTOGRAMMETRY_ASSET
 * 
 * Production Decision:
 * - Cheltenham photogrammetry drone scan contains 858,030 triangles (90%+ of total scene load).
 * - Baked unlit daytime sunlight (KHR_materials_unlit) clashing with Visual 2.0 night aesthetic.
 * - Jagged scan boundaries and photogrammetry mesh artifacts.
 * - REJECTED FOR PRODUCTION. Default / external asset mode strictly keeps procedural stadium.
 * - Kept purely as POC archive, only loaded when explicitly requested via ?stadium=cheltenham or ?assets=cheltenham.
 */

(function(root) {
    'use strict';

    const POC_STATUS = "POC_REJECTED_PHOTOGRAMMETRY_ASSET";

    class ExternalStadiumController {
        constructor() {
            this.active = false;
            this.stadiumGroup = null;
            this.modelScene = null;
            this.sceneRef = null;
            this.scaleFactor = 1.0;
            this.importedBounds = null;
            this.pocStatus = POC_STATUS;
        }

        async init(scene, G, proceduralAtmosphere = {}) {
            this.sceneRef = scene;

            const params = new URLSearchParams(window.location.search);
            const stadiumParam = (params.get('stadium') || '').toLowerCase();
            const assetsParam = (params.get('assets') || '').toLowerCase();
            const allowCheltenhamPoc = (stadiumParam === 'cheltenham' || assetsParam === 'cheltenham');

            if (!allowCheltenhamPoc) {
                console.log(`[ExternalStadium] POC Status: ${POC_STATUS}. Production mode active - Cheltenham photogrammetry stadium is REJECTED and disabled. Using procedural stadium environment.`);
                this.active = false;
                return;
            }

            console.warn(`[ExternalStadium] WARNING: Loading ${POC_STATUS} for POC evaluation only (?stadium=cheltenham or ?assets=cheltenham). Heavy load (858k triangles).`);
            const modelUrl = 'assets/models/stadium/cheltenham_football_pitch_gltf/scene.gltf';

            try {
                const gltf = await root.AssetManager.load(modelUrl);
                this.setupModel(gltf, G, proceduralAtmosphere);
                this.active = true;
                console.log(`[ExternalStadium] Successfully loaded Cheltenham POC environment.`);
            } catch (err) {
                console.warn('[ExternalStadium] Failed to load Cheltenham POC model:', err);
                this.active = false;
            }
        }

        setupModel(gltf, G, proceduralAtmosphere) {
            this.modelScene = gltf.scene;

            // 1. 禁用所有外部导入的相机与光源，防止打乱主转播相机与光照平衡
            this.modelScene.traverse(child => {
                if (child.isCamera) {
                    child.parent && child.parent.remove(child);
                }
                if (child.isLight) {
                    child.visible = false;
                }
                if (child.isMesh) {
                    child.castShadow = false; // 球场大环境无需投射阴影，极大节省绘制开销
                    child.receiveShadow = true;
                    if (child.material) {
                        child.material.roughness = Math.max(0.6, child.material.roughness || 0.7);
                    }
                }
            });

            // 2. 包围盒与尺寸分析
            const box = new THREE.Box3().setFromObject(this.modelScene);
            const size = new THREE.Vector3();
            box.getSize(size);
            const center = new THREE.Vector3();
            box.getCenter(center);

            this.importedBounds = { size, center };

            // 游戏场地比赛区域参考尺寸：宽约为 G.halfW * 2 (15.0)，长约为 G.pivotZ - G.topZ (约 24.5)
            // Cheltenham 模型尺寸约为 12.08 x 1.16 x 12.42
            // 计算等比放大系数，使外部看台与场馆宏观包裹游戏区域 (放大约 3.5 ～ 4.5 倍)
            const targetFieldSpan = 52.0; 
            const modelSpan = Math.max(size.x, size.z);
            this.scaleFactor = targetFieldSpan / modelSpan;

            this.stadiumGroup = new THREE.Group();
            this.stadiumGroup.name = "ExternalStadiumEnvironmentRoot";

            // 将球场中心对齐并微调高程 (Y 轴略下移 -0.15 避免与弹球机草坪及挡杆物理碰撞区发生 Z-Fighting)
            this.modelScene.position.set(-center.x, -center.y - 0.15, -center.z);
            this.stadiumGroup.add(this.modelScene);
            this.stadiumGroup.scale.setScalar(this.scaleFactor);

            // 略微平移适配弹球机视口纵深
            this.stadiumGroup.position.set(0, -0.05, 0);

            this.sceneRef.add(this.stadiumGroup);

            // 3. 优雅隐藏冗余的程序化 2D 看台天幕，让位于真实的 3D 体育场建筑
            if (proceduralAtmosphere.backdrop) {
                proceduralAtmosphere.backdrop.visible = false;
            }
            if (proceduralAtmosphere.crowdStrip) {
                proceduralAtmosphere.crowdStrip.visible = false;
            }
        }
    }

    root.ExternalStadium = new ExternalStadiumController();

})(window);
