import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';

// Tạo visual ground plane
export function createVisualGroundPlane(scene) {
  const groundGeometry = new THREE.PlaneGeometry(100, 100); // Plane 100x100
  const groundMaterial = new THREE.MeshLambertMaterial({ 
    color: 0x228B22, // Màu xanh lá đậm
    side: THREE.DoubleSide
  });
  
  const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
  groundPlane.rotation.x = -Math.PI / 2; // Xoay để nằm ngang
  groundPlane.position.set(0, 0, 0); // Đặt ở y=-0.9 để khớp với physics plane
  groundPlane.receiveShadow = true; // Nhận shadow
  
  scene.add(groundPlane);
  console.log('✅ Visual ground plane created');
  return groundPlane;
}

export function loadWorld(scene) {
  const loader = new GLTFLoader();
  loader.load('models/environment/map.glb', (gltf) => {
    scene.add(gltf.scene);
  });
}

export function loadWorldWithPhysics(scene, physicsWorld) {
  return new Promise((resolve) => {
    const loader = new GLTFLoader();
    const textureLoader = new THREE.TextureLoader();
    
    // Load texture 1 (your rock texture)
    const rockTexture = textureLoader.load('../public/texure/822.jpg', (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
    });

    // Load texture 2
    const previewTexture = textureLoader.load('../public/texure/preview.jpg', (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4); // Use a different repeat for variety
    });

    // Load texture 3
    const brightTexture = textureLoader.load('../public/texure/bright.jpg', (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(3, 3);
    });

    // Load texture 4
    const abstractTexture = textureLoader.load('../public/texure/vivid-abstract-background-cubes.jpg', (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1); // No repeat for this one, to show the full abstract image
    });

    const textures = [rockTexture, previewTexture, brightTexture, abstractTexture];

    loader.load('models/environment/map.glb', (gltf) => {
      const worldModel = gltf.scene;
      
      console.log('Loading world with physics...');
      
      scene.add(worldModel);
      
      scene.updateMatrixWorld(true);
      
      let physicsBodyCount = 0;
      
      worldModel.traverse((child) => {
        if (child.isMesh) {
          // Randomly choose which texture to apply
          const chosenTexture = textures[Math.floor(Math.random() * textures.length)];

          child.material = new THREE.MeshStandardMaterial({
              map: chosenTexture
          });
          
          child.castShadow = true;
          child.receiveShadow = true;
          
          const physicsBody = physicsWorld.createBoxCollisionFromMesh(child);
          
          if (physicsBody) {
            child.userData.physicsBody = physicsBody;
            physicsBodyCount++;
          }
        }
      });
      
      const stats = physicsWorld.getStats();
      console.log(`✅ World loaded! Added ${physicsBodyCount} physics bodies (${stats.totalBodies} total bodies)`);
      
      resolve(worldModel);
    }, 
    (progress) => {
      console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
    },
    (error) => {
      console.error('Error loading world:', error);
    });
  });
} 