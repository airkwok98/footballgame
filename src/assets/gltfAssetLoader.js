/**
 * Soccer Pinball 3D - Visual 2.0 Asset Integration System
 * GLTF Asset Loader & Mode Switcher
 */

(function(root) {
    'use strict';

    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('assets');
    // Default to 'legacy' unless explicitly specified as 'external'
    const currentMode = (modeParam === 'external') ? 'external' : 'legacy';

    console.log(`[AssetLoader] Initializing asset mode: ${currentMode} (URL param: ?assets=${modeParam || 'none'})`);

    const loaderCache = new Map();

    class GLTFAssetLoader {
        constructor() {
            this.mode = currentMode;
            this.isExternal = (currentMode === 'external');
            this.loader = null;
            this.initLoader();
        }

        initLoader() {
            if (typeof THREE !== 'undefined' && THREE.GLTFLoader) {
                this.loader = new THREE.GLTFLoader();
            } else {
                console.warn('[AssetLoader] THREE.GLTFLoader not found on startup. Will check dynamically.');
            }
        }

        ensureLoader() {
            if (!this.loader && typeof THREE !== 'undefined' && THREE.GLTFLoader) {
                this.loader = new THREE.GLTFLoader();
            }
            return this.loader;
        }

        load(url, onProgress) {
            return new Promise((resolve, reject) => {
                if (loaderCache.has(url)) {
                    const cached = loaderCache.get(url);
                    return resolve(cached.clone(true));
                }

                const loader = this.ensureLoader();
                if (!loader) {
                    const err = new Error('[AssetLoader] THREE.GLTFLoader is not available');
                    console.error(err);
                    return reject(err);
                }

                loader.load(
                    url,
                    (gltf) => {
                        loaderCache.set(url, gltf.scene);
                        resolve(gltf);
                    },
                    (xhr) => {
                        if (onProgress && xhr.total > 0) {
                            onProgress(xhr.loaded / xhr.total);
                        }
                    },
                    (error) => {
                        console.error(`[AssetLoader] Failed to load GLTF from ${url}:`, error);
                        reject(error);
                    }
                );
            });
        }
    }

    root.AssetManager = new GLTFAssetLoader();

})(window);
