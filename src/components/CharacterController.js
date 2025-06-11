import { Vec3, RaycastResult } from 'cannon-es';
import * as THREE from 'three';

export class CharacterController {
    constructor(body, character = null, world = null, debug = false) {
        this.body = body;
        this.character = character;
        this.world = world;

        this.speed = 12;
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
        this.debug = debug;

        // Helper: gói gọn console.log theo flag debug
        this.debugLog = (...args) => {
            if (this.debug) console.log(...args);
        };

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

                // Gọi trực tiếp hàm jump thay vì xử lý trong update()
                this.jump();
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

        // Raycast bắt đầu cao hơn một chút so với tâm để không bắt đầu bên trong collider mặt đất
        const rayStart = new Vec3(this.body.position.x, this.body.position.y + 0.05, this.body.position.z);
        const rayEnd   = new Vec3(rayStart.x, rayStart.y - (this.groundCheckDistance + 0.1), rayStart.z);

        this.raycastResult.reset();
        this.world.raycastClosest(rayStart, rayEnd, {}, this.raycastResult);

        const wasGround = this.isOnGround;
        this.isOnGround = this.raycastResult.hasHit && this.raycastResult.body !== this.body;

        // Log khi trạng thái ground thay đổi
        if (this.isOnGround !== wasGround) {
            this.debugLog(`[ground] ${this.isOnGround ? 'Landed' : 'Left ground'} at y=${this.body.position.y.toFixed(2)}`);
        }
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
        this.debugLog(`[frame] dt=${deltaTime.toFixed(3)} ground=${this.isOnGround} vel=(${this.body.velocity.x.toFixed(2)}, ${this.body.velocity.y.toFixed(2)}, ${this.body.velocity.z.toFixed(2)})`);

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
        // (đã xử lý trực tiếp trong onKeyDown -> jump())

    
        // === Di chuyển ===
        if (this.isOnGround) {
            this.body.velocity.x = direction.x * this.speed;
            this.body.velocity.z = direction.z * this.speed;
        } else {
            // Trên không
            if (this.body.velocity.y <= 0) {
                // Chỉ cho phép điều chỉnh ngang khi đang rơi xuống
                const airControl = 0.05;
                const targetX = direction.x * this.speed * 0.2;
                const targetZ = direction.z * this.speed * 0.2;

                this.body.velocity.x = THREE.MathUtils.lerp(this.body.velocity.x, targetX, airControl);
                this.body.velocity.z = THREE.MathUtils.lerp(this.body.velocity.z, targetZ, airControl);
            }
        }
    
        // === Animation ===
        this.updateAnimation(isMoving);
    
        // === Debug summary when moving or in air ===
        if (this.debug && (isMoving || !this.isOnGround)) {
            const status = this.isOnGround ? 'on ground' : 'in air';
            this.debugLog(`🏃 [${status}] vel: (${this.body.velocity.x.toFixed(2)}, ${this.body.velocity.y.toFixed(2)}, ${this.body.velocity.z.toFixed(2)})`);
        }
    }
    
    /**
     * Thực hiện nhảy đơn giản: chỉ khi đang đứng trên mặt đất.
     */
    jump() {
        // Cool-down tránh spam
        if (this.jumpCooldown > 0) return;

        // Cập nhật lại trạng thái ground để chắc chắn
        this.checkGrounded();

        if (!this.isOnGround) {
            this.debugLog('Cannot jump: not on ground');
            return;
        }

        this.debugLog('Jumping with force:', this.jumpForce);

        // Giữ nguyên vận tốc ngang, chỉ thêm vận tốc trục Y
        this.body.velocity.y = this.jumpForce;
        this.isOnGround = false;

        // Thiết lập cooldown
        this.jumpCooldown = 0.3;

        // Play jump animation nếu có
        if (this.character && this.character.userData.jumpAction) {
            const jumpAction = this.character.userData.jumpAction;
            jumpAction.reset().play();
        }
    }

    destroy() {
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
    }
}
