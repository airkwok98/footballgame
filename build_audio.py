import os
import numpy as np
import scipy.io.wavfile as wavfile
import subprocess

def build_all_audio():
    sfx_base = r'D:\AI\.agents\skills\video-shotcraft\assets\audio\sfx'
    out_dir = r'D:\antigravity_projects\soccer_pinball_3d\assets\audio'
    os.makedirs(out_dir, exist_ok=True)

    # 1. flipper.wav from lock-quick.mp3
    src_lock = os.path.join(sfx_base, 'mech', 'lock-quick.mp3')
    dst_flipper = os.path.join(out_dir, 'flipper.wav')
    subprocess.run(['ffmpeg', '-y', '-i', src_lock, '-t', '0.22', '-af', 'volume=2.2,highpass=f=120,afade=t=out:st=0.14:d=0.08', '-ar', '44100', '-ac', '2', dst_flipper], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # 2. kick.wav from hit-blow.mp3
    src_hit = os.path.join(sfx_base, 'impact', 'hit-blow.mp3')
    dst_kick = os.path.join(out_dir, 'kick.wav')
    subprocess.run(['ffmpeg', '-y', '-i', src_hit, '-t', '0.32', '-af', 'volume=2.5,bass=g=4:f=90,afade=t=out:st=0.22:d=0.1', '-ar', '44100', '-ac', '2', dst_kick], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # 3. kick_crit.wav from bass-hit-short.mp3 + air-whoosh-powerful.mp3
    src_bass = os.path.join(sfx_base, 'impact', 'bass-hit-short.mp3')
    src_whoosh = os.path.join(sfx_base, 'transition', 'air-whoosh-powerful.mp3')
    dst_crit = os.path.join(out_dir, 'kick_crit.wav')
    filter_complex = '[0:a]volume=2.0[a0];[1:a]volume=1.5,adelay=40|40[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2,afade=t=out:st=0.4:d=0.2[out]'
    subprocess.run(['ffmpeg', '-y', '-i', src_bass, '-i', src_whoosh, '-filter_complex', filter_complex, '-map', '[out]', '-t', '0.6', '-ar', '44100', '-ac', '2', dst_crit], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # 4. bounce.wav from metal-spring-hit.mp3
    src_spring = os.path.join(sfx_base, 'impact', 'metal-spring-hit.mp3')
    dst_bounce = os.path.join(out_dir, 'bounce.wav')
    subprocess.run(['ffmpeg', '-y', '-i', src_spring, '-t', '0.25', '-af', 'volume=2.0,highpass=f=200,afade=t=out:st=0.15:d=0.1', '-ar', '44100', '-ac', '2', dst_bounce], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # 5. whistle.wav synthesized with dual-tone modulated acoustic pea model
    sr = 44100
    dur = 0.52
    t = np.linspace(0, dur, int(sr * dur), endpoint=False)
    f1 = 2820.0
    f2 = 3010.0
    pea_freq = 28.0
    pea_mod = 1.0 + 0.08 * np.sin(2 * np.pi * pea_freq * t)
    noise = np.random.normal(0, 0.06, len(t))
    sig = np.sin(2 * np.pi * f1 * pea_mod * t) * 0.45 + np.sin(2 * np.pi * f2 * pea_mod * t) * 0.45 + noise
    env = np.ones_like(t)
    attack = int(sr * 0.03)
    release = int(sr * 0.12)
    env[:attack] = np.linspace(0, 1, attack)
    env[-release:] = np.linspace(1, 0, release)
    sig = sig * env
    sig = np.clip(sig, -0.98, 0.98)
    sig_i16 = (sig * 32767).astype(np.int16)
    stereo = np.column_stack([sig_i16, sig_i16])
    dst_whistle = os.path.join(out_dir, 'whistle.wav')
    wavfile.write(dst_whistle, sr, stereo)

    # 6. goal.wav from crowd applause + bass hit
    src_crowd = os.path.join(sfx_base, 'crowd', 'applause-rhythmic-loop.mp3')
    dst_goal = os.path.join(out_dir, 'goal.wav')
    filter_goal = '[0:a]volume=2.5,afade=t=in:st=0:d=0.1,afade=t=out:st=1.8:d=0.5[a0];[1:a]volume=2.2[a1];[a0][a1]amix=inputs=2:duration=first[out]'
    subprocess.run(['ffmpeg', '-y', '-i', src_crowd, '-i', src_bass, '-filter_complex', filter_goal, '-map', '[out]', '-t', '2.3', '-ar', '44100', '-ac', '2', dst_goal], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # 7. drain.wav
    dst_drain = os.path.join(out_dir, 'drain.wav')
    dur_d = 0.65
    t_d = np.linspace(0, dur_d, int(sr * dur_d), endpoint=False)
    f_sweep = 360.0 * np.exp(-3.5 * t_d)
    sig_d = np.sin(2 * np.pi * f_sweep * t_d) * np.exp(-4.5 * t_d) * 0.7
    sig_d += np.sin(2 * np.pi * (f_sweep * 1.5) * t_d) * np.exp(-5.0 * t_d) * 0.3
    sig_d_i16 = (np.clip(sig_d, -0.98, 0.98) * 32767).astype(np.int16)
    wavfile.write(dst_drain, sr, np.column_stack([sig_d_i16, sig_d_i16]))

    # 8. net_impact.wav (真实球入网窝沉闷低频撞击 + 尼龙绳网摩擦震颤音)
    dst_net = os.path.join(out_dir, 'net_impact.wav')
    dur_n = 0.68
    t_n = np.linspace(0, dur_n, int(sr * dur_n), endpoint=False)
    # 低频沉闷受力冲量 (Thud impact)
    f_thud = 95.0 * np.exp(-8.0 * t_n) + 38.0
    thud = np.sin(2 * np.pi * f_thud * t_n) * np.exp(-11.0 * t_n) * 0.65
    # 网绳紧绷高频共振 (Cord tension flutter)
    flutter = (np.sin(2 * np.pi * 185.0 * t_n) * 0.28 + np.sin(2 * np.pi * 320.0 * t_n) * 0.18) * np.exp(-9.5 * t_n)
    # 尼龙织网摩擦风声与网丝滑移白噪 (Nylon mesh friction whoosh)
    noise_raw = np.random.normal(0, 0.35, len(t_n))
    # 简单的指数滑动平均带通仿真尼龙粗糙度
    noise_filt = np.zeros_like(noise_raw)
    for i in range(1, len(t_n)):
        noise_filt[i] = 0.65 * noise_filt[i-1] + 0.35 * (noise_raw[i] - noise_raw[i-1])
    noise_env = (1.0 - np.exp(-60.0 * t_n)) * np.exp(-8.0 * t_n) * 1.8
    sig_net = thud + flutter + noise_filt * noise_env
    sig_net = np.clip(sig_net, -0.98, 0.98)
    sig_net_i16 = (sig_net * 32767).astype(np.int16)
    wavfile.write(dst_net, sr, np.column_stack([sig_net_i16, sig_net_i16]))

    # 9. header.wav (真实头骨迎顶足球沉闷低频撞击与皮革爆破音)
    dst_header = os.path.join(out_dir, 'header.wav')
    dur_h = 0.36
    t_h = np.linspace(0, dur_h, int(sr * dur_h), endpoint=False)
    f_core = 135.0 * np.exp(-12.0 * t_h) + 62.0
    core_h = np.sin(2 * np.pi * f_core * t_h) * np.exp(-13.0 * t_h) * 0.75
    f_slap = 480.0 * np.exp(-35.0 * t_h) + 160.0
    slap_h = np.sin(2 * np.pi * f_slap * t_h) * np.exp(-32.0 * t_h) * 0.45
    res_h = np.sin(2 * np.pi * 175.0 * t_h) * np.exp(-18.0 * t_h) * 0.35
    noise_h = np.random.normal(0, 0.18, len(t_h)) * np.exp(-22.0 * t_h)
    sig_header = core_h + slap_h + res_h + noise_h
    sig_header = np.clip(sig_header, -0.98, 0.98)
    sig_header_i16 = (sig_header * 32767).astype(np.int16)
    wavfile.write(dst_header, sr, np.column_stack([sig_header_i16, sig_header_i16]))

    print("All audio files built successfully!")

if __name__ == '__main__':
    build_all_audio()

