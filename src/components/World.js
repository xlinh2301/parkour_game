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
    loader.load('models/environment/map.glb', (gltf) => {
      const worldModel = gltf.scene;
      
      console.log('Loading world with physics...');
      
      // Add to scene first to ensure proper scene graph setup
      scene.add(worldModel);
      
      // Force update the entire scene graph
      scene.updateMatrixWorld(true);
      
      let physicsBodyCount = 0;
      
      // Duyệt qua tất cả objects trong model
      worldModel.traverse((child) => {
        if (child.isMesh) {
          console.log('Processing mesh:', child.name || 'unnamed mesh');
          
          // Enable shadows
          child.castShadow = true;
          child.receiveShadow = true;
          
          // Kích hoạt lại collision từ model parkour
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
    // Progress callback
    (progress) => {
      console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
    },
    // Error callback
    (error) => {
      console.error('Error loading world:', error);
    });
  });
} 