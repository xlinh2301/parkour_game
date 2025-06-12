import * as THREE from 'three';

export class Scene {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.querySelector('canvas.webgl'),
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Audio Listener
        this.audioListener = new THREE.AudioListener();
        this.camera.add(this.audioListener);
        this.backgroundMusic = null; // Store background music object

        this.daySkybox = null;
        this.ambientLight = null;
        this.directionalLight = null;

        this._initBackgroundMusic(); // Load music but don't play
    }

    _initBackgroundMusic() {
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load('sound/game_music.mp3', (buffer) => {
            this.backgroundMusic = new THREE.Audio(this.audioListener);
            this.backgroundMusic.setBuffer(buffer);
            this.backgroundMusic.setLoop(true);
            this.backgroundMusic.setVolume(0.1); // User adjusted volume
            // Do not play here
            console.log('Background music loaded.');
        }, undefined, (error) => {
            console.error('Error loading background music:', error);
        });
    }

    playBackgroundMusic() {
        if (this.backgroundMusic && !this.backgroundMusic.isPlaying) {
            this.backgroundMusic.play();
            console.log('Background music started.');
        }
    }

    stopBackgroundMusic() {
        if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
            this.backgroundMusic.stop();
            console.log('Background music stopped.');
        }
    }

    // New method to toggle music play/pause
    toggleBackgroundMusic() {
        if (this.backgroundMusic) {
            if (this.backgroundMusic.isPlaying) {
                this.backgroundMusic.pause(); // Use pause to allow resume
                console.log('Background music paused.');
            } else {
                this.backgroundMusic.play();
                console.log('Background music resumed/played.');
            }
        }
    }

    // New method to check if music is playing
    isBackgroundMusicPlaying() {
        return this.backgroundMusic ? this.backgroundMusic.isPlaying : false;
    }

    setDaySkybox(texture) {
        this.daySkybox = texture;
        this.scene.background = this.daySkybox; // Set it initially
    }

    setupLights() {
        this.ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        this.scene.add(this.ambientLight);

        this.directionalLight = new THREE.DirectionalLight(0xffffff, 2);
        this.directionalLight.position.set(10, 20, 5);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 50;
        this.scene.add(this.directionalLight);
    }

    setEnvironment(theme) {
        if (theme === 'night') {
            console.log("Switching to Night environment");
            this.ambientLight.color.setHex(0x404080);
            this.ambientLight.intensity = 0.8;
            
            this.directionalLight.color.setHex(0x5050aa);
            this.directionalLight.intensity = 1.5;
            this.directionalLight.position.set(-10, 15, -5);
            
            this.scene.background = new THREE.Color(0x101025);
        } else { // 'day'
            console.log("Switching to Day environment");
            this.ambientLight.color.setHex(0xffffff);
            this.ambientLight.intensity = 1.5;

            this.directionalLight.color.setHex(0xffffff);
            this.directionalLight.intensity = 2;
            this.directionalLight.position.set(10, 20, 5);
            
            if (this.daySkybox) {
                this.scene.background = this.daySkybox;
            } else {
                this.scene.background = new THREE.Color(0x87ceeb);
            }
        }
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}