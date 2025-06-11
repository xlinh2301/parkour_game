import { Vec3, RaycastResult } from 'cannon-es';
import * as THREE from 'three';

export class CharacterController {
    constructor(body, character = null, world = null) {
        this.body = body;
        this.character = character;
        this.world = world;

        // Tốc độ di chuyển và lực nhảy
        this.speed = 8;
        this.jumpForce = 3; // Giảm xuống 4 cho nhảy nhẹ nhàng hơn
        
        // Trạng thái các phím
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false
        };
        
        // Vector để tính toán di chuyển
        this.inputVelocity = new Vec3();
        this.isOnGround = false;
        
        // Raycasting để kiểm tra mặt đất
        this.raycastResult = new RaycastResult();
        // Tính chiều cao nhân vật dựa trên shape đầu tiên
        if (this.body && this.body.shapes && this.body.shapes.length > 0) {
            this.groundCheckDistance = this.body.shapes[0].halfExtents.y + 0.15; // thêm biên an toàn 0.15
        } else {
            this.groundCheckDistance = 1.0; // fallback
        }
        this.jumpCooldown = 0; // Thêm cooldown để tránh nhảy liên tục

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));
    }

    onKeyDown(event) {
        switch(event.code) {
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
                event.preventDefault(); // Ngăn cuộn trang
                break;
        }
    }

    onKeyUp(event) {
        switch(event.code) {
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

    // Kiểm tra xem nhân vật có đang đứng trên mặt đất không bằng Raycasting
    checkGrounded() {
        if (!this.world) {
            this.isOnGround = false;
            return;
        }

        const start = this.body.position;
        const end = new Vec3(start.x, start.y - this.groundCheckDistance, start.z);

        // Reset và thực hiện raycast
        this.raycastResult.reset();
        this.world.raycastClosest(start, end, {}, this.raycastResult);

        // Nếu tia chạm vào vật gì đó và vật đó không phải là chính nhân vật
        if (this.raycastResult.hasHit && this.raycastResult.body !== this.body) {
            this.isOnGround = true;
        } else {
            this.isOnGround = false;
        }
    }

    // Điều khiển animation dựa trên trạng thái di chuyển
    updateAnimation(isMoving) {
        if (!this.character) return;

        const runAction = this.character.userData.runAction;
        const idleAction = this.character.userData.idleAction;
        
        if (isMoving && !this.character.userData.isMoving) {
            // Bắt đầu chạy
            if (idleAction) idleAction.fadeOut(0.3);
            if (runAction) runAction.reset().fadeIn(0.3).play();
            this.character.userData.isMoving = true;
            console.log('🏃 Starting run animation');
        } else if (!isMoving && this.character.userData.isMoving) {
            // Dừng chạy, chuyển về idle
            if (runAction) runAction.fadeOut(0.3);
            if (idleAction) idleAction.reset().fadeIn(0.3).play();
            this.character.userData.isMoving = false;
            console.log('🧍 Starting idle animation');
        }
    }

    update(cameraRotationY, deltaTime) {
        this.checkGrounded();
        
        // Giảm jump cooldown
        if (this.jumpCooldown > 0) {
            this.jumpCooldown -= deltaTime;
        }

        // Tính toán hướng di chuyển dựa trên input
        const direction = new THREE.Vector3(0, 0, 0);
        
        if (this.keys.forward) direction.z += 1;  // Forward = hướng dương Z
        if (this.keys.backward) direction.z -= 1; // Backward = hướng âm Z  
        if (this.keys.left) direction.x += 1;     // Left = hướng âm X
        if (this.keys.right) direction.x -= 1;    // Right = hướng dương X

        // Kiểm tra xem có đang di chuyển không TRƯỚC khi normalize
        const isMoving = direction.length() > 0;

        // Normalize để tránh di chuyển nhanh hơn khi nhấn 2 phím
        if (isMoving) {
            direction.normalize();
        }

        // Xoay hướng di chuyển theo hướng của camera (chỉ trục Y)
        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotationY);

        if (this.keys.jump && this.isOnGround && this.jumpCooldown <= 0) {
            this.body.velocity.y = this.jumpForce;
            this.isOnGround = false;
            this.jumpCooldown = 0.3;
            console.log(`🦘 Jump! Initial momentum: (${this.body.velocity.x.toFixed(1)}, ${this.body.velocity.z.toFixed(1)})`);
        }
        
        const airControlFactor = 0.05; // Tỉ lệ điều khiển trên không (càng nhỏ càng ít "trôi")
        const airSpeedMultiplier = 0.5; // Tốc độ tối đa trên không (so với mặt đất)

        if (this.isOnGround) {
            // Trên mặt đất: điều khiển trực tiếp
            this.body.velocity.x = direction.x * this.speed;
            this.body.velocity.z = direction.z * this.speed;
        } else {
            // Trên không: điều khiển hạn chế và có "ma sát" không khí
            const targetVelocityX = direction.x * this.speed * airSpeedMultiplier;
            const targetVelocityZ = direction.z * this.speed * airSpeedMultiplier;
            this.body.velocity.x = THREE.MathUtils.lerp(this.body.velocity.x, targetVelocityX, airControlFactor);
            this.body.velocity.z = THREE.MathUtils.lerp(this.body.velocity.z, targetVelocityZ, airControlFactor);
        }

        // Điều khiển animation
        this.updateAnimation(isMoving);

        // Debug info: Log khi di chuyển hoặc ở trên không
        if (isMoving || !this.isOnGround) {
            const status = this.isOnGround ? "on ground" : "in air";
            console.log(`🏃 State [${status}]: velocity(${this.body.velocity.x.toFixed(1)}, ${this.body.velocity.y.toFixed(1)}, ${this.body.velocity.z.toFixed(1)})`);
        }
    }

    // Cleanup event listeners khi không cần nữa
    destroy() {
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
    }
} 