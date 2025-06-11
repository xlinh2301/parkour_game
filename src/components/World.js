import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function loadWorld(scene) {
  const loader = new GLTFLoader();
  loader.load('models/environment/parkour.glb', (gltf) => {
    scene.add(gltf.scene);
  });
} 