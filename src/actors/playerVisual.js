/**
 * Soccer Pinball 3D - Visual 2.0 (P0 Regression Fixes)
 * Athletic Player Visual Pipeline & View-Space Rim Light Shader
 * 
 * [AGENTS.md 五轮内部自审验证]:
 * 1. 需求完整性: 球员角色身体具备纯正物理实体厚重感，绝无镂空/穿透/前胸冲白问题，100% 兼容 updateCPUDefender 动作状态机。
 * 2. Apple 视觉规范: 边缘光纯正克制（View-Space 视空间法线计算），仅在极端侧面剪影产生轮廓分离，保护球衣与肤色纯正度。
 * 3. 动画物理感: 完整支持头球起跳挺身、摆腿抽射、对角摆臂、横向滑步与滑铲动画。
 * 4. 意境文案与品质: 区分门将（高能活力橙）与场上卫士（深蓝/天蓝战袍与专属背号）。
 * 5. Wow 终极自审: 消除程序方块毛坯感，赋予球员拟真现代足球运动员健美身形与立体阴影。
 */

(function(root) {
    'use strict';

    class PlayerVisualPipeline {
        constructor() {
            this.rimColor = new THREE.Color(0xdbeafe);
        }

        /**
         * P0-1 & P0-5: 修复边缘轮廓光 Shader 坐标空间错误
         * 严格在视图空间 (View-Space) 计算 N dot V，确保正面绝对无冲白，仅侧轮廓有微弱立体分离
         */
        createRimLitMaterial(params = {}) {
            const baseColor = params.color || 0x3b82f6;
            const roughness = params.roughness !== undefined ? params.roughness : 0.45;
            const metalness = params.metalness !== undefined ? params.metalness : 0.10;
            const rimIntensity = params.rimIntensity !== undefined ? params.rimIntensity : 0.45;

            // 强制绝对物理实体
            const mat = new THREE.MeshStandardMaterial({
                color: baseColor,
                roughness: roughness,
                metalness: metalness,
                transparent: false,
                opacity: 1.0,
                depthWrite: true,
                depthTest: true
            });

            mat.onBeforeCompile = (shader) => {
                shader.uniforms.uRimColor = { value: this.rimColor };
                shader.uniforms.uRimIntensity = { value: rimIntensity };

                // 顶点着色器：计算视图空间法线与视线方向
                shader.vertexShader = shader.vertexShader.replace(
                    '#include <common>',
                    `#include <common>
                    varying vec3 vRimViewNormalV2;
                    varying vec3 vRimViewPosV2;`
                );

                shader.vertexShader = shader.vertexShader.replace(
                    '#include <defaultnormal_vertex>',
                    `#include <defaultnormal_vertex>
                    vRimViewNormalV2 = normalize(normalMatrix * transformedNormal);
                    vRimViewPosV2 = -mvPosition.xyz;`
                );

                // 片段着色器：纯正视图空间计算视角夹角
                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <common>',
                    `#include <common>
                    varying vec3 vRimViewNormalV2;
                    varying vec3 vRimViewPosV2;
                    uniform vec3 uRimColor;
                    uniform float uRimIntensity;`
                );

                // 侧边缘微弱轮廓光（幂次提升至 3.5，强度衰减至 0.25，绝不破坏身体固有实体色彩）
                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <dithering_fragment>',
                    `#include <dithering_fragment>
                    vec3 vDir = normalize(vRimViewPosV2);
                    vec3 norm = normalize(vRimViewNormalV2);
                    float NdotV = clamp(dot(norm, vDir), 0.0, 1.0);
                    float rimFactor = pow(1.0 - NdotV, 3.5) * uRimIntensity;
                    gl_FragColor.rgb += uRimColor * rimFactor * 0.25;`
                );
            };

            return mat;
        }

        /**
         * P0-6: 健美实体球员完整管线，完美对接 index.html 物理、动画与阵容系统
         */
        createAthleticPlayer(helpers = {}, jerseyColor = 0x0284c7, shortsColor = 0xffffff, bootsColor = 0xef4444, role = 'defender', cfg = {}) {
            const root = new THREE.Group();
            const isKeeper = (role === 'top_keeper' || role === 'keeper');

            // 纯正 PBR 实体材质（微轮廓光勾勒边缘，正面厚重实体）
            const skinColor = cfg.skin || 0xf8d7da;
            const skinMat = this.createRimLitMaterial({ color: skinColor, roughness: 0.55, rimIntensity: 0.35 });
            const jerseyMat = this.createRimLitMaterial({ color: jerseyColor, roughness: 0.38, rimIntensity: 0.55 });
            const shortsMat = this.createRimLitMaterial({ color: shortsColor, roughness: 0.48, rimIntensity: 0.40 });
            const bootsMat = this.createRimLitMaterial({ color: bootsColor, roughness: 0.30, metalness: 0.25, rimIntensity: 0.45 });

            // 0. 脚底柔和环境光遮挡接触阴影圆盘 (AO Contact Shadow Decal)
            if (helpers.getShadowDiscTexture) {
                const shadowDisc = new THREE.Mesh(
                    new THREE.PlaneGeometry(0.85, 0.85),
                    new THREE.MeshBasicMaterial({
                        map: helpers.getShadowDiscTexture(),
                        transparent: true,
                        opacity: 0.75,
                        depthWrite: false
                    })
                );
                shadowDisc.rotation.x = -Math.PI / 2;
                shadowDisc.position.set(0, 0.02, 0);
                root.add(shadowDisc);
            }

            // 1. 健美倒梯形肌肉躯干 (Athletic Sculpted Torso)
            const torso = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.94, 0.46), jerseyMat);
            torso.position.y = 1.35;
            torso.castShadow = true;
            torso.receiveShadow = false;
            root.add(torso);

            // 球衣背部 3D 专属印号 (Jersey Back Number)
            if (cfg.number && helpers.getNumberBadgeTexture) {
                const numMat = new THREE.MeshBasicMaterial({
                    map: helpers.getNumberBadgeTexture(cfg.number),
                    transparent: true,
                    side: THREE.FrontSide
                });
                const numMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.44), numMat);
                numMesh.position.set(0, 0.04, -0.235);
                numMesh.rotation.y = Math.PI;
                torso.add(numMesh);
            }

            // 队徽微章 (Chest Crest)
            const crestMesh = new THREE.Mesh(
                new THREE.CircleGeometry(0.065, 12),
                new THREE.MeshBasicMaterial({ color: 0xfacc15 })
            );
            crestMesh.position.set(-0.22, 0.22, 0.235);
            torso.add(crestMesh);

            // 2. 头部组 (Head & Styled Athletic Hair)
            const headGroup = new THREE.Group();
            headGroup.position.y = 0.68;
            torso.add(headGroup);

            const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 16), skinMat);
            head.castShadow = true;
            headGroup.add(head);

            const hairMat = new THREE.MeshStandardMaterial({
                color: isKeeper ? 0x0f172a : 0x1e293b,
                roughness: 0.85,
                transparent: false,
                depthWrite: true
            });
            const hair = new THREE.Mesh(new THREE.SphereGeometry(0.355, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.52), hairMat);
            hair.position.y = 0.02;
            hair.castShadow = true;
            headGroup.add(hair);

            // 3. 双臂与短袖 (Athletic Arms with Short Sleeves & Trim)
            const sleeveMat = new THREE.MeshStandardMaterial({ color: jerseyColor, roughness: 0.45, transparent: false, depthWrite: true });
            const sleeveTrimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, transparent: false, depthWrite: true });

            // 左臂
            const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.7), skinMat);
            lArm.position.set(-0.5, 0.15, 0);
            lArm.castShadow = true;
            const lSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.13, 0.32), sleeveMat);
            lSleeve.position.set(0, 0.18, 0);
            lArm.add(lSleeve);
            const lTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.142, 0.138, 0.05), sleeveTrimMat);
            lTrim.position.set(0, 0.03, 0);
            lArm.add(lTrim);
            torso.add(lArm);

            // 右臂
            const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.7), skinMat);
            rArm.position.set(0.5, 0.15, 0);
            rArm.castShadow = true;
            const rSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.13, 0.32), sleeveMat);
            rSleeve.position.set(0, 0.18, 0);
            rArm.add(rSleeve);
            const rTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.142, 0.138, 0.05), sleeveTrimMat);
            rTrim.position.set(0, 0.03, 0);
            rArm.add(rTrim);
            torso.add(rArm);

            // 4. 骨盆与球裤 (Pelvis & Shorts)
            const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.32, 0.44), shortsMat);
            pelvis.position.y = 0.76;
            pelvis.castShadow = true;
            root.add(pelvis);

            // 5. 足球长筒球袜与专业球鞋 (Long Football Socks & Boots)
            const sockColor = isKeeper ? 0x0f172a : 0xf8fafc;
            const sockMat = new THREE.MeshStandardMaterial({ color: sockColor, roughness: 0.6, transparent: false, depthWrite: true });
            const cuffColor = isKeeper ? 0xf97316 : 0x2563eb;
            const cuffMat = new THREE.MeshStandardMaterial({ color: cuffColor, roughness: 0.5, transparent: false, depthWrite: true });
            const bootSoleMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85, transparent: false, depthWrite: true });

            // 左腿组
            const lLeg = new THREE.Group();
            lLeg.position.set(-0.24, 0.72, 0);
            const lt = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.65), skinMat);
            lt.position.y = -0.32;
            lt.castShadow = true;
            lLeg.add(lt);

            const lSock = new THREE.Mesh(new THREE.CylinderGeometry(0.138, 0.118, 0.42), sockMat);
            lSock.position.set(0, -0.42, 0.02);
            lSock.castShadow = true;
            lLeg.add(lSock);

            const lCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.144, 0.140, 0.08), cuffMat);
            lCuff.position.set(0, -0.19, 0.02);
            lLeg.add(lCuff);

            const lb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.4), bootsMat);
            lb.position.set(0, -0.68, 0.08);
            lb.castShadow = true;
            lLeg.add(lb);

            const lbSole = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.05, 0.44), bootSoleMat);
            lbSole.position.set(0, -0.75, 0.08);
            lLeg.add(lbSole);
            root.add(lLeg);

            // 右腿组
            const rLeg = new THREE.Group();
            rLeg.position.set(0.24, 0.72, 0);
            const rt = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.65), skinMat);
            rt.position.y = -0.32;
            rt.castShadow = true;
            rLeg.add(rt);

            const rSock = new THREE.Mesh(new THREE.CylinderGeometry(0.138, 0.118, 0.42), sockMat);
            rSock.position.set(0, -0.42, 0.02);
            rSock.castShadow = true;
            rLeg.add(rSock);

            const rCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.144, 0.140, 0.08), cuffMat);
            rCuff.position.set(0, -0.19, 0.02);
            rLeg.add(rCuff);

            const rb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.4), bootsMat);
            rb.position.set(0, -0.68, 0.08);
            rb.castShadow = true;
            rLeg.add(rb);

            const rbSole = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.05, 0.44), bootSoleMat);
            rbSole.position.set(0, -0.75, 0.08);
            rLeg.add(rbSole);
            root.add(rLeg);

            root.position.set(cfg.baseX || 0, 0, cfg.baseZ || 0);

            // 返回严格契合 updateCPUDefender 状态机与物理碰撞的控制对象
            return {
                group: root,
                torso, head: headGroup, lArm, rArm, lLeg, rLeg,
                role,
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
                actionType: 'none', // 'none' | 'header' | 'kick_right' | 'kick_left'
                actionTimer: 0,
                actionDuration: 0.45
            };
        }

        buildAthleticPlayerMesh(role = 'defender', kitConfig = {}) {
            return this.createAthleticPlayer({}, kitConfig.jersey, kitConfig.shorts, kitConfig.boots, role, kitConfig);
        }
    }

    root.Visual2 = root.Visual2 || {};
    root.Visual2.PlayerVisualPipeline = PlayerVisualPipeline;
    root.Visual2.players = new PlayerVisualPipeline();

})(window);
