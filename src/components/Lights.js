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

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(10, 15, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        this.scene.add(directionalLight);
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}