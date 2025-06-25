import { Vec3, RaycastResult } from 'cannon-es';
import * as THREE from 'three';
import { performanceConfig } from './PerformanceConfig.js';

export class CharacterController {
    constructor(body, character = null, world = null, debug = false) {
        this.body = body;
        this.character = character;
        this.world = world;

        this.speed = 1.2; // Walking speed
        this.sprintSpeed = 2.0; // Running speed when Shift held
        this.jumpForce = 2.5; // Nhảy nhẹ hơn
        this.deathCount = 0;
        this.deathSoundHasPlayed = false; // Cờ để đảm bảo âm thanh chỉ phát 1 lần

        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            sprint: false
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

        // ----- Reset & spawn -----
        this.spawnPosition = new Vec3(body.position.x, body.position.y, body.position.z);
        this.resetThreshold = -5; // nếu y thấp hơn ngưỡng này sẽ reset

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
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.sprint = true;
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
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.sprint = false;
                break;
        }
    }

    checkGrounded() {
        if (!this.world) {
            this.isOnGround = false;
            return;
        }

        // Sử dụng performance config để điều chỉnh tần suất kiểm tra
        const charConfig = performanceConfig.getCharacterConfig();
        const checkInterval = 1000 / charConfig.groundCheckFrequency;
        
        if (!this._lastGroundCheck) this._lastGroundCheck = 0;
        const now = performance.now();
        if (now - this._lastGroundCheck < checkInterval) {
            return;
        }
        this._lastGroundCheck = now;

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
        const jumpAction = this.character.userData.jumpAction;
        const runSound = this.character.userData.runSound;

        // Sử dụng performance config để điều chỉnh tần suất cập nhật animation
        const animConfig = performanceConfig.getAnimationConfig();
        const updateInterval = 1000 / animConfig.updateFrequency;
        
        if (!this._lastAnimUpdate) this._lastAnimUpdate = 0;
        const now = performance.now();
        if (now - this._lastAnimUpdate < updateInterval) {
            return;
        }
        this._lastAnimUpdate = now;

        // Lưu trạng thái animation trước đó
        if (!this._lastAnimState) this._lastAnimState = '';
        let nextState = '';
        if (!this.isOnGround) {
            nextState = 'jump';
        } else if (isMoving) {
            nextState = 'run';
        } else {
            nextState = 'idle';
        }
        if (this._lastAnimState !== nextState) {
            // Tắt tất cả action trước khi bật action mới
            const fadeTime = animConfig.fadeTime;
            if (idleAction && idleAction.isRunning()) idleAction.fadeOut(fadeTime);
            if (runAction && runAction.isRunning()) runAction.fadeOut(fadeTime);
            if (jumpAction && jumpAction.isRunning()) jumpAction.fadeOut(fadeTime);
            // Bật action mới
            if (nextState === 'idle' && idleAction) idleAction.reset().fadeIn(fadeTime * 2).play();
            if (nextState === 'run' && runAction) runAction.reset().fadeIn(fadeTime * 2).play();
            if (nextState === 'jump' && jumpAction) jumpAction.reset().fadeIn(fadeTime).play();
            this._lastAnimState = nextState;
        }

        // Run sound logic với throttling
        if (!this._lastSoundUpdate) this._lastSoundUpdate = 0;
        if (now - this._lastSoundUpdate > 100) { // Kiểm tra sound mỗi 100ms
            if (isMoving && this.isOnGround) {
                if (runSound && !runSound.isPlaying) {
                    runSound.play();
                }
            } else {
                if (runSound && runSound.isPlaying) {
                    runSound.stop();
                }
            }
            this._lastSoundUpdate = now;
        }
    }

    update(cameraRotationY, deltaTime) {
        // Giới hạn deltaTime để tránh frame drops lớn gây rung giật
        const clampedDeltaTime = Math.min(deltaTime, 0.033); // Tối đa 30fps
        
        this.debugLog(`[frame] dt=${clampedDeltaTime.toFixed(3)} ground=${this.isOnGround} vel=(${this.body.velocity.x.toFixed(2)}, ${this.body.velocity.y.toFixed(2)}, ${this.body.velocity.z.toFixed(2)})`);

        this.checkGrounded();
    
        // Reset cờ âm thanh nếu nhân vật đáp xuống đất
        if (this.isOnGround) {
            this.deathSoundHasPlayed = false;
        }

        // Phát âm thanh chết khi rơi xuống một nửa ngưỡng
        if (this.body.position.y < (this.resetThreshold / 2) && !this.deathSoundHasPlayed) {
            if (this.character && this.character.userData.deathSound) {
                const deathSound = this.character.userData.deathSound;
                
                if (deathSound.isPlaying) {
                    deathSound.stop();
                }
                
                deathSound.play();
                
                this.deathSoundHasPlayed = true; // Đánh dấu là đã phát
            }
        }
    
        // Giảm jump cooldown với deltaTime được giới hạn
        if (this.jumpCooldown > 0) {
            this.jumpCooldown -= clampedDeltaTime;
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

    
        // === Di chuyển với smoothing để giảm rung giật ===
        const moveSpeed = this.keys.sprint ? this.sprintSpeed : this.speed;
        const charConfig = performanceConfig.getCharacterConfig();
        const smoothingFactor = Math.min(clampedDeltaTime * 15 * charConfig.movementSmoothing, 1);

        if (this.isOnGround) {
            // Áp dụng smoothing cho chuyển động để giảm rung giật
            const targetVelX = direction.x * moveSpeed;
            const targetVelZ = direction.z * moveSpeed;
            
            this.body.velocity.x = THREE.MathUtils.lerp(this.body.velocity.x, targetVelX, smoothingFactor);
            this.body.velocity.z = THREE.MathUtils.lerp(this.body.velocity.z, targetVelZ, smoothingFactor);
        } else {
            // Trên không với điều khiển mượt mà hơn
            if (this.body.velocity.y <= 0) {
                const airControl = 0.03 * charConfig.movementSmoothing; // Điều chỉnh air control theo performance
                const targetX = direction.x * moveSpeed * 0.15;
                const targetZ = direction.z * moveSpeed * 0.15;

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

        // === Check fall below ground threshold ===
        if (this.body.position.y < this.resetThreshold) {
            this.resetToSpawn();
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

        // Play jump sound
        const jumpSound = this.character.userData.jumpSound;
        if (jumpSound) {
            if (jumpSound.isPlaying) {
                jumpSound.stop(); // Stop if already playing (e.g., rapid jumps)
            }
            jumpSound.play();
        }

        // Play jump animation nếu có
        if (this.character && this.character.userData.jumpAction) {
            const jumpAction = this.character.userData.jumpAction;
            jumpAction.reset().play();
        }
    }

    /** Reset nhân vật về vị trí spawn gốc */
    resetToSpawn() {
        this.debugLog('[reset] Falling below threshold, resetting character');
        this.deathCount++;

        this.body.position.copy(this.spawnPosition);
        this.body.velocity.set(0, 0, 0);
        this.body.angularVelocity.set(0, 0, 0);

        // Reset lại các trạng thái
        this.isOnGround = false;
        this.jumpCooldown = 0;
        this.deathSoundHasPlayed = false; // Quan trọng: reset cờ âm thanh
    }

    destroy() {
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
    }
}
