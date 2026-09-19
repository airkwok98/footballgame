"""
Soccer Pinball 3D - Visual 2.0 Pitch PBR V2 Generator
Generates premium UEFA Night Football Arcade turf textures at 2048x2048:
- Authentic deep emerald / navy-green turf palette (calibrated for ACES Filmic)
- Broad 5.5m mowing stripes (6 stripes across 33m pitch)
- Directional roller-pressed blade normal tilt
- Controlled micro-specular roughness (0.80 - 0.88) to eliminate glittering sandpaper noise
"""

from PIL import Image, ImageFilter
import numpy as np
import os

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "pitch")
W, H = 2048, 2048

print(f"[PitchV2] Generating 2048x2048 PBR Grass Textures in: {OUT_DIR}")

# 1. Base seamless grass reference
base_path = os.path.join(OUT_DIR, "grass_seamless.jpg")
if os.path.exists(base_path):
    base_img = Image.open(base_path).convert("L")
    base_gray = np.array(base_img.resize((W, H), Image.Resampling.LANCZOS), dtype=np.float32)
    # Normalize to [0, 1] mean centered
    base_micro = (base_gray - base_gray.mean()) / (base_gray.std() + 1e-4)
else:
    # Synthetic procedural noise fallback if base not found
    np.random.seed(20260919)
    base_micro = np.random.randn(W, H).astype(np.float32)

# Soften high-frequency micro speckles
base_micro = np.clip(base_micro * 0.45, -1.5, 1.5)

# 2. Broad 6-stripe mowing pattern along pitch length (Y axis)
# 6 alternating stripes across 33 meters -> ~5.5m width per stripe
y_coords = np.linspace(0, 1, H)[:, None]
x_coords = np.linspace(0, 1, W)[None, :]

# Sine wave with period = 6 stripes (3 full wave cycles)
stripe_phase = np.sin(y_coords * 3.0 * 2.0 * np.pi)
# Tanh gives flat plateaus with smooth, soft organic transitions at stripe borders
stripe_mask = np.tanh(stripe_phase * 6.0) * 0.5 + 0.5  # [0.0, 1.0]

# Subtle pitch spatial vignette: slightly deeper near touchlines, bright in center
dist_from_center_x = np.abs(x_coords - 0.5) * 2.0  # 0 at center, 1 at touchline
dist_from_center_y = np.abs(y_coords - 0.5) * 2.0
vignette = 1.0 - 0.08 * (dist_from_center_x ** 2 + 0.5 * dist_from_center_y ** 2)

# 3. Base Color (Diffuse)
# Calibrated UEFA Night Turf Palette:
# Light Stripe: RGB ~ [28, 68, 36] (vibrant, deep, rich stadium green)
# Dark Stripe:  RGB ~ [19, 48, 25] (deep emerald navy undertone)
col_light = np.array([28.0, 68.0, 36.0], dtype=np.float32)
col_dark  = np.array([19.0, 48.0, 25.0], dtype=np.float32)

diffuse = np.zeros((H, W, 3), dtype=np.float32)
for c in range(3):
    base_c = col_dark[c] + (col_light[c] - col_dark[c]) * stripe_mask
    # Add subtle micro blade variation (±8% luminance perturbation)
    diffuse[:, :, c] = base_c * (1.0 + 0.08 * base_micro) * vignette

diffuse = np.clip(diffuse, 0, 255).astype(np.uint8)
diff_img = Image.fromarray(diffuse)
diff_img.save(os.path.join(OUT_DIR, "pitch_v2_diffuse.jpg"), quality=93)
diff_img.resize((256, 256)).save(os.path.join(OUT_DIR, "pitch_v2_thumb.jpg"), quality=88)
print("  -> pitch_v2_diffuse.jpg & thumb saved.")

# 4. Normal Map
# Directional roller slope: ±0.06 along Y for mowing stripes
macro_ny = (stripe_mask - 0.5) * 0.12  # [-0.06, +0.06]
macro_nx = np.zeros_like(macro_ny)

# Micro blade normals from softened micro texture
grad_y, grad_x = np.gradient(base_micro)
micro_nx = -grad_x * 0.15
micro_ny = -grad_y * 0.15

nx = macro_nx + micro_nx
ny = macro_ny + micro_ny
nz = np.ones_like(nx)

len_inv = 1.0 / np.sqrt(nx * nx + ny * ny + nz * nz + 1e-6)
nx *= len_inv
ny *= len_inv
nz *= len_inv

norm_r = np.clip((nx * 0.5 + 0.5) * 255.0, 0, 255).astype(np.uint8)
norm_g = np.clip((ny * 0.5 + 0.5) * 255.0, 0, 255).astype(np.uint8)
norm_b = np.clip((nz * 0.5 + 0.5) * 255.0, 0, 255).astype(np.uint8)

norm_arr = np.stack([norm_r, norm_g, norm_b], axis=-1)
norm_img = Image.fromarray(norm_arr)
norm_img.save(os.path.join(OUT_DIR, "pitch_v2_normal.jpg"), quality=93)
print("  -> pitch_v2_normal.jpg saved.")

# 5. Roughness Map
# High matte roughness to prevent specular glittering (0.80 to 0.88)
# Light stripes have slightly lower roughness (sleeker roller pressed lay)
base_roughness = 0.86 - 0.05 * stripe_mask + 0.03 * base_micro
rough_arr = np.clip(base_roughness * 255.0, 0, 255).astype(np.uint8)
rough_img = Image.fromarray(rough_arr)
rough_img.save(os.path.join(OUT_DIR, "pitch_v2_roughness.jpg"), quality=93)
print("  -> pitch_v2_roughness.jpg saved.")

# 6. Ambient Occlusion (AO) Map
# Soft root occlusion + perimeter contact shadow
ao_base = 0.90 + 0.07 * np.clip(base_micro, -1.0, 1.0)
ao_edge = 1.0 - 0.18 * (np.maximum(0, dist_from_center_x - 0.82) / 0.18) ** 2
ao_arr = np.clip(ao_base * ao_edge * 255.0, 0, 255).astype(np.uint8)
ao_img = Image.fromarray(ao_arr)
ao_img.save(os.path.join(OUT_DIR, "pitch_v2_ao.jpg"), quality=93)
print("  -> pitch_v2_ao.jpg saved.")

print("[PitchV2] All 4 PBR textures successfully created!\n")
