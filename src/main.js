import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Scene } from './components/Lights.js';
import { CameraSystem } from './components/Camera.js';
import { loadCharacterWithPhysics } from './components/Character.js';
import { loadWorldWithPhysics } from './components/World.js';
import { PhysicsWorld } from './components/Physics.js';
import { CharacterController } from './components/CharacterController.js';
import CannonDebugger from 'cannon-es-debugger';
import { Vec3 } from 'cannon-es';
import UIManager from './components/UIManager.js';
import { ParticleManager } from './components/ParticleManager.js';
import { performanceConfig } from './components/PerformanceConfig.js';

// Game state
let character = null;
let characterBody = null;
let characterController = null;
let animationMixer = null;
let gameTime = 0;
let health = 100;
let score = 0;
let level = 0;
let lastDeathCount = 0;
let particleManager = null;
const initialSpawnPos = new Vec3(0, 2, 0);

function resetGame() {
    gameTime = 0;
    health = 100;
    score = 0;
    level = 0;
    lastDeathCount = 0;

    if (gameScene) {
        gameScene.setEnvironment('day');
    }
    if (particleManager) {
        particleManager.setWeather('rain'); // Start with rain
    }

    if (characterBody) {
        characterBody.position.copy(initialSpawnPos);
        characterBody.velocity.set(0, 0, 0);
        characterBody.angularVelocity.set(0, 0, 0);
    }
    if(characterController) {
        characterController.spawnPosition.copy(initialSpawnPos);
        characterController.deathCount = 0;
    }

    particleManager = new ParticleManager(gameScene.scene, gameScene.camera);
}

function requestPointerLock() {
    const canvas = document.querySelector('canvas.webgl');
    if (canvas) canvas.requestPointerLock();
}

// UI Manager
const uiManager = new UIManager({
    onStartGame: () => {
        resetGame();
        requestPointerLock();
        gameScene.playBackgroundMusic(); // Play music on start
    },
    onExitGame: () => {
        resetGame();
        document.exitPointerLock();
        gameScene.stopBackgroundMusic(); // Stop music on exit
    },
    onResumeGame: () => {
        requestPointerLock();
        // Optionally, resume music if it was paused or stopped
        // gameScene.playBackgroundMusic(); 
    },
    // Add new callbacks for music toggle
    onToggleMusic: () => {
        gameScene.toggleBackgroundMusic();
    },
    isMusicPlaying: () => {
        return gameScene.isBackgroundMusicPlaying();
    }
});
uiManager.showLoginScreen();

// Khởi tạo scene mới
const gameScene = new Scene();
gameScene.setupLights();
particleManager = new ParticleManager(gameScene.scene, gameScene.camera);

// --- Tải Skybox ---
const gltfLoader = new GLTFLoader();
gltfLoader.load(
    '../public/models/skybox/cityskyline.glb', // Đường dẫn đến file skybox của bạn
    (gltf) => {
        let skyboxTexture = null;

        // Duyệt qua tất cả các đối tượng con trong model đã tải
        gltf.scene.traverse(function(node) {
            // Nếu tìm thấy một mesh có vật liệu và texture map
            if (node.isMesh && node.material && node.material.map) {
                skyboxTexture = node.material.map;
            }
        });

        if (skyboxTexture) {
            // Thiết lập cách THREE.js diễn giải texture này
            skyboxTexture.mapping = THREE.EquirectangularReflectionMapping;
            
            // Gán texture làm background cho scene
            gameScene.setDaySkybox(skyboxTexture);
            
            console.log('✅ Skybox loaded and set as background.');
        } else {
            console.error('❌ Could not find a texture map in the loaded skybox model.');
        }
    },
    undefined, // Bỏ qua callback tiến trình
    (error) => {
        console.error('An error happened while loading the skybox:', error);
    }
);
// --- Kết thúc tải Skybox ---

// Khởi tạo physics world
const physicsWorld = new PhysicsWorld();

// Tạo ground plane cơ bản
// physicsWorld.createGroundPlane();

const cameraSystem = new CameraSystem(gameScene.camera, gameScene.renderer);

// Load world với physics TRƯỚC, sau đó mới load character
loadWorldWithPhysics(gameScene.scene, physicsWorld).then(() => {
    console.log('🌍 World loaded with physics!');
    
    // Load character sau khi world đã sẵn sàng
    return loadCharacterWithPhysics(gameScene.scene, physicsWorld, gameScene.audioListener); // Pass audioListener
}).then((characterData) => {
  character = characterData.mesh;
  characterBody = characterData.body;
  characterBody.position.copy(initialSpawnPos);
  animationMixer = characterData.mixer;
  characterController = new CharacterController(characterBody, character, physicsWorld.world, true);
  // Đăng ký va chạm checkpoint
  characterBody.addEventListener('collide', (event) => {
    const other = event.body;
    if (other && other.meshName && other.meshName.startsWith('checkpoint_')) {
      const idStr = other.meshName.split('_')[1];
      const cpId = parseInt(idStr,10);
      if (!isNaN(cpId) && cpId > level) {
        level = cpId;

        // Add health only if it's not the final level
        if (level < 6) {
            health += 20;
            health = Math.min(100, health); // Cap health at 100
        }
        
        // Change environment based on level
        const theme = (level <= 2) ? 'day' : 'night';
        gameScene.setEnvironment(theme);
        
        // Add weather effects based on level
        if (level === 1 || level === 2) {
            particleManager.setWeather('rain');
        } else if (level === 3 || level === 4 || level === 5) {
            particleManager.setWeather('snow');
        } else {
            particleManager.setWeather('clear'); // Clear weather on other levels
        }

        if (characterController) {
          characterController.spawnPosition.copy(other.position);
        }
        console.log(`🏁 Reached checkpoint ${cpId}`);

        // --- Kiểm tra điều kiện chiến thắng ---
        if (level >= 6) {
            score = calculateScore();
            uiManager.showWinningScreen({ health: health, score: score });
            console.log('🏆 Player has won the game!');
        }
        // --- Kết thúc kiểm tra ---
      }
    }
  });
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
    if (!uiManager.isGamePaused) {
        cameraSystem.handleMouseMove(event, character);
    }
}

const clock = new THREE.Clock();

// After physicsWorld initialization and ground plane creation
const cannonDebugger = CannonDebugger(gameScene.scene, physicsWorld.world, {
  color: 0xff0000
});

function calculateScore() {
    const healthBonus = health * 50;
    const timePenalty = Math.floor(gameTime) * 10;
    const deathPenalty = (characterController ? characterController.deathCount : 0) * 200;
    
    // Score cannot be negative
    const finalScore = Math.max(0, healthBonus - timePenalty - deathPenalty);
    return finalScore;
}

function animate() {
  const deltaTime = clock.getDelta();
  
  // Giới hạn deltaTime theo performance config
  const physicsConfig = performanceConfig.getPhysicsConfig();
  const clampedDeltaTime = Math.min(deltaTime, 1 / 30); // Không cho phép dưới 30fps
  
  if (!uiManager.isGameStarted || uiManager.isGamePaused) {
    window.requestAnimationFrame(animate);
    return;
  }
  
  gameTime += clampedDeltaTime;
  
  // Update physics first với performance config
  physicsWorld.step(clampedDeltaTime);
  
  // Health and Lose Condition Check
  if (characterController && characterController.deathCount > lastDeathCount) {
    const death_penalty = 20;
    health -= death_penalty;
    lastDeathCount = characterController.deathCount;

    if (health <= 0) {
        health = 0; // Prevent negative health display
        score = calculateScore();
        uiManager.showLosingScreen({ score: score });
    }
  }

  // Sync character mesh with physics body
  if (character && characterBody) {
    physicsWorld.syncObject(character, characterBody);
    
    // Cập nhật UI theo performance config
    const uiConfig = performanceConfig.getUIConfig();
    if (performanceConfig.shouldUpdate('ui', animate.lastUIUpdate || 0)) {
      uiManager.updateInGameUI({
          level: level,
          time: gameTime,
          health: health
      });
      animate.lastUIUpdate = performance.now();
    }
  }
  
  // Update camera
  if (cameraSystem && character) {
    cameraSystem.update(character, clampedDeltaTime);
  }
  
  // Update character movement
  if (characterController && cameraSystem) {
    characterController.update(cameraSystem.currentRotation.y, clampedDeltaTime);
  }
  
  // Update animation mixer với fixed timestep
  if (animationMixer) {
    animationMixer.update(clampedDeltaTime);
  }

  // Update particle effects theo performance config
  if (particleManager) {
    if (performanceConfig.shouldUpdate('particles', animate.lastParticleUpdate || 0)) {
      particleManager.update();
      animate.lastParticleUpdate = performance.now();
    }
  }
  
  // Update physics debug visuals (tắt để tối ưu hiệu năng)
  // cannonDebugger.update();
  
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
