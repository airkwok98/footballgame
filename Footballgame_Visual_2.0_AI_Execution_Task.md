# Footballgame Visual 2.0 — AI 直接执行任务书

> 项目仓库：`https://github.com/footballgame-dev/footballgame.git`  
> 当前主分支：`main`  
> 当前产品形态：Three.js / WebGL 网页版原型  
> 最终目标平台：**微信小游戏 / 微信小程序生态中的小游戏端**  
> 当前网页端定位：仅作为开发、调试、快速体验与视觉验证环境，不是最终主战场。  
> 本任务优先级：**视觉升级 > 玩法新增 > 功能扩展**

---

## 0. 你的角色

你现在不是“继续往现有页面上加一些特效”的普通前端工程师。

你要同时承担以下角色：

- Technical Artist / 技术美术
- Real-time Rendering Engineer / 实时渲染工程师
- Game Visual Director / 游戏视觉导演
- Three.js / WebGL 工程师
- Mobile Performance Engineer / 移动端性能工程师
- AI-assisted Game Developer / AI 辅助游戏开发工程师

你的任务是：

> 在不破坏现有核心玩法的前提下，把目前带有明显“程序 Demo 感”的 Soccer Pinball 3D，升级成一款第一眼看上去更接近商业精品网页游戏 / 精品微信小游戏的 Visual 2.0 版本。

---

# 1. 项目背景

当前项目名：

**Soccer Pinball 3D / 3D 绿茵足球弹珠赛**

当前核心技术：

- Three.js
- WebGL
- 原生 HTML / JS
- 单文件 `index.html` 为主要运行入口
- 程序化几何体
- PBR 草坪
- 实时灯光
- 粒子
- 球网 Verlet 软体
- AI 防守球员
- Tournament 晋级系统
- Sweet Spot / Rocket Shot
- Ball Saver
- Combo
- 3D / Top Camera
- 音效
- 观众
- LED
- Confetti

当前仓库已经具有完整可玩闭环。

**本轮不要重做玩法。**

之前讨论过的以下 Gameplay 2.0 想法先保留，但本任务不要优先开发：

- 防守球员被突破 / 失位
- 足球化 Power-up
- 每关独立机制
- Multi-ball
- Combo 重构
- 场景机关化
- Roguelite / Arcade Football Pinball 方向

本轮核心任务只有一个：

# **Visual 2.0**

---

# 2. 视觉参考

重点学习以下两个参考：

1. X / Twitter：
   `https://x.com/chrisjdimarco/status/2100652900212953327?s=20`

2. ARK / 22 — Utopia Breaker：
   `https://arkanoid-utopia-22.chipchaunceytheonlyone.chatgpt.site/`

不要机械复制它们的颜色、题材或具体资产。

要学习的是：

- 统一的 Art Direction
- 画面层次
- 色彩控制
- Lighting
- Shader
- Bloom
- Post-processing
- VFX
- Camera Language
- Motion
- Impact Feedback
- UI 与 3D 场景融合
- 材质高级感
- “少量元素但质感集中”的做法

目标不是变成科幻打砖块。

目标是：

> 保留“足球 + 弹珠 + 顶级夜场赛事”的主题，同时做到参考作品那种统一、舒服、高级、具有视觉冲击力的实时游戏表现。

---

# 3. 最终平台约束

最终主要运行平台是：

# **微信小游戏**

所以不要用桌面 PC 的性能预算设计最终方案。

但当前开发阶段仍然以浏览器 Three.js 版本为视觉试验场。

必须遵守以下原则：

## 3.1 实时只留给真正需要实时的内容

适合实时：

- 足球
- 双挡杆
- 门将 / 防守球员
- 球门
- 球网
- 关键 VFX
- 少量关键动态灯光
- Camera
- Gameplay Feedback

适合烘焙 / 假实时：

- 看台
- 大量观众
- 大部分体育场结构
- 背景
- 环境光
- 大面积阴影
- 远景
- 装饰
- 氛围光
- 部分反射

优先考虑：

- Lightmap
- Cubemap
- Environment Map
- Billboard
- Sprite
- Impostor
- Pre-baked Texture
- PBR Texture
- LOD
- Texture Atlas

## 3.2 目标性能

Visual 2.0 开发版至少同时保留：

- Desktop High
- Mobile Medium
- Mobile Low

三档质量级别的设计可能性。

最终目标：

- 中高端手机：尽量稳定 50–60 FPS
- 普通手机：稳定 30 FPS 以上
- 不为了一个不重要的视觉效果让 GPU 成本失控

任何特效都必须考虑：

> 这个效果对“玩家第一眼感知到的品质提升”是否值得它的性能成本？

---

# 4. 当前最主要的问题

请先自行完整阅读仓库，不要只看 README。

重点阅读：

- `README.md`
- `index.html`
- `assets/`
- `build_audio.py`
- `build_pitch_patterns.py`
- 最近的 commit history

重点定位以下现状：

## 4.1 程序化几何感过强

当前人物大量使用：

- `BoxGeometry`
- `SphereGeometry`
- `CylinderGeometry`

这会让画面即使叠加灯光和粒子，仍然偏“程序员 Demo”。

Visual 2.0 应逐步转向：

- GLB / GLTF 游戏资产
- 更合理的低模
- 更统一的人物比例
- 正确 UV
- PBR BaseColor
- Normal
- Roughness
- AO
- Emissive（必要时）

## 4.2 画面元素很多，但 Art Direction 不够集中

当前同时存在：

- 写实足球
- 欧冠 / 世界杯
- 真实草坪
- 金色冠军元素
- 蓝色霓虹
- 科技感
- 街机感
- 粒子
- 拟真人
- 纸屑
- UI Toast

需要建立统一规则。

---

# 5. Visual 2.0 推荐 Art Direction

不要直接复制参考游戏。

为 footballgame 建议采用：

# **Premium Night Football Arcade**

关键词：

- 顶级夜场足球
- 深蓝黑背景
- 冷白主照明
- 少量电光青蓝
- 少量冠军金
- 强轮廓
- 高对比
- 高级而非廉价霓虹
- 比 FIFA 更街机
- 比普通街机更写实
- 科技感只作为“赛事包装”和“击球能量反馈”

推荐主色体系：

- Deep Navy / Slate Black
- Stadium White
- Electric Cyan / Azure
- Champion Gold
- 少量 Warning Red

禁止：

- 全屏五颜六色
- 所有对象都发光
- 滥用 Bloom
- 大量彩虹粒子
- UI 每次碰撞都弹字
- 过度赛博朋克
- 把足球主题改成科幻主题

---

# 6. 第一阶段：建立 Visual Baseline

正式修改前，先完成以下审计。

输出：

`docs/VISUAL_2_AUDIT.md`

必须记录：

## 6.1 当前场景对象

列出：

- Pitch
- Ball
- Flippers
- Goal
- Net
- Players
- Crowd
- Stadium
- LED
- Lights
- Shadows
- Particles
- UI
- Camera

## 6.2 当前材质

记录主要对象目前使用：

- MeshBasicMaterial
- MeshStandardMaterial
- Texture
- Normal
- Roughness
- AO
- Transparent
- Additive

## 6.3 当前实时成本

至少统计：

- Draw Calls
- Triangles
- Geometries
- Textures
- Lights
- Shadow-casting Lights
- Shadow Map
- Pixel Ratio
- Particle Count
- Crowd Count
- Net Particle / Spring Count

可在开发模式增加 Debug Panel。

## 6.4 当前视觉问题

请按以下等级标记：

- P0：严重影响商业感
- P1：明显影响品质
- P2：锦上添花

不要泛泛描述。

必须指出具体对象和具体代码位置。

---

# 7. 第二阶段：先制作“第一关 Visual Vertical Slice”

## 非常重要

不要直接改完全部 8 关。

先只把：

# **第 1 轮 · 选拔初赛**

制作成 Visual 2.0 Vertical Slice。

只有第一关达到目标，后续才复制到全项目。

---

# 8. Visual 2.0 核心升级模块

---

## 8.1 足球 Ball

当前足球应该从“普通贴图球”升级成视觉焦点之一。

目标：

- 高质量球面材质
- 正确 Roughness
- 微弱 Normal
- 清晰但不过曝的 Stadium Reflection
- 高速状态下的视觉反馈
- Rocket Shot 状态拥有独立 Shader / Material State

普通状态：

- 写实足球
- 清晰皮革层次
- 少量反射
- 不发光

Rocket Shot：

- 内核 Energy
- Edge Fresnel
- Emissive
- Directional Trail
- 高速尾迹
- Impact Ring
- 短暂 Bloom Pulse

禁止：

- 常态足球变成发光球
- 过强火焰
- 全程长尾巴

---

## 8.2 Flippers / 挡杆

当前挡杆需要从“几何体工具”升级成：

> 足球场机械装置 + 高端街机装置

视觉建议：

- 深色高强度主体
- 金属 / 碳纤维 / 烤漆材质
- 击球面采用亮色足球主题纹理
- 边缘可有非常轻微的 Emissive
- 运动时有 Motion Accent
- Sweet Spot 区域可通过材质或细小标记表达

不要做成传统弹珠机塑料挡板。

---

## 8.3 球员 Player

这是最大升级项之一。

现有 Box / Sphere / Cylinder 人物只是 placeholder。

Visual 2.0 要准备：

- 一个高质量但移动端友好的 low-poly 足球运动员基础模型
- 门将与普通球员至少有视觉区分
- 可重复换球衣颜色
- 可显示号码
- 能支持基础骨骼动作

推荐预算（仅参考，执行时可测试调整）：

- 近场核心球员：约 4k–12k tris
- 非核心球员：约 2k–6k tris
- 远景：LOD / impostor

注意：

不要求人物脸达到 FIFA。

因为当前镜头距离不值得。

重点是：

- 身体比例
- 动作
- 球衣
- 轮廓
- 阴影
- 光照
- 跑动自然度

如果无法自动生成最终可用 GLB：

先建立正式 Asset Pipeline 和 placeholder GLB，不要继续无限堆 primitive。

---

## 8.4 Pitch / 草坪

目标：

> 不增加真实草叶几何数量，也能让草坪看起来更像商业游戏。

建议：

- 高质量 BaseColor
- Normal
- Roughness
- AO
- Detail Normal
- 边线与草坪材质融合
- Grazing Angle 高光
- 轻微方向性草纹
- Stadium Light Gradient

不要：

- 大量真实草叶 Mesh
- 重型 displacement
- 手机端昂贵 parallax

---

## 8.5 Goal / 球门

保留当前球网物理优势。

升级：

- 门柱 PBR
- 金属 / 高光白漆
- Light Reflection
- 更真实网线材质
- 合理 Transparency
- Net Impact 局部高光变化

进球瞬间：

- 网面形变
- 短促 Impact Flash
- Bloom Pulse
- Sound
- Camera
- Very Short Hit Stop

形成一个完整的 Impact Stack。

---

# 9. Lighting 2.0

不要再靠增加更多实时灯来提升品质。

重构思路：

## 9.1 主光

- 1 个主方向光 / Stadium Key Light

## 9.2 辅助光

- 少量实时 fill / rim

## 9.3 体育场灯

视觉上可以很多，
真正实时计算不能很多。

优先：

- emissive fixtures
- light cones
- pre-baked illumination
- fake volumetric beams

## 9.4 Character Rim Light

足球运动员需要从深色背景中分离。

可考虑：

- Shader Rim
- Fresnel
- Fake Rim

而不是每个球员增加一盏灯。

---

# 10. Shader 2.0

建立统一 Shader / Material 系统。

至少探索：

## Core

- Fresnel
- Rim
- Emissive
- Energy Flow
- Impact Flash

## Event Shader

只在事件期间出现：

- Rocket Shot
- Goal
- Ball Saver
- Promotion

避免永久特效。

如果使用自定义 GLSL：

必须：

- 可开关
- 可降级
- Mobile fallback
- 避免重型循环
- 避免大面积高频透明 overdraw

---

# 11. Post-processing 2.0

请建立可配置后处理链。

优先级：

## P0

- Tone Mapping
- Color Grading
- Controlled Bloom
- Vignette

## P1

- FXAA / SMAA 或兼容方案
- SSAO（视性能决定）
- Mild Sharpen

## Event-only

- Chromatic Aberration
- Radial Blur
- Exposure Pulse
- Camera Shake
- Hit Stop

谨慎：

- Motion Blur
- DOF

这些只允许在短时镜头或高配模式使用。

---

# 12. Camera Language 2.0

目前 camera 不应该只是：

- 3D
- Top

还应该成为视觉反馈系统的一部分。

普通比赛：

- 稳定
- 清晰
- 视觉舒适
- 足球和挡杆始终可判断

Sweet Spot：

- 轻微 camera impulse

Rocket Shot：

- FOV micro punch
- subtle follow
- stronger shake

Goal：

建议序列：

1. 球越过门线
2. 极短 hit-stop
3. Camera push
4. 网面冲击
5. Exposure/Bloom pulse
6. Crowd reaction
7. Confetti
8. Camera ease back

整个过程不要影响玩家重新开始下一球。

---

# 13. VFX 2.0

现在的烟雾、火花、草屑不能继续无限叠加。

需要建立统一 VFX Language。

定义：

## Level 0

普通碰撞

- 几乎无视觉特效
- 声音即可

## Level 1

挡杆击球

- 小冲击
- 少量 turf / dust

## Level 2

Sweet Spot

- Impact ring
- short trail
- stronger sound

## Level 3

Rocket Shot

- energy trail
- rim glow
- controlled bloom
- camera impulse

## Level 4

Goal

- net impact
- goal flash
- crowd
- confetti
- camera

## Level 5

Promotion / Champion

- 最大庆典

原则：

> 越重要的事件，视觉反馈越大。

普通碰撞不要抢进球的戏。

---

# 14. UI 2.0

UI 必须逐步从：

“网页按钮 + 游戏画面”

变成：

“游戏 HUD”。

建议：

- 统一字体体系
- 统一圆角
- 统一透明度
- 统一蓝 / 金
- 更轻、更少
- 不挡球门
- 不挡球轨迹
- 手机安全区适配

右上角工具按钮在最终微信版本中需要重新评估。

开发版可以保留。

最终版：

- 非比赛功能应尽量放到 Pause/Menu
- 比赛 HUD 只保留最重要信息

---

# 15. 体育场 Stadium

不要追求完整 3D 体育场。

目标：

# **2.5D Premium Stadium**

推荐：

前景：

- 球场
- 球门
- 球员
- 必要近景结构

中景：

- 低模看台
- LED
- 少量 3D Crowd

远景：

- High-quality baked stadium backdrop
- panoramic environment
- billboard crowd
- pre-baked lights

这样比全部实时建模：

- 更漂亮
- 更稳定
- 更省性能
- 更适合微信小游戏

---

# 16. Crowd 优化

当前 100+ 拟真人全部作为完整 3D 对象不是最终方向。

改为分层：

## Layer A

前排少量 3D Crowd

## Layer B

中距离低模 / instanced

## Layer C

远处 Billboard / Texture

Goal Reaction：

不要让所有观众都运行复杂骨骼。

可：

- GPU vertex motion
- billboard animation
- texture flipbook
- simple transform

---

# 17. Performance Budget

每次视觉升级必须记录性能变化。

建立：

`docs/VISUAL_2_PERFORMANCE.md`

至少记录：

- Before / After FPS
- Draw Calls
- Triangles
- Texture Memory Estimate
- Shadow Cost
- Particle Cost
- Renderer Pixel Ratio

建议增加：

```text
?quality=high
?quality=medium
?quality=low
?debug=1
```

方便测试。

---

# 18. 资源策略

允许使用：

- AI 生图
- AI Texture
- AI 3D
- Blender
- GLTF / GLB
- CC0 / 合规可商用资产
- 程序化生成
- 自建 Shader

禁止：

- 未确认版权的 FIFA / UEFA / EA / Club 商业资产
- 把商业游戏模型直接扒出来
- 未授权明星球员模型
- 未授权 Logo
- 未授权真实赛事素材

目前项目里的“欧冠 / 世界杯”字样未来商业上线前也需要进行 IP / 商标审查。

Visual 2.0 阶段可以暂时保留开发语义，但代码和资产设计应便于以后替换品牌。

---

# 19. Three.js 与 Cocos 的决策

## 本任务不要第一天就重写成 Cocos。

原因：

当前 Three.js 版本：

- 已经可玩
- 逻辑成熟
- 调试速度快
- 方便做 Visual Prototype

所以当前 Visual 2.0 第一阶段：

# **继续使用 Three.js 完成 Vertical Slice。**

但是必须同时：

- 避免把新逻辑全部继续写入一个巨大 `index.html`
- 新 Visual 系统尽量模块化
- 新资产使用可迁移格式，例如 GLB / PNG / JPG / KTX2（视支持情况）

当 Vertical Slice 完成后：

输出：

`docs/COCOS_MIGRATION_EVALUATION.md`

只做评估，不直接迁移。

评估：

- Three.js → 微信小游戏
- Cocos Creator → 微信小游戏

比较：

- 视觉
- 性能
- 资源
- 开发速度
- 维护
- Shader
- VFX
- 微信适配
- AI 辅助开发便利度

然后再决定是否迁移。

---

# 20. 代码架构要求

当前 `index.html` 已接近大型单文件应用。

Visual 2.0 新增代码不要继续全部塞进去。

逐步建立：

```text
src/
  core/
  rendering/
  materials/
  effects/
  camera/
  actors/
  game/
  ui/
```

例如：

```text
src/rendering/quality.js
src/rendering/postprocessing.js
src/materials/ballMaterial.js
src/materials/playerMaterial.js
src/effects/goalFx.js
src/effects/rocketShotFx.js
src/camera/cameraDirector.js
```

注意：

不要为了“代码漂亮”一次性重写整个项目。

原则：

# **Incremental Refactor**

先抽新系统。

旧系统能跑就暂时保留。

---

# 21. 禁止事项

本任务期间不要：

1. 大规模修改核心物理
2. 重写 Tournament
3. 新增 20 个 Gameplay 功能
4. 大量增加新的 UI 弹窗
5. 无限制增加粒子
6. 无限制增加实时光源
7. 为桌面高配电脑牺牲手机性能
8. 第一阶段直接重写 Cocos
9. 为了“华丽”破坏足球识别度
10. 每次碰撞都触发大型震屏
11. 把整个游戏做成赛博朋克
12. 修改已有核心玩法手感，除非是修复 Bug
13. 删除已有功能但不提供等价替代
14. 一次提交几千行不可审查的重构

---

# 22. 开发策略

执行时采用：

# **Small Changes + Visual Checkpoint**

每一个阶段完成后：

- 可运行
- 可回退
- 可截图
- 可对比
- 可性能测试

建议 Git Commit 粒度：

```text
chore(visual2): add visual audit and baseline metrics
feat(visual2): add rendering quality profiles
feat(visual2): upgrade ball material and rocket shot shader
feat(visual2): introduce camera director
feat(visual2): add controlled bloom and color grading
feat(visual2): rebuild flipper material
feat(visual2): introduce gltf player asset pipeline
feat(visual2): optimize stadium crowd layers
perf(visual2): reduce realtime lights and shadow cost
docs(visual2): add performance report
```

---

# 23. 第一版必须做到的 P0

Visual 2.0 Vertical Slice 第一版最少实现：

- [ ] 统一 Art Direction
- [ ] Quality Profile
- [ ] Visual Debug / Stats
- [ ] 足球材质升级
- [ ] Rocket Shot 视觉升级
- [ ] 挡杆材质升级
- [ ] 第一版 GLTF / GLB 球员管线
- [ ] Lighting 重构
- [ ] Controlled Bloom
- [ ] Color Grading / Tone
- [ ] Goal Impact Stack
- [ ] Camera Director
- [ ] 体育场 2.5D 优化
- [ ] Crowd 分层思路
- [ ] Mobile 性能测试
- [ ] Before / After 截图
- [ ] Visual 2.0 文档

---

# 24. P1

在 P0 稳定后再做：

- SSAO
- 更好的草坪 detail
- Goal net shader
- better volumetric fake
- 更完整角色动画
- Promotion cinematic
- Champion cinematic
- Quality auto-detect
- KTX2 / texture compression
- Instancing
- LOD

---

# 25. 验收标准

## 视觉

启动第一关后，必须明显满足：

### 1. 一致性

一眼看上去是同一个美术体系。

### 2. 层次

能区分：

- Ball
- Player
- Goal
- Pitch
- Stadium
- Background

不能糊在一起。

### 3. 光

主体必须有：

- Key
- Fill
- Rim / Separation

### 4. 材质

Ball / Player / Flipper / Goal 不再像简单 primitive。

### 5. 反馈

Rocket Shot 和 Goal 必须形成明显的视觉高潮。

### 6. 克制

普通碰撞不能比进球更热闹。

### 7. 可玩

视觉升级不能降低：

- 球可见度
- 球速判断
- 挡杆判断
- 球门判断

---

# 26. 性能验收

至少在浏览器模拟以下场景：

- 1080p desktop
- 中等 Android viewport
- iPhone portrait viewport

记录：

- Idle
- Normal Play
- Rocket Shot
- Goal
- Confetti

如果 Visual 2.0 比旧版性能明显下降：

必须指出最大 GPU / CPU 成本来源。

不能简单写：

“设备性能不足”。

---

# 27. 最终交付

完成 Visual 2.0 第一轮后必须提供：

## Code

可运行版本。

## Docs

```text
docs/
  VISUAL_2_AUDIT.md
  VISUAL_2_ART_DIRECTION.md
  VISUAL_2_IMPLEMENTATION.md
  VISUAL_2_PERFORMANCE.md
  COCOS_MIGRATION_EVALUATION.md
```

## Screenshot

至少：

```text
before/
after/
```

包括：

- 常规比赛
- Rocket Shot
- Goal
- Mobile

## Summary

最终输出：

```text
Visual 2.0 本轮完成：
1.
2.
3.

视觉提升最大项：
1.
2.
3.

当前仍然最大的限制：
1.
2.
3.

性能：
Desktop:
Mobile:

下一阶段建议：
P0:
P1:
P2:
```

---

# 28. AI 自主决策权限

在不违背上述方向的情况下：

你可以自行：

- 新建文件
- 重构局部代码
- 调整材质参数
- 调整灯光参数
- 创建 Shader
- 创建 Debug UI
- 创建质量档位
- 优化资产
- 使用 Blender / Python 工具脚本
- 创建测试页
- 创建截图脚本
- 使用合规 AI 工具生成开发用视觉资产
- 对代码进行性能优化

你不需要每一个参数都询问用户。

如果出现多个技术方案：

选择：

> **视觉收益高、性能成本低、微信迁移友好**

的方案。

---

# 29. 遇到问题时的原则

不要因为某个目标做不到就停下询问。

例如：

如果无法获得完美球员模型：

不要停止。

先：

1. 建立 GLTF Pipeline
2. 找合法 placeholder
3. 完成材质 / 光照 / LOD 系统
4. 记录未来替换方式

如果某 Post Effect 在移动端太重：

不要强行使用。

设计替代方案。

如果无法访问参考链接：

不要停止。

根据任务书 Art Direction 和现有项目继续执行。

---

# 30. 最终核心原则

Visual 2.0 不是：

> 加更多东西。

而是：

# **让每一个留下来的东西都更高级。**

牢记：

```text
Asset Quality
+
Art Direction
+
Lighting
+
Shader
+
VFX
+
Camera
+
Post Processing
+
Performance Discipline
=
Premium Visual
```

不是：

```text
更多 Mesh
+
更多灯
+
更多粒子
=
高级画面
```

---

# 31. 现在开始

从以下动作开始执行：

1. 拉取 / 打开最新 `main`
2. 阅读 README
3. 阅读完整 `index.html`
4. 阅读 assets 目录
5. 阅读最近 commits
6. 建立视觉性能 baseline
7. 创建 `docs/VISUAL_2_AUDIT.md`
8. 确定 Art Direction
9. 开始第一关 Visual Vertical Slice
10. 逐步提交，不破坏当前可玩版本

**不要只输出方案。**

**直接开始修改项目。**

目标不是写一份漂亮报告。

目标是：

> 交付一个真正看起来明显升级的、可运行的 Footballgame Visual 2.0 第一关 Vertical Slice。
