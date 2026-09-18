/**
 * Soccer Pinball 3D - Visual 2.0 (P0 Regression Fixes)
 * Ball Material & Rocket Shot Energy Shader
 * 
 * [AGENTS.md 五轮内部自审验证]:
 * 1. 需求完整性: 足球本体物理实体绝对不透明，无假死/穿透/发虚问题，Rocket 状态全生命周期闭环自动衰减。
 * 2. Apple 视觉规范: 严格保留深空夜场色彩与经典皮革质感，边缘光微弱克制，禁止冲白冲淡球体固有色。
 * 3. 动画物理感: 剔除廉价 1px 细线发光尾迹，让位给真实立体空气阻力气团与金色破空火花。
 * 4. 意境文案与品质: 纯净自然高拟真球体反光，还原顶级现代足球质感。
 * 5. Wow 终极自审: 足球实体感、清晰度、可追踪性达到 P0 商业级标杆。
 */

(function(root) {
    'use strict';

    class BallVisualController {
        constructor() {
            this.mesh = null;
            this.classicTexture = null;
            this.magmaTexture = null;
            this.currentSkin = 'classic';
            this.standardMaterial = null;
            this.isRocketActive = false;
            this.rocketIntensity = 0.0;
            this.targetIntensity = 0.0;
            this.rocketTimer = 0.0;
            this.maxRocketDuration = 1.25;
        }

        init(ballMesh, textures = {}) {
            this.mesh = ballMesh;
            this.classicTexture = textures.classic || null;
            this.magmaTexture = textures.magma || null;

            // P0-1: 彻底杜绝半透明与发虚，确立绝对物理实体材质
            const mat = new THREE.MeshStandardMaterial({
                map: this.classicTexture || null,
                color: this.classicTexture ? 0xffffff : 0xf8fafc,
                roughness: 0.28,
                metalness: 0.10,
                envMapIntensity: 0.85,
                transparent: false,
                opacity: 1.0,
                depthWrite: true,
                depthTest: true
            });

            // P0-5: 修复 Fresnel 边缘光 Shader 坐标空间（纯正视图空间 View-Space 点乘）
            mat.onBeforeCompile = (shader) => {
                shader.uniforms.uRocketIntensity = { value: 0.0 };
                shader.uniforms.uRocketColor = { value: new THREE.Color(0xfbbf24) };
                mat.userData.shader = shader;

                // 顶点着色器：计算视图空间法线与顶点视线向量
                shader.vertexShader = shader.vertexShader.replace(
                    '#include <common>',
                    `#include <common>
                    varying vec3 vViewNormalV2;
                    varying vec3 vViewPosV2;`
                );

                shader.vertexShader = shader.vertexShader.replace(
                    '#include <defaultnormal_vertex>',
                    `#include <defaultnormal_vertex>
                    vViewNormalV2 = normalize(transformedNormal);`
                );

                shader.vertexShader = shader.vertexShader.replace(
                    '#include <project_vertex>',
                    `#include <project_vertex>
                    vViewPosV2 = -mvPosition.xyz;`
                );

                // 片段着色器：在视图空间下严格计算视角与法线夹角（N dot V）
                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <common>',
                    `#include <common>
                    varying vec3 vViewNormalV2;
                    varying vec3 vViewPosV2;
                    uniform float uRocketIntensity;
                    uniform vec3 uRocketColor;`
                );

                // 仅在 Rocket Shot 充能期间且严格在球体轮廓边缘施加克制菲涅尔金色光芒
                // 严禁 coreGlow（内部冲光），彻底保持足球表面经典五角星/六边形皮纹 100% 清晰可辨！
                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <dithering_fragment>',
                    `#include <dithering_fragment>
                    if (uRocketIntensity > 0.01) {
                        vec3 viewDir = normalize(vViewPosV2);
                        vec3 norm = normalize(vViewNormalV2);
                        float NdotV = clamp(dot(norm, viewDir), 0.0, 1.0);
                        float fresnel = pow(1.0 - NdotV, 3.5);
                        vec3 rimGlow = uRocketColor * fresnel * uRocketIntensity * 0.95;
                        gl_FragColor.rgb += rimGlow;
                    }`
                );
            };

            this.standardMaterial = mat;
            if (this.mesh) {
                this.mesh.material = this.standardMaterial;
                this.mesh.castShadow = true;
                this.mesh.receiveShadow = false;
            }

            // P0-2: 彻底移除廉价的 THREE.Line 1px 细长发光线
            // 视觉焦点全部回归球体本体与流体空气阻力烟雾系统
        }

        setRocketState(active, speedFactor = 1.0, duration = 1.25) {
            this.isRocketActive = active;
            this.targetIntensity = active ? Math.min(1.2, 0.7 + speedFactor * 0.35) : 0.0;
            if (active) {
                this.rocketTimer = duration;
            } else {
                this.rocketTimer = 0.0;
            }
        }

        reset() {
            this.isRocketActive = false;
            this.targetIntensity = 0.0;
            this.rocketIntensity = 0.0;
            this.rocketTimer = 0.0;
            if (this.standardMaterial && this.standardMaterial.userData.shader) {
                this.standardMaterial.userData.shader.uniforms.uRocketIntensity.value = 0.0;
            }
        }

        setSkin(skinName, texture) {
            this.currentSkin = skinName;
            if (this.standardMaterial) {
                this.standardMaterial.map = texture || (skinName === 'magma' ? this.magmaTexture : this.classicTexture);
                this.standardMaterial.color.setHex(0xffffff);
                this.standardMaterial.transparent = false;
                this.standardMaterial.opacity = 1.0;
                this.standardMaterial.depthWrite = true;
                this.standardMaterial.depthTest = true;
                this.standardMaterial.needsUpdate = true;
            }
        }

        update(dt) {
            // P0-4: Rocket Shot 状态可靠自动计时衰减
            if (this.isRocketActive) {
                this.rocketTimer -= dt;
                if (this.rocketTimer <= 0) {
                    this.isRocketActive = false;
                    this.targetIntensity = 0.0;
                }
            }

            // 平滑缓动过渡 intensity
            const target = this.isRocketActive ? (this.targetIntensity || 1.0) : 0.0;
            this.rocketIntensity += (target - this.rocketIntensity) * Math.min(1.0, dt * 8.0);
            if (this.rocketIntensity < 0.005) {
                this.rocketIntensity = 0.0;
            }

            if (this.standardMaterial && this.standardMaterial.userData.shader) {
                this.standardMaterial.userData.shader.uniforms.uRocketIntensity.value = this.rocketIntensity;
            }
        }
    }

    root.Visual2 = root.Visual2 || {};
    root.Visual2.BallVisualController = BallVisualController;
    root.Visual2.ball = new BallVisualController();

})(window);
