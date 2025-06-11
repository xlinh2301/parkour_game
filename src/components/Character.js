import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';

export function loadCharacter(scene) {
  return new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load('models/character/luoli_run.glb', (gltf) => {
      const character = gltf.scene;
      // Giảm kích thước nhân vật nhỏ hơn để phù hợp tỉ lệ thế giới
      character.scale.set(0.001, 0.001, 0.001);
      character.position.set(0, 5, 0);
      scene.add(character);
      resolve(character);
    });
  });
}

export function loadCharacterWithPhysics(scene, physicsWorld) {
  return new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load('models/character/luoli_run.glb', (gltf) => {
      const character = gltf.scene;
      // Giảm kích thước nhân vật nhỏ hơn để phù hợp tỉ lệ thế giới
      character.scale.set(0.002, 0.002, 0.002);
      character.position.set(0, 2, 0); // Spawn vừa phải, rơi xuống ground plane
      
      // Tạo AnimationMixer cho character
      const mixer = new THREE.AnimationMixer(character);
      
      // Log tất cả animations có sẵn
      console.log('Available animations:', gltf.animations.map(clip => clip.name));
      
      // Tìm và phát animation chạy
      let runAction = null;
      let idleAction = null;
      
      gltf.animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        console.log('Animation clip:', clip.name);
        
        // Tìm animation chạy (có thể có tên khác nhau)
        if (clip.name.toLowerCase().includes('run') || 
            clip.name.toLowerCase().includes('walk') ||
            clip.name.toLowerCase().includes('jog')) {
          runAction = action;
          console.log('🏃 Found run animation:', clip.name);
        }
        
        // Tìm animation đứng yên
        if (clip.name.toLowerCase().includes('idle') || 
            clip.name.toLowerCase().includes('stand')) {
          idleAction = action;
          console.log('🧍 Found idle animation:', clip.name);
        }
      });
      
      // Nếu không tìm thấy animation cụ thể, phát animation đầu tiên
      if (!runAction && gltf.animations.length > 0) {
        runAction = mixer.clipAction(gltf.animations[0]);
        console.log('🎬 Using first animation as run:', gltf.animations[0].name);
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
      character.userData.isMoving = false;
      
      // Debug: log collisions
      characterBody.addEventListener('collide', (event) => {
        const other = event.body;
        console.log(`🤝 Character collided with body id=${other.id}, meshName=${other.meshName || 'N/A'}`);
      });
      
      console.log('✅ Character loaded with physics and animations!');
      
      resolve({
        mesh: character,
        body: characterBody,
        mixer: mixer,
        runAction: runAction,
        idleAction: idleAction
      });
    });
  });
} 