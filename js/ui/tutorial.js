// ── First-Run Tutorial Overlay ──────────────────────────────────────
// A low-friction controls cheat-sheet shown during wave 1 of a player's
// first-ever run (progression.highestWave === 0). Non-blocking: it fades
// out after a short time or once the player starts attacking, and never
// appears again once they've completed a wave.
//
// Only shows attacks already unlocked at the current wave, so it grows
// with the player rather than dumping all seven controls at once.

var Tutorial = {
    _shown: false,        // has the overlay been engaged this run
    _dismissed: false,    // fully faded / dismissed
    _timer: 0,            // counts up while visible
    HOLD_TIME: 9,         // seconds fully visible before auto-fade
    FADE_TIME: 1.2,

    reset: function () {
        this._shown = false;
        this._dismissed = false;
        this._timer = 0;
    },

    // Called each frame from update(). game gives access to progression/waves.
    update: function (dt, game) {
        if (this._dismissed) return;
        var prog = game && game.progression;
        var waves = game && game.waves;
        if (!prog || !waves) return;

        // Only on a first-ever run, first wave, active play.
        var firstRun = (prog.highestWave === 0);
        if (!firstRun || waves.waveNumber > 1 || waves.state !== 'playing') {
            this._dismissed = true;
            return;
        }

        this._shown = true;
        this._timer += dt;

        // Dismiss early once the player starts doing things (any attack input).
        if (typeof Input !== 'undefined' && (
                Input.wantsChlorine() || Input.wantsOzone() || Input.wantsUV() ||
                Input.wantsBackwash() || Input.wantsCoagulant() || Input.wantsPH())) {
            // Let it linger a moment, then fade.
            if (this._timer < this.HOLD_TIME - this.FADE_TIME) {
                this._timer = this.HOLD_TIME - this.FADE_TIME;
            }
        }

        if (this._timer >= this.HOLD_TIME) this._dismissed = true;
    },

    draw: function (ctx, game) {
        if (this._dismissed || !this._shown) return;
        var prog = game && game.progression;
        if (!prog) return;

        // Fade alpha over the last FADE_TIME seconds.
        var a = 1;
        var remaining = this.HOLD_TIME - this._timer;
        if (remaining < this.FADE_TIME) a = Math.max(0, remaining / this.FADE_TIME);

        var rows = [
            { keys: 'W A S D / Arrows', label: 'Move the Operator Rig', need: null },
            { keys: 'SPACE (hold)',     label: 'Chlorine contact spray', need: 'chlorine' },
            { keys: 'E / Click',        label: 'Ozone diffuser',         need: 'ozone' },
            { keys: 'Q / Right-Click',  label: 'UV disinfection pulse',  need: 'uv' },
            { keys: 'R',                label: 'Coagulant injection',    need: 'coagulant' },
            { keys: 'F',                label: 'Filter backwash vortex', need: 'backwash' },
            { keys: 'T',                label: 'pH shock zone',          need: 'ph' },
        ].filter(function (r) { return r.need === null || prog.hasAttack(r.need); });

        ctx.save();
        var s = CFG._scale || 1;
        ctx.setTransform(s, 0, 0, s, 0, 0);
        ctx.globalAlpha = a;

        var lineH = 22;
        var padX = 18, padY = 16;
        var boxW = 360;
        var boxH = padY * 2 + 24 + rows.length * lineH;
        var bx = CFG.WIDTH / 2 - boxW / 2;
        var by = CFG.HEIGHT - boxH - 80;

        // Panel
        ctx.fillStyle = 'rgba(3, 13, 18, 0.82)';
        ctx.fillRect(bx, by, boxW, boxH);
        ctx.strokeStyle = 'rgba(120, 230, 220, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx, by, boxW, boxH);

        // Title
        ctx.fillStyle = '#8fffee';
        ctx.font = 'bold 14px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('OPERATOR CONTROLS', CFG.WIDTH / 2, by + padY);

        // Rows
        var ry = by + padY + 28;
        ctx.textBaseline = 'middle';
        for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            ctx.textAlign = 'left';
            ctx.font = 'bold 12px "Courier New", monospace';
            ctx.fillStyle = '#ffcc44';
            ctx.fillText(r.keys, bx + padX, ry + i * lineH);
            ctx.textAlign = 'right';
            ctx.font = '12px "Courier New", monospace';
            ctx.fillStyle = '#cfe8ee';
            ctx.fillText(r.label, bx + boxW - padX, ry + i * lineH);
        }

        // Hint
        ctx.globalAlpha = a * 0.7;
        ctx.textAlign = 'center';
        ctx.font = 'italic 10px "Courier New", monospace';
        ctx.fillStyle = '#88aab0';
        ctx.fillText('More barriers unlock as cycles advance', CFG.WIDTH / 2, by + boxH - padY + 2);

        ctx.restore();
    },
};
