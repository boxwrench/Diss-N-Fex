// ── Text Popup Manager ─────────────────────────────────────────────
// Floating score / combo text that rises and fades.
// Depends on global CFG.

var TextPopupManager = {
    popups: [],

    /**
     * Create a floating text popup.
     * @param {number} x        world x
     * @param {number} y        world y
     * @param {string} text     display text
     * @param {object} [options] overrides for color, size, life, vy, scale, bold
     */
    add: function (x, y, text, options) {
        var opts = options || {};
        var life = opts.life || 1.0;
        var popup = {
            x:       x,
            y:       y,
            text:    text,
            color:   opts.color  || '#fff',
            size:    opts.size   || 16,
            life:    life,
            maxLife: life,
            vy:      opts.vy     != null ? opts.vy : -60,
            scale:   opts.scale  != null ? opts.scale : 1.5,
            bold:    !!opts.bold,
        };
        this.popups.push(popup);
        return popup;
    },

    /** White score popup "+{points}" */
    addScore: function (x, y, points) {
        this.add(x, y, '+' + points, {
            color: '#ffffff',
        });
    },

    /** Combo tier popup in tier color with tier label, size 24, bold */
    addCombo: function (x, y, combo, tier) {
        this.add(x, y, tier.label + ' x' + combo, {
            color: tier.color,
            size:  24,
            bold:  true,
        });
    },

    /** Yellow bonus popup "{name} +{points}", size 18 */
    addBonus: function (x, y, name, points) {
        this.add(x, y, name + ' +' + points, {
            color: '#ffff00',
            size:  18,
        });
    },

    /** Kill popup with type-specific color */
    addKill: function (x, y, typeName, points) {
        var colors = {
            normal:      '#ffffff',
            jogger:      '#66ff66',
            umbrella:    '#66ccff',
            dog_walker:  '#ffaa44',
            tourist:     '#ff66ff',
            businessman: '#44ff88',
        };
        this.add(x, y, '+' + points, {
            color: colors[typeName] || '#ffffff',
        });
    },

    /** Special guilt popup in pink, longer life */
    addGuilty: function (x, y) {
        this.add(x, y, 'Was that really necessary?', {
            color: '#ff88cc',
            size:  14,
            life:  2.0,
        });
    },

    /** Move popups up, shrink scale, reduce life, remove expired. */
    update: function (dt) {
        for (var i = this.popups.length - 1; i >= 0; i--) {
            var p = this.popups[i];
            p.y += p.vy * dt;
            p.life -= dt;

            // Shrink scale toward 1.0 (punch-in effect)
            if (p.scale > 1.0) {
                p.scale = Math.max(1.0, p.scale - dt * 3);
            }

            if (p.life <= 0) {
                this.popups.splice(i, 1);
            }
        }
    },

    /** Draw all active popups with shadow and fade. */
    draw: function (ctx) {
        for (var i = 0; i < this.popups.length; i++) {
            var p = this.popups[i];
            var ratio = p.life / p.maxLife;

            // Fade out in last 30% of life
            var alpha = ratio < 0.3 ? ratio / 0.3 : 1.0;

            var fontStr = (p.bold ? 'bold ' : '') + Math.round(p.size) + 'px "Courier New", monospace';

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.scale(p.scale, p.scale);
            ctx.globalAlpha = alpha;
            ctx.font = fontStr;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Black outline / shadow for readability
            ctx.fillStyle = '#000000';
            ctx.fillText(p.text, 1, 1);
            ctx.fillText(p.text, -1, -1);
            ctx.fillText(p.text, 1, -1);
            ctx.fillText(p.text, -1, 1);

            // Coloured text on top
            ctx.fillStyle = p.color;
            ctx.fillText(p.text, 0, 0);

            ctx.globalAlpha = 1;
            ctx.restore();
        }
    },
};
