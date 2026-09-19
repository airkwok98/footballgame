/**
 * Soccer Pinball 3D - Visual 2.0 Asset Integration System
 * GLTF Asset Loader & Mode Switcher
 * P0 Stabilization: Canonical GLTF Cache Contract Repair
 */

(function(root) {
    'use strict';

    const params = (typeof window !== 'undefined' && window.location && window.location.search)
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams('');

    const isReview = (params.get('review') || '').toLowerCase() === 'current';
    const modeParam = (params.get('assets') || (isReview ? 'external' : '')).toLowerCase();
    const stadiumParam = (params.get('stadium') || (isReview ? 'football_court' : '')).toLowerCase();
    // External asset mode active if assets=external, assets=cheltenham, stadium=cheltenham, or stadium=football_court
    const isExternal = (modeParam === 'external' || modeParam === 'cheltenham' || stadiumParam === 'cheltenham' || stadiumParam === 'football_court');
    const currentMode = isExternal ? 'external' : 'legacy';

    console.log(`[AssetLoader] Initializing asset mode: ${currentMode} (URL params: assets=${modeParam || 'none'}, stadium=${stadiumParam || 'none'})`);

    const loaderCache = new Map();
    const pendingLoads = new Map();

    const cacheStats = {
        hits: 0,
        misses: 0,
        networkRequests: 0
    };

    function containsSkinnedMesh(rootObj) {
        if (!rootObj || typeof rootObj.traverse !== 'function') return false;
        let found = false;
        rootObj.traverse((obj) => {
            if (obj && obj.isSkinnedMesh) {
                found = true;
            }
        });
        return found;
    }

    function cloneScene(sceneTemplate) {
        if (!sceneTemplate) return null;
        if (containsSkinnedMesh(sceneTemplate)) {
            if (typeof THREE !== 'undefined' && THREE.SkeletonUtils && typeof THREE.SkeletonUtils.clone === 'function') {
                return THREE.SkeletonUtils.clone(sceneTemplate);
            } else {
                console.warn('[AssetLoader] SkinnedMesh detected in template but THREE.SkeletonUtils.clone is unavailable; falling back to scene.clone(true).');
                return sceneTemplate.clone(true);
            }
        }
        return sceneTemplate.clone(true);
    }

    function cloneCachedGltf(template) {
        const clonedScene = cloneScene(template.scene);
        const scenes = clonedScene ? [clonedScene] : [];
        return {
            scene: clonedScene,
            scenes: scenes,
            animations: template.animations ? template.animations.slice() : [],
            cameras: template.cameras ? template.cameras.slice() : [],
            asset: template.asset || null,
            userData: template.userData ? Object.assign({}, template.userData) : {},
            parser: template.parser || null
        };
    }

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
                    cacheStats.hits++;
                    const cachedTemplate = loaderCache.get(url);
                    return resolve(cloneCachedGltf(cachedTemplate));
                }

                if (pendingLoads.has(url)) {
                    cacheStats.hits++;
                    return pendingLoads.get(url)
                        .then((template) => resolve(cloneCachedGltf(template)))
                        .catch(reject);
                }

                const loader = this.ensureLoader();
                if (!loader) {
                    const err = new Error('[AssetLoader] THREE.GLTFLoader is not available');
                    console.error(err);
                    return reject(err);
                }

                cacheStats.misses++;
                cacheStats.networkRequests++;

                const pendingPromise = new Promise((pResolve, pReject) => {
                    loader.load(
                        url,
                        (gltf) => {
                            const canonicalTemplate = {
                                scene: gltf.scene,
                                animations: gltf.animations || [],
                                cameras: gltf.cameras || [],
                                asset: gltf.asset || null,
                                userData: gltf.userData || {},
                                parser: gltf.parser || null
                            };
                            loaderCache.set(url, canonicalTemplate);
                            pendingLoads.delete(url);
                            pResolve(canonicalTemplate);
                        },
                        (xhr) => {
                            if (onProgress && xhr && xhr.total > 0) {
                                onProgress(xhr.loaded / xhr.total);
                            }
                        },
                        (error) => {
                            console.error(`[AssetLoader] Failed to load GLTF from ${url}:`, error);
                            pendingLoads.delete(url);
                            pReject(error);
                        }
                    );
                });

                pendingLoads.set(url, pendingPromise);

                pendingPromise
                    .then((template) => resolve(cloneCachedGltf(template)))
                    .catch(reject);
            });
        }

        getCacheStats() {
            return {
                entries: Array.from(loaderCache.keys()),
                pending: Array.from(pendingLoads.keys()),
                hits: cacheStats.hits,
                misses: cacheStats.misses,
                networkRequests: cacheStats.networkRequests
            };
        }

        hasCache(url) {
            return loaderCache.has(url);
        }

        clearCache() {
            loaderCache.clear();
            pendingLoads.clear();
        }
    }

    const instance = new GLTFAssetLoader();

    if (typeof root !== 'undefined') {
        root.AssetManager = instance;
        root.__gltfCacheDebug = () => instance.getCacheStats();
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            GLTFAssetLoader,
            AssetManager: instance
        };
    }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
