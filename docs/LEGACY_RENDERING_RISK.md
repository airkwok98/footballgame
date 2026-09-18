# Soccer Pinball 3D — Legacy Rendering Pipeline Performance Risk Analysis

**Status**: Informational / Architecture Debt Log  
**Applicable Branch**: `visual-2.0`  
**Reference Benchmark**: DevTools WebGL Profiler / `renderer.info` Metrics  

---

## 1. Executive Summary

During the Visual 2.0 WebGL runtime profiling and external asset evaluation, an architectural performance bottleneck was identified within the core legacy rendering pipeline:

```
Legacy Scene Runtime Profile (Baseline):
├── Draw Calls:    ~1,364 calls / frame
├── Geometries:    ~973 active BufferGeometries
├── Textures:      ~18 loaded textures
└── Total Tris:    ~91,240 triangles
```

While the triangle count (~91k) is modest and well within modern GPU rasterization budgets, the **1,364 Draw Calls per frame** represents a severe CPU bottleneck for WebGL applications. In WebGL / Three.js, CPU-to-GPU command submission and state switching are notoriously costly. At 60 FPS, this translates to over **81,800 WebGL draw calls per second**, starving the JavaScript main thread and causing micro-stutters, particularly on mobile browsers and lower-power integrated GPUs.

> [!IMPORTANT]
> **Scope Notice**: Per project milestones, this issue is logged for technical debt tracking. **No legacy scene refactoring is to be performed in this milestone**, preserving 100% gameplay and tournament stability. This document establishes the technical blueprint for the subsequent performance optimization sprint.

---

## 2. Overhead Source Breakdown

Detailed inspection of the scene graph (`scene.traverse`) reveals where the ~1,364 draw calls and ~973 geometries originate:

```
Draw Call Distribution:
┌─────────────────────────────────────────────────────────────┬────────────┬───────────┐
│ Component / Node Subtree                                    │ Draw Calls │ % of Total│
├─────────────────────────────────────────────────────────────┼────────────┼───────────┤
│ Spectator Stands & Individual Seats                         │ ~720       │ 52.8%     │
│ Procedural Crowd Figures (Individual Quad Billboards)       │ ~240       │ 17.6%     │
│ Arena Boundary Rails, Side Bumpers & Rubber Posts           │ ~140       │ 10.3%     │
│ Pin Bumpers, Target Pins, Pop Bumpers & Field Studs         │ ~115       │  8.4%     │
│ Pitch Turf Markings, Goal Nets & Goalposts                  │ ~85        │  6.2%     │
│ Dynamic Entities (Ball, Flipped Bats, Mechanical Rods, UI)  │ ~64        │  4.7%     │
└─────────────────────────────────────────────────────────────┴────────────┴───────────┘
```

### Key Culprits:
1. **Un-batched Stadium Seating**:
   Each chair or bench section in the four procedural grandstands is created as an independent `THREE.Mesh` with its own `THREE.BoxGeometry` or `CylinderGeometry`.
2. **Crowd Sprite Quads**:
   Individual spectator sprites are rendered as distinct mesh billboards rather than an instanced particle array or an `InstancedMesh`.
3. **Pinball Arena Hardware**:
   Scores of mechanical pins, guide rails, and spring posts are attached directly as individual scene graph nodes without static geometry merging.

---

## 3. Technical Mechanism: Why Draw Calls Kill WebGL Performance

In high-end native graphics APIs (DirectX 12, Vulkan, Metal), indirect draw and bindless resources allow tens of thousands of draw calls with minimal CPU overhead. WebGL 1.0 / 2.0, however, operates on a synchronous, single-threaded browser JavaScript bridge:

```
For EACH of the 1,364 Draw Calls per frame:
1. JS Engine: Traverses Scene Graph & Computes Model-View Matrices
2. Three.js: Evaluates State Cache (Program, Uniforms, Depth, Blending)
3. Browser WebGL Layer: Validates Context State & Bounds
4. GPU Driver: gl.bindVertexArray / gl.bindBuffer
5. GPU Driver: gl.useProgram (if material changes)
6. GPU Driver: gl.uniformMatrix4fv / gl.uniform* (Uniform Uploads)
7. GPU Driver: gl.drawElements()
```

### The Cost:
- **CPU Bottleneck**: The JavaScript execution thread spends 8–14ms merely iterating objects, sorting by depth/material, and pushing commands to the driver.
- **Battery Drain & Thermal Throttling**: On mobile devices (iOS Safari / Android Chrome), this heavy CPU submission loop forces high CPU frequency, leading to quick thermal throttling and frame drops from 60 FPS down to 30–45 FPS.
- **External Asset Contrast**: The external soccer ball originally had 32 draw calls for 32 leather panels. By applying `BufferGeometryUtils.mergeBufferGeometries`, we collapsed it to 2 draw calls while keeping all 19,920 triangles. The entire legacy stadium needs this exact same treatment.

---

## 4. Architectural Roadmap for Phase 3 Optimization

When the dedicated Performance Refactoring phase begins, the following concrete architectural upgrades should be applied:

### 4.1 Upgrade 1: `THREE.InstancedMesh` for Repeated Elements
- **Target**: Spectator Seats (~720 calls) and Crowd Quads (~240 calls).
- **Implementation**:
  Replace hundreds of individual `THREE.Mesh` instances with a single `THREE.InstancedMesh(seatGeometry, seatMaterial, 720)`.
  Matrix transforms and color variations are stored in a Float32 buffer attribute (`instanceMatrix`, `instanceColor`).
- **Expected Impact**: **960 draw calls $\rightarrow$ 2 draw calls** (99.8% reduction).

### 4.2 Upgrade 2: Static `BufferGeometryUtils.mergeBufferGeometries`
- **Target**: Immobile arena architecture (perimeter walls, corner ramps, non-moving guide rails, pitch chalk lines).
- **Implementation**:
  Group static geometries sharing the same material (e.g., metal rails, plastic walls, white field lines). Clone and bake their local-to-world transforms via `geometry.applyMatrix4(child.matrixWorld)`, then execute `THREE.BufferGeometryUtils.mergeBufferGeometries`.
- **Expected Impact**: **220 draw calls $\rightarrow$ ~8 draw calls**.

### 4.3 Upgrade 3: Frustum Culling & Viewport Occlusion
- **Target**: Stands and backdrop structures located behind the primary pinball broadcast camera.
- **Implementation**:
  Enable automatic bounding sphere/box computation for merged chunks so Three.js camera frustum culling immediately discards invisible geometry before submission.

### 4.4 Expected Post-Optimization Profile

```
Projected Phase 3 Profile:
├── Total Draw Calls: ~45 – 65 calls / frame (down from 1,364 — a 95% reduction!)
├── Frame Budget:     < 1.8ms JS submission time (down from ~11ms)
├── Target FPS:       Stable 60 FPS / 120 FPS on ProMotion mobile screens
└── Triangle Budget:  Completely unaffected (100% visual fidelity maintained)
```
