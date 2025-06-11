import { AmbientLight, DirectionalLight } from 'three';

export function createLights() {
  const ambientLight = new AmbientLight(0xffffff, 0.5);

  const directionalLight = new DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(0, 10, 5);

  return { ambientLight, directionalLight };
} 