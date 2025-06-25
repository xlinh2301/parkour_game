// PerformanceConfig.js - Cấu hình hiệu năng cho máy cấu hình khác nhau

export class PerformanceConfig {
    constructor() {
        // Detect device performance level
        this.performanceLevel = this.detectPerformanceLevel();
        this.config = this.getConfigForLevel(this.performanceLevel);
        
        console.log(`🚀 Performance level detected: ${this.performanceLevel}`);
        console.log('📊 Performance config:', this.config);
    }

    detectPerformanceLevel() {
        // Kiểm tra số lõi CPU
        const cores = navigator.hardwareConcurrency || 4;
        
        // Kiểm tra memory (nếu có)
        const memory = navigator.deviceMemory || 4;
        
        // Kiểm tra WebGL renderer để đoán GPU
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        let gpuInfo = '';
        
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                gpuInfo = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
            }
        }

        // Xác định performance level dựa trên thông tin phần cứng
        if (cores >= 8 && memory >= 8) {
            return 'high';
        } else if (cores >= 4 && memory >= 4) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    getConfigForLevel(level) {
        const configs = {
            high: {
                // Cấu hình cho máy mạnh
                renderer: {
                    antialias: true,
                    shadowMapSize: 2048,
                    enableShadows: true,
                    pixelRatio: Math.min(window.devicePixelRatio, 2)
                },
                physics: {
                    fixedTimeStep: 1/60,
                    maxSubSteps: 5,
                    solverIterations: 10
                },
                animation: {
                    updateFrequency: 60, // fps
                    fadeTime: 0.2
                },
                particles: {
                    maxParticles: 1000,
                    updateFrequency: 60
                },
                ui: {
                    updateFrequency: 60
                },
                character: {
                    groundCheckFrequency: 60,
                    movementSmoothing: 0.8
                }
            },
            medium: {
                // Cấu hình cho máy trung bình
                renderer: {
                    antialias: true,
                    shadowMapSize: 1024,
                    enableShadows: true,
                    pixelRatio: Math.min(window.devicePixelRatio, 1.5)
                },
                physics: {
                    fixedTimeStep: 1/50,
                    maxSubSteps: 4,
                    solverIterations: 7
                },
                animation: {
                    updateFrequency: 45,
                    fadeTime: 0.15
                },
                particles: {
                    maxParticles: 500,
                    updateFrequency: 45
                },
                ui: {
                    updateFrequency: 30
                },
                character: {
                    groundCheckFrequency: 45,
                    movementSmoothing: 0.7
                }
            },
            low: {
                // Cấu hình cho máy yếu
                renderer: {
                    antialias: false,
                    shadowMapSize: 512,
                    enableShadows: false,
                    pixelRatio: 1
                },
                physics: {
                    fixedTimeStep: 1/40,
                    maxSubSteps: 3,
                    solverIterations: 5
                },
                animation: {
                    updateFrequency: 30,
                    fadeTime: 0.1
                },
                particles: {
                    maxParticles: 200,
                    updateFrequency: 30
                },
                ui: {
                    updateFrequency: 20
                },
                character: {
                    groundCheckFrequency: 30,
                    movementSmoothing: 0.6
                }
            }
        };

        return configs[level];
    }

    // Cho phép người dùng override performance level
    setPerformanceLevel(level) {
        if (['low', 'medium', 'high'].includes(level)) {
            this.performanceLevel = level;
            this.config = this.getConfigForLevel(level);
            console.log(`🔧 Performance level set to: ${level}`);
            return true;
        }
        return false;
    }

    // Helper methods để lấy config cho từng component
    getRendererConfig() {
        return this.config.renderer;
    }

    getPhysicsConfig() {
        return this.config.physics;
    }

    getAnimationConfig() {
        return this.config.animation;
    }

    getParticleConfig() {
        return this.config.particles;
    }

    getUIConfig() {
        return this.config.ui;
    }

    getCharacterConfig() {
        return this.config.character;
    }

    // Kiểm tra xem có nên skip frame hay không dựa trên frequency
    shouldUpdate(component, lastUpdate) {
        const config = this.config[component];
        if (!config || !config.updateFrequency) return true;
        
        const interval = 1000 / config.updateFrequency; // ms
        return (performance.now() - lastUpdate) >= interval;
    }
}

// Singleton instance
export const performanceConfig = new PerformanceConfig();
