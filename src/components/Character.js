import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function loadCharacter(scene) {
  const loader = new GLTFLoader();
  loader.load('models/character/luoli_run.glb', (gltf) => {
    const character = gltf.scene;
    character.scale.set(0.002, 0.002, 0.002);
    character.position.set(0, 0, 0);
    scene.add(character);
  });
} 