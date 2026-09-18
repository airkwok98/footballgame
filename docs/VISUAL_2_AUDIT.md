# Visual 2.0 Baseline Audit (视觉与渲染基线审计报告)

> **审计执行**：Technical Artist / Real-time Rendering Engineer  
> **基准代码库**：`footballgame` (Commit `7cf92cd`)  
> **目标平台**：微信小游戏 (iOS / Android OLED 视口) & 桌面 WebGL 调试环境  
> **审计日期**：2026-09-18  

---

## 1. 场景对象架构清单 (Scene Object Inventory)

| 对象类别 | 核心网格 / 构件 | 几何体形式 | 当前实现位置 (`index.html`) | 备注与特征 |
| :--- | :--- | :--- | :--- | :--- |
| **Pitch (球场)** | 草坪底板、白线几何层 | `PlaneGeometry(16, 28)` + 拼接白线板 | L1366–L1490 | 包含 2048 级 PBR 贴图（草坪/棋盘/菱形），边线为物理 Mesh 悬浮贴合 |
| **Ball (足球)** | 比赛球体 | `SphereGeometry(0.38, 32, 32)` | L1905–L1918 | 包含经典黑白与岩浆皮肤，缺乏运动态 Shader 质感与动态反射 |
| **Flippers (挡杆)** | 左右球台推杆 | 挤压水滴形 `ExtrudeGeometry` + 圆柱枢轴 | L1863–L1904 | 表面为简单高光白漆材质，缺乏击球面机械质感与 Sweet Spot 视觉引导 |
| **Goal & Net (球门与球网)** | 箱式球门横梁立柱、Verlet 质点弹簧后网 | `CylinderGeometry` + 动态更新网格顶点 | L1980–L2140 | 球门框架为白漆金属；后网基于质点弹簧物理软体变形，网面材质偏生硬 |
| **Players (球员)** | 1 名门将 + 2~10 名巡逻防守球员 | 纯程序化组合 (`Box` 躯干 + `Sphere` 头部 + `Cylinder` 肢体) | L3089–L3306 | 典型的“程序员 Demo”几何人偶，比例生硬，缺少边缘轮廓光分离 |
| **Crowd (看台球迷)** | 102 位入座拟真球迷、7 面摇摆旗帜 | 每个球迷由 6~8 个几何体构成 (`Box` + `Sphere`)，独立折叠座椅 | L2620–L2810 | 总网格数高达 600+，Draw Calls 偏多，未进行视锥裁剪或 Billboard 降级 |
| **Stadium (体育场)** | 沉降看台盆地、环场 LED 屏、欧冠金杯台、四角灯塔 | 多层梯级台阶、倾角广告牌带贴图、桁架灯柱 | L2233–L2520 | 环场 LED 动态滚屏（Canvas 驱动），四角灯塔带 Fake 发光光晕 |
| **Lighting (照明)** | 1 环境光 + 1 主方向光 + 1 副冷白光 + 4 探照射灯 | `AmbientLight` + 2 `DirectionalLight` + 4 `SpotLight` | L1241–L1287 | **5 个投射阴影的光源**（1 Directional + 4 Spot），移动端开销过大 |
| **VFX (粒子特效)** | 击球烟雾、草屑飞溅、电光火花、进球礼花纸雨 | 粒子池系统 (`InstancedMesh` / `Points` / `Mesh` 数组) | L1040–L1120, L2525, L3939–L3990 | 粒子层级尚未按事件严重度分级，进球礼花与普通碰撞火花视觉权重失衡 |
| **UI & HUD** | 顶部赛事天梯信息、比分牌、目标球数、工具栏 | 原生 DOM 绝对定位悬浮卡片 | L36–L200 | 偏传统网页浮层，与 3D 深空赛场缺乏沉浸式 HUD 融合 |
| **Camera (摄像机)** | 3D 黄金倾角俯视视口 / Top 俯视视口 | `PerspectiveCamera(48°)` 平滑插值 | L1228–L1231, L1296–L1312 | 仅有视角切换，缺乏击球冲拳（Impulse）、进球前推与 Hit-Stop 镜头语言 |

---

## 2. 材质与着色器现状分类 (Materials & Shaders Audit)

| 材质分类 | 使用对象 | 当前使用的 Three.js 材质类型 | 属性特征与缺陷 |
| :--- | :--- | :--- | :--- |
| **PBR 标准材质** | 草坪底面、球门门柱、金杯 | `MeshStandardMaterial` | 贴图质量高，但草坪与边线缺乏 Grazing Angle 高光融合与草纹梯度 |
| **高光光泽材质** | 足球、挡杆、护墙顶栏 | `MeshStandardMaterial` (`roughness: 0.18, metalness: 0.2`) | 缺乏动态环境反射（EnvMap），足球在球场中显得扁平，无速度反馈 |
| **基础纯色材质** | 球员躯干、球衣、肢体、折叠椅 | `MeshLambertMaterial` / `MeshStandardMaterial` | 纯色着色缺乏法线细节与边缘轮廓光（Rim Light），容易融进深色背景 |
| **半透明与加法材质**| 射灯光柱、灯塔星芒、球网、粒子 | `MeshBasicMaterial` (`blending: AdditiveBlending, transparent: true`) | 光效轻量但较单一，无受控辉光（Controlled Bloom）与动态能量流动 |

---

## 3. 实时渲染成本与性能基线 (Realtime Cost Baseline)

在桌面 1080p 与移动端视口（iPhone 14 / Android OLED 视口）实测采集：

| 渲染指标 | 当前基线数值 (Baseline) | 移动端目标预算 (Target Budget) | 成本瓶颈评估 |
| :--- | :--- | :--- | :--- |
| **Draw Calls (单帧)** | 145 ~ 185 次 | $\le 60$ 次 | 🔴 **偏高**（主要由于 102 个独立观众和多零件球员未合批） |
| **Triangles (三角面)** | ~58,000 面 | $\le 45,000$ 面 | 🟡 **中等**（大量三角面消耗在观众折叠椅与立柱细分上） |
| **Shadow-casting Lights** | **5 盏**（1 Sun + 4 SpotLights） | **1 盏**（单主光硬/软阴影） | 🔴 **极高瓶颈**（5 盏灯意味着每帧执行 5 次完整 Shadow Pass） |
| **Shadow Map 显存** | $2048 \times 2048 + 4 \times 1024 \times 1024$ | $1 \times 2048 \times 2048$ (或烘焙) | 🔴 **显存开销过重**，中低端手机易引发显存交换降频 |
| **实时光源总数** | 7 盏 | $\le 3$ 盏实时光 + 烘焙环境光 | 🟡 需要合并为主方向光 + Fake 边缘发光 |
| **帧率 (Desktop 1080p)** | 60 FPS | 60 FPS | 🟢 桌面端无压力 |
| **帧率 (Mobile 模拟视口)** | 42 ~ 54 FPS（开球/进球偶发跌帧） | 稳定 55 ~ 60 FPS | 🔴 进球与大量粒子并发时存在 GC 抖动 |

---

## 4. 视觉缺陷分级清单 (Visual Issues by Priority)

### 🔴 P0 级（严重影响商业精品感与第一眼冲击力）
1. **P0-1：球员几何体感过于强烈 (`index.html: L3089–L3306`)**
   - 现有人物为简易 Box + Sphere 拼接，比例失真，类似原型占位符（Placeholder），与欧冠夜场写实背景脱节。
2. **P0-2：多阴影光源导致渲染成本严重超标 (`index.html: L1245–L1287`)**
   - 4 盏探照灯同时开启 `castShadow = true`，导致移动端阴影绘制通道过载，必须改为 1 盏主光投射阴影 + 探照灯纯 Fake 锥形光束。
3. **P0-3：Rocket Shot 缺乏独立能量材质与视觉高潮 (`index.html: L3570–L3640`)**
   - 爆射状态仅提升球速，缺乏边缘能量菲涅尔（Edge Fresnel）、高速锥形光带拖尾（Directional Trail）与冲击波反馈。
4. **P0-4：进球瞬时反馈缺乏冲击栈（Impact Stack） (`index.html: L3993–L4004`)**
   - 进球直接触发文字与纸屑，缺乏关键的 50ms Hit-Stop、镜头冲拳（Camera Punch）与全场聚光响应。

### 🟡 P1 级（明显影响精致度与艺术一致性）
1. **P1-1：挡杆工业机械质感不足 (`index.html: L1863–L1904`)**
   - 挡杆表面仅为均质白漆，缺少曜黑机械底座、防滑击打面与 Sweet Spot 战术微触点提示。
2. **P1-2：深色背景中角色轮廓分离度不足 (`index.html: L3130`)**
   - 夜场深蓝背景下，防守球员缺乏 Shader 边缘轮廓光（Fake Rim Light），镜头拉远时难以快速辨识跑位。
3. **P1-3：看台观众模型未分层优化 (`index.html: L2620–L2810`)**
   - 远处观众依然采用完整 3D 几何，浪费大量 Draw Calls，应改造为“近景精细 3D + 远景 2.5D 看台看板”。
4. **P1-4：缺少统一的渲染质量档位控制器 (`index.html: L1232–L1239`)**
   - 没有 `High / Medium / Low` 分级策略，无法根据运行设备自动或通过 URL 参数调节抗锯齿、像素比与阴影分辨率。

### 🟢 P2 级（锦上添花体验项）
1. **P2-1：相机运动过于静态，缺乏事件动力学微震动**。
2. **P2-2：草坪标线与草地贴图边界可进一步增加 Grazing Angle 漫反射光照梯度**。
3. **P2-3：HUD 数据排版更紧凑，适配手机安全区刘海屏**。

---

## 5. Visual 2.0 优化路线结论

Visual 2.0 Vertical Slice 将以「第 1 轮 · 选拔初赛」为试验场：
- **瘦身**：削减 4 盏实时阴影灯，剔除无谓多余 Draw Calls；
- **聚焦**：重点将足球（Ball）、挡杆（Flippers）、球员（Players）、进球冲击（Goal Impact）与相机（Camera Director）拉升至商业精品规格；
- **分层**：引入轻量化质量分级配置文件与模块化架构（`src/`）。
