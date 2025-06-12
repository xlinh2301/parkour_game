import * as THREE from 'three';

export class ParticleManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.weatherSystems = {};
        this.activeWeather = null;

        this._createAllWeatherSystems();
    }

    _createRain() {
        const particleCount = 6000;
        const particles = new THREE.BufferGeometry();
        const positions = [];

        for (let i = 0; i < particleCount; i++) {
            positions.push(
                (Math.random() - 0.5) * 50,
                Math.random() * 50,
                (Math.random() - 0.5) * 50
            );
        }

        particles.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xaaaaee,
            size: 0.08,
            transparent: true,
            opacity: 0.25
        });

        const points = new THREE.Points(particles, material);
        points.visible = false;
        this.scene.add(points);

        return {
            points,
            update: () => {
                const positions = points.geometry.attributes.position.array;
                const cameraX = this.camera.position.x;
                const cameraZ = this.camera.position.z;

                for (let i = 0; i < particleCount; i++) {
                    positions[i * 3 + 1] -= 0.25; // Faster fall speed for rain

                    // If particle is below the camera, reset it to the top
                    if (positions[i * 3 + 1] < -10) {
                        positions[i * 3] = cameraX + (Math.random() - 0.5) * 50;
                        positions[i * 3 + 1] = 40;
                        positions[i * 3 + 2] = cameraZ + (Math.random() - 0.5) * 50;
                    }
                }
                points.geometry.attributes.position.needsUpdate = true;
            }
        };
    }

    _createSnow() {
        const particleCount = 5000;
        const particles = new THREE.BufferGeometry();
        const positions = [];

        for (let i = 0; i < particleCount; i++) {
            positions.push(
                (Math.random() - 0.5) * 50, // x
                Math.random() * 50,         // y
                (Math.random() - 0.5) * 50  // z
            );
        }

        particles.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.1,
            transparent: true,
            opacity: 0.3
        });

        const points = new THREE.Points(particles, material);
        points.visible = false;
        this.scene.add(points);

        return {
            points,
            update: () => {
                const positions = points.geometry.attributes.position.array;
                const cameraX = this.camera.position.x;
                const cameraZ = this.camera.position.z;

                for (let i = 0; i < particleCount; i++) {
                    positions[i * 3 + 1] -= 0.05; // Fall speed
                    
                    // Add some sway
                    positions[i * 3] += Math.sin(positions[i * 3 + 1] * 0.5) * 0.01;

                    if (positions[i * 3 + 1] < -10) {
                        // Reset particle to a new position above the player
                        positions[i * 3] = cameraX + (Math.random() - 0.5) * 50;
                        positions[i * 3 + 1] = 40;
                        positions[i * 3 + 2] = cameraZ + (Math.random() - 0.5) * 50;
                    }
                }
                points.geometry.attributes.position.needsUpdate = true;
            }
        };
    }

    _createAllWeatherSystems() {
        this.weatherSystems.rain = this._createRain();
        this.weatherSystems.snow = this._createSnow();
        console.log('All weather systems created and ready.');
    }

    setWeather(weatherType) { // 'rain', 'snow', or 'clear'
        if (this.activeWeather === weatherType) return;

        // Hide the current weather
        if (this.activeWeather && this.weatherSystems[this.activeWeather]) {
            this.weatherSystems[this.activeWeather].points.visible = false;
        }

        // Show the new weather
        if (weatherType && this.weatherSystems[weatherType]) {
            this.weatherSystems[weatherType].points.visible = true;
            this.activeWeather = weatherType;
            console.log(`Switched weather to: ${weatherType}`);
        } else {
            this.activeWeather = null;
            console.log('Weather cleared');
        }
    }

    update() {
        if (this.activeWeather && this.weatherSystems[this.activeWeather]) {
            this.weatherSystems[this.activeWeather].update();
        }
    }
} 