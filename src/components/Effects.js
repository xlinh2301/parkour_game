import * as THREE from 'three';

/**
 * Quản lý việc tạo và cập nhật các hiệu ứng tạm thời, như bụi.
 */
export class EffectManager {
    constructor(scene) {
        this.scene = scene;
        this.activeEffects = [];
    }

    /**
     * Tạo hiệu ứng bụi tại một vị trí cho trước.
     * @param {THREE.Vector3} position Vị trí để tạo hiệu ứng.
     */
    createDustEffect(position) {
        const dustEffect = new DustParticles(this.scene, position);
        this.activeEffects.push(dustEffect);
    }

    /**
     * Cập nhật tất cả các hiệu ứng đang hoạt động.
     * @param {number} deltaTime Thời gian trôi qua kể từ khung hình trước.
     */
    update(deltaTime) {
        this.activeEffects = this.activeEffects.filter(effect => {
            const isAlive = effect.update(deltaTime);
            if (!isAlive) {
                effect.dispose();
            }
            return isAlive;
        });
    }

    /** Dọn dẹp tất cả hiệu ứng */
    dispose() {
        this.activeEffects.forEach(effect => effect.dispose());
        this.activeEffects = [];
    }
}


/**
 * Hiệu ứng bụi đơn giản nổ ra từ một điểm rồi tan biến.
 */
class DustParticles {
    constructor(scene, position, count = 20, color = 0xaaaaaa) {
        this.scene = scene;
        this.particleCount = count;
        this.life = 0.6; // Hiệu ứng kéo dài 0.6 giây
        this.velocities = [];

        const geometry = new THREE.BufferGeometry();
        const vertices = [];

        // Tạo các hạt tại vị trí gốc
        for (let i = 0; i < this.particleCount; i++) {
            vertices.push(0, 0, 0);

            // Tạo vận tốc ngẫu nhiên cho mỗi hạt
            const theta = Math.random() * Math.PI * 2; // Hướng ngẫu nhiên trên mặt phẳng XZ
            const speed = Math.random() * 2.5 + 1.0;  // Tốc độ ngẫu nhiên

            this.velocities.push(new THREE.Vector3(
                Math.cos(theta) * speed,
                (Math.random() - 0.2) * 1.5, // Hơi hướng lên một chút
                Math.sin(theta) * speed
            ));
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        const material = new THREE.PointsMaterial({
            color: color,
            size: 0.15,
            transparent: true,
            opacity: 0.7,
            sizeAttenuation: true,
            depthWrite: false,
        });

        this.points = new THREE.Points(geometry, material);
        this.points.position.copy(position);
        this.scene.add(this.points);
    }

    /**
     * Cập nhật vị trí và độ mờ của các hạt.
     * @returns {boolean} Trả về false nếu hiệu ứng đã kết thúc.
     */
    update(deltaTime) {
        this.life -= deltaTime;
        if (this.life <= 0) {
            return false; // Đã hết "sống"
        }

        const positions = this.points.geometry.attributes.position;
        for (let i = 0; i < this.particleCount; i++) {
            const vel = this.velocities[i];
            positions.setX(i, positions.getX(i) + vel.x * deltaTime);
            positions.setY(i, positions.getY(i) + vel.y * deltaTime);
            positions.setZ(i, positions.getZ(i) + vel.z * deltaTime);
        }
        positions.needsUpdate = true;

        // Mờ dần theo thời gian
        this.points.material.opacity = Math.max(0, this.life / 0.6);

        return true;
    }

    /** Dọn dẹp tài nguyên THREE.js */
    dispose() {
        if (this.points) {
            this.scene.remove(this.points);
            this.points.geometry.dispose();
            this.points.material.dispose();
            this.points = null;
        }
    }
} 