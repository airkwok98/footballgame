# Soccer Pinball 3D (3D 绿茵足球弹珠赛)

![Three.js](https://img.shields.io/badge/Three.js-r128-blue.svg)
![WebGL](https://img.shields.io/badge/WebGL-2.0-green.svg)
![60FPS](https://img.shields.io/badge/FPS-60%2B-brightgreen.svg)
![License](https://img.shields.io/badge/License-MIT-orange.svg)

《Soccer Pinball 3D》是一款基于 Three.js 和 WebGL 原生构建的高沉浸感、欧冠赛场级 3D 足球弹珠对战游戏。游戏将经典街机弹珠球台（Pinball）的爽快机械推杆打击感，与 FIFA / 欧冠现代足球赛场的宏大视听氛围深度结合。

---

## 🌟 核心特性 (Key Features)

### 1. 欧式标准立体球门与 Verlet 质点弹簧球网动力学 (Soft-Body Net Physics)
- 依据 FIFA / 欧冠标准箱式球门（Box Goal Frame）建模，包含双立柱、主横梁、倒圆角弯头、水平后拉杆与刚性加固桁架；
- 表面采用高光烤漆白漆（Glossy White Lacquer）PBR 材质，搭配半透明高通透尼龙编织织网；
- **真实足球撞网深陷动力学**：射门入网后足球以真实 3D 矢量冲撞后网，网面质点向后凸出形成深陷包裹网窝，结构弹簧向四周传递同心圆张力涟漪，动能被弹性阻尼迅速耗散，柔和滑落草坪；
- 伴随撞网沉闷冲击与尼龙摩擦专属音频（`net_impact.wav`）。

### 2. 欧冠之夜全景沉浸式球场氛围 (UEFA Champions Night Atmosphere)
- **宏伟看台天幕与夜空探照灯**：提取自精美原画，四周带平滑阿尔法羽化，自然融入 `#0b1322` 深空夜场 Slate 蓝底色；
- **微倾角环场动态 LED 滚屏广告牌**：左右边线配备长达 28 米的曜黑铝合金 LED 屏，面向俯视镜头微倾斜 $22^\circ$，贴图实时动态平滑滚屏，顶沿镶嵌电光青蓝与冠军流金激光导光条；
- **欧冠大耳朵金杯发光展示台**：立于球门右上角旗区外侧，配备多边形曜黑基座、发光金环与专属暖金射灯；
- **四角夜场射灯塔与星芒光晕**：四角矗立金属桁架立柱与倾角探照灯组，搭载通透星芒光晕（`AdditiveBlending`）；
- **进球漫天金色礼花纸带雨 (Confetti Shower)**：进球瞬间从球门天穹泼洒 120 片双面彩色纸花，具备 3D 多轴翻滚旋转与自然下坠空气阻尼。

### 3. 商业级拟真看台观众席与助威系统 (Realistic Stadium Crowd)
- **拒绝简易圆球**：全场 100+ 位入座球迷均采用真实 3D 拟真人型（躯干战袍、多元肤色面部、发型/棒球帽、大腿与多种助威姿态）；
- **欧式专业折叠座椅**：观众入座在配备座垫（Seat pan）与微后仰人体工学靠背（Backrest）的折叠座椅上；
- **多变助威姿态**：双臂高举胜利 V 字狂欢、单臂举拳振臂、胸前鼓掌、高举俱乐部横幅围巾（`[ ★ CHAMPIONS ★ ]`）；
- **迎风飘扬队旗**：看台架设 7 面大幅 3D 俱乐部队旗，采用 GPU 顶点正弦波物理驱动；
- **进球全场起立狂欢 (Standing Ovation)**：破门瞬间全场 102 位观众全体起立跳跃、双臂疯狂挥舞助威！

### 4. 三款 3D PBR 大师级拟真绿茵草坪 (Switchable PBR Grass Pitches)
- 包含**经典斑马横条纹**、**英超棋盘方格**、**大师菱性格纹**三种独立生成的 2048 级 PBR 材质组（Diffuse + Normal + Roughness + AO）；
- 嵌入式吸附草叶法线起伏的微反光白色标线；
- 支持游戏内即时无缝切换（按 `C` 或 `P` 键）。

### 5. 纯净原生手感与物理反馈 (Arcade Pinball Mechanics)
- 精密水滴形渐细流线挡杆，角速度与冲击力精确校准；
- 足球飞出瞬间带有空气扰动与烟雾粒子拖尾效果；
- 电脑防守球员（橙色门将 + 蓝色双后卫）合理巡逻，具备动态射门穿透空档，绝不自摆乌龙。

---

## 🎮 控制指南 (Controls)

| 键位 / 操作 | 动作 |
| :--- | :--- |
| **A** / **← 左方向键** / **屏幕左侧点击** | 激活左推杆击球 |
| **D** / **→ 右方向键** / **屏幕右侧点击** | 激活右推杆击球 |
| **Space 空格键** | 重新开球 / 发球 |
| **G 键** | 触发破门射门测试 (即刻观赏球网深陷与全场狂欢) |
| **C 键** / **P 键** / **顶部 🌿 图标** | 实时切换草坪款式 (斑马纹 / 棋盘格 / 菱性格) |
| **顶部 ⚽ 图标** | 切换足球皮肤 (经典黑白 / 岩浆能量球) |
| **顶部 🏆 图标** | 查看欧冠优胜者分享卡 |
| **顶部 🖼️ 图标** | 查看全景海报原画 |
| **顶部 🔊 图标** | 切换静音 / 开启音效 |

---

## 🚀 本地运行指南 (Getting Started)

由于游戏采用 WebGL 纹理和 Web Audio API，建议在本地 HTTP 服务器环境下运行以规避浏览器的跨域文件安全限制：

### 使用 Python (推荐)
```bash
# 进入工程目录
cd footballgame

# 启动本地服务器 (端口 8088 或自定义)
python -m http.server 8088
```
在浏览器中访问：`http://127.0.0.1:8088/index.html`

### 使用 Node.js / npx
```bash
npx serve .
```

---

## 📁 目录结构 (Project Structure)

```text
footballgame/
├── assets/
│   ├── audio/          # 击球、弹跳、进球、落袋、刷网等 8 组高保真音效
│   ├── balls/          # 经典足球与能量岩浆皮肤
│   ├── environment/    # 球场全景反射环境贴图
│   ├── pitch/          # 三大 PBR 草坪法线、粗糙度与 AO 纹理
│   ├── stadium/        # 看台穹顶天幕、环场 LED 屏、欧冠金杯与球迷图层
│   └── ui/             # 封面海报与优胜分享卡原画
├── libs/
│   ├── three.min.js    # Three.js 核心 3D 渲染库
│   └── cannon.min.js   # 物理运算辅助库
├── build_audio.py      # 程序化音频合成脚本
├── build_pitch_patterns.py # 2048 级 PBR 草坪纹理生成脚本
├── index.html          # 游戏主入口 (单文件零依赖，全功能闭环)
├── README.md           # 项目说明文档
└── .gitignore          # Git 忽略配置
```

---

## 📄 开源许可 (License)

本项目采用 [MIT License](LICENSE) 开源。
