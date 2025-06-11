import * as THREE from 'three';
import { World, Box, Body, Vec3, Material, ContactMaterial, NaiveBroadphase } from 'cannon-es';

export class PhysicsWorld {
    constructor() {
        // Debug: Check if imports work
        console.log('World:', World);
        console.log('Box:', Box);
        
        // Tạo physics world
        this.world = new World();
        this.world.gravity.set(0, -9.81, 0); // Trọng lực
        this.world.broadphase = new NaiveBroadphase();
        
        // Contact material cho va chạm mượt
        this.defaultMaterial = new Material('default');
        const defaultContactMaterial = new ContactMaterial(
            this.defaultMaterial,
            this.defaultMaterial,
            {
                friction: 0.4,
                restitution: 0.1,
            }
        );
        this.world.addContactMaterial(defaultContactMaterial);
        this.world.defaultContactMaterial = defaultContactMaterial;
        
        this.staticBodies = [];
        this.dynamicBodies = [];
    }

    createBoxCollisionFromMesh(mesh) {
        // Force update matrix world to ensure we have correct transformations
        mesh.updateMatrixWorld(true);
        
        // Clone the geometry to avoid shared bounding box issues
        const geometry = mesh.geometry.clone();
        geometry.computeBoundingBox();
        
        const localBox = geometry.boundingBox;
        const size = new THREE.Vector3();
        localBox.getSize(size);
    
        // Decompose the world matrix to get the final position, rotation, and scale
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        mesh.matrixWorld.decompose(position, quaternion, scale);
    
        // Apply the final world scale to the local size of the box
        size.multiply(scale);
    
        // Ensure the box has a minimum thickness to prevent physics issues
        const minSize = 0.02;
        size.x = Math.max(size.x, minSize);
        size.y = Math.max(size.y, minSize);
        size.z = Math.max(size.z, minSize);

        // The center of the local bounding box might be offset from the mesh's pivot.
        // This offset must be scaled and rotated to find the final world center of the geometry.
        const centerOffset = new THREE.Vector3();
        localBox.getCenter(centerOffset);
        centerOffset.multiply(scale);
        centerOffset.applyQuaternion(quaternion);

        // Calculate the final world position of the geometry's center
        const finalPosition = new THREE.Vector3().copy(position).add(centerOffset);
    
        // Compute world bounding box using Three.js helper for comparison
        const worldBox = new THREE.Box3().setFromObject(mesh);
        const worldSize = new THREE.Vector3();
        const worldCenter = new THREE.Vector3();
        worldBox.getSize(worldSize);
        worldBox.getCenter(worldCenter);

        // Log the mesh name and calculated values for debugging
        console.log(`Mesh: ${mesh.name || 'unnamed'}`);
        console.log('  Local bounding box min:', localBox.min, 'max:', localBox.max);
        console.log('  Scale:', scale);
        console.log('  Calculated collision size (scaled):', size);
        console.log('  World bounding box size (Three.js):', worldSize);
        console.log('  Collision box center (finalPosition):', finalPosition);
        console.log('  World bounding box center (Three.js):', worldCenter);
        console.log('  Delta center:', new THREE.Vector3().subVectors(finalPosition, worldCenter));
        console.log('------------------------------------------------------');
    
        // Create the Cannon shape
        const shape = new Box(new Vec3(size.x / 2, size.y / 2, size.z / 2));
        
        const body = new Body({ mass: 0 }); // Static body
        body.addShape(shape); // The shape's center is the body's origin
        
        // Set the body's final position and rotation
        body.position.set(finalPosition.x, finalPosition.y, finalPosition.z);
        body.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
      
        body.material = this.defaultMaterial;
        body.meshName = mesh.name || 'unnamed';
        this.world.addBody(body);
        this.staticBodies.push(body);
      
        // Clean up cloned geometry
        geometry.dispose();
      
        return body;
    }
    

    // Tạo ground plane cơ bản để character center ở y=0.9
    createGroundPlane() {
        const groundShape = new Box(new Vec3(50, 0.05, 50)); // Plane lớn, rất mỏng
        const groundBody = new Body({ mass: 0 }); // Static
        groundBody.addShape(groundShape);
        groundBody.position.set(0, 0, 0); // Đặt center ở y=0 để mặt trên ở y=0.05
        groundBody.material = this.defaultMaterial;
        
        this.world.addBody(groundBody);
        this.staticBodies.push(groundBody);
        
        console.log('✅ Physics ground plane created at y=0 (surface at y=0.05, character center will be at y=0.95)');
        return groundBody;
    }

    // Tạo nhân vật physics (capsule hoặc box)
    createCharacterBody(position = { x: 0, y: 1, z: 0 }) {
        const characterShape = new Box(new Vec3(0.3, 0.9, 0.3));
        const characterBody = new Body({ 
            mass: 0,  // Thay đổi từ 0 thành 1 để nhân vật có thể di chuyển
            fixedRotation: true,  // Giữ cho nhân vật không bị lật ngã
            // position: new Vec3(0, 0.01, 0)
        }); 
        characterBody.addShape(characterShape);
        characterBody.position.set(position.x, position.y, position.z);
        characterBody.material = this.defaultMaterial;
        
        characterBody.updateMassProperties();
        
        this.world.addBody(characterBody);
        return characterBody;
    }

    // Update physics
    step(deltaTime) {
        this.world.step(deltaTime);
    }

    // Sync Three.js object với Cannon body
    syncObject(threeObject, cannonBody) {
        threeObject.position.copy(cannonBody.position);
        threeObject.quaternion.copy(cannonBody.quaternion);
    }

    // Debug: Hiển thị thống kê
    getStats() {
        return {
            staticBodies: this.staticBodies.length,
            totalBodies: this.world.bodies.length
        };
    }

    /**
     * Tạo body động (mass > 0) từ một mesh. Shape là Box dựa trên bounding-box thế giới
     * Giữ fixedRotation mặc định true để nhân vật không bị lật.
     */
    createDynamicBoxFromMesh(mesh, options = {}) {
        const { mass = 1, fixedRotation = true, shrinkXZ = 1.0, shrinkY = 1.0 } = options;
        // Force update matrix world
        mesh.updateMatrixWorld(true);

        let size, finalPosition, quaternion;

        if (mesh.geometry) {
            // clone geometry and compute bounding box in local space
            const geometry = mesh.geometry.clone();
            geometry.computeBoundingBox();

            const localBox = geometry.boundingBox;
            size = new THREE.Vector3();
            localBox.getSize(size);

            // decompose world matrix for position/rotation/scale
            const position = new THREE.Vector3();
            quaternion = new THREE.Quaternion();
            const scale = new THREE.Vector3();
            mesh.matrixWorld.decompose(position, quaternion, scale);

            // Apply scale
            size.multiply(scale);

            // Minimum thickness to avoid issues
            const minSize = 0.02;
            size.x = Math.max(size.x, minSize);
            size.y = Math.max(size.y, minSize);
            size.z = Math.max(size.z, minSize);

            // center offset handling
            const centerOffset = new THREE.Vector3();
            localBox.getCenter(centerOffset);
            centerOffset.multiply(scale);
            centerOffset.applyQuaternion(quaternion);

            // Always use world bounding-box center as finalPosition
            const worldBoxFinal = new THREE.Box3().setFromObject(mesh);
            const worldCenterFinal = new THREE.Vector3();
            worldBoxFinal.getCenter(worldCenterFinal);
            finalPosition = worldCenterFinal;

            geometry.dispose();
        } else {
            // Fallback for Group/Object3D without geometry: use world bounding box
            const worldBox = new THREE.Box3().setFromObject(mesh);
            size = new THREE.Vector3();
            worldBox.getSize(size);
            finalPosition = new THREE.Vector3();
            worldBox.getCenter(finalPosition);
            quaternion = new THREE.Quaternion(); // identity
            // Ensure min thickness
            const minSize = 0.02;
            size.x = Math.max(size.x, minSize);
            size.y = Math.max(size.y, minSize);
            size.z = Math.max(size.z, minSize);
        }

        // Apply shrink factors (allow slimming X/Z while preserving height)
        size.x *= shrinkXZ;
        size.z *= shrinkXZ;
        size.y *= shrinkY;

        // Make shape with shrunk size
        const shape = new Box(new Vec3(size.x / 2, size.y / 2, size.z / 2));
        const body = new Body({ mass, fixedRotation });
        body.addShape(shape);
        body.position.set(finalPosition.x, finalPosition.y, finalPosition.z);
        body.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
        body.material = this.defaultMaterial;
        body.meshName = mesh.name || 'unnamed';

        this.world.addBody(body);
        this.dynamicBodies.push(body);

        return body;
    }
} 