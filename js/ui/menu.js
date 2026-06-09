// ── Menu System ────────────────────────────────────────────────────
// Title, pause, game-over, how-to-play, and shop screens.
// Depends on globals: CFG, Input, UPGRADES, Progression.

class MenuSystem {
    constructor() {
        this.state = 'title';   // 'title' | 'playing' | 'paused' | 'gameover' | 'howtoplay' | 'shop'
        this._time = 0;
        this._tipIndex = Math.floor(Math.random() * MenuSystem.TIPS.length);
        this._blinkTimer = 0;
        this._shopSelection = 0;
        this._gameOverStats = null;
        this._cosmeticIndex = 0;    // index into unlocked cosmetics list
        this._musicVolume = 0.3;    // matches music master default
        this._sfxVolume = 0.3;      // matches sfx master default
        this._volSelected = 0;      // 0=music, 1=sfx

        // Set by main.js so pause/shop screens can read stats
        this.progression = null;
        this.achievements = null;
    }

    /**
     * Store stats snapshot for the newspaper game-over screen.
     * Call this from the gameOver() function in main.js.
     * @param {{ waveNumber:number, totalKills:number, bestCombo:number,
     *           score:number, highScore:number, isNewHigh:boolean }} stats
     */
    setGameOverStats(stats) {
        this._gameOverStats = stats;
        // Pick random sub-headline and forecast once per game over
        this._gameOverSubHeadline = MenuSystem.SUB_HEADLINES[
            Math.floor(Math.random() * MenuSystem.SUB_HEADLINES.length)
        ];
        this._gameOverForecast = MenuSystem.FORECASTS[
            Math.floor(Math.random() * MenuSystem.FORECASTS.length)
        ];
    }

    // ── Update & state transitions ─────────────────────────────────

    /**
     * @param {number} dt  delta time in seconds
     * @returns {{ action: string|null }}  'start' | 'resume' | 'pause' | 'restart' | null
     */
    update(dt) {
        this._time += dt;
        this._blinkTimer += dt;

        switch (this.state) {

            case 'title':
                if (Input.justPressed('Enter') || Input.justPressed('NumpadEnter')) {
                    this.state = 'playing';
                    return { action: 'start' };
                }
                // Slot keys 1-4: load or start in that slot
                // Shift+1-4: delete that slot
                for (var _si = 1; _si <= 4; _si++) {
                    if (Input.justPressed('Digit' + _si)) {
                        if (Input.isDown('ShiftLeft') || Input.isDown('ShiftRight')) {
                            return { action: 'deleteslot', slot: _si - 1 };
                        }
                        this.state = 'playing';
                        return { action: 'loadslot', slot: _si - 1 };
                    }
                }
                if (Input.justPressed('KeyH')) {
                    this.state = 'howtoplay';
                    return { action: 'howtoplay' };
                }
                if (Input.justPressed('KeyG')) {
                    window.open('encyclopedia.html', '_blank');
                    return { action: null };
                }
                if (Input.justPressed('KeyA')) {
                    this.state = 'achievements';
                    this._achFrom = 'title';
                    return { action: 'achievements' };
                }
                break;

            case 'playing':
                if (Input.justPressed('Escape')) {
                    this.state = 'paused';
                    this._tipIndex = Math.floor(Math.random() * MenuSystem.TIPS.length);
                    return { action: 'pause' };
                }
                break;

            case 'paused':
                if (Input.justPressed('Escape')) {
                    this.state = 'playing';
                    return { action: 'resume' };
                }
                if (Input.justPressed('KeyA')) {
                    this.state = 'achievements';
                    this._achFrom = 'paused';
                    return { action: 'achievements' };
                }
                if (Input.justPressed('KeyM')) {
                    this.state = 'title';
                    return { action: 'quit' };
                }
                // Volume controls on pause screen
                if (Input.justPressed('ArrowLeft')) {
                    if (this._volSelected === 0) this._musicVolume = Math.max(0, this._musicVolume - 0.05);
                    else this._sfxVolume = Math.max(0, this._sfxVolume - 0.05);
                    return { action: 'volumechange', musicVol: this._musicVolume, sfxVol: this._sfxVolume };
                }
                if (Input.justPressed('ArrowRight')) {
                    if (this._volSelected === 0) this._musicVolume = Math.min(1, this._musicVolume + 0.05);
                    else this._sfxVolume = Math.min(1, this._sfxVolume + 0.05);
                    return { action: 'volumechange', musicVol: this._musicVolume, sfxVol: this._sfxVolume };
                }
                if (Input.justPressed('ArrowUp') || Input.justPressed('ArrowDown')) {
                    this._volSelected = this._volSelected === 0 ? 1 : 0;
                }
                break;

            case 'achievements':
                if (Input.justPressed('Escape') || Input.justPressed('KeyA')) {
                    this._achScroll = 0;
                    this.state = this._achFrom || 'title';
                    if (this._achFrom === 'paused') return { action: 'pause' };
                    return { action: 'backtotitle' };
                }
                if (Input.isDown('ArrowDown') || Input.isDown('KeyS')) {
                    var totalAch = (typeof ACHIEVEMENTS !== 'undefined') ? ACHIEVEMENTS.length : 0;
                    var totalRows = Math.ceil(totalAch / 2);
                    var maxScroll = Math.max(0, totalRows * 58 - (CFG.HEIGHT - 120));
                    this._achScroll = Math.min((this._achScroll || 0) + 3, maxScroll);
                }
                if (Input.isDown('ArrowUp') || Input.isDown('KeyW')) {
                    this._achScroll = Math.max(0, (this._achScroll || 0) - 3);
                }
                break;

            case 'gameover':
                if (Input.justPressed('Enter') || Input.justPressed('NumpadEnter')) {
                    this.state = 'title';
                    return { action: 'backtotitle' };
                }
                break;

            case 'howtoplay':
                if (Input.justPressed('Escape')) {
                    this.state = 'title';
                    return { action: 'backtotitle' };
                }
                break;

            case 'shop': {
                // Mouse click on upgrade
                var shopKeys = UPGRADES ? Object.keys(UPGRADES) : [];
                if (Input.mouse.down) {
                    var mx = Input.mouse.x;
                    var my = Input.mouse.y;
                    // Check left and right column hit areas
                    var _cx = CFG.WIDTH / 2;
                    var _startY = 95;
                    var _rowH = 58;
                    var _colW = _cx - 30;
                    // Build left/right key lists matching drawShop layout
                    var _leftK = [], _rightK = [];
                    for (var _ski = 0; _ski < shopKeys.length; _ski++) {
                        var _sk = shopKeys[_ski];
                        if (_sk.indexOf('lightning') === 0 || _sk.indexOf('tornado') === 0 || _sk.indexOf('frost') === 0 || _sk.indexOf('fog') === 0) {
                            _rightK.push(_sk);
                        } else {
                            _leftK.push(_sk);
                        }
                    }
                    // Check left column
                    for (var _li = 0; _li < _leftK.length; _li++) {
                        var _ly = _startY + _li * _rowH;
                        if (mx >= 24 && mx <= 24 + _colW && my >= _ly - 3 && my <= _ly - 3 + _rowH - 6) {
                            return { action: 'buyupgrade', key: _leftK[_li] };
                        }
                    }
                    // Check right column
                    for (var _ri = 0; _ri < _rightK.length; _ri++) {
                        var _ry = _startY + _ri * _rowH;
                        if (mx >= _cx + 9 && mx <= _cx + 9 + _colW && my >= _ry - 3 && my <= _ry - 3 + _rowH - 6) {
                            return { action: 'buyupgrade', key: _rightK[_ri] };
                        }
                    }
                }
                // ENTER closes shop
                if (Input.justPressed('Enter') || Input.justPressed('NumpadEnter')) {
                    return { action: 'closeshop' };
                }
                // R resets save
                if (Input.justPressed('KeyR')) {
                    return { action: 'resetsave' };
                }
                // < / > cycle cosmetics (comma/period keys)
                if (Input.justPressed('Comma') || Input.justPressed('BracketLeft')) {
                    return { action: 'cosmeticprev' };
                }
                if (Input.justPressed('Period') || Input.justPressed('BracketRight')) {
                    return { action: 'cosmeticnext' };
                }
                break;
            }
        }

        return { action: null };
    }

    /** Transition to game-over state. */
    triggerGameOver() {
        this.state = 'gameover';
    }

    // ── Draw dispatch ──────────────────────────────────────────────

    draw(ctx, scoring, progression) {
        switch (this.state) {
            case 'title':     this.drawTitle(ctx, scoring);        break;
            case 'paused':    this.drawPause(ctx);                 break;
            case 'gameover':  this.drawGameOver(ctx, scoring);     break;
            case 'howtoplay': this.drawHowToPlay(ctx);             break;
            case 'shop':      this.drawShop(ctx, progression);     break;
            case 'achievements': this.drawAchievements(ctx);      break;
            // 'playing' – nothing to draw
        }
    }

    // ── Title Screen ───────────────────────────────────────────────

    drawTitle(ctx, scoring) {
        var cx = CFG.WIDTH / 2;
        var cy = CFG.HEIGHT / 2;

        // Dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, CFG.WIDTH, CFG.HEIGHT);

        // Title with glow
        ctx.save();
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 20;
        this._shadowText(ctx, 'DISS N FEX', cx, cy - 170, '#00ffff',
            'bold 48px "Courier New", monospace', 'center');
        ctx.restore();

        this._drawTitle22Badge(ctx, cx - 310, cy - 174, 1.0);

        // Subtitle
        this._shadowText(ctx, 'Drinking Water Treatment Arcade', cx, cy - 115, '#88aacc',
            '18px "Courier New", monospace', 'center');
        this._shadowText(ctx, 'INTAKE > COAG > FILTER > UV > CLEARWELL', cx, cy - 90, '#66ddee',
            '11px "Courier New", monospace', 'center');

        // Operator preview in the middle
        this._drawOperatorPreview(ctx, cx, cy - 20);

        // Save slots
        var slotY = cy + 70;
        this._shadowText(ctx, '--- SAVE SLOTS ---', cx, slotY, '#8888aa',
            'bold 12px "Courier New", monospace', 'center');

        for (var si = 0; si < 4; si++) {
            var slotData = null;
            try {
                if (typeof SaveSystem !== 'undefined') {
                    slotData = SaveSystem.getSlotInfo(si);
                }
            } catch(e) {}

            var sy = slotY + 18 + si * 20;
            var slotText;
            var slotColor;
            if (slotData && slotData.waveNumber) {
                slotText = (si + 1) + ' - Cycle ' + slotData.waveNumber + '  Score: ' + (slotData.score || 0);
                slotColor = '#44ff88';
            } else {
                slotText = (si + 1) + ' - New Game';
                slotColor = '#888899';
            }
            this._shadowText(ctx, slotText, cx, sy, slotColor,
                '14px "Courier New", monospace', 'center');
        }

        var menuY = slotY + 105;

        // How to Play
        this._shadowText(ctx, 'H - How to Play', cx, menuY, '#888888',
            '13px "Courier New", monospace', 'center');

        // Encyclopedia & Achievements links
        this._shadowText(ctx, 'G - Encyclopedia   A - Achievements', cx, menuY + 18, '#666677',
            '11px "Courier New", monospace', 'center');
        this._shadowText(ctx, 'Shift+1-4 to delete a slot', cx, menuY + 34, '#554444',
            '10px "Courier New", monospace', 'center');

        // High score
        var hi = (scoring && scoring.highScore) ? scoring.highScore : 0;
        if (hi > 0) {
            this._shadowText(ctx, 'HIGH SCORE: ' + hi, cx, CFG.HEIGHT - 40, '#888888',
                '14px "Courier New", monospace', 'center');
        }
    }

    // ── Animated cloud for title screen ────────────────────────────

    _drawTitle22Badge(ctx, x, y, scale) {
        scale = scale || 1;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        ctx.save();
        ctx.shadowColor = '#66ccff';
        ctx.shadowBlur = 10;
        this._drawTitle22LogoMark(ctx, 0, 0, 1);
        ctx.restore();

        this._shadowText(ctx, 'Title 22', 34, -12, '#d8efff',
            'bold 17px "Courier New", monospace', 'left');
        this._shadowText(ctx, 'DRINKING WATER', 35, 8, '#6bd6ee',
            '8px "Courier New", monospace', 'left');

        ctx.restore();
    }

    _drawTitle22LogoMark(ctx, x, y, scale) {
        scale = scale || 1;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        function dropPath() {
            ctx.beginPath();
            ctx.moveTo(0, -28);
            ctx.bezierCurveTo(16, -10, 23, 3, 20, 15);
            ctx.bezierCurveTo(17, 27, 7, 32, -3, 29);
            ctx.bezierCurveTo(-15, 25, -22, 15, -20, 2);
            ctx.bezierCurveTo(-18, -9, -10, -19, 0, -28);
            ctx.closePath();
        }

        ctx.save();
        dropPath();
        ctx.clip();

        var darkGrad = ctx.createLinearGradient(-22, -26, 6, 28);
        darkGrad.addColorStop(0, '#071b62');
        darkGrad.addColorStop(1, '#0a2d86');
        ctx.fillStyle = darkGrad;
        ctx.fillRect(-24, -30, 26, 62);

        var lightGrad = ctx.createLinearGradient(-2, -26, 24, 30);
        lightGrad.addColorStop(0, '#21a9d5');
        lightGrad.addColorStop(1, '#66d7f7');
        ctx.fillStyle = lightGrad;
        ctx.fillRect(-1, -30, 25, 62);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.beginPath();
        ctx.ellipse(8, -2, 6, 22, -0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        dropPath();
        ctx.strokeStyle = 'rgba(230, 250, 255, 0.85)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.font = 'bold 17px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('22', 2, 8);

        ctx.restore();
    }

    _drawOperatorPreview(ctx, cx, cy) {
        var bob = Math.sin(this._time * 1.5) * 6;
        var y = cy + bob;
        var w = 120;
        var h = 60;

        if (typeof Cloud !== 'undefined') {
            if (!this._operatorPreview) this._operatorPreview = new Cloud();
            this._operatorPreview._time = this._time;
            this._operatorPreview.expression = 'happy';
            this._operatorPreview.expressionTimer = 1;
            this._operatorPreview.isSleeping = false;
            this._operatorPreview.cosmetic = 'none';
            this._operatorPreview._drawOperatorSprite(ctx, cx - 18, y + 10, 0.62);
            return;
        }

        ctx.save();

        // ── Sanitizer Probe Body (Menu Version) ──────────────────
        // Central glowing core
        var coreGrad = ctx.createRadialGradient(
            cx - w * 0.08, y - h * 0.08, w * 0.02,
            cx, y, w * 0.22
        );
        coreGrad.addColorStop(0, '#e8f7ff');
        coreGrad.addColorStop(0.5, '#4db8ff');
        coreGrad.addColorStop(1, '#005580');

        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, y, w * 0.22, 0, Math.PI * 2);
        ctx.fill();

        // Metallic outer rim
        ctx.strokeStyle = '#66ccff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, y, w * 0.22, 0, Math.PI * 2);
        ctx.stroke();

        // Orbiting rings
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.save();
        ctx.translate(cx, y);
        
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.35, h * 0.15, Math.PI * 0.15 + Math.sin(this._time * 1.2) * 0.1, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(186, 85, 211, 0.7)';
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.35, h * 0.15, -Math.PI * 0.15 - Math.sin(this._time * 1.5) * 0.1, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();

        // Screen face inside the probe
        // Eyes
        var eyeSpacing = w * 0.07;
        var eyeY = y - 3;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(cx - eyeSpacing, eyeY, 3, 4.5, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + eyeSpacing, eyeY, 3, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pupils
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(cx - eyeSpacing, eyeY, 1.5, 0, Math.PI * 2);
        ctx.arc(cx + eyeSpacing, eyeY, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Eyebrows
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - eyeSpacing - 4, eyeY - 6);
        ctx.lineTo(cx - eyeSpacing + 4, eyeY - 6);
        ctx.moveTo(cx + eyeSpacing - 4, eyeY - 6);
        ctx.lineTo(cx + eyeSpacing + 4, eyeY - 6);
        ctx.stroke();

        // Smile
        ctx.beginPath();
        ctx.arc(cx, y + 4, 3, 0.1, Math.PI - 0.1);
        ctx.stroke();

        ctx.restore();
    }

    // ── Pause Screen ───────────────────────────────────────────────

    drawPause(ctx) {
        var cx = CFG.WIDTH / 2;
        var cy = CFG.HEIGHT / 2;

        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(0, 0, CFG.WIDTH, CFG.HEIGHT);

        // PAUSED
        this._shadowText(ctx, 'PAUSED', cx, 40, '#ffffff',
            'bold 36px "Courier New", monospace', 'center');

        // Random tip
        var tip = MenuSystem.TIPS[this._tipIndex % MenuSystem.TIPS.length];
        this._shadowText(ctx, '"' + tip + '"', cx, 85, '#bbbb88',
            'italic 13px "Courier New", monospace', 'center');

        // ── Stats (two columns: left=run, right=lifetime) ──────
        var prog = this.progression;
        var ach  = this.achievements;
        var scr  = this.scoring;
        var rowY = 120;

        if (scr) {
            this._shadowText(ctx, 'THIS RUN', cx - 200, rowY, '#88aa88', 'bold 11px "Courier New", monospace', 'center');
            this._shadowText(ctx, 'Score: ' + (scr.score || 0), cx - 200, rowY + 16, '#aaccaa', '11px "Courier New", monospace', 'center');
            this._shadowText(ctx, 'Sanitized: ' + (scr.totalKills || 0), cx - 200, rowY + 30, '#aaccaa', '11px "Courier New", monospace', 'center');
            this._shadowText(ctx, 'Best Combo: x' + (scr.bestCombo || 0), cx - 200, rowY + 44, '#aaccaa', '11px "Courier New", monospace', 'center');
        }
        if (prog) {
            this._shadowText(ctx, 'LIFETIME', cx + 200, rowY, '#8888aa', 'bold 11px "Courier New", monospace', 'center');
            this._shadowText(ctx, 'Highest Cycle: ' + prog.highestWave, cx + 200, rowY + 16, '#aaaacc', '11px "Courier New", monospace', 'center');
            this._shadowText(ctx, 'Total Sanitized: ' + prog.totalKills, cx + 200, rowY + 30, '#aaaacc', '11px "Courier New", monospace', 'center');
            this._shadowText(ctx, 'TP Earned: ' + prog.totalStormPoints, cx + 200, rowY + 44, '#aaaacc', '11px "Courier New", monospace', 'center');
        }
        if (ach) {
            var achProg = ach.getProgress();
            this._shadowText(ctx, 'Achievements: ' + achProg.unlocked + '/' + achProg.total,
                cx, rowY + 66, '#9999aa', '11px "Courier New", monospace', 'center');
        }

        // ── Volume controls ────────────────────────────────────
        var volY = rowY + 90;
        this._shadowText(ctx, 'VOLUME', cx, volY, '#8888aa', 'bold 11px "Courier New", monospace', 'center');

        var musicLabel = this._volSelected === 0 ? '\u25B6 Music' : '  Music';
        var sfxLabel = this._volSelected === 1 ? '\u25B6 SFX' : '  SFX';

        this._shadowText(ctx, musicLabel, cx - 70, volY + 16, this._volSelected === 0 ? '#ffffff' : '#666666', '11px "Courier New", monospace', 'left');
        this.drawBar(ctx, cx + 10, volY + 14, 80, 7, this._musicVolume, '#4488dd', '#222233');

        this._shadowText(ctx, sfxLabel, cx - 70, volY + 30, this._volSelected === 1 ? '#ffffff' : '#666666', '11px "Courier New", monospace', 'left');
        this.drawBar(ctx, cx + 10, volY + 28, 80, 7, this._sfxVolume, '#44dd88', '#222233');

        this._shadowText(ctx, '\u2190\u2192 adjust  \u2191\u2193 select', cx, volY + 46, '#444444', '9px "Courier New", monospace', 'center');

        // ── Menu hints ─────────────────────────────────────────
        this._shadowText(ctx, 'ESC - Resume   A - Achievements   M - Main Menu', cx, CFG.HEIGHT - 30, '#888888',
            '12px "Courier New", monospace', 'center');
    }

    // ── Game Over Screen (Newspaper style) ─────────────────────────

    drawGameOver(ctx, scoring) {
        var cx = CFG.WIDTH / 2;
        var cy = CFG.HEIGHT / 2;

        // Read stats from the stored snapshot, with fallbacks
        var gs = this._gameOverStats || {};
        var waveNumber = gs.waveNumber || 0;
        var totalKills = gs.totalKills || 0;
        var bestCombo  = gs.bestCombo  || 0;
        var score      = gs.score      || (scoring && scoring.score) || 0;
        var highScore  = gs.highScore  || (scoring && scoring.highScore) || 0;
        var isNewHigh  = gs.isNewHigh  || false;

        // ── Dark overlay ─────────────────────────────────────────
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, CFG.WIDTH, CFG.HEIGHT);

        // ── Newspaper dimensions ─────────────────────────────────
        var paperW = Math.min(520, CFG.WIDTH - 40);
        var paperH = Math.min(560, CFG.HEIGHT - 40);
        var paperX = cx - paperW / 2;
        var paperY = cy - paperH / 2;

        // ── Torn-edge / border effect ────────────────────────────
        // Outer shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;

        // Cream-colored paper background with subtle torn edges
        ctx.fillStyle = '#f5f0e1';
        ctx.beginPath();
        ctx.moveTo(paperX + 2, paperY);
        // Top edge with slight irregularity
        for (var tx = paperX + 2; tx < paperX + paperW; tx += 8) {
            ctx.lineTo(tx, paperY + Math.sin(tx * 0.7) * 1.2);
        }
        // Right edge
        for (var ry = paperY; ry < paperY + paperH; ry += 8) {
            ctx.lineTo(paperX + paperW + Math.sin(ry * 0.5) * 1.5, ry);
        }
        // Bottom edge
        for (var bx = paperX + paperW; bx > paperX; bx -= 8) {
            ctx.lineTo(bx, paperY + paperH + Math.sin(bx * 0.6) * 1.3);
        }
        // Left edge
        for (var ly = paperY + paperH; ly > paperY; ly -= 8) {
            ctx.lineTo(paperX + Math.sin(ly * 0.4) * 1.4, ly);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Subtle inner border
        ctx.strokeStyle = '#c8b89a';
        ctx.lineWidth = 1;
        ctx.strokeRect(paperX + 8, paperY + 8, paperW - 16, paperH - 16);

        // ── Helper for newspaper text (dark ink on paper) ────────
        var self = this;
        var inkText = function(text, x, y, font, align, color) {
            ctx.font = font;
            ctx.textAlign = align || 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = color || '#1a1a1a';
            ctx.fillText(text, x, y);
        };

        // ── Masthead: THE MUNICIPAL CHRONICLE ────────────────────
        var mastheadY = paperY + 18;
        inkText('THE MUNICIPAL CHRONICLE', cx, mastheadY,
            'bold 24px "Courier New", monospace', 'center', '#1a1a1a');

        // Thin rule under masthead
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(paperX + 20, mastheadY + 40);
        ctx.lineTo(paperX + paperW - 20, mastheadY + 40);
        ctx.stroke();

        // Thin rule (double line effect)
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(paperX + 20, mastheadY + 44);
        ctx.lineTo(paperX + paperW - 20, mastheadY + 44);
        ctx.stroke();

        // ── Date line ────────────────────────────────────────────
        var dateLineY = mastheadY + 50;
        var now = new Date();
        var months = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
        var dateStr = months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear();
        var volLine = 'Cycle ' + waveNumber + '  |  ' + dateStr + '  |  Plant Ops Bulletin';
        inkText(volLine, cx, dateLineY,
            '10px "Courier New", monospace', 'center', '#555555');

        // Separator
        ctx.strokeStyle = '#999999';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(paperX + 20, dateLineY + 16);
        ctx.lineTo(paperX + paperW - 20, dateLineY + 16);
        ctx.stroke();

        // ── Main Headline ────────────────────────────────────────
        var headline = 'SENTIENT PROBE SAVES MUNICIPAL DRINKING WATER';
        if (score > 50000) {
            headline = 'DRONE ACHIEVES UNPRECEDENTED LOG REMOVAL';
        } else if (totalKills > 100) {
            headline = 'PATHOGEN LOAD DROPS DRAMATICALLY';
        } else if (totalKills < 5) {
            headline = "WORLD'S LEAST EFFICIENT PROBE DISAPPOINTS";
        } else if (waveNumber >= 20) {
            headline = 'MULTI-BARRIER TREATMENT TRAIN HOLDS THE LINE';
        } else if (waveNumber >= 15) {
            headline = 'VIRUS BOSS DEFEATED INSIDE UV REACTOR';
        } else if (waveNumber >= 10) {
            headline = 'SUPER-BACTERIA NO MATCH FOR DISINFECTION TRAIN';
        } else if (waveNumber < 3) {
            headline = 'BRIEF SHOCK MILDLY IRRITATES A FEW AMOEBAE';
        }

        var headlineY = dateLineY + 24;

        // Word-wrap headline into the newspaper width
        var headlineMaxW = paperW - 60;
        var headlineLines = this._wrapText(ctx, headline,
            'bold 20px "Courier New", monospace', headlineMaxW);

        for (var hi = 0; hi < headlineLines.length; hi++) {
            inkText(headlineLines[hi], cx, headlineY + hi * 24,
                'bold 20px "Courier New", monospace', 'center', '#1a1a1a');
        }

        // ── Sub-headline ─────────────────────────────────────────
        var subHeadY = headlineY + headlineLines.length * 24 + 6;
        var subHead = this._gameOverSubHeadline || 'Finished-water sample passes inspection';
        inkText(subHead, cx, subHeadY,
            'italic 12px "Courier New", monospace', 'center', '#444444');

        // Separator
        ctx.strokeStyle = '#999999';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(paperX + 30, subHeadY + 20);
        ctx.lineTo(paperX + paperW - 30, subHeadY + 20);
        ctx.stroke();

        // ── Article body ─────────────────────────────────────────
        var articleY = subHeadY + 28;
        var articleMaxW = paperW - 60;

        var article = "The WTP operator known as 'Diss N Fex' sterilized the water channel across "
            + waveNumber + ' treatment cycle' + (waveNumber !== 1 ? 's' : '')
            + ', neutralizing ' + totalKills + ' pathogen'
            + (totalKills !== 1 ? 's' : '') + ' in its wake. '
            + 'The treatment train achieved a peak combo of x' + bestCombo
            + ' and accumulated log-removal efficiency estimated at '
            + score.toLocaleString() + ' points.';

        if (isNewHigh) {
            article += ' This surpasses the previous record, establishing a new all-time high.';
        }

        var articleLines = this._wrapText(ctx, article,
            '11px "Courier New", monospace', articleMaxW);

        for (var ai = 0; ai < articleLines.length; ai++) {
            inkText(articleLines[ai], paperX + 30, articleY + ai * 15,
                '11px "Courier New", monospace', 'left', '#333333');
        }

        // ── Score display (centered, prominent) ──────────────────
        var scoreY = articleY + articleLines.length * 15 + 14;
        inkText('TOTAL TREATMENT SCORE', cx, scoreY,
            'bold 10px "Courier New", monospace', 'center', '#666666');
        inkText(score.toLocaleString(), cx, scoreY + 14,
            'bold 24px "Courier New", monospace', 'center', '#1a1a1a');

        // High score line
        if (!isNewHigh && highScore > 0) {
            inkText('Record: ' + highScore.toLocaleString(), cx, scoreY + 42,
                '10px "Courier New", monospace', 'center', '#888888');
        }

        // ── Weather Forecast box (bottom-right) ──────────────────
        var forecastW = 170;
        var forecastH = 60;
        var forecastX = paperX + paperW - forecastW - 20;
        var forecastY = paperY + paperH - forecastH - 40;

        // Box border
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        ctx.strokeRect(forecastX, forecastY, forecastW, forecastH);

        // Box header
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(forecastX, forecastY, forecastW, 16);
        inkText('WEATHER FORECAST', forecastX + forecastW / 2, forecastY + 1,
            'bold 10px "Courier New", monospace', 'center', '#f5f0e1');

        // Forecast text
        var forecast = this._gameOverForecast || 'Extended forecast: pain';
        var forecastLines = this._wrapText(ctx, forecast,
            '10px "Courier New", monospace', forecastW - 12);
        for (var fi = 0; fi < forecastLines.length; fi++) {
            inkText(forecastLines[fi], forecastX + forecastW / 2, forecastY + 20 + fi * 13,
                '10px "Courier New", monospace', 'center', '#333333');
        }

        // ── NEW RECORD diagonal banner ───────────────────────────
        if (isNewHigh) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(-0.3);

            // Banner background
            ctx.fillStyle = 'rgba(204, 160, 30, 0.92)';
            ctx.fillRect(-paperW / 2 - 10, -16, paperW + 20, 34);

            // Banner border
            ctx.strokeStyle = '#8b6914';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-paperW / 2 - 10, -16, paperW + 20, 34);

            // Banner text with pulsing
            var pulse = 1.0 + 0.08 * Math.sin(this._time * 5);
            ctx.scale(pulse, pulse);
            ctx.font = 'bold 18px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#1a1a1a';
            ctx.fillText('\u2605 NEW RECORD \u2605', 1, 2);
            ctx.fillStyle = '#ffffff';
            ctx.fillText('\u2605 NEW RECORD \u2605', 0, 0);

            ctx.restore();
        }

        // ── "Press ENTER for Main Menu" (bottom of paper) ────────
        var promptY = paperY + paperH - 30;
        if (Math.sin(this._blinkTimer * 3) > -0.3) {
            inkText('Press ENTER for Main Menu', cx, promptY,
                'bold 13px "Courier New", monospace', 'center', '#1a1a1a');
        }
    }

    /**
     * Word-wrap helper: splits text to fit within maxWidth for the given font.
     * @returns {string[]} array of lines
     */
    _wrapText(ctx, text, font, maxWidth) {
        ctx.font = font;
        var words = text.split(' ');
        var lines = [];
        var currentLine = '';

        for (var i = 0; i < words.length; i++) {
            var testLine = currentLine ? (currentLine + ' ' + words[i]) : words[i];
            var metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = words[i];
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }
        return lines;
    }

    // ── Shop Screen ──────────────────────────────────────────────────

    // ── Achievements Screen ─────────────────────────────────────────

    drawAchievements(ctx) {
        var cx = CFG.WIDTH / 2;
        var w = CFG.WIDTH;
        var h = CFG.HEIGHT;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, w, h);

        var ach = this.achievements;
        var allAch = (typeof ACHIEVEMENTS !== 'undefined') ? ACHIEVEMENTS : [];
        var progress = ach ? ach.getProgress() : { unlocked: 0, total: allAch.length };

        this._shadowText(ctx, 'ACHIEVEMENTS', cx, 25, '#ffdd44',
            'bold 28px "Courier New", monospace', 'center');
        this._shadowText(ctx, progress.unlocked + ' / ' + progress.total + ' unlocked', cx, 55, '#aaaaaa',
            '14px "Courier New", monospace', 'center');

        // Grid of achievements — centered, max 900px wide
        var cols = 2;
        var maxGridW = Math.min(900, w - 60);
        var gap = 8;
        var cardW = Math.floor((maxGridW - gap * (cols - 1)) / cols);
        var cardH = 50;
        var startX = Math.floor((w - maxGridW) / 2);
        var startY = 80;
        // Use scrollOffset for many achievements
        if (!this._achScroll) this._achScroll = 0;

        // Clip so scrolled cards don't overlap title
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 70, w, h - 110);
        ctx.clip();

        for (var i = 0; i < allAch.length; i++) {
            var a = allAch[i];
            var col = i % cols;
            var row = Math.floor(i / cols);
            var ax = startX + col * (cardW + gap);
            var ay = startY + row * (cardH + gap) - (this._achScroll || 0);

            if (ay + cardH < 70) continue; // above visible area (scrolled past)
            if (ay > h - 40) continue; // below visible area

            var unlocked = ach ? ach.isUnlocked(a.id) : false;

            // Card background
            ctx.fillStyle = unlocked ? '#1a1a3a' : '#0d0d1a';
            ctx.fillRect(ax, ay, cardW, cardH);
            ctx.strokeStyle = unlocked ? '#ffdd44' : '#222233';
            ctx.lineWidth = 1;
            ctx.strokeRect(ax, ay, cardW, cardH);

            // Icon
            ctx.font = '20px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = unlocked ? '#ffffff' : '#333344';
            ctx.fillText(a.icon, ax + 6, ay + cardH / 2);

            // Name
            ctx.font = 'bold 12px "Courier New", monospace';
            ctx.fillStyle = unlocked ? '#ffdd44' : '#444455';
            ctx.fillText(a.name, ax + 32, ay + 16);

            // Description
            ctx.font = '10px "Courier New", monospace';
            ctx.fillStyle = unlocked ? '#888899' : '#333344';
            ctx.fillText(a.desc, ax + 32, ay + 34);

            // Locked overlay
            if (!unlocked) {
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(ax, ay, cardW, cardH);
            }
        }
        ctx.restore(); // end clip

        // Back hint
        this._shadowText(ctx, 'Arrow keys to scroll | ESC or A to go back', cx, h - 20, '#666666',
            '12px "Courier New", monospace', 'center');
    }

    // ── Shop Screen ──────────────────────────────────────────────────

    drawShop(ctx, progression) {
        var cx = CFG.WIDTH / 2;
        var w  = CFG.WIDTH;
        var h  = CFG.HEIGHT;

        // Dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, w, h);

        // Title
        ctx.save();
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 15;
        this._shadowText(ctx, 'TREATMENT TRAIN UPGRADES', cx, 22, '#ffffff',
            'bold 28px "Courier New", monospace', 'center');
        ctx.restore();

        // Sanitization points
        var pts = progression ? progression.stormPoints : 0;
        this._shadowText(ctx, 'Treatment Points: ' + pts, cx, 58, '#ffcc00',
            'bold 20px "Courier New", monospace', 'center');

        // Color-coding by upgrade type
        var upgradeColors = {
            rainDamage:      '#4488dd',
            rainWidth:       '#4488dd',
            hailDamage:      '#aaddee',
            hailPierce:      '#aaddee',
            lightningAoe:    '#ddcc00',
            lightningCharge: '#ddcc00',
            tornadoDuration: '#aa8855',
            tornadoWidth:    '#aa8855',
            frostDuration:   '#88ccff',
            fogRadius:       '#888899',
            meterRecharge:   '#ffffff',
            comboWindow:     '#ffffff',
            moveSpeed:       '#ffffff',
        };

        // Split upgrades into two columns:
        // Left: rain, hail, general   Right: lightning, tornado
        var leftKeys  = [];
        var rightKeys = [];
        var allKeys   = UPGRADES ? Object.keys(UPGRADES) : [];

        for (var ki = 0; ki < allKeys.length; ki++) {
            var k = allKeys[ki];
            if (k.indexOf('lightning') === 0 || k.indexOf('tornado') === 0 || k.indexOf('frost') === 0 || k.indexOf('fog') === 0) {
                rightKeys.push(k);
            } else {
                leftKeys.push(k);
            }
        }

        // Draw upgrades in a two-column layout
        var colLeftX  = 30;
        var colRightX = cx + 15;
        var startY    = 95;
        var rowH      = 58;

        // Helper to draw a single upgrade entry
        var self = this;
        var drawEntry = function(key, index, x, y) {
            var def   = UPGRADES[key];
            var level = progression ? progression.getUpgradeLevel(key) : 0;
            var cost  = progression ? progression.getUpgradeCost(key) : null;
            var canBuy = progression ? progression.canAfford(key) : false;
            var color = upgradeColors[key] || '#ffffff';

            // Number key label (1-9, 0 for 10th)
            var numLabel = ''; // click to buy

            // Highlight if affordable
            var nameColor = canBuy ? color : self._dimColor(color, 0.55);
            var boxY = y - 3;
            var boxH = rowH - 6;
            var colW = cx - 30;

            // Subtle highlight background for affordable upgrades
            if (canBuy) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
                ctx.fillRect(x - 6, boxY, colW, boxH);
            }

            // Buy indicator
            self._shadowText(ctx, canBuy ? '\u25B6' : '\u25AA', x, y, canBuy ? '#ffcc00' : '#333333',
                '12px "Courier New", monospace', 'left');

            // Upgrade name
            self._shadowText(ctx, def.name, x + 32, y, nameColor,
                'bold 14px "Courier New", monospace', 'left');

            // Level squares: filled for purchased, empty for remaining
            var squares = '';
            for (var li = 0; li < def.maxLevel; li++) {
                squares += (li < level) ? '\u25A0' : '\u25A1';
            }
            self._shadowText(ctx, squares, x + 32, y + 17, nameColor,
                '14px "Courier New", monospace', 'left');

            // Cost or MAX
            var costStr;
            var costColor;
            if (cost === null) {
                costStr  = 'MAX';
                costColor = '#44cc44';
            } else {
                costStr  = cost + ' TP';
                costColor = canBuy ? '#ffcc00' : '#776633';
            }
            self._shadowText(ctx, costStr, x + colW - 10, y, costColor,
                'bold 13px "Courier New", monospace', 'right');

            // Description
            self._shadowText(ctx, def.desc, x + 32, y + 33, '#777777',
                '11px "Courier New", monospace', 'left');
        };

        // Draw left column entries
        for (var li = 0; li < leftKeys.length; li++) {
            var globalIdx = allKeys.indexOf(leftKeys[li]);
            drawEntry(leftKeys[li], globalIdx, colLeftX, startY + li * rowH);
        }

        // Draw right column entries
        for (var ri = 0; ri < rightKeys.length; ri++) {
            var globalIdx2 = allKeys.indexOf(rightKeys[ri]);
            drawEntry(rightKeys[ri], globalIdx2, colRightX, startY + ri * rowH);
        }

        // ── Cosmetic Selector ──
        var cosmeticY = h - 160;
        this._shadowText(ctx, '- OPERATOR GEAR -', cx, cosmeticY, '#ccaaff',
            'bold 13px "Courier New", monospace', 'center');

        // Build list of unlocked cosmetics
        var unlockedCosmetics = [];
        var gearList = typeof OPERATOR_GEAR !== 'undefined' ? OPERATOR_GEAR :
            (typeof CLOUD_COSMETICS !== 'undefined' ? CLOUD_COSMETICS : []);
        if (gearList.length) {
            for (var ci = 0; ci < gearList.length; ci++) {
                var cosm = gearList[ci];
                var waveOk = cosm.unlockWave === 0 || (progression && progression.highestWave >= cosm.unlockWave);
                var achOk  = !cosm.unlockAch || (this.achievements && this.achievements.isUnlocked(cosm.unlockAch));
                if (cosm.id === 'none' || (waveOk && achOk)) {
                    unlockedCosmetics.push(cosm);
                }
            }
        }

        if (unlockedCosmetics.length > 0) {
            // Clamp index
            if (this._cosmeticIndex < 0) this._cosmeticIndex = unlockedCosmetics.length - 1;
            if (this._cosmeticIndex >= unlockedCosmetics.length) this._cosmeticIndex = 0;

            var selCosmetic = unlockedCosmetics[this._cosmeticIndex];
            var selected = progression ? progression.selectedCosmetic : 'none';

            // Draw arrows and current selection
            var arrowFont = 'bold 16px "Courier New", monospace';
            var nameFont  = 'bold 14px "Courier New", monospace';
            this._shadowText(ctx, '<', cx - 100, cosmeticY + 20, '#ffcc00', arrowFont, 'center');
            this._shadowText(ctx, '>', cx + 100, cosmeticY + 20, '#ffcc00', arrowFont, 'center');

            var cosColor = (selCosmetic.id === selected) ? '#ffcc00' : '#cccccc';
            this._shadowText(ctx, selCosmetic.name, cx, cosmeticY + 20, cosColor, nameFont, 'center');

            if (selCosmetic.id === selected) {
                this._shadowText(ctx, '(equipped)', cx, cosmeticY + 38, '#88cc88',
                    '10px "Courier New", monospace', 'center');
            }

            this._shadowText(ctx, '< , >  to browse cosmetics', cx, cosmeticY + 38 + (selCosmetic.id === selected ? 14 : 0),
                '#666666', '10px "Courier New", monospace', 'center');
        }

        // Show locked cosmetics hint
        var totalCosmetics = gearList.length;
        if (unlockedCosmetics.length < totalCosmetics) {
            var locked = totalCosmetics - unlockedCosmetics.length;
            this._shadowText(ctx, locked + ' more locked (reach higher cycles & achievements)',
                cx, cosmeticY + 58 + (unlockedCosmetics.length > 0 ? 0 : 0), '#555555',
                '10px "Courier New", monospace', 'center');
        }

        // ── Unlocked Attacks section ──
        var attackY = h - 100;
        this._shadowText(ctx, '- TREATMENT BARRIERS -', cx, attackY, '#ffffff',
            'bold 14px "Courier New", monospace', 'center');

        var attacks = [
            { name: 'Chlorine',  key: 'rain',      icon: '\u2602', color: '#4488dd' },
            { name: 'Ozone',     key: 'hail',      icon: '\u2744', color: '#aaddee' },
            { name: 'UV',        key: 'lightning',  icon: '\u26A1', color: '#ddcc00' },
            { name: 'Filter',    key: 'tornado',    icon: '\u2301', color: '#aa8855' },
            { name: 'Coagulant', key: 'frost',      icon: '\u2745', color: '#88ccff' },
            { name: 'pH',        key: 'fog',        icon: '\u2601', color: '#888899' },
        ];

        var atkSpacing = 90;
        var atkStartX  = cx - (attacks.length - 1) * atkSpacing / 2;

        for (var ai = 0; ai < attacks.length; ai++) {
            var atk = attacks[ai];
            var ax  = atkStartX + ai * atkSpacing;
            var unlocked = progression ? progression.hasAttack(atk.key) : false;

            // Icon (lock symbol when not unlocked)
            this._shadowText(ctx, unlocked ? atk.icon : '\uD83D\uDD12', ax, attackY + 22,
                unlocked ? atk.color : '#333333',
                '22px "Courier New", monospace', 'center');
            // Name
            this._shadowText(ctx, atk.name, ax, attackY + 48, unlocked ? atk.color : '#444444',
                '12px "Courier New", monospace', 'center');
        }

        // Bottom prompts
        if (Math.sin(this._blinkTimer * 3) > -0.3) {
            this._shadowText(ctx, 'Press ENTER to continue', cx, h - 28, '#ffffff',
                'bold 14px "Courier New", monospace', 'center');
        }

        // Reset save hint (small red text in bottom-left corner)
        this._shadowText(ctx, 'Press R to reset save', 10, h - 16, '#773333',
            '10px "Courier New", monospace', 'left');
    }

    /**
     * Dim a hex color by a factor (0..1).  Used by drawShop.
     */
    _dimColor(hex, factor) {
        // Parse #RRGGBB
        var r = parseInt(hex.substring(1, 3), 16);
        var g = parseInt(hex.substring(3, 5), 16);
        var b = parseInt(hex.substring(5, 7), 16);
        r = Math.floor(r * factor);
        g = Math.floor(g * factor);
        b = Math.floor(b * factor);
        return '#' + ('0' + r.toString(16)).slice(-2)
                   + ('0' + g.toString(16)).slice(-2)
                   + ('0' + b.toString(16)).slice(-2);
    }

    // ── How to Play Screen ─────────────────────────────────────────

    drawHowToPlay(ctx) {
        var cx = CFG.WIDTH / 2;
        var startY = 120;
        var gap = 32;

        // Overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, CFG.WIDTH, CFG.HEIGHT);

        // Title
        this._shadowText(ctx, 'HOW TO PLAY', cx, 50, '#ffffff',
            'bold 28px "Courier New", monospace', 'center');

        // Controls
        var controls = [
            { key: 'WASD / Arrows',  desc: 'Move WTP operator' },
            { key: 'SPACE (hold)',    desc: 'Dose chlorine contact spray' },
            { key: 'E / Left-click', desc: 'Fire ozone diffuser bubbles' },
            { key: 'Q / Right-click', desc: 'Pulse UV reactor light' },
            { key: 'F',              desc: 'Backwash filter vortex' },
            { key: 'R',              desc: 'Inject coagulant for floc' },
            { key: 'T',              desc: 'Adjust pH shock zone' },
            { key: '1-5',            desc: 'Use stored treatment aid' },
        ];

        for (var i = 0; i < controls.length; i++) {
            var y = startY + i * gap;
            this._shadowText(ctx, controls[i].key, cx - 20, y, '#ffff88',
                'bold 16px "Courier New", monospace', 'right');
            this._shadowText(ctx, controls[i].desc, cx + 20, y, '#cccccc',
                '16px "Courier New", monospace', 'left');
        }

        // Combo system
        var comboY = startY + controls.length * gap + 30;
        this._shadowText(ctx, '- COMBO SYSTEM -', cx, comboY, '#ffffff',
            'bold 18px "Courier New", monospace', 'center');

        var comboLines = [
            'Neutralize pathogens across the treatment train.',
            'Fast multi-barrier removals raise the log-removal score.',
            'Tiers: STABLE > STERILE > HYPER-PURE > DISTILLED',
        ];

        for (var j = 0; j < comboLines.length; j++) {
            this._shadowText(ctx, comboLines[j], cx, comboY + 30 + j * 24, '#aaaaaa',
                '13px "Courier New", monospace', 'center');
        }

        // Attack unlocks
        var unlockY = comboY + 30 + comboLines.length * 24 + 30;
        this._shadowText(ctx, '- PROCESS UNLOCKS -', cx, unlockY, '#ffffff',
            'bold 18px "Courier New", monospace', 'center');

        var unlockLines = [
            { text: 'Chlorine - Active from the start', color: '#4488dd' },
            { text: 'Ozone - Unlocks at Cycle 3',       color: '#aaddee' },
            { text: 'UV Light - Unlocks at Cycle 6',    color: '#ddcc00' },
            { text: 'Coagulant - Unlocks at Cycle 8',   color: '#88ccff' },
            { text: 'Filter Vortex - Unlocks at Cycle 10', color: '#aa8855' },
            { text: 'pH Shock - Unlocks at Cycle 12',   color: '#aaaaaa' },
        ];

        for (var u = 0; u < unlockLines.length; u++) {
            this._shadowText(ctx, unlockLines[u].text, cx, unlockY + 28 + u * 22,
                unlockLines[u].color, '13px "Courier New", monospace', 'center');
        }

        // Back
        this._shadowText(ctx, 'Press ESC to go back', cx, CFG.HEIGHT - 60, '#888888',
            '14px "Courier New", monospace', 'center');
    }

    // ── Bar helper (for volume sliders) ────────────────────────────

    drawBar(ctx, x, y, w, h, fill, color, bgColor) {
        ctx.fillStyle = bgColor || '#222222';
        ctx.fillRect(x, y, w, h);
        var fw = Math.max(0, Math.min(1, fill)) * w;
        if (fw > 0) {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, fw, h);
        }
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
    }

    // ── Text helper ────────────────────────────────────────────────

    _shadowText(ctx, text, x, y, color, font, align) {
        ctx.font = font;
        ctx.textAlign = align || 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#000000';
        ctx.fillText(text, x + 1, y + 1);
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    }
}

// ── Pause-screen tips ──────────────────────────────────────────────

MenuSystem.TIPS = [
    "UV light is science's way of saying 'deactivate DNA'",
    "Ozone: like oxygen, but more corrosive",
    "Nobody expects the night-shift operator",
    "Being sterile never felt so high-tech",
    "Remember: bacteria reproduce exponentially... react quickly!",
    "Diss N Fex was rated '99.9% effective against E. coli'",
    "Fun fact: chlorine is just angry sanitizer",
    "Have you tried NOT letting bacteria clog the filters?",
];

// ── Newspaper sub-headlines (game over screen) ────────────────────

MenuSystem.SUB_HEADLINES = [
    "Biofilm formation rate drops 90%",
    "Pathogen resistance genes fail to adapt",
    "Plant report: WTP operator keeps the clearwell steady",
    "EPA confirms drinking water achieves 100% purity",
    "Mutant Bacillus claims 'corrosive environment'",
    "Lab results confirmed: completely germ-free",
];

// ── Weather forecast quips (game over screen) ─────────────────────

MenuSystem.FORECASTS = [
    "Next batch: 99.9% pure water",
    "Extended report: zero pathogens",
    "Partly chlorinated with a chance of UV",
    "Flow rate steady (and also sanitized)",
];
