// ── Operator Gear ──────────────────────────────────────────────
var OPERATOR_GEAR = [
    { id: 'none',       name: 'Duty Operator',      unlockWave: 0,  unlockAch: null },
    { id: 'sunglasses', name: 'Safety Shades',      unlockWave: 10, unlockAch: null },
    { id: 'crown',      name: 'Chief Operator',     unlockWave: 0,  unlockAch: 'defeatBoss' },
    { id: 'monocle',    name: 'Lab Inspector',      unlockWave: 15, unlockAch: null },
    { id: 'horns',      name: 'Acid-Resistant PPE', unlockWave: 0,  unlockAch: 'combo30' },
    { id: 'halo',       name: 'Clearwell Halo',     unlockWave: 0,  unlockAch: 'zapOldLady' },
    { id: 'tophat',     name: 'Control Room Pro',   unlockWave: 20, unlockAch: null },
    { id: 'bandana',    name: 'Field Tech',         unlockWave: 0,  unlockAch: 'kill500' },
];
var CLOUD_COSMETICS = OPERATOR_GEAR;

// ── Operator Rig (legacy Cloud class name retained for compatibility) ───────
// Depends on globals: CFG, Input

class Cloud {
    constructor() {
        this.x = CFG.CLOUD.START_X;
        this.y = CFG.CLOUD.START_Y;
        this.vx = 0;
        this.vy = 0;
        this.baseWidth = CFG.CLOUD.WIDTH;
        this.baseHeight = CFG.CLOUD.HEIGHT;
        this.width = this.baseWidth;
        this.height = this.baseHeight;

        // Health
        this.hp = 150;
        this.maxHp = 150;

        // Meters
        this.rainMeter = CFG.RAIN.METER_MAX;
        this.hailMeter = CFG.HAIL.METER_MAX;
        this.lightningCharge = CFG.LIGHTNING.CHARGE_TIME;
        this.tornadoCharge = CFG.TORNADO.CHARGE_TIME;
        this.frostCharge = CFG.FROST.CHARGE_TIME;
        this.fogCharge = CFG.FOG.CHARGE_TIME;

        // State
        this.isRaining = false;
        this.anger = 0;
        this.idleTimer = 0;
        this.isSleeping = false;

        // Growth power-up
        this.growthTimer = 0;

        // Cosmetic accessory
        this.cosmetic = 'none';

        // Expression system
        this.expression = 'neutral'; // 'neutral','happy','evil','scared','sad','smug'
        this.expressionTimer = 0;

        // Internal animation
        this._time = 0;
        this._sleepZ = [];
    }

    // ── Update ──────────────────────────────────────────────────

    update(dt) {
        this._time += dt;

        // ── Movement ────────────────────────────────────────────
        var move = Input.moveDir();
        var moving = (move.x !== 0 || move.y !== 0);
        var attacking = Input.wantsRain() || Input.wantsHail() || Input.wantsLightning();

        var speed = this._effectiveSpeed || CFG.CLOUD.SPEED;
        this.vx = move.x * speed;
        this.vy = move.y * speed;
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Clamp to bounds
        this.x = Math.max(CFG.CLOUD.MIN_X, Math.min(CFG.CLOUD.MAX_X, this.x));
        this.y = Math.max(CFG.CLOUD.MIN_Y, Math.min(CFG.CLOUD.MAX_Y, this.y));

        // ── Meter refill ────────────────────────────────────────
        var rechargeMult = this._effectiveRecharge || 1;
        if (!this.isRaining) {
            this.rainMeter = Math.min(CFG.RAIN.METER_MAX,
                this.rainMeter + CFG.RAIN.REFILL_RATE * rechargeMult * dt);
        }
        this.hailMeter = Math.min(CFG.HAIL.METER_MAX,
            this.hailMeter + CFG.HAIL.REFILL_RATE * rechargeMult * dt);
        var ltngChargeMax = this._effectiveLightningCharge || CFG.LIGHTNING.CHARGE_TIME;
        this.lightningCharge = Math.min(ltngChargeMax,
            this.lightningCharge + dt * rechargeMult);
        this.tornadoCharge = Math.min(CFG.TORNADO.CHARGE_TIME,
            this.tornadoCharge + dt * rechargeMult);
        this.frostCharge = Math.min(CFG.FROST.CHARGE_TIME,
            this.frostCharge + dt * rechargeMult);
        this.fogCharge = Math.min(CFG.FOG.CHARGE_TIME,
            this.fogCharge + dt * rechargeMult);

        // ── Idle / Sleep ────────────────────────────────────────
        if (!moving && !attacking) {
            this.idleTimer += dt;
            if (this.idleTimer > CFG.IDLE_TIME) {
                this.isSleeping = true;
            }
        } else {
            this.idleTimer = 0;
            this.isSleeping = false;
        }

        // ── Anger decay ─────────────────────────────────────────
        this.anger = Math.max(0, this.anger - CFG.CLOUD.ANGER_DECAY * dt);

        // ── Expression timer ──────────────────────────────────
        if (this.expressionTimer > 0) {
            this.expressionTimer -= dt;
            if (this.expressionTimer <= 0) {
                this.expression = 'neutral';
            }
        }

        // ── Growth power-up ─────────────────────────────────────
        if (this.growthTimer > 0) {
            this.growthTimer -= dt;
            // Multiplicative stacking: 1.4x, 1.96x, 2.74x
            var growthMult = Math.pow(1.4, this._growthStacks || 1);
            this.width = this.baseWidth * growthMult;
            this.height = this.baseHeight * growthMult;
        } else {
            this.width = this.baseWidth;
            this.height = this.baseHeight;
        }
    }

    // ── Drawing ─────────────────────────────────────────────────

    draw(ctx) {
        ctx.save();

        var cx = this.x;
        var cy = this.y;
        var w = this.width;
        var h = this.height;

        // Subtle bob
        var bob = Math.sin(this._time * 1.8) * 2.5;
        cy += bob;

        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(cx + 18, CFG.GROUND_Y + 4, w * 0.75, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        var scale = 0.72 * (h / this.baseHeight);
        this._drawOperatorSprite(ctx, cx - 26 * scale, cy, scale);

        ctx.restore();
        return;

        // ── Ground shadow ───────────────────────────────────────
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(cx, CFG.GROUND_Y + 4, w * 0.5, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // ── Sanitizer Probe Body (Reskinned) ────────────────────
        // Central glowing core
        var coreGrad = ctx.createRadialGradient(
            cx - w * 0.08, cy - h * 0.08, w * 0.02,
            cx, cy, w * 0.22
        );
        coreGrad.addColorStop(0, '#e8f7ff'); // glowing white-cyan
        coreGrad.addColorStop(0.5, '#4db8ff'); // bright cyan
        coreGrad.addColorStop(1, '#005580'); // deep shadow blue

        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, w * 0.22, 0, Math.PI * 2);
        ctx.fill();

        // Metallic outer rim
        ctx.strokeStyle = '#66ccff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, w * 0.22, 0, Math.PI * 2);
        ctx.stroke();

        // Orbiting Sanitization Rings
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.save();
        ctx.translate(cx, cy);
        
        // Ring 1 (tilted)
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.35, h * 0.15, Math.PI * 0.15 + Math.sin(this._time * 1.5) * 0.1, 0, Math.PI * 2);
        ctx.stroke();

        // Ring 2 (tilted opposite)
        ctx.strokeStyle = 'rgba(186, 85, 211, 0.6)'; // magenta/UV ring
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.35, h * 0.15, -Math.PI * 0.15 - Math.sin(this._time * 1.8) * 0.1, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();

        // ── Face ────────────────────────────────────────────────
        if (this.isSleeping) {
            this._drawSleepingFace(ctx, cx, cy, w, h);
        } else {
            this._drawFace(ctx, cx, cy, w, h);
        }

        // ── Cosmetic accessory ────────────────────────────────
        if (this.cosmetic && this.cosmetic !== 'none') {
            this._drawCosmetic(ctx, cx, cy, w, h);
        }

        ctx.restore();
    }

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    _drawFeedPump(ctx, x, y, scale) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        ctx.fillStyle = '#101417';
        this._roundRect(ctx, 8, -92, 52, 20, 8);
        ctx.fill();
        ctx.strokeStyle = '#2b3436';
        ctx.lineWidth = 2;
        for (var gx = 14; gx < 56; gx += 8) {
            ctx.beginPath();
            ctx.moveTo(gx, -88);
            ctx.lineTo(gx + 6, -76);
            ctx.stroke();
        }

        var motorGrad = ctx.createLinearGradient(0, -72, 0, -18);
        motorGrad.addColorStop(0, '#aeb9b7');
        motorGrad.addColorStop(0.35, '#6d7777');
        motorGrad.addColorStop(1, '#3e4848');
        ctx.fillStyle = motorGrad;
        this._roundRect(ctx, 4, -74, 60, 62, 8);
        ctx.fill();
        ctx.strokeStyle = '#d7e0dc';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(20,30,30,0.55)';
        ctx.lineWidth = 4;
        for (var f = 0; f < 5; f++) {
            ctx.beginPath();
            ctx.moveTo(14 + f * 9, -65);
            ctx.lineTo(14 + f * 9, -24);
            ctx.stroke();
        }

        var bodyGrad = ctx.createLinearGradient(-36, -16, 80, 62);
        bodyGrad.addColorStop(0, '#ffd72e');
        bodyGrad.addColorStop(0.55, '#f4b600');
        bodyGrad.addColorStop(1, '#c98000');
        ctx.fillStyle = bodyGrad;
        this._roundRect(ctx, -34, -15, 104, 70, 16);
        ctx.fill();
        ctx.strokeStyle = '#7d5700';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#ffdc2f';
        this._roundRect(ctx, -18, 50, 76, 18, 8);
        ctx.fill();

        ctx.fillStyle = '#111619';
        ctx.beginPath();
        ctx.arc(-36, 17, 31, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#5f6767';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.strokeStyle = '#394143';
        ctx.lineWidth = 4;
        for (var a = 0; a < Math.PI * 2; a += Math.PI / 5) {
            ctx.beginPath();
            ctx.moveTo(-36, 17);
            ctx.lineTo(-36 + Math.cos(a) * 25, 17 + Math.sin(a) * 25);
            ctx.stroke();
        }
        ctx.strokeStyle = '#879092';
        ctx.lineWidth = 2;
        for (var b = 0; b < 6; b++) {
            var ba = b * Math.PI / 3;
            ctx.beginPath();
            ctx.arc(-36 + Math.cos(ba) * 27, 17 + Math.sin(ba) * 27, 3, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.fillStyle = '#7e8786';
        this._roundRect(ctx, 61, -49, 28, 48, 5);
        ctx.fill();
        ctx.strokeStyle = '#47504f';
        ctx.stroke();
        ctx.fillStyle = '#27302f';
        ctx.beginPath();
        ctx.arc(75, -35, 8, 0, Math.PI * 2);
        ctx.arc(75, -14, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e54334';
        ctx.beginPath();
        ctx.arc(5, -1, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1a1d1f';
        this._roundRect(ctx, 62, 6, 48, 23, 10);
        ctx.fill();
        ctx.strokeStyle = '#5d6566';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#0b0d0f';
        this._roundRect(ctx, 104, 3, 18, 29, 8);
        ctx.fill();
        ctx.fillStyle = '#e8f9f7';
        ctx.beginPath();
        ctx.ellipse(121, 17, 8, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#343b3c';
        ctx.stroke();

        ctx.strokeStyle = '#111619';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-64, 17);
        ctx.lineTo(-92, 17);
        ctx.stroke();
        ctx.fillStyle = '#15191b';
        this._roundRect(ctx, -99, 7, 18, 20, 6);
        ctx.fill();

        ctx.strokeStyle = '#20d8c9';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(128, 17);
        ctx.bezierCurveTo(152, 5, 155, 44, 184, 32);
        ctx.stroke();
        ctx.fillStyle = 'rgba(105,255,175,0.55)';
        for (var d = 0; d < 5; d++) {
            ctx.beginPath();
            ctx.ellipse(190 + d * 10, 31 - d * 3, 3, 5, -0.6, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    _drawOperatorSprite(ctx, x, y, scale) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        var mood = this.isSleeping ? 'sleeping' : (this.expressionTimer > 0 ? this.expression : 'neutral');
        var pumpPulse = 1 + Math.sin(this._time * 7) * 0.04;

        this._drawFeedPump(ctx, 48, 3, 0.78 * pumpPulse);

        ctx.fillStyle = '#113846';
        this._roundRect(ctx, -20, 38, 15, 35, 5);
        ctx.fill();
        this._roundRect(ctx, 6, 38, 15, 35, 5);
        ctx.fill();
        ctx.fillStyle = '#0a222a';
        this._roundRect(ctx, -25, 68, 22, 8, 4);
        ctx.fill();
        this._roundRect(ctx, 4, 68, 22, 8, 4);
        ctx.fill();

        var bodyGrad = ctx.createLinearGradient(0, -18, 0, 48);
        bodyGrad.addColorStop(0, '#4bded3');
        bodyGrad.addColorStop(1, '#1589a0');
        ctx.fillStyle = bodyGrad;
        this._roundRect(ctx, -28, -18, 56, 68, 15);
        ctx.fill();
        ctx.strokeStyle = '#d7fffb';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#d7ff3c';
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(-17, -12);
        ctx.lineTo(-4, -12);
        ctx.lineTo(-9, 42);
        ctx.lineTo(-23, 42);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(4, -12);
        ctx.lineTo(17, -12);
        ctx.lineTo(23, 42);
        ctx.lineTo(9, 42);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = '#4bded3';
        ctx.lineWidth = 13;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-25, -4);
        ctx.quadraticCurveTo(-48, 8, -46, 34);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(24, -3);
        ctx.quadraticCurveTo(49, -7, 65, -22);
        ctx.stroke();

        ctx.fillStyle = '#12333f';
        ctx.beginPath();
        ctx.arc(-46, 36, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(67, -23, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffd73b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(69, -24, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(60, -24);
        ctx.lineTo(78, -24);
        ctx.moveTo(69, -33);
        ctx.lineTo(69, -15);
        ctx.stroke();

        ctx.fillStyle = '#c98963';
        this._roundRect(ctx, -10, -33, 20, 19, 6);
        ctx.fill();

        var skinGrad = ctx.createRadialGradient(-8, -60, 4, 0, -52, 28);
        skinGrad.addColorStop(0, '#ffd5af');
        skinGrad.addColorStop(1, '#bd7354');
        ctx.fillStyle = skinGrad;
        ctx.beginPath();
        ctx.ellipse(0, -54, 29, 31, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#5f352e';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#39251f';
        ctx.beginPath();
        ctx.ellipse(-3, -70, 25, 15, -0.12, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-23, -55, 10, Math.PI * 0.7, Math.PI * 1.8);
        ctx.fill();

        var hardHat = this.cosmetic === 'crown' ? '#ffd700' : this.cosmetic === 'horns' ? '#ff7a2c' : '#ffca45';
        ctx.fillStyle = hardHat;
        ctx.beginPath();
        ctx.ellipse(0, -78, 31, 15, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-30, -78, 60, 10);
        ctx.fillStyle = '#e49b22';
        ctx.fillRect(-36, -69, 72, 6);
        ctx.strokeStyle = '#fff2b5';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -91);
        ctx.lineTo(0, -68);
        ctx.stroke();

        if (this.cosmetic === 'sunglasses') {
            ctx.fillStyle = 'rgba(20, 20, 40, 0.9)';
            this._roundRect(ctx, -19, -60, 14, 9, 3);
            ctx.fill();
            this._roundRect(ctx, 5, -60, 14, 9, 3);
            ctx.fill();
            ctx.fillRect(-5, -56, 10, 2);
        } else if (mood === 'happy' || mood === 'smug') {
            ctx.strokeStyle = '#221714';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(-10, -55, 5, Math.PI + 0.15, -0.15);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(10, -55, 5, Math.PI + 0.15, -0.15);
            ctx.stroke();
        } else if (mood === 'scared') {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-10, -55, 5, 0, Math.PI * 2);
            ctx.arc(10, -55, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#221714';
            ctx.beginPath();
            ctx.arc(-10, -55, 2, 0, Math.PI * 2);
            ctx.arc(10, -55, 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (mood === 'evil') {
            ctx.strokeStyle = '#221714';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(-16, -58);
            ctx.lineTo(-5, -54);
            ctx.moveTo(16, -58);
            ctx.lineTo(5, -54);
            ctx.stroke();
            ctx.fillStyle = '#ff1a1a';
            ctx.beginPath();
            ctx.arc(-10, -55, 2.5, 0, Math.PI * 2);
            ctx.arc(10, -55, 2.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (mood === 'sleeping') {
            ctx.strokeStyle = '#221714';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(-10, -55, 5, 0.2, Math.PI - 0.2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(10, -55, 5, 0.2, Math.PI - 0.2);
            ctx.stroke();
            this._updateZs();
            ctx.font = 'bold 14px monospace';
            ctx.fillStyle = '#99aaff';
            for (var zi = 0; zi < this._sleepZ.length; zi++) {
                var z = this._sleepZ[zi];
                ctx.globalAlpha = z.alpha;
                ctx.fillText('Z', 31 + z.ox, -76 + z.oy);
            }
            ctx.globalAlpha = 1;
        } else {
            ctx.fillStyle = '#221714';
            ctx.beginPath();
            ctx.arc(-10, -55, 3, 0, Math.PI * 2);
            ctx.arc(10, -55, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.strokeStyle = '#4d2a24';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        if (mood === 'sad' || mood === 'scared') {
            ctx.moveTo(-10, -39);
            ctx.quadraticCurveTo(0, -47, 13, -39);
        } else {
            ctx.moveTo(-10, -42);
            ctx.quadraticCurveTo(0, -34, 13, -43);
        }
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 120, 120, 0.34)';
        ctx.beginPath();
        ctx.arc(-19, -47, 5, 0, Math.PI * 2);
        ctx.arc(19, -47, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#07313c';
        this._roundRect(ctx, -12, 4, 24, 12, 3);
        ctx.fill();
        ctx.fillStyle = '#c7fff5';
        ctx.font = 'bold 7px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('WTP', 0, 10);

        ctx.restore();
    }

    _drawCosmetic(ctx, cx, cy, w, h) {
        var eyeSpacing = w * 0.12;
        var eyeY = cy - h * 0.05;

        switch (this.cosmetic) {

            case 'sunglasses': {
                // Two dark rectangles over eyes + bridge
                ctx.fillStyle = 'rgba(20, 20, 40, 0.85)';
                var glassW = 12;
                var glassH = 8;
                ctx.fillRect(cx - eyeSpacing - glassW / 2, eyeY - glassH / 2, glassW, glassH);
                ctx.fillRect(cx + eyeSpacing - glassW / 2, eyeY - glassH / 2, glassW, glassH);
                // Bridge
                ctx.strokeStyle = '#222244';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx - eyeSpacing + glassW / 2, eyeY);
                ctx.lineTo(cx + eyeSpacing - glassW / 2, eyeY);
                ctx.stroke();
                // Rims
                ctx.strokeStyle = '#444466';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(cx - eyeSpacing - glassW / 2, eyeY - glassH / 2, glassW, glassH);
                ctx.strokeRect(cx + eyeSpacing - glassW / 2, eyeY - glassH / 2, glassW, glassH);
                break;
            }

            case 'crown': {
                // Golden 3-point crown above cloud
                var crownY = cy - h * 0.45;
                var crownW = w * 0.25;
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.moveTo(cx - crownW, crownY);
                ctx.lineTo(cx - crownW * 0.6, crownY - 12);
                ctx.lineTo(cx - crownW * 0.2, crownY);
                ctx.lineTo(cx, crownY - 16);
                ctx.lineTo(cx + crownW * 0.2, crownY);
                ctx.lineTo(cx + crownW * 0.6, crownY - 12);
                ctx.lineTo(cx + crownW, crownY);
                ctx.closePath();
                ctx.fill();
                // Crown base band
                ctx.fillStyle = '#ccaa00';
                ctx.fillRect(cx - crownW, crownY, crownW * 2, 4);
                // Jewels
                ctx.fillStyle = '#ff2222';
                ctx.beginPath();
                ctx.arc(cx, crownY - 13, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#2244ff';
                ctx.beginPath();
                ctx.arc(cx - crownW * 0.6, crownY - 9, 1.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(cx + crownW * 0.6, crownY - 9, 1.5, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'monocle': {
                // Circle around right eye + chain
                var monoX = cx + eyeSpacing;
                var monoY = eyeY;
                var monoR = 8;
                ctx.strokeStyle = '#ccaa44';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(monoX, monoY, monoR, 0, Math.PI * 2);
                ctx.stroke();
                // Chain going down
                ctx.strokeStyle = '#aa8833';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(monoX + monoR * 0.7, monoY + monoR * 0.7);
                ctx.lineTo(monoX + monoR * 0.5, monoY + monoR + 8);
                ctx.lineTo(monoX + monoR * 0.8, monoY + monoR + 14);
                ctx.lineTo(monoX + monoR * 0.3, monoY + monoR + 20);
                ctx.stroke();
                // Glass glint
                ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(monoX - 2, monoY - 2, monoR * 0.5, -0.8, -0.2);
                ctx.stroke();
                break;
            }

            case 'horns': {
                // Two red pointed triangles from cloud top
                var hornY = cy - h * 0.35;
                ctx.fillStyle = '#cc2222';
                // Left horn
                ctx.beginPath();
                ctx.moveTo(cx - w * 0.15, hornY + 5);
                ctx.lineTo(cx - w * 0.2, hornY - 14);
                ctx.lineTo(cx - w * 0.08, hornY + 2);
                ctx.closePath();
                ctx.fill();
                // Right horn
                ctx.beginPath();
                ctx.moveTo(cx + w * 0.15, hornY + 5);
                ctx.lineTo(cx + w * 0.2, hornY - 14);
                ctx.lineTo(cx + w * 0.08, hornY + 2);
                ctx.closePath();
                ctx.fill();
                // Darker inner shading
                ctx.fillStyle = '#991111';
                ctx.beginPath();
                ctx.moveTo(cx - w * 0.14, hornY + 3);
                ctx.lineTo(cx - w * 0.19, hornY - 10);
                ctx.lineTo(cx - w * 0.1, hornY + 1);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(cx + w * 0.14, hornY + 3);
                ctx.lineTo(cx + w * 0.19, hornY - 10);
                ctx.lineTo(cx + w * 0.1, hornY + 1);
                ctx.closePath();
                ctx.fill();
                break;
            }

            case 'halo': {
                // Golden ellipse floating above cloud
                var haloY = cy - h * 0.52;
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.ellipse(cx, haloY, w * 0.18, 5, 0, 0, Math.PI * 2);
                ctx.stroke();
                // Inner glow
                ctx.strokeStyle = 'rgba(255, 230, 100, 0.5)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.ellipse(cx, haloY, w * 0.15, 3.5, 0, 0, Math.PI * 2);
                ctx.stroke();
                break;
            }

            case 'tophat': {
                // Dark top hat above cloud
                var hatY = cy - h * 0.42;
                var hatW = w * 0.2;
                var brimW = w * 0.3;
                var hatH = 18;
                // Brim
                ctx.fillStyle = '#1a1a2e';
                ctx.fillRect(cx - brimW, hatY, brimW * 2, 4);
                // Crown of hat
                ctx.fillStyle = '#222240';
                ctx.fillRect(cx - hatW, hatY - hatH, hatW * 2, hatH);
                // Hat band
                ctx.fillStyle = '#cc3333';
                ctx.fillRect(cx - hatW, hatY - 5, hatW * 2, 4);
                // Highlight edge
                ctx.strokeStyle = '#333355';
                ctx.lineWidth = 1;
                ctx.strokeRect(cx - hatW, hatY - hatH, hatW * 2, hatH);
                break;
            }

            case 'bandana': {
                // Red band across forehead with trailing knot
                var bandY = eyeY - 10;
                ctx.fillStyle = '#cc2222';
                ctx.fillRect(cx - w * 0.22, bandY, w * 0.44, 5);
                // Knot on right side
                ctx.beginPath();
                ctx.moveTo(cx + w * 0.22, bandY);
                ctx.lineTo(cx + w * 0.32, bandY + 8);
                ctx.lineTo(cx + w * 0.28, bandY + 3);
                ctx.lineTo(cx + w * 0.35, bandY + 12);
                ctx.strokeStyle = '#cc2222';
                ctx.lineWidth = 3;
                ctx.stroke();
                // Knot ball
                ctx.fillStyle = '#aa1111';
                ctx.beginPath();
                ctx.arc(cx + w * 0.22, bandY + 2.5, 3, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
        }
    }

    _drawFace(ctx, cx, cy, w, h) {
        var angerT = this.anger / CFG.CLOUD.ANGER_MAX; // 0..1
        var expr = this.expression;
        var exprActive = this.expressionTimer > 0;

        // Eye positions
        var eyeSpacing = w * 0.12;
        var eyeY = cy - h * 0.05;
        var eyeRx = 5;
        var eyeRy = 6;

        // Pupil shift based on velocity
        var pShiftX = (this.vx / CFG.CLOUD.SPEED) * 2;
        var pShiftY = (this.vy / CFG.CLOUD.SPEED) * 1.5;

        // Mouth baseline
        var mouthY = cy + h * 0.15;
        var mouthW = w * 0.1;

        ctx.strokeStyle = '#2a2a3e';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        // ── Expression-based face ─────────────────────────────
        if (exprActive && expr === 'happy') {
            // Happy bounce offset
            var bounce = Math.abs(Math.sin(this._time * 8)) * 2;
            cy -= bounce;
            eyeY = cy - h * 0.05;
            mouthY = cy + h * 0.15;

            // Eyes: upward crescents (^_^)
            ctx.strokeStyle = '#2a2a3e';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(cx - eyeSpacing, eyeY, 5, Math.PI + 0.3, -0.3);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx + eyeSpacing, eyeY, 5, Math.PI + 0.3, -0.3);
            ctx.stroke();

            // Eyebrows: relaxed, slightly raised
            var browY = eyeY - eyeRy - 5;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - eyeSpacing - 6, browY);
            ctx.quadraticCurveTo(cx - eyeSpacing, browY - 3, cx - eyeSpacing + 6, browY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + eyeSpacing - 6, browY);
            ctx.quadraticCurveTo(cx + eyeSpacing, browY - 3, cx + eyeSpacing + 6, browY);
            ctx.stroke();

            // Mouth: wide smile
            var smileW = mouthW * 1.6;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(cx - smileW, mouthY - 2);
            ctx.quadraticCurveTo(cx, mouthY + 8, cx + smileW, mouthY - 2);
            ctx.stroke();

        } else if (exprActive && expr === 'evil') {
            // Eyes: narrow slits
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(cx - eyeSpacing, eyeY, eyeRx * 1.1, eyeRy * 0.45, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + eyeSpacing, eyeY, eyeRx * 1.1, eyeRy * 0.45, 0, 0, Math.PI * 2);
            ctx.fill();

            // Pupils: tiny, red-tinted
            ctx.fillStyle = '#ff1a1a';
            var tinyPupil = 1.5;
            ctx.beginPath();
            ctx.arc(cx - eyeSpacing + pShiftX, eyeY + pShiftY * 0.3, tinyPupil, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + eyeSpacing + pShiftX, eyeY + pShiftY * 0.3, tinyPupil, 0, Math.PI * 2);
            ctx.fill();

            // Eyebrows: heavily slanted inward
            var browY = eyeY - eyeRy - 2;
            ctx.strokeStyle = '#2a2a3e';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(cx - eyeSpacing - 7, browY - 5);
            ctx.lineTo(cx - eyeSpacing + 5, browY + 4);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + eyeSpacing + 7, browY - 5);
            ctx.lineTo(cx + eyeSpacing - 5, browY + 4);
            ctx.stroke();

            // Mouth: wide evil grin with triangle teeth
            var gW = mouthW * 1.8;
            ctx.fillStyle = '#1a0a2e';
            ctx.beginPath();
            ctx.moveTo(cx - gW, mouthY - 1);
            ctx.quadraticCurveTo(cx, mouthY + 10, cx + gW, mouthY - 1);
            ctx.closePath();
            ctx.fill();
            // Triangle teeth along top edge
            ctx.fillStyle = '#ffffff';
            for (var tt = -3; tt <= 3; tt++) {
                var ttx = cx + tt * gW * 0.15;
                ctx.beginPath();
                ctx.moveTo(ttx - 2, mouthY - 1);
                ctx.lineTo(ttx + 2, mouthY - 1);
                ctx.lineTo(ttx, mouthY + 3);
                ctx.closePath();
                ctx.fill();
            }

        } else if (exprActive && expr === 'scared') {
            // Eyes: wide circles
            var bigRx = eyeRx * 1.5;
            var bigRy = eyeRy * 1.5;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(cx - eyeSpacing, eyeY, bigRx, bigRy, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#2a2a3e';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(cx - eyeSpacing, eyeY, bigRx, bigRy, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(cx + eyeSpacing, eyeY, bigRx, bigRy, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#2a2a3e';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(cx + eyeSpacing, eyeY, bigRx, bigRy, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Pupils: tiny dots
            ctx.fillStyle = '#1a1a2e';
            ctx.beginPath();
            ctx.arc(cx - eyeSpacing, eyeY, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + eyeSpacing, eyeY, 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Eyebrows: raised high
            var browY = eyeY - bigRy - 5;
            ctx.strokeStyle = '#2a2a3e';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - eyeSpacing - 6, browY + 2);
            ctx.quadraticCurveTo(cx - eyeSpacing, browY - 4, cx - eyeSpacing + 6, browY + 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + eyeSpacing - 6, browY + 2);
            ctx.quadraticCurveTo(cx + eyeSpacing, browY - 4, cx + eyeSpacing + 6, browY + 2);
            ctx.stroke();

            // Mouth: small O
            ctx.strokeStyle = '#2a2a3e';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, mouthY + 2, 4, 0, Math.PI * 2);
            ctx.stroke();

        } else if (exprActive && expr === 'smug') {
            // Left eye: normal (open)
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(cx - eyeSpacing, eyeY, eyeRx, eyeRy, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1a1a2e';
            ctx.beginPath();
            ctx.arc(cx - eyeSpacing + pShiftX, eyeY + pShiftY, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Right eye: half-closed (winking)
            ctx.strokeStyle = '#2a2a3e';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(cx + eyeSpacing - 5, eyeY);
            ctx.quadraticCurveTo(cx + eyeSpacing, eyeY + 3, cx + eyeSpacing + 5, eyeY);
            ctx.stroke();

            // Left eyebrow: normal
            var browY = eyeY - eyeRy - 3;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - eyeSpacing - 6, browY);
            ctx.lineTo(cx - eyeSpacing + 6, browY);
            ctx.stroke();

            // Right eyebrow: raised
            ctx.beginPath();
            ctx.moveTo(cx + eyeSpacing - 6, browY);
            ctx.lineTo(cx + eyeSpacing + 6, browY - 5);
            ctx.stroke();

            // Mouth: sideways smirk (one side up)
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - mouthW, mouthY + 1);
            ctx.quadraticCurveTo(cx + mouthW * 0.3, mouthY + 2, cx + mouthW * 1.2, mouthY - 4);
            ctx.stroke();

        } else if (exprActive && expr === 'sad') {
            // Eyes: normal but droopy
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(cx - eyeSpacing, eyeY + 1, eyeRx, eyeRy * 0.85, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + eyeSpacing, eyeY + 1, eyeRx, eyeRy * 0.85, 0, 0, Math.PI * 2);
            ctx.fill();

            // Pupils
            ctx.fillStyle = '#1a1a2e';
            ctx.beginPath();
            ctx.arc(cx - eyeSpacing, eyeY + 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + eyeSpacing, eyeY + 2, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Teardrops below eyes
            ctx.fillStyle = '#6688cc';
            ctx.beginPath();
            ctx.ellipse(cx - eyeSpacing - 2, eyeY + eyeRy + 3, 1.5, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + eyeSpacing + 2, eyeY + eyeRy + 3, 1.5, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Eyebrows: curved upward in middle (worried look)
            var browY = eyeY - eyeRy - 3;
            ctx.strokeStyle = '#2a2a3e';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - eyeSpacing - 6, browY - 3);
            ctx.quadraticCurveTo(cx - eyeSpacing, browY + 3, cx - eyeSpacing + 6, browY - 1);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + eyeSpacing + 6, browY - 3);
            ctx.quadraticCurveTo(cx + eyeSpacing, browY + 3, cx + eyeSpacing - 6, browY - 1);
            ctx.stroke();

            // Mouth: frown
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - mouthW, mouthY);
            ctx.quadraticCurveTo(cx, mouthY - 5, cx + mouthW, mouthY);
            ctx.stroke();

        } else {
            // ── Default anger-based face (neutral expression) ─────

            // Eyes (white)
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(cx - eyeSpacing, eyeY, eyeRx, eyeRy, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + eyeSpacing, eyeY, eyeRx, eyeRy, 0, 0, Math.PI * 2);
            ctx.fill();

            // Pupils
            ctx.fillStyle = '#1a1a2e';
            var pupilR = 2.5 + angerT * 0.5;
            ctx.beginPath();
            ctx.arc(cx - eyeSpacing + pShiftX, eyeY + pShiftY, pupilR, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + eyeSpacing + pShiftX, eyeY + pShiftY, pupilR, 0, Math.PI * 2);
            ctx.fill();

            // Eyebrows
            ctx.strokeStyle = '#2a2a3e';
            ctx.lineWidth = 2;
            var browAngle = angerT * 0.5;
            var browY = eyeY - eyeRy - 3;
            ctx.beginPath();
            ctx.moveTo(cx - eyeSpacing - 6, browY - browAngle * 4);
            ctx.lineTo(cx - eyeSpacing + 6, browY + browAngle * 6);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + eyeSpacing + 6, browY - browAngle * 4);
            ctx.lineTo(cx + eyeSpacing - 6, browY + browAngle * 6);
            ctx.stroke();

            // Mouth
            ctx.strokeStyle = '#2a2a3e';
            ctx.lineWidth = 2;
            if (angerT < 0.3) {
                var curve = -3 + angerT * 10;
                ctx.beginPath();
                ctx.moveTo(cx - mouthW, mouthY);
                ctx.quadraticCurveTo(cx, mouthY + curve, cx + mouthW, mouthY);
                ctx.stroke();
            } else if (angerT < 0.7) {
                var gW = mouthW * 1.3;
                ctx.beginPath();
                ctx.moveTo(cx - gW, mouthY - 1);
                ctx.quadraticCurveTo(cx, mouthY + 5, cx + gW, mouthY - 1);
                ctx.stroke();
                ctx.lineWidth = 1;
                for (var t = -1; t <= 1; t++) {
                    var tx = cx + t * gW * 0.4;
                    ctx.beginPath();
                    ctx.moveTo(tx, mouthY);
                    ctx.lineTo(tx, mouthY + 3);
                    ctx.stroke();
                }
            } else {
                var gW2 = mouthW * 1.6;
                ctx.fillStyle = '#1a0a2e';
                ctx.beginPath();
                ctx.moveTo(cx - gW2, mouthY - 2);
                ctx.quadraticCurveTo(cx, mouthY + 8, cx + gW2, mouthY - 2);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                for (var tt = -2; tt <= 2; tt++) {
                    var ttx = cx + tt * gW2 * 0.22;
                    ctx.beginPath();
                    ctx.moveTo(ttx - 2, mouthY - 1);
                    ctx.lineTo(ttx + 2, mouthY - 1);
                    ctx.lineTo(ttx, mouthY + 2);
                    ctx.closePath();
                    ctx.fill();
                }
            }
        }
    }

    _drawSleepingFace(ctx, cx, cy, w, h) {
        var eyeSpacing = w * 0.12;
        var eyeY = cy - h * 0.05;

        // Closed eyes: curved lines
        ctx.strokeStyle = '#2a2a3e';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.arc(cx - eyeSpacing, eyeY, 5, 0.2, Math.PI - 0.2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx + eyeSpacing, eyeY, 5, 0.2, Math.PI - 0.2);
        ctx.stroke();

        // Small content mouth
        var mouthY = cy + h * 0.15;
        ctx.beginPath();
        ctx.moveTo(cx - 5, mouthY);
        ctx.quadraticCurveTo(cx, mouthY + 3, cx + 5, mouthY);
        ctx.stroke();

        // Floating Z's
        this._updateZs();
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = '#6666aa';
        for (var i = 0; i < this._sleepZ.length; i++) {
            var z = this._sleepZ[i];
            ctx.globalAlpha = z.alpha;
            ctx.fillText('Z', cx + w * 0.3 + z.ox, cy - h * 0.3 + z.oy);
        }
        ctx.globalAlpha = 1;
    }

    _updateZs() {
        // Maintain 3 Z particles floating upward
        while (this._sleepZ.length < 3) {
            this._sleepZ.push({
                ox: Math.random() * 15,
                oy: -Math.random() * 20,
                alpha: 0.2 + Math.random() * 0.5,
                speed: 12 + Math.random() * 8,
                size: 10 + Math.random() * 8,
            });
        }
        for (var i = this._sleepZ.length - 1; i >= 0; i--) {
            var z = this._sleepZ[i];
            z.oy -= z.speed * 0.016; // approx dt
            z.alpha -= 0.008;
            if (z.alpha <= 0 || z.oy < -60) {
                this._sleepZ.splice(i, 1);
            }
        }
    }

    // ── Meter Methods ───────────────────────────────────────────

    canRain() {
        return this.rainMeter > 0;
    }

    useRain(dt) {
        this.rainMeter = Math.max(0, this.rainMeter - CFG.RAIN.DRAIN_RATE * dt);
        this.isRaining = true;
    }

    stopRain() {
        this.isRaining = false;
    }

    canHail() {
        return this.hailMeter >= CFG.HAIL.COST;
    }

    useHail() {
        this.hailMeter = Math.max(0, this.hailMeter - CFG.HAIL.COST);
    }

    canLightning() {
        var chargeNeeded = this._effectiveLightningCharge || CFG.LIGHTNING.CHARGE_TIME;
        return this.lightningCharge >= chargeNeeded;
    }

    useLightning() {
        this.lightningCharge = 0;
    }

    canTornado() {
        return this.tornadoCharge >= CFG.TORNADO.CHARGE_TIME;
    }

    useTornado() {
        this.tornadoCharge = 0;
    }

    canFrost() { return this.frostCharge >= CFG.FROST.CHARGE_TIME; }
    useFrost() { this.frostCharge = 0; }
    canFog() { return this.fogCharge >= CFG.FOG.CHARGE_TIME; }
    useFog() { this.fogCharge = 0; }

    // ── Anger ───────────────────────────────────────────────────

    addAnger(amount) {
        this.anger = Math.min(CFG.CLOUD.ANGER_MAX, this.anger + amount);
    }

    setExpression(type, duration) {
        this.expression = type;
        this.expressionTimer = duration || 1.5;
    }

    // ── Geometry helpers ────────────────────────────────────────

    getCenter() {
        return { x: this.x, y: this.y + this.height / 2 };
    }

    getBounds() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 4,
            w: this.width,
            h: this.height,
        };
    }

    takeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount);
        this.setExpression('scared', 0.5);
    }

    isDead() {
        return this.hp <= 0;
    }
}
