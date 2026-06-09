// ── Camera ──────────────────────────────────────────────────────
class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    follow(target, dt) {
        this.targetX = target.x - CFG.WIDTH / 2 + CFG.CAMERA.LOOK_AHEAD * (target.vx || 0) / CFG.RIG.SPEED;
        this.targetY = 0;
        this.x += (this.targetX - this.x) * CFG.CAMERA.LERP;
        this.y += (this.targetY - this.y) * CFG.CAMERA.LERP;

        // Clamp
        this.x = Math.max(0, Math.min(this.x, CFG.CITY.WORLD_WIDTH - CFG.WIDTH));

        // Shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            const t = this.shakeTimer / CFG.UV_PULSE.SHAKE_DURATION;
            this.offsetX = (Math.random() - 0.5) * 2 * this.shakeIntensity * t;
            this.offsetY = (Math.random() - 0.5) * 2 * this.shakeIntensity * t;
        } else {
            this.offsetX = 0;
            this.offsetY = 0;
        }
    }

    shake(intensity, duration) {
        this.shakeIntensity = intensity || CFG.UV_PULSE.SHAKE_INTENSITY;
        this.shakeTimer = duration || CFG.UV_PULSE.SHAKE_DURATION;
    }

    applyTransform(ctx) {
        ctx.save();
        ctx.translate(-this.x + this.offsetX, -this.y + this.offsetY);
    }

    restore(ctx) {
        ctx.restore();
    }

    screenX(worldX) { return worldX - this.x + this.offsetX; }
    screenY(worldY) { return worldY - this.y + this.offsetY; }
    worldX(screenX) { return screenX + this.x; }
    worldY(screenY) { return screenY + this.y; }
}
