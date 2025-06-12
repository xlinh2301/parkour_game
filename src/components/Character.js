import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';

export function loadCharacter(scene) {
  return new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load('models/character/nhanvat.glb', (gltf) => {
      const character = gltf.scene;
      // Giảm kích thước nhân vật nhỏ hơn để phù hợp tỉ lệ thế giới
      character.scale.set(0.001, 0.001, 0.001);
      character.position.set(0, 4, 0);
      scene.add(character);
      resolve(character);
    });
  });
}

export function loadCharacterWithPhysics(scene, physicsWorld, audioListener) { // Added audioListener
  return new Promise((resolve, reject) => { // Added reject for error handling
    const loader = new GLTFLoader();
    loader.load('models/character/nhanvat.glb', (gltf) => {
      const character = gltf.scene;
      // Tăng kích thước nhân vật lên gấp 10 lần so với trước đây
      character.scale.set(0.2, 0.2, 0.2);
      character.position.set(0, 4, 0); // Spawn vừa phải, rơi xuống ground plane
      
      // Tạo AnimationMixer cho character
      const mixer = new THREE.AnimationMixer(character);
      
      // Log tất cả animations có sẵn
      // console.log('Available animations:', gltf.animations.map(clip => clip.name));
      
      // Tìm và phát animation chạy, idle, jump
      let runAction = null;
      let idleAction = null;
      let jumpAction = null;
      
      gltf.animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        // console.log('Animation clip:', clip.name);
        
        // Tìm animation chạy
        if (clip.name.toLowerCase().includes('run')) {
          runAction = action;
          console.log('🏃 Found run animation:', clip.name);
        }
        // Tìm animation đứng yên
        if (clip.name.toLowerCase().includes('idle')) {
          idleAction = action;
          console.log('🧍 Found idle animation:', clip.name);
        }
        // Tìm animation nhảy
        if (clip.name.toLowerCase().includes('jump')) {
          jumpAction = action;
          console.log('🦘 Found jump animation:', clip.name);
        }
      });
      
      // Nếu không tìm thấy animation cụ thể, phát animation đầu tiên
      if (!runAction && gltf.animations.length > 0) {
        runAction = mixer.clipAction(gltf.animations[0]);
        // console.log('🎬 Using first animation as run:', gltf.animations[0].name);
      }
      if (!idleAction && gltf.animations.length > 0) {
        idleAction = mixer.clipAction(gltf.animations[0]);
        console.log('🎬 Using first animation as idle:', gltf.animations[0].name);
      }
      if (!jumpAction && gltf.animations.length > 0) {
        jumpAction = mixer.clipAction(gltf.animations[0]);
        console.log('🎬 Using first animation as jump:', gltf.animations[0].name);
      }
      
      // Phát animation idle mặc định
      if (idleAction) {
        idleAction.play();
      }
      
      // Enable shadows cho character   
      character.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      scene.add(character);
      
      // Tạo physics body dựa trên mesh thực tế (kích thước khớp bounding box)
      const characterBody = physicsWorld.createDynamicBoxFromMesh(character, {
        mass: 1,
        fixedRotation: true,
        shrinkXZ: 0.5,
        shrinkY: 0.9
      });
      
      // Lưu reference
      character.userData.physicsBody = characterBody;
      character.userData.mixer = mixer;
      character.userData.runAction = runAction;
      character.userData.idleAction = idleAction;
      character.userData.jumpAction = jumpAction;
      character.userData.isMoving = false;

      // Load sounds
      const soundLoader = new THREE.AudioLoader();
      let jumpSound, runSound;

      const soundsToLoad = [
        { name: 'jumpSound', path: 'sound/jump.mp3' },
        { name: 'runSound', path: 'sound/run.mp3' }
      ];
      let soundsLoaded = 0;

      soundsToLoad.forEach(soundInfo => {
        soundLoader.load(soundInfo.path, (buffer) => {
          const sound = new THREE.Audio(audioListener);
          sound.setBuffer(buffer);
          if (soundInfo.name === 'runSound') {
            sound.setLoop(true); // Loop running sound
            sound.setVolume(0.5); // Adjust volume as needed
            runSound = sound;
            character.userData.runSound = runSound;
          } else if (soundInfo.name === 'jumpSound') {
            sound.setVolume(0.7); // Adjust volume as needed
            jumpSound = sound;
            character.userData.jumpSound = jumpSound;
          }
          soundsLoaded++;
          if (soundsLoaded === soundsToLoad.length) {
            console.log('🔊 All character sounds loaded!');
            resolve({
              mesh: character,
              body: characterBody,
              mixer: mixer,
              runAction: runAction,
              idleAction: idleAction,
              jumpAction: jumpAction
              // Sounds are attached to character.userData directly
            });
          }
        }, undefined, (error) => {
          console.error(`Error loading sound ${soundInfo.path}:`, error);
          // Potentially reject or resolve without this sound
          soundsLoaded++;
          if (soundsLoaded === soundsToLoad.length) {
             // Resolve even if some sounds failed, to not block game load
            console.warn('Proceeding with character load despite some sound errors.');
            resolve({
              mesh: character,
              body: characterBody,
              mixer: mixer,
              runAction: runAction,
              idleAction: idleAction,
              jumpAction: jumpAction
            });
          }
        });
      });
      
      // Debug: log collisions
      characterBody.addEventListener('collide', (event) => {
        const other = event.body;
        console.log(`🤝 Character collided with body id=${other.id}, meshName=${other.meshName || 'N/A'}`);
      });
      
      // console.log('✅ Character loaded with physics and animations!');
      
      // Resolve is now handled after sounds are loaded (or failed)
      // resolve({
      //   mesh: character,
      //   body: characterBody,
      //   mixer: mixer,
      //   runAction: runAction,
      //   idleAction: idleAction
      // });
    }, undefined, (error) => { // Added error callback for GLTFLoader
        console.error('Error loading character model:', error);
        reject(error);
    });
  });
}