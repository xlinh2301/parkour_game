import * as THREE from 'three';

export class ParticleManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.weatherSystems = {};
        this.activeWeather = null;
        this.fireworksActive = false;
        this.fireworkParticles = []; // To store active firework rockets and their explosions

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

    _createFireworks() {
        // This system is more dynamic; particles are created on demand by startFireworks
        // We can pre-create a material or geometry if needed, but for now, let's create them dynamically.
        console.log('Fireworks system ready.');
        return {
            // No persistent points object like rain/snow
            update: () => {
                const newFireworksParticles = [];
                for (let i = 0; i < this.fireworkParticles.length; i++) {
                    const p = this.fireworkParticles[i];
                    p.velocity.y -= 0.01; // Gravity for rockets/sparks
                    p.position.add(p.velocity);
                    p.lifetime -= 1;

                    if (p.mesh) {
                        p.mesh.position.copy(p.position);
                        p.mesh.material.opacity = Math.max(0, p.lifetime / p.initialLifetime); // Fade out
                    }

                    if (p.lifetime <= 0) {
                        if (p.mesh) this.scene.remove(p.mesh);
                        if (p.isRocket && p.explode) {
                            p.explode(); // Trigger explosion
                        }
                        // Otherwise, particle just dies
                    } else {
                        newFireworksParticles.push(p);
                    }
                }
                this.fireworkParticles = newFireworksParticles;
                if (this.fireworkParticles.length === 0) {
                    this.fireworksActive = false;
                }
            }
        };
    }

    _createAllWeatherSystems() {
        this.weatherSystems.rain = this._createRain();
        this.weatherSystems.snow = this._createSnow();
        this.weatherSystems.fireworks = this._createFireworks(); // Add fireworks system
        console.log('All weather systems created and ready.');
    }

    startFireworks(count = 5, duration = 180) { // Launch 5 rockets, effect lasts ~3 seconds
        if (this.fireworksActive) return;
        this.fireworksActive = true;
        console.log('Starting fireworks!');

        const launchExplosion = (rocketPosition) => {
            const numSparks = 50 + Math.random() * 50;
            const explosionColor = new THREE.Color(Math.random(), Math.random(), Math.random());
            for (let i = 0; i < numSparks; i++) {
                const sparkGeometry = new THREE.SphereGeometry(0.05, 8, 8); // Smaller sparks
                const sparkMaterial = new THREE.MeshBasicMaterial({
                    color: explosionColor,
                    transparent: true,
                    opacity: 0.8
                });
                const sparkMesh = new THREE.Mesh(sparkGeometry, sparkMaterial);
                sparkMesh.position.copy(rocketPosition);
                this.scene.add(sparkMesh);

                const velocity = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.3,
                    (Math.random() - 0.5) * 0.3,
                    (Math.random() - 0.5) * 0.3
                );
                this.fireworkParticles.push({
                    mesh: sparkMesh,
                    position: sparkMesh.position.clone(),
                    velocity: velocity,
                    lifetime: 60 + Math.random() * 60, // Sparks last 1-2 seconds
                    initialLifetime: 60 + Math.random() * 60,
                    isRocket: false
                });
            }
        };

        for (let i = 0; i < count; i++) {
            // Delay each rocket launch slightly
            setTimeout(() => {
                const rocketGeometry = new THREE.SphereGeometry(0.1, 8, 8);
                const rocketMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffff00, // Yellowish rocket
                    transparent: true,
                    opacity: 1
                });
                const rocketMesh = new THREE.Mesh(rocketGeometry, rocketMaterial);
                
                // Launch from different positions around the character/camera
                const launchX = this.camera.position.x + (Math.random() - 0.5) * 30;
                const launchZ = this.camera.position.z + (Math.random() - 0.5) * 30;
                const launchY = this.camera.position.y - 5; // Start below camera view, shoot up

                rocketMesh.position.set(launchX, launchY, launchZ);
                this.scene.add(rocketMesh);

                const rocketLifetime = 90 + Math.random() * 30; // Rocket flies for 1.5-2s

                this.fireworkParticles.push({
                    mesh: rocketMesh,
                    position: rocketMesh.position.clone(),
                    velocity: new THREE.Vector3(
                        (Math.random() - 0.5) * 0.05, // Slight horizontal spread
                        0.2 + Math.random() * 0.1,  // Upward velocity
                        (Math.random() - 0.5) * 0.05
                    ),
                    lifetime: rocketLifetime,
                    initialLifetime: rocketLifetime,
                    isRocket: true,
                    explode: () => launchExplosion(rocketMesh.position)
                });
            }, i * 300); // Stagger launches by 300ms
        }
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
        if (this.activeWeather && this.weatherSystems[this.activeWeather] && this.weatherSystems[this.activeWeather].points) {
            this.weatherSystems[this.activeWeather].update();
        }
        // Always update fireworks if active
        if (this.fireworksActive && this.weatherSystems.fireworks) {
            this.weatherSystems.fireworks.update();
        }
    }
}