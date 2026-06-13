// ── Projectile Manager ────────────────────────────────────────────
// Handles chlorine, ozone, and UV bolt creation / movement / drawing.
// Depends on global CFG.

class ProjectileManager {
    constructor() {
        this.chlorineDroplets      = [];
        this.ozoneProjectiles     = [];
        this.uvBolts = [];
        this.backwashes      = [];
        this.coagulantCones     = [];
        this.phZones       = [];
        this.enemyBullets   = [];  // visible bullets from military/bosses
        this.flashAlpha    = 0;   // screen-flash for UV
    }

    // ── Spawners ──────────────────────────────────────────────────

    /**
     * Spawn a raindrop falling straight down.
     * @param {number} x  rig centre x
     * @param {number} y  rig bottom y
     * @param {number} coneWidth  horizontal spread
     */
    spawnChlorine(x, y, coneWidth) {
        var half = (coneWidth || CFG.CHLORINE.CONE_WIDTH) / 2;
        this.chlorineDroplets.push({
            x:  x + (Math.random() - 0.5) * half * 2,
            y:  y,
            vy: CFG.CHLORINE.DROP_SPEED,
            w:  2,
            h:  8,
        });
    }

    /**
     * Spawn a hailstone aimed at (targetX, targetY).
     */
    spawnOzone(x, y, targetX, targetY) {
        var dx   = targetX - x;
        var dy   = targetY - y;
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;
        var spd  = CFG.OZONE.SPEED;
        this.ozoneProjectiles.push({
            x:  x,
            y:  y,
            vx: (dx / dist) * spd,
            vy: (dy / dist) * spd,
            r:  CFG.OZONE.RADIUS,
        });
    }

    /**
     * Spawn a UV bolt from (x, y) down to CFG.GROUND_Y.
     * Returns the bolt object for AoE lookup.
     */
    spawnUV(x, y) {
        var bolt = this._generateBolt(x, y, CFG.GROUND_Y);
        bolt.life     = CFG.UV_PULSE.BOLT_DURATION;
        bolt.maxLife  = CFG.UV_PULSE.BOLT_DURATION;
        bolt.x        = x;                       // centre x for AoE
        bolt.groundY  = CFG.GROUND_Y;
        this.uvBolts.push(bolt);

        // trigger screen flash
        this.flashAlpha = 0.6;
        return bolt;
    }

    /**
     * Spawn a bw at ground level moving in dir (1=right, -1=left).
     */
    spawnBackwash(x, dir) {
        var bw = {
            x: x,
            y: CFG.GROUND_Y,
            dir: dir,
            speed: CFG.BACKWASH.SPEED,
            life: CFG.BACKWASH.DURATION,
            maxLife: CFG.BACKWASH.DURATION,
            width: CFG.BACKWASH.WIDTH,
            height: CFG.BACKWASH.HEIGHT,
            hitTimer: 0, // ticks for damage intervals
            rotation: 0,
            hitPeds: {}, // track last hit time per ped to avoid constant damage
        };
        this.backwashes.push(bw);
        return bw;
    }

    /**
     * Spawn a coagulant cone from (x,y) in given direction.
     */
    spawnCoagulant(x, y, dir) {
        var cone = {
            x: x, y: y, dir: dir,
            life: 1.2, maxLife: 1.2,
            width: CFG.COAGULANT.CONE_WIDTH,
            length: CFG.COAGULANT.CONE_LENGTH,
        };
        this.coagulantCones.push(cone);
        return cone;
    }

    /**
     * Spawn a pH shock zone at ground level.
     */
    spawnPH(x, groundY) {
        var zone = {
            x: x, y: groundY,
            radius: CFG.PH_SHOCK.RADIUS,
            life: CFG.PH_SHOCK.DURATION, maxLife: CFG.PH_SHOCK.DURATION,
        };
        this.phZones.push(zone);
        return zone;
    }

    /**
     * Spawn an enemy bullet from (sx,sy) aimed at (tx,ty).
     */
    spawnEnemyBullet(sx, sy, tx, ty, damage) {
        var dx = tx - sx;
        var dy = ty - sy;
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;
        var speed = 320;
        this.enemyBullets.push({
            x: sx, y: sy,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed,
            damage: damage,
            life: 3.0, // max travel time
            trail: [],
        });
    }

    // ── Internal: bolt geometry ───────────────────────────────────

    _generateBolt(startX, startY, endY) {
        var segments  = [];
        var branches  = [];
        var segLen    = 20;
        var jitter    = 30;
        var cx        = startX;
        var cy        = startY;
        var totalDist = endY - startY;
        var steps     = Math.ceil(totalDist / segLen);

        segments.push({ x: cx, y: cy });

        // number of branches to create (2-4)
        var branchCount  = 2 + Math.floor(Math.random() * 3);
        var branchPoints = [];
        for (var b = 0; b < branchCount; b++) {
            branchPoints.push(1 + Math.floor(Math.random() * (steps - 2)));
        }

        for (var i = 1; i <= steps; i++) {
            var t = i / steps;
            cy = startY + totalDist * t;
            cx = startX + (Math.random() - 0.5) * jitter * 2;
            segments.push({ x: cx, y: cy });

            // spawn branch?
            if (branchPoints.indexOf(i) !== -1) {
                branches.push(this._generateBranch(cx, cy, endY));
            }
        }
        // make sure we actually end at ground level
        segments[segments.length - 1].y = endY;

        return { segments: segments, branches: branches };
    }

    _generateBranch(startX, startY, maxY) {
        var pts    = [];
        var len    = 3 + Math.floor(Math.random() * 4); // 3-6 segs
        var dir    = Math.random() < 0.5 ? -1 : 1;
        var cx     = startX;
        var cy     = startY;
        pts.push({ x: cx, y: cy });
        for (var i = 0; i < len; i++) {
            cx += dir * (10 + Math.random() * 20);
            cy += 10 + Math.random() * 15;
            if (cy > maxY) cy = maxY;
            pts.push({ x: cx, y: cy });
        }
        return pts;
    }

    // ── Update ────────────────────────────────────────────────────

    update(dt) {
        var i;

        // Chlorine
        for (i = this.chlorineDroplets.length - 1; i >= 0; i--) {
            var r = this.chlorineDroplets[i];
            r.y += r.vy * dt;
            if (r.y > CFG.GROUND_Y + 20) {
                this.chlorineDroplets.splice(i, 1);
            }
        }

        // Ozone
        for (i = this.ozoneProjectiles.length - 1; i >= 0; i--) {
            var h = this.ozoneProjectiles[i];
            h.vy += CFG.OZONE.GRAVITY * dt;
            h.x  += h.vx * dt;
            h.y  += h.vy * dt;
            if (h.y > CFG.GROUND_Y + 20 || h.y < -50) {
                this.ozoneProjectiles.splice(i, 1);
            }
        }

        // UV
        for (i = this.uvBolts.length - 1; i >= 0; i--) {
            var bolt = this.uvBolts[i];
            bolt.life -= dt;
            if (bolt.life <= 0) {
                this.uvBolts.splice(i, 1);
            }
        }

        // Backwashes
        for (i = this.backwashes.length - 1; i >= 0; i--) {
            var t = this.backwashes[i];
            t.x += t.dir * t.speed * dt;
            t.life -= dt;
            t.rotation += dt * 12;
            t.hitTimer -= dt;
            if (t.life <= 0 || t.x < -100 || t.x > CFG.CITY.WORLD_WIDTH + 100) {
                this.backwashes.splice(i, 1);
            }
        }

        // Enemy bullets
        for (i = this.enemyBullets.length - 1; i >= 0; i--) {
            var eb = this.enemyBullets[i];
            eb.x += eb.vx * dt;
            eb.y += eb.vy * dt;
            eb.life -= dt;
            // Trail
            eb.trail.push({ x: eb.x, y: eb.y, life: 0.15 });
            // Age trail
            for (var ti = eb.trail.length - 1; ti >= 0; ti--) {
                eb.trail[ti].life -= dt;
                if (eb.trail[ti].life <= 0) eb.trail.splice(ti, 1);
            }
            if (eb.life <= 0 || eb.x < -50 || eb.x > CFG.CITY.WORLD_WIDTH + 50 || eb.y < -50) {
                this.enemyBullets.splice(i, 1);
            }
        }

        // Coagulant cones
        for (i = this.coagulantCones.length - 1; i >= 0; i--) {
            this.coagulantCones[i].life -= dt;
            if (this.coagulantCones[i].life <= 0) this.coagulantCones.splice(i, 1);
        }
        // pH Shock zones
        for (i = this.phZones.length - 1; i >= 0; i--) {
            this.phZones[i].life -= dt;
            if (this.phZones[i].life <= 0) this.phZones.splice(i, 1);
        }

        // Screen flash decay
        if (this.flashAlpha > 0) {
            this.flashAlpha -= dt / CFG.UV_PULSE.FLASH_DURATION;
            if (this.flashAlpha < 0) this.flashAlpha = 0;
        }
    }

    // ── Draw ──────────────────────────────────────────────────────

    draw(ctx) {
        this._drawChlorine(ctx);
        this._drawOzone(ctx);
        this._drawUV(ctx);
        this._drawBackwashes(ctx);
        this._drawCoagulant(ctx);
        this._drawPH(ctx);
        this._drawEnemyBullets(ctx);
        this._drawFlash(ctx);
    }

    _drawChlorine(ctx) {
        ctx.strokeStyle = '#ccff33';
        ctx.lineWidth   = 2;
        ctx.beginPath();
        for (var i = 0; i < this.chlorineDroplets.length; i++) {
            var r = this.chlorineDroplets[i];
            ctx.moveTo(r.x, r.y);
            ctx.lineTo(r.x, r.y + r.h);
        }
        ctx.stroke();
    }

    _drawOzone(ctx) {
        for (var i = 0; i < this.ozoneProjectiles.length; i++) {
            var h = this.ozoneProjectiles[i];
            ctx.fillStyle   = 'rgba(0, 230, 255, 0.25)'; // cyan ozone bubbles
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth   = 1.5;
            ctx.beginPath();
            ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // white glint highlight
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(h.x - h.r * 0.35, h.y - h.r * 0.35, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawUV(ctx) {
        for (var i = 0; i < this.uvBolts.length; i++) {
            var bolt  = this.uvBolts[i];
            var alpha = Math.min(1, bolt.life / bolt.maxLife * 2); // fade in last half

            // glow (purple UV plasma glow)
            this._strokePath(ctx, bolt.segments, 'rgba(186,85,211,' + (alpha * 0.5) + ')', 8);
            // core (bright violet-white)
            this._strokePath(ctx, bolt.segments, 'rgba(255,220,255,' + alpha + ')', 2.5);

            // branches
            for (var b = 0; b < bolt.branches.length; b++) {
                var br = bolt.branches[b];
                this._strokePath(ctx, br, 'rgba(138,43,226,' + (alpha * 0.4) + ')', 5);
                this._strokePath(ctx, br, 'rgba(230,190,255,' + (alpha * 0.8) + ')', 1.5);
            }
        }
    }

    _strokePath(ctx, pts, style, width) {
        if (pts.length < 2) return;
        ctx.strokeStyle = style;
        ctx.lineWidth   = width;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (var i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
    }

    _drawBackwashes(ctx) {
        for (var i = 0; i < this.backwashes.length; i++) {
            var t = this.backwashes[i];
            var fade = Math.min(1, t.life / 0.5); // fade in last 0.5s

            ctx.save();
            ctx.translate(t.x, t.y);
            ctx.globalAlpha = fade * 0.85;

            // Funnel shape: wide at bottom, narrow at top
            var w = t.width;
            var h = t.height;

            // Rotating debris lines (cyan water vortex)
            for (var d = 0; d < 6; d++) {
                var angle = t.rotation + d * (Math.PI * 2 / 6);
                var yOff = (d / 6) * h;
                var widthAtY = w * (0.3 + 0.7 * (yOff / h)); // narrower at top
                var rx = Math.cos(angle) * widthAtY * 0.5;
                var alpha = 0.3 + 0.4 * Math.abs(Math.sin(angle));
                ctx.fillStyle = 'rgba(0,180,255,' + alpha + ')';
                ctx.beginPath();
                ctx.ellipse(rx, -yOff, widthAtY * 0.35, 4, angle * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Main funnel body (water whirlpool gradient)
            var grad = ctx.createLinearGradient(0, 0, 0, -h);
            grad.addColorStop(0, 'rgba(0,100,200,' + (fade * 0.75) + ')');
            grad.addColorStop(0.5, 'rgba(0,150,230,' + (fade * 0.55) + ')');
            grad.addColorStop(1, 'rgba(100,200,255,' + (fade * 0.25) + ')');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(-w / 2, 0);
            ctx.lineTo(-w * 0.15, -h);
            ctx.lineTo(w * 0.15, -h);
            ctx.lineTo(w / 2, 0);
            ctx.closePath();
            ctx.fill();

            // Swirl lines
            ctx.strokeStyle = 'rgba(0,120,220,' + (fade * 0.6) + ')';
            ctx.lineWidth = 1.5;
            for (var s = 0; s < 4; s++) {
                var sy = -h * (s + 0.5) / 4;
                var sw = w * (0.3 + 0.7 * ((h + sy) / h)) * 0.4;
                var offset = Math.sin(t.rotation * 2 + s * 1.5) * sw;
                ctx.beginPath();
                ctx.arc(offset, sy, sw, 0, Math.PI, false);
                ctx.stroke();
            }

            // Water bubbles at base
            for (var p = 0; p < 4; p++) {
                var px = (Math.random() - 0.5) * w * 1.2;
                var py = -Math.random() * 10;
                ctx.fillStyle = 'rgba(200,240,255,' + (fade * 0.55) + ')';
                ctx.beginPath();
                ctx.arc(px, py, 2 + Math.random() * 3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.restore();
        }
    }

    _drawCoagulant(ctx) {
        for (var i = 0; i < this.coagulantCones.length; i++) {
            var c = this.coagulantCones[i];
            var alpha = Math.min(1, c.life / c.maxLife * 2);

            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.globalAlpha = alpha * 0.7;

            // Cone triangle pointing downward from rig position
            var halfW = c.width / 2;
            var len = c.length;

            // Gradient from white-blue at origin to transparent at tip
            var grad = ctx.createLinearGradient(0, 0, 0, len);
            grad.addColorStop(0, 'rgba(180,220,255,0.8)');
            grad.addColorStop(0.4, 'rgba(140,200,255,0.5)');
            grad.addColorStop(1, 'rgba(100,180,255,0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-halfW, len);
            ctx.lineTo(halfW, len);
            ctx.closePath();
            ctx.fill();

            // Ice crystal particles scattered in the cone area
            ctx.fillStyle = '#ffffff';
            var seed = c.life * 137.5;
            for (var p = 0; p < 20; p++) {
                var t = (p + 1) / 21;
                var localW = halfW * t;
                var px = (Math.sin(seed + p * 73.1) * 0.5) * localW * 2 - localW;
                var py = t * len;
                var sz = 1 + Math.abs(Math.sin(seed + p * 31.7)) * 2.5;
                ctx.globalAlpha = alpha * (0.4 + 0.6 * Math.abs(Math.cos(seed + p * 19.3)));
                ctx.beginPath();
                ctx.arc(px, py, sz, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.globalAlpha = 1;
            ctx.restore();
        }
    }

    _drawPH(ctx) {
        for (var i = 0; i < this.phZones.length; i++) {
            var f = this.phZones[i];
            var remaining = f.life;
            var alpha = remaining < 1.0 ? remaining : 1.0; // fade in last 1s of life

            ctx.save();
            ctx.translate(f.x, f.y);

            // Multiple overlapping semi-transparent ellipses for pH shock bank
            var layers = 8;
            for (var l = 0; l < layers; l++) {
                var drift = Math.sin(performance.now() * 0.001 + l * 1.7) * 12;
                var vertDrift = Math.cos(performance.now() * 0.0008 + l * 2.3) * 3;
                var lx = drift + (l - layers / 2) * (f.radius * 0.2);
                var ly = vertDrift - 5;
                var rx = f.radius * (0.4 + 0.3 * Math.abs(Math.sin(l * 0.9)));
                var ry = 12 + 8 * Math.abs(Math.cos(l * 1.2));

                var grad = ctx.createRadialGradient(lx, ly, 0, lx, ly, rx);
                var baseAlpha = alpha * (0.23 - l * 0.02);
                grad.addColorStop(0, 'rgba(120,240,50,' + baseAlpha + ')'); // acid green chemical shock
                grad.addColorStop(0.5, 'rgba(80,200,30,' + (baseAlpha * 0.6) + ')');
                grad.addColorStop(1, 'rgba(40,150,10,0)');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.ellipse(lx, ly, rx, ry, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.globalAlpha = 1;
            ctx.restore();
        }
    }

    _drawEnemyBullets(ctx) {
        for (var i = 0; i < this.enemyBullets.length; i++) {
            var eb = this.enemyBullets[i];
            // Trail
            for (var t = 0; t < eb.trail.length; t++) {
                var tr = eb.trail[t];
                ctx.globalAlpha = tr.life / 0.15 * 0.4;
                ctx.fillStyle = '#ff4444';
                ctx.beginPath();
                ctx.arc(tr.x, tr.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            // Bullet
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#ff6644';
            ctx.beginPath();
            ctx.arc(eb.x, eb.y, 4, 0, Math.PI * 2);
            ctx.fill();
            // Bright core
            ctx.fillStyle = '#ffcc44';
            ctx.beginPath();
            ctx.arc(eb.x, eb.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    _drawFlash(ctx) {
        if (this.flashAlpha <= 0) return;
        ctx.save();
        var s = CFG._scale || 1;
        ctx.setTransform(s, 0, 0, s, 0, 0);  // reset to screen space (scaled)
        ctx.fillStyle = 'rgba(255,255,255,' + this.flashAlpha + ')';
        ctx.fillRect(0, 0, CFG.WIDTH, CFG.HEIGHT);
        ctx.restore();
    }
}
