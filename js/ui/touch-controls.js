// ── Touch Controls ──────────────────────────────────────────────────
// On-screen controls for touch devices: a drag-to-move zone on the left
// and a cluster of attack buttons on the right. Only rendered/active when
// Input.isTouch is true, so desktop play is completely unaffected.
//
// Coordinates are in the virtual 1280x720 game space (same as HUD).
// Geometry lives here; input.js delegates hit-testing to these methods.

var TouchControls = {
    // ── Layout ──────────────────────────────────────────────────────
    // Move zone: left ~45% of the screen, lower portion.
    MOVE_ZONE: { x: 0, y: 250, w: 560, h: 470 },
    // Visual anchor for the move pad ring (recentres to first touch).
    _padCx: 160, _padCy: 560, _padR: 110,
    _activePadCx: 160, _activePadCy: 560, _hasPad: false,

    // Attack buttons (right side). Only the unlocked ones are shown/active.
    // key -> { label, attackName (progression.hasAttack), color, held }
    BUTTONS: [
        { key: 'chlorine',  label: 'CL',  attack: 'chlorine',  color: '#ccff33', held: true  },
        { key: 'ozone',     label: 'O3',  attack: 'ozone',     color: '#00ffff', held: false },
        { key: 'uv',        label: 'UV',  attack: 'uv',        color: '#dd66ff', held: false },
        { key: 'coagulant', label: 'CO',  attack: 'coagulant', color: '#ffffff', held: false },
        { key: 'backwash',  label: 'BW',  attack: 'backwash',  color: '#00aaff', held: false },
        { key: 'ph',        label: 'pH',  attack: 'ph',        color: '#88cc44', held: false },
    ],
    BTN_R: 46,

    _game: null,
    setGame: function (game) { this._game = game; },

    // ── Geometry helpers ────────────────────────────────────────────
    isMoveZone: function (x, y) {
        var z = this.MOVE_ZONE;
        // Exclude the button cluster region (right side) defensively.
        if (this._isOverAnyButton(x, y)) return false;
        return x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h;
    },

    // Returns normalized {x,y} direction from the pad centre to the touch,
    // with a small dead-zone. Recentres the pad to the initial touch.
    moveDirection: function (x, y) {
        if (!this._hasPad) {
            this._activePadCx = x; this._activePadCy = y; this._hasPad = true;
        }
        var dx = x - this._activePadCx;
        var dy = y - this._activePadCy;
        var len = Math.sqrt(dx * dx + dy * dy);
        var dead = 12;
        if (len < dead) return { x: 0, y: 0 };
        // Clamp magnitude to 1 (full speed past the pad radius).
        var mag = Math.min(1, len / this._padR);
        return { x: (dx / len) * mag, y: (dy / len) * mag };
    },

    releasePad: function () { this._hasPad = false; },

    // List of currently-unlocked buttons with computed positions.
    _layoutButtons: function () {
        var out = [];
        var prog = this._game && this._game.progression;
        // Right-side cluster: two columns, bottom-aligned.
        var baseX = CFG.WIDTH - 190;
        var baseY = CFG.HEIGHT - 170;
        var gx = 96, gy = 96;
        var idx = 0;
        for (var i = 0; i < this.BUTTONS.length; i++) {
            var b = this.BUTTONS[i];
            var unlocked = !prog || prog.hasAttack(b.attack);
            if (!unlocked) continue;
            var col = idx % 2, rowi = Math.floor(idx / 2);
            out.push({
                key: b.key, label: b.label, color: b.color, held: b.held,
                cx: baseX + col * gx,
                cy: baseY - rowi * gy,
            });
            idx++;
        }
        return out;
    },

    _isOverAnyButton: function (x, y) {
        var btns = this._layoutButtons();
        for (var i = 0; i < btns.length; i++) {
            var dx = x - btns[i].cx, dy = y - btns[i].cy;
            if (dx * dx + dy * dy <= this.BTN_R * this.BTN_R) return true;
        }
        return false;
    },

    // Which held-button (chlorine) is under this point, or null.
    heldButtonAt: function (x, y) {
        var btns = this._layoutButtons();
        for (var i = 0; i < btns.length; i++) {
            if (!btns[i].held) continue;
            var dx = x - btns[i].cx, dy = y - btns[i].cy;
            if (dx * dx + dy * dy <= this.BTN_R * this.BTN_R) return btns[i].key;
        }
        return null;
    },

    // Handle a touchstart at (x,y): set the matching edge action flag.
    // Held buttons are managed separately (heldButtonAt), so we skip them here.
    pressAt: function (x, y, touchState) {
        var btns = this._layoutButtons();
        for (var i = 0; i < btns.length; i++) {
            var dx = x - btns[i].cx, dy = y - btns[i].cy;
            if (dx * dx + dy * dy <= this.BTN_R * this.BTN_R) {
                if (btns[i].held) {
                    touchState.chlorine = true; // also engage immediately
                } else {
                    touchState[btns[i].key] = true;
                }
                return true;
            }
        }
        return false;
    },

    // ── Draw ────────────────────────────────────────────────────────
    draw: function (ctx, game) {
        if (!Input.isTouch) return;
        this._game = game;
        // Only show during active play.
        if (!game || !game.waves || game.waves.state === 'title') return;

        ctx.save();
        var s = CFG._scale || 1;
        ctx.setTransform(s, 0, 0, s, 0, 0);

        // Move pad (left): outer ring + inner knob at active centre.
        var px = this._hasPad ? this._activePadCx : this._padCx;
        var py = this._hasPad ? this._activePadCy : this._padCy;
        ctx.globalAlpha = 0.28;
        ctx.strokeStyle = '#8fd0ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px, py, this._padR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#8fd0ff';
        ctx.beginPath();
        ctx.arc(px, py, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Attack buttons (right).
        var btns = this._layoutButtons();
        for (var i = 0; i < btns.length; i++) {
            var b = btns[i];
            ctx.globalAlpha = 0.22;
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.arc(b.cx, b.cy, this.BTN_R, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 0.85;
            ctx.strokeStyle = b.color;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(b.cx, b.cy, this.BTN_R, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(b.label, b.cx, b.cy);
        }
        ctx.restore();
    },
};
