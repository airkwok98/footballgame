# Visual 2.0 Implementation (实施与架构改造技术文档)

> **工程实施**：Technical Artist / Real-time Rendering Engineer  
> **代码库**：`footballgame` (Visual 2.0 Vertical Slice)  
> **实施范围**：第 1 轮 · 选拔初赛 (Stage 0) 标杆切片与模块化渲染管线  

---

## 1. 架构改造理念：渐进式模块化 (Incremental Refactor)

为告别单文件 `index.html` 过于臃肿的弊端，同时避免大规模重构破坏既有物理碰撞与手感，Visual 2.0 确立了 **“先抽新视觉系统，旧核心平稳桥接”** 的演进原则。

新增架构统一收拢至 `src/` 模块目录，对外暴露清晰的零耦合接口，并全面适配微信小游戏运行环境：

```text
footballgame/
├── docs/
│   ├── VISUAL_2_AUDIT.md            # 视觉与性能基线审计
│   ├── VISUAL_2_ART_DIRECTION.md    # 顶级夜场足球街机美学规范
│   ├── VISUAL_2_IMPLEMENTATION.md   # 本技术实施方案
│   ├── VISUAL_2_PERFORMANCE.md      # 性能分级与压测报告
│   └── COCOS_MIGRATION_EVALUATION.md# 微信小游戏生态跨引擎深度评估
├── src/
│   ├── rendering/
│   │   ├── quality.js               # 渲染质量档位控制器 (?quality=high|med|low&debug=1)
│   │   └── postprocessing.js        # 受控辉光、曝光脉冲与暗角滤镜
│   ├── camera/
│   │   └── cameraDirector.js        # 相机镜头导演 (微震、冲拳、进球推镜)
│   ├── materials/
│   │   ├── ballMaterial.js          # PBR 足球与 Rocket Shot 菲涅尔能量着色器
│   │   └── flipperMaterial.js       # 曜黑阳极氧化铝机械挡杆与击球瞬态闪烁
│   ├── actors/
│   │   ├── playerVisual.js          # 健美球员模型与 GLSL Fake Rim Light 轮廓光
│   │   └── stadiumCrowd.js          # 2.5D 体育场看台观众分层系统
│   └── effects/
│       └── goalImpactStack.js       # 进球全阶段多维冲击栈调度器
└── index.html                       # 纯净挂载入口与主循环桥接
```

---

## 2. 核心模块实现详解

### 2.1 质量档位与成本控制 (`src/rendering/quality.js`)
* **三档质量预设**：
  - **High**：桌面与旗舰 OLED 手机（`pixelRatio: 2.0`, `PCFSoft` 软阴影, 2048 分辨率, 启用 ACES ToneMapping 与受控曝光脉冲）。
  - **Medium**：主流手机（`pixelRatio: 1.5`, 1024 阴影, 粒子缩放 0.75）。
  - **Low**：低功耗与长续航（`pixelRatio: 1.0`, 关闭实时阴影, 极简粒子）。
* **轻量级性能调试器 (Debug Overlay)**：
  - 触发方式：URL 带 `?debug=1` 或键盘按下反引号 `` ` `` / `F3`。
  - 实时呈现：FPS、帧耗时（ms）、Draw Calls、Triangles、Shadow Passes 以及几何体/贴图显存统计。

### 2.2 阴影通道瘦身与照明 2.0 (`index.html: initThree`)
* **痛点根治**：旧版 4 盏探照灯同时开启 `castShadow = true`，单帧执行 5 次阴影贴图生成通道，移动端 GPU 负载过重。
* **单 Shadow Pass 铁律**：将 4 盏探照灯的 `castShadow` 设为 `false`，仅保留 1 盏主漫射太阳光投射柔和阴影，4 盏探照灯专注于提供立体高光照射与 Fake 锥形光束（Light Cones），**阴影计算开销降低 80%**。

### 2.3 足球 PBR 与爆射能量着色器 (`src/materials/ballMaterial.js`)
* **常态巡航**：高保真皮革表面，粗糙度 `0.35`，金属度 `0.15`，环境反射强度 `0.85`，绝不自发光。
* **Rocket Shot 爆击态**：
  - 通过 `onBeforeCompile` 注入 GLSL 顶点与片元着色器；
  - 实时计算视线与法线夹角生成锐利的边缘菲涅尔金光（`#fbbf24`），配合内部金色核心能量；
  - 尾部跟随一条高帧率能量光带（Quad Line Strip），球速越快光带张力越强。

### 2.4 机械挡杆质感升维 (`src/materials/flipperMaterial.js`)
* **深色高强度主体**：曜黑阳极氧化铝与碳纤维质感（`color: 0x1e293b, metalness: 0.82, roughness: 0.28`）。
* **镀铬转轴衬套**：中心枢轴采用纯粹镜面镀铬（`metalness: 0.95, roughness: 0.12`）。
* **毫秒级触碰高亮**：球体击中瞬间，根据是否命中 Sweet Spot 分别触发金色或青蓝色毫秒级光能脉冲。

### 2.5 角色边缘轮廓光 (`src/actors/playerVisual.js`)
* **解决痛点**：深色看台背景下球员易被吞没。
* **Fake Rim Light 机制**：无需为球员添加昂贵的实时光源，直接在着色器层通过 `pow(1.0 - dot(viewDir, normal), 2.5)` 叠加一层冷白轮廓光（`#dbeafe`），在任何光照角度下角色边缘始终立体突出。

### 2.6 相机导演与进球冲击栈 (`src/camera/cameraDirector.js`, `src/effects/goalImpactStack.js`)
* **Sweet Spot 击打**：微量 `0.12` 相机冲量振动。
* **Rocket Shot 爆射**：FOV 微缩（Zoom Punch）向后推背感。
* **Goal 进球冲击栈**：
  1. 足球越过门线；
  2. 50ms 极短冻结（Hit Stop）；
  3. 相机平滑前推 `1.8m` 聚焦球网深陷形变；
  4. 触发全屏受控曝光/辉光脉冲；
  5. 看台全场起立欢呼；
  6. 抛洒 3D 金色双面礼花纸雨；
  7. 相机平滑回退至黄金常规俯视位。
