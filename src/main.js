import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createScene } from './core/Scene.js';
import { createCamera } from './components/Camera.js';
import { createLights } from './components/Lights.js';
import { loadCharacter } from './components/Character.js';
import { loadWorld } from './components/World.js';

const scene = createScene();
const camera = createCamera();
const { ambientLight, directionalLight } = createLights();
scene.add(ambientLight, directionalLight);

loadWorld(scene);
loadCharacter(scene);

const canvas = document.querySelector('canvas.webgl');
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

function animate() {
  controls.update();
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
