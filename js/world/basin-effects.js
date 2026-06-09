// ── BasinEffects ───────────────────────────────────────────────────────
// Ambient basinEffects effects: pools that form from rain and grow/evaporate,
// and lightning scorch marks that fade over time.

const BasinEffects = (function () {

    var MAX_POOLS       = 50;
    var POOL_GROW_RATE  = 12;     // pixels/sec radius growth
    var POOL_MAX_RADIUS = 20;
    var POOL_EVAP_RATE  = 3;      // pixels/sec radius shrink after maxed
    var SCORCH_LIFETIME   = 10;     // seconds before fully faded

    // ── Constructor ──────────────────────────────────────────────
    var MAX_SURGES       = 5;
    var SURGE_MAX_RADIUS = 80;
    var SURGE_GROW_RATE  = 8;       // pixels/sec radius growth

    function BasinEffects() {
        this.pools   = [];         // { x, y, radius, maxed }
        this.scorches  = [];         // { x, y, radius, age }
        this.surges    = [];         // { x, y, radius, life, maxLife }
        this.buildingDamage = [];    // { x, w, level } — cosmetic damage 1-3
        this.timeOfDay = 0;          // 0 = noon, 0.5 = midnight
    }

    // ── Puddles ──────────────────────────────────────────────────
    BasinEffects.prototype.addPool = function (x, y) {
        if (this.pools.length >= MAX_POOLS) {
            // Recycle the oldest pool
            this.pools.shift();
        }
        this.pools.push({
            x:      x,
            y:      y,
            radius: 2,
            maxed:  false,
        });
    };

    // ── Scorches ─────────────────────────────────────────────────
    BasinEffects.prototype.addScorch = function (x, y) {
        this.scorches.push({
            x:      x,
            y:      y,
            radius: 10 + Math.random() * 8,
            age:    0,
        });
    };

    // ── Building Damage ────────────────────────────────────────────
    BasinEffects.prototype.damageBuilding = function (x, w) {
        // Find existing damage entry for this building
        for (var i = 0; i < this.buildingDamage.length; i++) {
            var bd = this.buildingDamage[i];
            if (bd.x === x && bd.w === w) {
                bd.level = Math.min(3, bd.level + 1);
                return;
            }
        }
        this.buildingDamage.push({ x: x, w: w, level: 1 });
    };

    // ── Update ───────────────────────────────────────────────────
    BasinEffects.prototype.update = function (dt) {
        var i;

        // Update pools
        for (i = this.pools.length - 1; i >= 0; i--) {
            var p = this.pools[i];

            if (!p.maxed) {
                p.radius += POOL_GROW_RATE * dt;
                if (p.radius >= POOL_MAX_RADIUS) {
                    p.radius = POOL_MAX_RADIUS;
                    p.maxed  = true;
                }
            } else {
                // Evaporate
                p.radius -= POOL_EVAP_RATE * dt;
                if (p.radius <= 0) {
                    this.pools.splice(i, 1);
                }
            }
        }

        // Check pools for surge upgrade
        for (i = this.pools.length - 1; i >= 0; i--) {
            var pp = this.pools[i];
            if (pp.radius >= 18 && this.surges.length < MAX_SURGES) {
                if (Math.random() < 0.01) {
                    this.surges.push({
                        x: pp.x,
                        y: pp.y,
                        radius: 40,
                        life: 15,
                        maxLife: 15,
                    });
                    this.pools.splice(i, 1);
                }
            }
        }

        // Update surges
        for (i = this.surges.length - 1; i >= 0; i--) {
            var fl = this.surges[i];
            fl.life -= dt;
            if (fl.life <= 0) {
                this.surges.splice(i, 1);
                continue;
            }
            // Grow radius up to max, then shrink when life is low
            var lifeRatio = fl.life / fl.maxLife;
            if (lifeRatio > 0.3) {
                // Growing phase
                fl.radius = Math.min(SURGE_MAX_RADIUS, fl.radius + SURGE_GROW_RATE * dt);
            } else {
                // Shrinking phase
                fl.radius = SURGE_MAX_RADIUS * (lifeRatio / 0.3);
            }
        }

        // Update scorches
        for (i = this.scorches.length - 1; i >= 0; i--) {
            var s = this.scorches[i];
            s.age += dt;
            if (s.age >= SCORCH_LIFETIME) {
                this.scorches.splice(i, 1);
            }
        }
    };

    // ── Flood lookup ──────────────────────────────────────────────
    BasinEffects.prototype.getSurgeAtX = function (x) {
        for (var i = 0; i < this.surges.length; i++) {
            var fl = this.surges[i];
            if (Math.abs(x - fl.x) <= fl.radius) {
                return fl;
            }
        }
        return null;
    };

    // ── Clear ──────────────────────────────────────────────────────
    BasinEffects.prototype.clear = function () {
        this.pools.length = 0;
        this.scorches.length = 0;
        this.surges.length = 0;
        this.buildingDamage = [];
    };

    // ── Draw ─────────────────────────────────────────────────────
    BasinEffects.prototype.draw = function (ctx) {
        var i;

        // ── Puddles (blue ellipses on the ground) ────────────────
        for (i = 0; i < this.pools.length; i++) {
            var p = this.pools[i];
            if (p.radius <= 0) continue;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.scale(1, 0.35);       // flatten into an ellipse

            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI * 2);

            // Slightly transparent blue, brighter near centre
            ctx.fillStyle = 'rgba(80,130,200,0.35)';
            ctx.fill();

            // Subtle highlight ring
            ctx.strokeStyle = 'rgba(120,170,240,0.25)';
            ctx.lineWidth   = 1;
            ctx.stroke();

            ctx.restore();
        }

        // ── Scorch marks (dark fading circles) ──────────────────
        for (i = 0; i < this.scorches.length; i++) {
            var s     = this.scorches[i];
            var alpha = 1 - (s.age / SCORCH_LIFETIME);
            if (alpha <= 0) continue;

            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.scale(1, 0.4);        // flatten onto ground plane

            // Dark scorch with radial fade
            var grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s.radius);
            grad.addColorStop(0, 'rgba(15,10,5,' + (alpha * 0.7) + ')');
            grad.addColorStop(0.6, 'rgba(30,20,10,' + (alpha * 0.4) + ')');
            grad.addColorStop(1, 'rgba(40,30,15,0)');

            ctx.beginPath();
            ctx.arc(0, 0, s.radius, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.restore();
        }

        // ── Floods (larger dark-blue ellipses with ripple animation) ──
        for (i = 0; i < this.surges.length; i++) {
            var fl = this.surges[i];
            if (fl.radius <= 0) continue;

            ctx.save();
            ctx.translate(fl.x, fl.y);
            ctx.scale(1, 0.35); // flatten onto ground

            // Main surge body
            var fAlpha = Math.min(1, fl.life / 2); // fade when nearly expired
            var fGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, fl.radius);
            fGrad.addColorStop(0, 'rgba(40,80,150,' + (fAlpha * 0.6) + ')');
            fGrad.addColorStop(0.6, 'rgba(50,100,180,' + (fAlpha * 0.4) + ')');
            fGrad.addColorStop(1, 'rgba(60,120,200,0)');
            ctx.fillStyle = fGrad;
            ctx.beginPath();
            ctx.arc(0, 0, fl.radius, 0, Math.PI * 2);
            ctx.fill();

            // Animated concentric ripple rings
            var time = performance.now() * 0.001;
            for (var ring = 0; ring < 3; ring++) {
                var ripplePhase = (time * 1.5 + ring * 0.8) % 1.0;
                var rippleR = fl.radius * 0.3 + fl.radius * 0.7 * ripplePhase;
                var rippleAlpha = fAlpha * 0.3 * (1 - ripplePhase);
                ctx.strokeStyle = 'rgba(100,160,230,' + rippleAlpha + ')';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(0, 0, rippleR, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.restore();
        }

        // ── Building damage overlays (cracks and rubble) ──────────
        for (i = 0; i < this.buildingDamage.length; i++) {
            var bd = this.buildingDamage[i];
            // Cracks
            ctx.strokeStyle = '#222222';
            ctx.lineWidth = 1.5;
            for (var cr = 0; cr < bd.level; cr++) {
                var crx = bd.x + bd.w * (0.2 + cr * 0.3);
                var cry = CFG.GROUND_Y - 30 - cr * 40;
                ctx.beginPath();
                ctx.moveTo(crx, cry);
                ctx.lineTo(crx + 8, cry + 15);
                ctx.lineTo(crx - 5, cry + 25);
                ctx.stroke();
            }
            // Rubble at base (higher damage = more rubble)
            if (bd.level >= 2) {
                ctx.fillStyle = '#554433';
                for (var ri = 0; ri < bd.level * 2; ri++) {
                    ctx.fillRect(bd.x + ri * 12, CFG.GROUND_Y - 4, 8, 4);
                }
            }
        }
    };

    return BasinEffects;
})();
