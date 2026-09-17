from PIL import Image, ImageFilter
import numpy as np
import os

W, H = 2048, 2048
OUT_DIR = r"D:\antigravity_projects\soccer_pinball_3d\assets\pitch"

print("[1/5] Loading base textures...")
base_img = Image.open(os.path.join(OUT_DIR, "grass_seamless.jpg"))
base_arr = np.array(base_img, dtype=np.float32)

# Normalize column stripes from base_arr to get pure unstriped uniform turf
col_mean = base_arr.mean(axis=(0, 2), keepdims=True)
global_mean = base_arr.mean()
pure_turf = base_arr * (global_mean / (col_mean + 1e-4))
pure_turf = np.clip(pure_turf, 0, 255)

# Tile micro turf 2x across X and 4x across Y for ultra-fine grass blades
tile_x = 2
tile_y = 4
sub_w = W // tile_x
sub_h = H // tile_y
sub_turf = np.array(Image.fromarray(pure_turf.astype(np.uint8)).resize((sub_w, sub_h), Image.Resampling.LANCZOS), dtype=np.float32)
micro_turf = np.tile(sub_turf, (tile_y, tile_x, 1))

# Base normal map
base_norm = np.array(Image.open(os.path.join(OUT_DIR, "grass_normal.jpg")).resize((sub_w, sub_h)), dtype=np.float32)
micro_norm = np.tile(base_norm, (tile_y, tile_x, 1))
norm_x = (micro_norm[:, :, 0] / 127.5) - 1.0
norm_y = (micro_norm[:, :, 1] / 127.5) - 1.0
norm_z = micro_norm[:, :, 2] / 255.0

# Base roughness
base_rough = np.array(Image.open(os.path.join(OUT_DIR, "grass_roughness.jpg")).resize((sub_w, sub_h)), dtype=np.float32)
micro_rough = np.tile(base_rough, (tile_y, tile_x))

def build_pbr_set(name, mask, m_x, m_y, r_delta):
    print(f"Generating {name} PBR textures...")
    # 1. Diffuse (shading modulation: light bands ~1.12, dark bands ~0.88)
    # Mask is [0, 1]
    mod = 0.88 + 0.24 * mask
    diff = np.clip(micro_turf * mod[:, :, None], 0, 255).astype(np.uint8)
    diff_path = os.path.join(OUT_DIR, f"pitch_{name}_diffuse.jpg")
    Image.fromarray(diff).save(diff_path, quality=90)

    # 2. Normal map (blend micro grass bumps with macro mowing slope)
    nx = norm_x + m_x
    ny = norm_y + m_y
    nz = norm_z
    len_inv = 1.0 / np.maximum(1e-4, np.sqrt(nx * nx + ny * ny + nz * nz))
    nx *= len_inv
    ny *= len_inv
    nz *= len_inv

    r_ch = np.clip((nx * 0.5 + 0.5) * 255, 0, 255).astype(np.uint8)
    g_ch = np.clip((ny * 0.5 + 0.5) * 255, 0, 255).astype(np.uint8)
    b_ch = np.clip(nz * 255, 0, 255).astype(np.uint8)
    norm_img = Image.fromarray(np.stack([r_ch, g_ch, b_ch], axis=-1))
    norm_path = os.path.join(OUT_DIR, f"pitch_{name}_normal.jpg")
    norm_img.save(norm_path, quality=90)

    # 3. Roughness map (mown grass varies between 0.60 and 0.75)
    rough = np.clip(micro_rough * (1.0 + r_delta), 0, 255).astype(np.uint8)
    rough_path = os.path.join(OUT_DIR, f"pitch_{name}_roughness.jpg")
    Image.fromarray(rough).save(rough_path, quality=90)

    # 4. Thumbnail (256x256) for UI preview / verification
    thumb_path = os.path.join(OUT_DIR, f"pitch_{name}_thumb.jpg")
    Image.fromarray(diff).resize((256, 256)).save(thumb_path, quality=85)
    print(f"[OK] {name} textures saved successfully.")

# Coordinates in [0, 1]
x_coords = np.linspace(0, 1, W)[None, :]
y_coords = np.linspace(0, 1, H)[:, None]

# --- PATTERN 1: 经典斑马横条纹 (Zebra Stripes - 8 stripes) ---
zebra_wave = np.sin(y_coords * 8 * 2 * np.pi)
zebra_mask = np.tanh(zebra_wave * 4.0) * 0.5 + 0.5
# Directional macro slope: alternating vertical tilt
zebra_my = (zebra_mask - 0.5) * 0.35
zebra_mx = np.zeros_like(zebra_my)
zebra_r_delta = (zebra_mask - 0.5) * 0.18
build_pbr_set("zebra", zebra_mask, zebra_mx, zebra_my, zebra_r_delta)

# --- PATTERN 2: 英超棋盘方格 (Checkerboard - 4 cols x 8 rows) ---
chk_u = np.sin((x_coords - 0.5 / 4) * 4 * 2 * np.pi)
chk_v = np.sin((y_coords - 0.5 / 8) * 8 * 2 * np.pi)
checker_raw = np.logical_xor(chk_u > 0, chk_v > 0).astype(np.float32)
chk_blur = Image.fromarray((checker_raw * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius=5))
checker_mask = np.array(chk_blur, dtype=np.float32) / 255.0

# Checker normal: alternating horizontal vs vertical grain
checker_mx = (checker_mask - 0.5) * 0.28
checker_my = (0.5 - checker_mask) * 0.28
checker_r_delta = (checker_mask - 0.5) * 0.16
build_pbr_set("checker", checker_mask, checker_mx, checker_my, checker_r_delta)

# --- PATTERN 3: 大师菱形交织 (Diamond Argyle - Centered Scots Diamond Grid) ---
u_c = x_coords - 0.5
v_c = (y_coords - 0.5) * 2.0 # Aspect ratio 1:2
d1 = (u_c * 4.0 + v_c * 4.0)
d2 = (u_c * 4.0 - v_c * 4.0)
dia_raw = np.logical_xor(np.sin(d1 * np.pi) > 0, np.sin(d2 * np.pi) > 0).astype(np.float32)
dia_blur = Image.fromarray((dia_raw * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius=5))
diamond_mask = np.array(dia_blur, dtype=np.float32) / 255.0

# Diagonal normal tilt: 45 degree alternating slopes
dia_diff = diamond_mask - 0.5
diamond_mx = dia_diff * 0.22
diamond_my = dia_diff * 0.22
diamond_r_delta = dia_diff * 0.16
build_pbr_set("diamond", diamond_mask, diamond_mx, diamond_my, diamond_r_delta)

print("\n[ALL COMPLETE] All 3 PBR grass texture sets generated at 2048x2048!")
