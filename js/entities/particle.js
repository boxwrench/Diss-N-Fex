// ── Particle System ───────────────────────────────────────────────
// Visual effects: splashes, sparks, smoke, sparkles.
// Depends on global CFG.

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    // ── Core ──────────────────────────────────────────────────────

    /**
     * Emit particles at (x, y).
     * @param {number} x
     * @param {number} y
     * @param {object} opts
     *   count, color, speed, life, gravity, size, spread (radians)
     */
    emit(x, y, opts) {
        var count   = opts.count   || 5;
        var color   = opts.color   || '#ffffff';
        var speed   = opts.speed   || 80;
        var life    = opts.life    || 0.6;
        var gravity = opts.gravity != null ? opts.gravity : 0;
        var size    = opts.size    || 2;
        var spread  = opts.spread  != null ? opts.spread : Math.PI * 2;
        var baseAngle = opts.baseAngle != null ? opts.baseAngle : 0;

        for (var i = 0; i < count; i++) {
            var angle = baseAngle - spread / 2 + Math.random() * spread;
            var spd   = speed * (0.5 + Math.random() * 0.5);
            this.particles.push({
                x:       x,
                y:       y,
                vx:      Math.cos(angle) * spd,
                vy:      Math.sin(angle) * spd,
                life:    life * (0.7 + Math.random() * 0.3),
                maxLife: life,
                color:   color,
                size:    size * (0.6 + Math.random() * 0.4),
                gravity: gravity,
            });
        }
    }

    update(dt) {
        for (var i = this.particles.length - 1; i >= 0; i--) {
            var p = this.particles[i];
            p.vy += p.gravity * dt;
            p.x  += p.vx * dt;
            p.y  += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        for (var i = 0; i < this.particles.length; i++) {
            var p     = this.particles[i];
            var alpha = Math.max(0, p.life / p.maxLife);
            ctx.globalAlpha = alpha;
            ctx.fillStyle   = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // ── Pre-made Emitters ─────────────────────────────────────────

    /** Small blue splash when a raindrop hits ground / ped. */
    rainSplash(x, y) {
        this.emit(x, y, {
            count:     3 + Math.floor(Math.random() * 3),  // 3-5
            color:     '#6ab4ff',
            speed:     50,
            life:      0.35,
            gravity:   120,
            size:      1.5,
            spread:    Math.PI * 0.6,   // ~108 deg
            baseAngle: -Math.PI / 2,    // upward
        });
    }

    /** White particles on ozone impact, wider spread. */
    hailImpact(x, y) {
        this.emit(x, y, {
            count:     5 + Math.floor(Math.random() * 4),  // 5-8
            color:     '#e0eeff',
            speed:     100,
            life:      0.45,
            gravity:   200,
            size:      2.5,
            spread:    Math.PI * 1.2,   // wide
            baseAngle: -Math.PI / 2,
        });
    }

    /** Bright yellow/white sparks radiating in all directions. */
    lightningParticles(x, y) {
        var count = 10 + Math.floor(Math.random() * 6); // 10-15
        for (var i = 0; i < count; i++) {
            var col = Math.random() < 0.4 ? '#ffffff' : '#ffee44';
            this.emit(x, y, {
                count:   1,
                color:   col,
                speed:   140 + Math.random() * 100,
                life:    0.4 + Math.random() * 0.3,
                gravity: 60,
                size:    2 + Math.random() * 1.5,
                spread:  Math.PI * 2,
            });
        }
    }

    /** Red particles when a ped takes a hit. */
    hitEffect(x, y) {
        this.emit(x, y, {
            count:     4 + Math.floor(Math.random() * 3),  // 4-6
            color:     '#ff4444',
            speed:     70,
            life:      0.4,
            gravity:   80,
            size:      2,
            spread:    Math.PI * 0.7,
            baseAngle: -Math.PI / 2,
        });
    }

    /** Gray smoke poof when a ped dies. */
    deathPoof(x, y) {
        this.emit(x, y, {
            count:     8 + Math.floor(Math.random() * 5),  // 8-12
            color:     '#999999',
            speed:     40,
            life:      0.8,
            gravity:   -30,   // floats up
            size:      3.5,
            spread:    Math.PI * 0.8,
            baseAngle: -Math.PI / 2,
        });
    }

    /** Sparkles in a given color for combo celebrations. */
    comboSparkle(x, y, color) {
        this.emit(x, y, {
            count:     6 + Math.floor(Math.random() * 5),  // 6-10
            color:     color || '#ffff00',
            speed:     90,
            life:      0.6,
            gravity:   -20,
            size:      2.5,
            spread:    Math.PI * 2,
        });
    }
}
