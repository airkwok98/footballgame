# Soccer Pinball 3D — Production Stadium 3D Asset Specification & Requirements

**Status**: Active / Approved  
**Applicable Branch**: `visual-2.0`  
**Reference Document**: `docs/VISUAL_2_ART_DIRECTION.md`, `docs/LEGACY_RENDERING_RISK.md`  

---

## 1. Background & Cheltenham Stadium POC Conclusion

In the Visual 2.0 external 3D asset Proof-of-Concept (POC), we evaluated two external models:
1. **Perfect Football Model**: Accepted and integrated into production with geometry batching optimization.
2. **Cheltenham Football Pitch Model**: **Officially REJECTED for Production** (`POC_REJECTED_PHOTOGRAMMETRY_ASSET`).

### 1.1 Cheltenham Rejection Post-Mortem

| Criterion | Cheltenham POC Reality | Production Game Requirement | Assessment |
| :--- | :--- | :--- | :--- |
| **Triangle Count** | **858,030 triangles** (90.4% of entire scene) | $\le 100,000$ triangles total | ❌ **Fatal Overhead** |
| **Asset Topology** | Raw photogrammetry drone scan (dense non-uniform triangulated mesh) | Clean quad-dominant topology, retopologized for game engines | ❌ **Non-game Topology** |
| **Mesh Boundaries** | Severely jagged, cut-off edge artifacts, floating vertices | Clean boundaries, closed geometry or intentional horizon fades | ❌ **Severe Visual Glitches** |
| **Material & Shading** | `KHR_materials_unlit` with harsh, non-directional midday sunlight baked directly into diffuse maps | Standard PBR (`MeshStandardMaterial`), dynamic lighting response | ❌ **Incompatible Lighting** |
| **Art Direction Alignment** | Midday British town suburb look with baked yellow sunlight | Deep Space / Night Arena (`#050510` dark base with navy & championship gold) | ❌ **Severe Style Clash** |
| **Modularity** | Monolithic single-scan mesh (cannot isolate stands, grass, or roof) | Modular pieces (stands, roof, pitch rim, LED boards, dugouts) | ❌ **Unmodular** |

The Cheltenham model remains archived in `assets/models/stadium/cheltenham_football_pitch_gltf/` purely for technical reference and regression benchmarking. It is gated behind explicit URL parameters (`?stadium=cheltenham` or `?assets=cheltenham`) and must **never** be loaded in production.

---

## 2. Production Stadium Asset Technical Budget

To deliver the high-impact "Apple-grade / AAA broadcast" look while sustaining rock-solid 60 FPS across desktop and mobile WebGL devices, any prospective stadium model must adhere to the following budgets:

### 2.1 Geometry & Triangle Budget

```
Total Stadium Budget: 30,000 – 100,000 Triangles Max
```

| Component | Target Triangle Range | Notes |
| :--- | :--- | :--- |
| **Lower Tier Stands (Pitchside)** | 8,000 – 18,000 | Visible in primary gameplay camera frustum. Geometry seats only for front 3-5 rows; upper rows textured. |
| **Upper Tier Stands & Bleachers** | 6,000 – 15,000 | Stepped geometry with texture-baked seating details. |
| **Stadium Roof & Cantilever Trusses** | 8,000 – 20,000 | Structural steel beams, floodlight gantries, outer facade rim. |
| **LED Perimeter Advertising Boards** | 1,000 – 3,000 | Continuous ring surrounding the pitch. UV-mapped for dynamic video/scrolling textures. |
| **Team Dugouts & Technical Area** | 2,000 – 5,000 | Bench seats, acrylic canopy, substitution board area. |
| **Floodlight Towers / Light Rigs (x4)**| 4,000 – 10,000 | Four corner towers or roof-integrated light banks. |
| **VIP Suites & Stadium Concourse Facade**| 5,000 – 15,000 | Background building massing, glass boxes. |
| **Total Combined** | **34,000 – 86,000** | Must not exceed 100,000 triangles under any circumstance. |

### 2.2 LOD (Level-of-Detail) Architecture

1. **LOD0 (High, Camera Distance < 30 units)**: 60,000 – 80,000 triangles. Full bevels on perimeter barriers, visible handrails, front-row seat geometry.
2. **LOD1 (Medium, Camera Distance 30–60 units)**: 25,000 – 40,000 triangles. Handrails collapsed to textures, planar bleacher slopes.
3. **LOD2 (Low, Camera Distance > 60 units / Background)**: 8,000 – 15,000 triangles. Structural silhouette and roof outline only.

---

## 3. Modular Breakdown & Hierarchy

The stadium asset must **not** be delivered as a single un-editable polygon blob. It must be organized into logical, named parent nodes inside the glTF hierarchy:

```text
Stadium_Root (Transform at 0, 0, 0)
├── Stands_Group
│   ├── Stands_North (Lower & Upper)
│   ├── Stands_South (Lower & Upper)
│   ├── Stands_East (Lower & Upper)
│   └── Stands_West (Lower & Upper)
├── Roof_Structure
│   ├── Roof_Truss_North
│   ├── Roof_Truss_South
│   └── Roof_Gantry_Lights
├── Pitch_Perimeter
│   ├── LED_Boards_Rim (Independent UV map for scrolling shader)
│   ├── Turf_Edge_Transition (Apron surrounding the green)
│   ├── Dugout_Home
│   └── Dugout_Away
├── Lighting_Rigs
│   ├── Tower_NE (with directional light target dummies)
│   ├── Tower_NW
│   ├── Tower_SE
│   └── Tower_SW
└── Exterior_Facade (Toggled off for close-in camera views)
    ├── Outer_Walls
    └── Concourse_Glass
```

### Advantages of Modular Organization:
1. **Frustum Culling**: Three.js can automatically cull sections behind the camera.
2. **Independent Material Control**: The LED perimeter board material can run a canvas or video texture without altering stand materials.
3. **Selective Occlusion**: Roof or upper stands can be hidden or made semi-transparent when the camera pitches up during Rocket Shot cinematics.

---

## 4. Material, Texture & Shading Standards

### 4.1 PBR Material Requirements
All components must use standard **Metallic-Roughness PBR** workflow compatible with `THREE.MeshStandardMaterial`:

| Map Type | Resolution | Bit Depth / Format | Requirements |
| :--- | :--- | :--- | :--- |
| **Base Color / Diffuse** | 2048x2048 (Main) / 1024x1024 (Props) | 8-bit sRGB (PNG / JPG / WebP) | **Strictly neutral albedo**. No baked direct directional sun shadows or hard highlights. |
| **Roughness / Metalness / AO** | 2048x2048 (Packed ORM) | 8-bit Linear (RGB: R=AO, G=Roughness, B=Metalness) | ORM channel packing preferred to save texture memory and GPU texture samplers. |
| **Normal Map** | 2048x2048 | 8-bit Linear (Tangent Space OpenGL format, +Y up) | Used to simulate fine details (seat rows, corrugated steel, concrete panels) without polygon cost. |
| **Emissive Map** | 1024x1024 | 8-bit sRGB | For LED ribbons, scoreboards, floodlight lenses, tunnel signage. |

### 4.2 Prohibited Shading Practices
- ❌ **NO Baked Daytime Sunlight**: Diffuse textures containing yellow sunlight splashes, hard shadows, or outdoor ambient daylight will be rejected immediately.
- ❌ **NO `KHR_materials_unlit` for Environmental Geometry**: Unlit materials cannot receive dynamic game lights (floodlights, rocket shot flashes, goal flare reflections).
- ❌ **NO Massive Uncompressed 4K/8K Textures**: Maximum single texture resolution is 2048x2048. Total VRAM texture footprint must stay under 40 MB.

---

## 5. File Formats & Delivery Specifications

1. **Format**: Single self-contained `.glb` (preferred) or `.gltf` + `.bin` + relative texture folder.
2. **Engine Compatibility**: Three.js r128+ `GLTFLoader`. Must pass `gltf-validator` with 0 errors and 0 unhandled extension warnings.
3. **Coordinate System**:
   - Y-up, Right-Handed (standard Three.js / glTF convention).
   - Pitch center located exactly at world origin `(0, 0, 0)`.
   - Dimensions modeled to real-world meters (1 unit = 1 meter, or calibrated to Soccer Pinball's standard pitch width $\approx 15.0\text{m}$, length $\approx 24.5\text{m}$).
4. **Transform Cleanliness**:
   - Rotation and scale baked to `(0, 0, 0)` and `(1, 1, 1)` on all sub-meshes.
   - Pivot points centered at each sub-mesh's logical ground anchor.

---

## 6. Licensing & Commercial Compliance

Any asset acquired from external marketplaces (Sketchfab, CGTrader, TurboSquid, Unity/Unreal stores, Blender Market) must satisfy:

1. **Commercial Use Allowed**: Must possess a license permitting commercial video game use (e.g., CC-BY 4.0, Royalty-Free Commercial, Standard Game Engine License).
2. **Editorial Use Only Prohibited**: Assets marked "Editorial Use Only" (e.g. copyrighted real stadiums like Allianz Arena, Camp Nou, Wembley with real trademarked club crests/sponsors) **cannot** be shipped in a commercial product.
3. **Attribution File**: Any CC-BY asset must be accompanied by an entry in `CREDITS.md` noting author, source URL, and license terms.
