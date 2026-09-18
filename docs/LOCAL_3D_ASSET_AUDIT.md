# Soccer Pinball 3D — 本地 3D 资产全量体检与技术选型报告 (Local 3D Asset Audit)

**状态**: Completed / Active  
**项目分支**: `visual-2.0`  
**基准 Commit**: `d49f123`  
**扫描目录**: `D:\antigravity_projects\soccer_pinball_3d\assets\models`  
**参考规范**: [`docs/STADIUM_ASSET_REQUIREMENTS.md`](file:///D:/antigravity_projects/soccer_pinball_3d/docs/STADIUM_ASSET_REQUIREMENTS.md), [`docs/VISUAL_2_ART_DIRECTION.md`](file:///D:/antigravity_projects/soccer_pinball_3d/docs/VISUAL_2_ART_DIRECTION.md)  

---

## 一、资产总览与全量体检矩阵 (Audit Summary Matrix)

经过对 `assets/models/` 目录下所有资产的递归技术扫描、glTF 元数据结构解析、贴图分辨率解析、骨骼蒙皮及动画轨分析，本地共检索到 **8 个 3D 资产**：

| Asset ID | Category | Asset Name | Tris | Verts | Meshes | Mats | Textures | Rig / Bones | Anim | PBR | File Size | License Type & Risk | Grade / Verdict |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `ball_perfect_football` | BALL | Perfect Football (Benchmark) | 19,920 | 11,106 | 33 (合批为 2) | 3 | 0 (纯PBR) | 无 (0) | 0 | 标准 PBR | 0.53 MB | 未知 (PENDING) | **BENCHMARK / KEEP** |
| `ball_trionda_gold` | BALL | Trionda Elite Gold Football | 1,994 | 1,486 | 1 | 1 | 2 (1024x1024) | 无 (0) | 0 | 标准 PBR | 2.31 MB | CC-BY-4.0 (LIKELY SAFE) | **SIMILAR / KEEP FOR LATER** |
| `ball_football_design_blue` | BALL | Football Design Blue | 11,520 | 6,512 | 1 | 1 | 1 (**8192x8192 8K**) | 无 (0) | 0 | 标准 PBR | 9.30 MB | CC-BY-4.0 (LIKELY SAFE) | **WORSE / REJECT** |
| `player_ukrainian` | PLAYER | Ukrainian Football Player 01 | 620 | 1,151 | 6 | 6 | 0 (纯色材质) | 有 (20) | 2 | 标准 PBR | 0.17 MB | CC-BY-4.0 (LIKELY SAFE) | **C / REJECT** (方块积木玩具人) |
| `player_alien_soldier` | PLAYER | 644230060_ Alien Soldier Football | 46,108 | 27,038 | 2 | 2 | 8 (**4096x4096 4K**) | 有 (66) | 1 | SpecGloss (旧版) | 73.48 MB | CC-BY-4.0 (LIKELY SAFE) | **REJECT** (外星机械生化人，非足球员) |
| `stadium_football_court` | STADIUM | Football Court | 137,257 | 234,708 | 8 (高度模块化) | 7 | 2 (512x512, 8x8) | 无 (0) | 0 | 标准 PBR | 8.93 MB | CC-BY-4.0 (LIKELY SAFE) | **A- / TEST NOW** (看台/顶棚/灯塔可拆分) |
| `stadium_low_poly` | STADIUM | Low Poly Football Stadium | 472,208 | 940,108 | 86 | 49 | 5 (2048x2048) | 无 (0) | 0 | 标准 PBR | 43.44 MB | CC-BY-4.0 (LIKELY SAFE) | **B / KEEP FOR LATER** (面数严重超标需减面) |
| `stadium_football_field_free` | STADIUM | Football Field (Free) | 7,652 | 13,732 | 62 | 2 | 2 (256x512) | 无 (0) | 0 | 标准 PBR | 0.65 MB | CC-BY-4.0 (LIKELY SAFE) | **C+ / KEEP FOR LATER** (街头笼式球场无看台) |

---

## 二、BALL 资产深度诊断与评分

当前生产已接入并完成 Draw Call 合批的资产为：`perfect_football__soccer_ball_gltf`（简称 `ball_perfect_football`），将其作为 **Benchmark 基准**。

### 1. `ball_perfect_football__soccer_ball_gltf` (Benchmark 基准)
- **技术信息**：
  - 三角形面数：19,920 面
  - 子网格数量：原始 33 个，经 `BufferGeometryUtils` 合批后压降至 2 个网格
  - 材质数：3 个标准 PBR 材质（黑白五角星皮块、几何缝线）
  - 贴图依赖：0 张贴图（全依赖几何下陷实体缝线与高光反射），文件仅 0.53 MB
  - 授权：PENDING（需补充来源记录）
- **评级与结论**：**BENCHMARK (KEEP)**。视觉经典、质感扎实、0 贴图内存开销、光影响应极佳。

### 2. `ball_trionda_elite_gold_football` (对比基准：SIMILAR)
- **技术信息**：
  - 三角形面数：1,994 面
  - 网格与材质：1 Mesh, 1 PBR Material, Draw Calls: 1
  - 贴图：2 张 1024x1024 PBR 贴图（`basic_fx_baseColor.png` 1.45 MB, `basic_fx_normal.png` 0.75 MB）
  - 授权：CC-BY-4.0 by Hafeez Ahmed (LIKELY SAFE)
- **优点**：
  - 仅 1 个 Draw Call，面数低（1,994 面），文件极小；
  - 黑金冠军杯纹理与 Visual 2.0 蓝金夜场视觉方向天然契合；
  - 带有标准法线贴图（Normal Map）模拟皮革凹凸。
- **缺点与风险**：
  - **版权风险**：纹理表面清晰印有 **Adidas 三道杠商标** 与 **FIFA World Cup 奖杯标识**，商业化版本存在明显侵权风险；
  - **几何精度**：1,994 面在近景特写下球体边缘有微弱多边形折面痕迹（不及 Benchmark 19k 面平滑）。
- **建议**：**KEEP FOR LATER**（在剥离其 Adidas/FIFA 商标贴图后，可作为低端移动端 Quality Low 的极限减负备选球）。

### 3. `ball_football_design_blue` (对比基准：WORSE)
- **技术信息**：
  - 三角形面数：11,520 面
  - 材质与网格：1 Mesh, 1 Material
  - 贴图：**1 张 8192x8192 (8K) 贴图，体积达 9.18 MB**
  - 授权：CC-BY-4.0 by NAEEMSADIQ (LIKELY SAFE)
- **致命缺点**：
  - **8K 贴图严重违规**：在 WebGL 移动端中，单张 8K 贴图解压后占用高达 **256 MB** GPU 显存，直接诱发低端机 WebGL 上下文丢失或闪退，严重违反项目性能铁律；
  - 缝线完全为平面绘制，无实体法线或几何凹凸感；
  - 蓝橙花纹与夜场质感存在视觉脱节。
- **建议**：**REJECT**。

---

## 三、PLAYER 资产深度诊断与评分 (最高优先级重点)

项目核心诉求：
- 明显是**成年人足球运动员**；
- 人体比例真实、足球球衣与球鞋完整；
- 严禁 **Roblox、方块人、玩具人、雕塑人、扫描高模**；
- 带骨骼 Rig 与跑步/踢球 Animation。

### 1. `players_ukrainian_football_player.01` (评级：C / REJECT)
- **技术参数**：
  - 面数：620 面，顶点 1,151
  - 材质/贴图：6 个纯色材质，0 张贴图，体积 0.17 MB
  - 骨骼与动画：20 根骨骼，包含 2 个跑步动画轨 (`1-move-1`)
  - 授权：CC-BY-4.0 by Alexander.Xas (LIKELY SAFE)
- **实机视觉体检结论**：
  - 几何构造由 `Cube_t-shirt`, `Cube_shorts`, `Cube_base`, `Cube_boot` 堆叠而成；
  - 头部为正方体方块，身躯为六面体棱柱，四肢为几何块；
  - **本质是典型的 Minecraft / Roblox 式方块积木玩具人**，与 Visual 2.0 拟真专业足球氛围严重不符。
- **建议**：**REJECT**（绝对不能作为拟真成年足球运动员使用）。

### 2. `players_644230060__alien_soldier_football` (评级：REJECT)
- **技术参数**：
  - 面数：46,108 面，顶点 27,038
  - 贴图：8 张 4096x4096 (4K) 贴图，文件体积高达 **73.48 MB**
  - 骨骼与动画：66 根 Mixamo 骨骼，包含 1 个奔跑动画轨
  - 扩展：`KHR_materials_pbrSpecularGlossiness`（非现代 Metallic-Roughness PBR）
  - 授权：CC-BY-4.0 by puri060 (LIKELY SAFE)
- **实机视觉体检结论**：
  - 模型并非人类，而是经典 Mixamo 资产 **Ch44 Alien Soldier（生化外星战士）**；
  - 身穿黑色生化重甲，面部带有橙色发光发热面罩，无任何真实球衣、短裤、球袜与球鞋；
  - 73 MB 超大体积，4K 贴图严重超标。
- **建议**：**REJECT**。

> [!WARNING]
> **P0 级关键诊断结论**：
> 当前本地下载的两个 Player 资产均**不符合**生产级拟真足球运动员标准（一个为 Roblox 方块人，一个为科幻外星生化兵）。
> **禁止在当前分支强行接入这两个资产**，下一阶段需专项采购/下载 **Game-ready Realistic Football Player**（成人比例、标准球服、8k～25k 面、Mixamo 人形骨骼）。

---

## 四、STADIUM 资产深度诊断与评分 (严格对标 STADIUM_ASSET_REQUIREMENTS)

### 1. `stadium_football_court` (评级：A- / TEST NOW)
- **技术参数**：
  - 面数：137,257 面，顶点 234,708
  - 网格数：8 个独立子 Mesh，7 个 PBR 材质
  - 贴图：仅 2 张微型贴图（512x512 及 8x8），总贴图占用 < 200 KB
  - 体积：8.93 MB（非常克制）
  - 光影：标准 PBR，无烘焙死日光，支持动态夜场泛光灯
  - 授权：CC-BY-4.0 by Kemal Çolak (LIKELY SAFE)
- **模块化结构与三角形分布剖析**：
  ```text
  stadium_football_court 节点拆解：
  ├── court_Red Tribune_0   [红座椅区]     : 31,200 tris  <-- 独立看台座椅
  ├── court_Black Tribune_0 [黑色看台基座] : 27,542 tris  <-- 看台混凝土梯级
  ├── court_proof_0         [遮阳顶棚]     :    152 tris  <-- 现代悬臂顶棚
  ├── court_spot light_0    [4座现代灯塔]  :     32 tris  <-- 倾角现代泛光灯塔
  ├── court_court_0         [平整草坪]     :      2 tris  <-- 场地底板
  ├── court_gray metalic_0  [外围铁丝网]   : 47,697 tris  <-- 细密钢丝网 (可按需剔除)
  └── court_kale diregi_0   [街头球门]     : 30,632 tris  <-- 密网球门 (弹球机有原生球门)
  ```
- **核心适配优势**：
  - **高度模块化**：只要保留看台、顶棚与灯塔（`Red Tribune` + `Black Tribune` + `proof` + `spot light`），环境面数即可从 137k 优化至 **~58,926 面**，**完美契合 `docs/STADIUM_ASSET_REQUIREMENTS.md` 规定的 30k～100k 黄金预算**！
  - 剔除多余的 4.7 万面铁丝网后，可与当前 Soccer Pinball 的深蓝天幕和挡杆外壳严丝合缝包裹。
- **评级与结论**：**TOP 1 候选 (TEST NOW)**。

### 2. `stadium_low_poly_football_stadium` (评级：B / KEEP FOR LATER)
- **技术参数**：
  - 面数：**472,208 面**（严重超标，近 50 万面）
  - 网格数：86 个 Mesh，49 个 Material
  - 贴图：5 张 2048x2048 PBR 贴图
  - 体积：43.44 MB
  - 授权：CC-BY-4.0 by ismeteren07 (LIKELY SAFE)
- **优缺点分析**：
  - **优点**：四面大看台、环形大灯塔、LED 广告回廊具备真正的“大型杯赛主体育场”恢弘感，非航拍扫描，模型边缘整洁。
  - **缺点**：面数（472k）是预算上限（100k）的近 5 倍，49 种材质导致未合并前产生 86+ 次额外 Draw Calls，灯架与栏杆包含大量未优化的细密多边形圆柱。
- **建议**：**KEEP FOR LATER**（后续在 Blender 中进行 Decimate 网格减面与材质合并并压至 60k 面后再考虑使用）。

### 3. `stadium_football_field_free` (评级：C+ / KEEP FOR LATER)
- **技术参数**：
  - 面数：7,652 面，网格数：62，体积：0.65 MB
  - 贴图：2 张小贴图
  - 授权：CC-BY-4.0 by coolalext (LIKELY SAFE)
- **优缺点分析**：
  - 极度轻量（7.6k 面），但场景定位为“社区笼式简易球场”，无任何观众看台与顶棚结构，无法提供杯赛锦标赛的宏大气场。
- **建议**：**KEEP FOR LATER**（其 4 根简易灯杆与替补席长凳可作为配件提取，但不适合作为整场背景）。

---

## 五、最终候选与决策建议 (Candidate Selection & Decision)

```
LOCAL ASSET AUDIT RESULT

BALL TOP 2:
1. Asset: perfect_football__soccer_ball_gltf (Benchmark)
   Triangles: 19,920
   Meshes: 2 (Merged)
   Materials: 3 (PBR)
   License: PENDING (需补全元数据)
   Verdict: BENCHMARK (KEEP IN PRODUCTION)

2. Asset: trionda_elite_gold_football
   Triangles: 1,994
   Meshes: 1
   Materials: 1
   PBR: Yes
   License: CC-BY-4.0 (含 Adidas/FIFA 商标风险)
   Verdict: KEEP FOR LATER (低配移动端候选，需去标)

PLAYER TOP 2 (当前本地资产均不达标):
1. Asset: ukrainian_football_player.01
   Triangles: 620
   Rig: Yes (20 bones)
   Animations: 2 (Run)
   Materials: 6 (Color)
   Textures: 0
   License: CC-BY-4.0
   Integration Risk: 风格为 Roblox 方块人，严重破坏 Visual 2.0 拟真基调
   Verdict: REJECT

2. Asset: 644230060__alien_soldier_football
   Triangles: 46,108
   Rig: Yes (66 Mixamo bones)
   Animations: 1
   Materials: 2
   Textures: 8 (4K, 73MB)
   License: CC-BY-4.0
   Integration Risk: 题材为外星机械兵非人类球员，4K 纹理严重超标
   Verdict: REJECT

STADIUM TOP 3:
1. Asset: football_court
   Triangles: 137,257 (模块化裁剪后约 58,900)
   Meshes: 8
   Modular: Yes (看台/顶棚/灯塔独立)
   PBR: Yes
   Baked Light: No (纯净中性漫反射，支持夜场灯光)
   License: CC-BY-4.0
   Integration Risk: Low (关闭铁网与球网即可直接入局)
   Verdict: TEST NOW (作为首选生产级球场候选)

2. Asset: low_poly_football_stadium
   Triangles: 472,208
   Meshes: 86
   Modular: Partial
   PBR: Yes
   Baked Light: No
   License: CC-BY-4.0
   Integration Risk: High (面数超预算 4.7 倍，需预先减面)
   Verdict: KEEP FOR LATER

3. Asset: football_field_free
   Triangles: 7,652
   Meshes: 62
   Modular: Partial
   PBR: Yes
   Baked Light: No
   License: CC-BY-4.0
   Integration Risk: Low (但缺少大型赛事看台)
   Verdict: KEEP FOR LATER

==================================================
BEST NEXT TEST:

PLAYER:
  [Action Required]: 本地现有 2 个 Player 资产皆不符合拟真足球员标准。
  请优先从 Sketchfab / CGTrader 补充下载 1~2 个真实人体比例、标准足球球衣短裤的
  Generic Low-Poly Rigged Football Player (8,000 ~ 25,000 面)。

STADIUM:
  football_court (首选测试：仅提取其看台与现代灯塔，面数仅 ~58k，零日光烘焙)。

BALL:
  维持当前 perfect_football__soccer_ball_gltf (已合批为 2 Draw Calls，视觉与性能最稳)。

DO NOT INTEGRATE:
  - 644230060__alien_soldier_football (外星生化兵)
  - ukrainian_football_player.01 (方块积木人)
  - football_design_blue (8K 贴图爆显存)
```
