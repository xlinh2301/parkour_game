import * as THREE from 'three';
import { createScene } from './core/Scene.js';
import { CameraSystem } from './components/Camera.js';
import { createLights } from './components/Lights.js';
import { loadCharacter } from './components/Character.js';
import { loadWorld } from './components/World.js';

const scene = createScene();
const { ambientLight, directionalLight } = createLights();
scene.add(ambientLight, directionalLight);

const canvas = document.querySelector('canvas.webgl');
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const cameraSystem = new CameraSystem(camera, renderer);

let character;

loadWorld(scene);
loadCharacter(scene).then((loadedCharacter) => {
  character = loadedCharacter;
  cameraSystem.setup(character);
});

canvas.addEventListener('click', () => {
    canvas.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
        document.addEventListener('mousemove', onMouseMove);
    } else {
        document.removeEventListener('mousemove', onMouseMove);
    }
});

function onMouseMove(event) {
    cameraSystem.handleMouseMove(event, character);
}

const clock = new THREE.Clock();

function animate() {
  const deltaTime = clock.getDelta();
  if (cameraSystem) {
    cameraSystem.update(character, deltaTime);
  }
  renderer.render(scene, camera);
  window.requestAnimationFrame(animate);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
