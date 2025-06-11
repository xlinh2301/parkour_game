import * as THREE from 'three';
import { Scene } from './components/Lights.js';
import { CameraSystem } from './components/Camera.js';
import { loadCharacterWithPhysics } from './components/Character.js';
import { loadWorldWithPhysics } from './components/World.js';
import { PhysicsWorld } from './components/Physics.js';
import { CharacterController } from './components/CharacterController.js';
import CannonDebugger from 'cannon-es-debugger';

// Khởi tạo scene mới
const gameScene = new Scene();
gameScene.setupLights();

// Khởi tạo physics world
const physicsWorld = new PhysicsWorld();

// Tạo ground plane cơ bản
physicsWorld.createGroundPlane();

const cameraSystem = new CameraSystem(gameScene.camera, gameScene.renderer);

let character = null;
let characterBody = null;
let characterController = null;
let animationMixer = null;

// Load world với physics TRƯỚC, sau đó mới load character
loadWorldWithPhysics(gameScene.scene, physicsWorld).then(() => {
    console.log('🌍 World loaded with physics!');
    
    // Load character sau khi world đã sẵn sàng
    return loadCharacterWithPhysics(gameScene.scene, physicsWorld);
}).then((characterData) => {
  character = characterData.mesh;
  characterBody = characterData.body;
  animationMixer = characterData.mixer;
  characterController = new CharacterController(characterBody, character, physicsWorld.world, true);
  cameraSystem.setup(character);
  console.log('👤 Character setup complete with animations!');
}).catch((error) => {
  console.error('❌ Error loading game:', error);
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

// After physicsWorld initialization and ground plane creation
const cannonDebugger = CannonDebugger(gameScene.scene, physicsWorld.world, {
  color: 0xff0000
});

function animate() {
  const deltaTime = clock.getDelta();
  
  // Update physics first
  physicsWorld.step(deltaTime);
  
  // Sync character mesh with physics body
  if (character && characterBody) {
    physicsWorld.syncObject(character, characterBody);
    
    // Debug: Log character position occasionally
    // if (Math.floor(Date.now() / 1000) % 2 === 0) {
    //   console.log(`Character position: (${characterBody.position.x.toFixed(2)}, ${characterBody.position.y.toFixed(2)}, ${characterBody.position.z.toFixed(2)}), velocity.y: ${characterBody.velocity.y.toFixed(2)}`);
    // }
  }
  
  // Update camera
  if (cameraSystem && character) {
    cameraSystem.update(character, deltaTime);
  }
  
  // Update character movement
  if (characterController && cameraSystem) {
    characterController.update(cameraSystem.currentRotation.y, deltaTime);
  }
  
  // Update animation mixer
  if (animationMixer) {
    animationMixer.update(deltaTime);
  }

  // Update physics debug visuals
  cannonDebugger.update();
  
  // Render
  gameScene.renderer.render(gameScene.scene, gameScene.camera);
  window.requestAnimationFrame(animate);
}

animate();

window.addEventListener('resize', () => {
  gameScene.handleResize();
});

// Debug: Log physics stats every 5 seconds
setInterval(() => {
  const stats = physicsWorld.getStats();
  console.log(`📊 Physics Stats: ${stats.staticBodies} static bodies, ${stats.totalBodies} total bodies`);
}, 5000);
