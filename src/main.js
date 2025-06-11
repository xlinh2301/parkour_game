import * as THREE from 'three';
import { Scene } from './components/Lights.js';
import { CameraSystem } from './components/Camera.js';
import { loadCharacter } from './components/Character.js';
import { loadWorld } from './components/World.js';

// Khởi tạo scene mới
const gameScene = new Scene();
gameScene.setupLights();

const cameraSystem = new CameraSystem(gameScene.camera, gameScene.renderer);

let character;

loadWorld(gameScene.scene);
loadCharacter(gameScene.scene).then((loadedCharacter) => {
  character = loadedCharacter;
  cameraSystem.setup(character);
});

const canvas = document.querySelector('canvas.webgl');

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
  gameScene.renderer.render(gameScene.scene, gameScene.camera);
  window.requestAnimationFrame(animate);
}

animate();

window.addEventListener('resize', () => {
  gameScene.handleResize();
});
