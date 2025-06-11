import { Vec3, RaycastResult } from 'cannon-es';
import * as THREE from 'three';

export class CharacterController {
    constructor(body, character = null, world = null) {
        this.body = body;
        this.character = character;
        this.world = world;

        this.speed = 8;
        this.jumpForce = 2; // Nhảy nhẹ hơn

        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false
        };

        this.inputVelocity = new Vec3();
        this.isOnGround = false;
        this.prevIsOnGround = false;

        this.raycastResult = new RaycastResult();
        if (this.body && this.body.shapes && this.body.shapes.length > 0) {
            this.groundCheckDistance = this.body.shapes[0].halfExtents.y + 0.15;
        } else {
            this.groundCheckDistance = 1.0;
        }

        this.jumpCooldown = 0;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));
    }

    onKeyDown(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = true;
                break;
            case 'Space':
                this.keys.jump = true;
                event.preventDefault();
                break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = false;
                break;
            case 'Space':
                this.keys.jump = false;
                break;
        }
    }

    checkGrounded() {
        if (!this.world) {
            this.isOnGround = false;
            return;
        }

        // Nếu đang di chuyển lên (vận tốc dương), bỏ qua kiểm tra "ground" để tránh nhận diện sai
        const upwardThreshold = 0.1;
        if (this.body.velocity.y > upwardThreshold) {
            this.isOnGround = false;
            return;
        }

        const start = this.body.position;
        const end = new Vec3(start.x, start.y - this.groundCheckDistance, start.z);

        this.raycastResult.reset();
        this.world.raycastClosest(start, end, {}, this.raycastResult);

        this.isOnGround = this.raycastResult.hasHit && this.raycastResult.body !== this.body;
    }

    updateAnimation(isMoving) {
        if (!this.character) return;

        const runAction = this.character.userData.runAction;
        const idleAction = this.character.userData.idleAction;

        if (isMoving && !this.character.userData.isMoving) {
            if (idleAction) idleAction.fadeOut(0.3);
            if (runAction) runAction.reset().fadeIn(0.3).play();
            this.character.userData.isMoving = true;
        } else if (!isMoving && this.character.userData.isMoving) {
            if (runAction) runAction.fadeOut(0.3);
            if (idleAction) idleAction.reset().fadeIn(0.3).play();
            this.character.userData.isMoving = false;
        }
    }

    update(cameraRotationY, deltaTime) {
        this.checkGrounded();
    
        // Giảm jump cooldown
        if (this.jumpCooldown > 0) {
            this.jumpCooldown -= deltaTime;
        }
    
        // Tính toán hướng
        const direction = new THREE.Vector3();
        if (this.keys.forward) direction.z += 1;
        if (this.keys.backward) direction.z -= 1;
        if (this.keys.left) direction.x += 1;
        if (this.keys.right) direction.x -= 1;
    
        const isMoving = direction.length() > 0;
        if (isMoving) direction.normalize();
        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotationY);
    
        // === Nhảy ===
        if (this.keys.jump && this.isOnGround && this.jumpCooldown <= 0) {
            // 🚫 Dừng chuyển động ngang hoàn toàn khi nhảy
            this.body.velocity.x = 0;
            this.body.velocity.z = 0;
        
            // ✅ Nhảy lên
            this.body.velocity.y = this.jumpForce;
            this.isOnGround = false;
            this.jumpCooldown = 0.3;
        
            console.log(`🦘 Jump! velocity: (${this.body.velocity.x.toFixed(2)}, ${this.body.velocity.y.toFixed(2)}, ${this.body.velocity.z.toFixed(2)})`);
        }
        
        console.log('✅ After jump:', this.body.velocity);

    
        // === Di chuyển ===
        if (this.isOnGround) {
            this.body.velocity.x = direction.x * this.speed;
            this.body.velocity.z = direction.z * this.speed;
        } else {
            // Trên không: dùng air control nhẹ để tránh mất kiểm soát
            const airControl = 0.05;
            const targetX = direction.x * this.speed * 0.2;
            const targetZ = direction.z * this.speed * 0.2;
    
            this.body.velocity.x = THREE.MathUtils.lerp(this.body.velocity.x, targetX, airControl);
            this.body.velocity.z = THREE.MathUtils.lerp(this.body.velocity.z, targetZ, airControl);
        }
    
        // === Gravity thủ công (nếu bạn không để world.gravity hoạt động) ===
        // Nếu world.gravity đã được set, bạn có thể bỏ dòng này
        // this.body.velocity.y += -9.81 * deltaTime;
    
        // === Animation ===
        this.updateAnimation(isMoving);
    
        // === Debug ===
        if (isMoving || !this.isOnGround) {
            const status = this.isOnGround ? "on ground" : "in air";
            console.log(`🏃 [${status}] vel: (${this.body.velocity.x.toFixed(2)}, ${this.body.velocity.y.toFixed(2)}, ${this.body.velocity.z.toFixed(2)})`);
        }
    }
    

    destroy() {
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
    }
}
