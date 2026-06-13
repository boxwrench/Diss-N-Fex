// ── HUD (Heads-Up Display) ─────────────────────────────────────────
// Screen-space overlay: resource bars, score, combo, wave info, power-ups.
// Depends on global CFG.

var HUD = {

    // ── Helper: draw a horizontal bar ──────────────────────────────

    drawBar: function (ctx, x, y, w, h, fill, color, bgColor, label) {
        if (label) {
            ctx.font = 'bold 10px "Courier New", monospace';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#000000';
            ctx.fillText(label, x - 5 + 1, y + h / 2 + 1);
            ctx.fillStyle = '#cccccc';
            ctx.fillText(label, x - 5, y + h / 2);
        }

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
    },

    _shadowText: function (ctx, text, x, y, color, font, align) {
        ctx.font = font;
        ctx.textAlign = align || 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#000000';
        ctx.fillText(text, x + 1, y + 1);
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    },

    // ── Main draw ──────────────────────────────────────────────────

    draw: function (ctx, game) {
        ctx.save();
        var s = CFG._scale || 1;
        ctx.setTransform(s, 0, 0, s, 0, 0);

        this._drawResourceBars(ctx, game);
        this._drawInventory(ctx, game);
        this._drawWaveInfo(ctx, game);
        this._drawTreatmentObjective(ctx, game);
        this._drawScore(ctx, game);
        this._drawCombo(ctx, game);
        this._drawPowerups(ctx, game);

        ctx.restore();
    },

    _drawTreatmentObjective: function (ctx, game) {
        var objectives = game.treatmentObjectives;
        var waves = game.waves;
        if (!objectives || !objectives.getStatus || !waves || waves.state !== 'playing') return;

        var status = objectives.getStatus();
        if (!status) return;

        var w = 390;
        var x = 20;
        var y = 208;
        var h = 70;
        var progress = Math.max(0, Math.min(1, status.progress || 0));

        ctx.save();
        ctx.fillStyle = 'rgba(3, 13, 18, 0.78)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(120, 230, 220, 0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        this._shadowText(ctx, status.title, x + 12, y + 8, '#8fffee',
            'bold 12px "Courier New", monospace', 'left');
        this._shadowText(ctx, status.progressPct + '%', x + w - 12, y + 8, '#ffffff',
            'bold 12px "Courier New", monospace', 'right');

        ctx.fillStyle = '#10262c';
        ctx.fillRect(x + 12, y + 27, w - 24, 7);
        ctx.fillStyle = progress >= 0.8 ? '#44ff88' : progress >= 0.5 ? '#ffcc44' : '#ff6644';
        ctx.fillRect(x + 12, y + 27, (w - 24) * progress, 7);

        this._shadowText(ctx, status.metricLine, x + 12, y + 42, '#c8f7ff',
            '10px "Courier New", monospace', 'left');

        var alert = status.alerts && status.alerts.length ? status.alerts[status.alerts.length - 1] : status.target;
        this._shadowText(ctx, alert, x + 12, y + 56, '#aab7bb',
            '9px "Courier New", monospace', 'left');

        ctx.restore();
    },

    // Separate public method for intermission (called from main.js)
    drawIntermission: function (ctx, game) {
        ctx.save();
        var s = CFG._scale || 1;
        ctx.setTransform(s, 0, 0, s, 0, 0);
        this._drawIntermission(ctx, game);
        ctx.restore();
    },

    // ── Resource Meters (top-left) ─────────────────────────────────

    _drawResourceBars: function (ctx, game) {
        var rig = game.rig;
        if (!rig) return;
        var prog = game.progression;

        var barX = 70;
        var barY = 20;
        var barW = 140;
        var barH = 12;
        var gap  = 18;
        var row  = 0;
        var keyX = barX + barW + 6;

        // Operator HP bar (wider, at the top)
        if (rig.hp != null) {
            var hpFill = rig.hp / rig.maxHp;
            var hpColor = hpFill > 0.5 ? '#44cc44' : hpFill > 0.25 ? '#cccc00' : '#cc3333';
            this.drawBar(ctx, barX, barY, barW, barH + 2, hpFill, hpColor, '#1a1a2e', 'HP');
            // HP text
            ctx.font = '9px "Courier New", monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#aaaaaa';
            ctx.fillText(Math.ceil(rig.hp) + '/' + rig.maxHp, keyX, barY + (barH + 2) / 2);
            row++;
        }

        var _drawKey = function (y, key) {
            ctx.font = '9px "Courier New", monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#555566';
            ctx.fillText('[' + key + ']', keyX, y + barH / 2);
        };

        // Chlorine (always shown)
        var rainFill = (rig.chlorineMeter || 0) / CFG.CHLORINE.METER_MAX;
        this.drawBar(ctx, barX, barY + gap * row, barW, barH, rainFill, '#ccff33', '#1a1a2e', 'CHLORINE');
        _drawKey(barY + gap * row, 'SPACE');
        row++;

        // Helper: draw charge bar with key hint / READY
        var _drawChargeBar = function (self, label, key, fill, color, readyColor, unlocked, lockWave) {
            var y = barY + gap * row;
            if (unlocked) {
                var c = color;
                if (fill >= 1.0) {
                    var gl = 0.7 + 0.3 * Math.sin(performance.now() * 0.008);
                    c = readyColor.replace('A)', gl + ')');
                }
                self.drawBar(ctx, barX, y, barW, barH, fill, c, '#1a1a2e', label);
                if (fill >= 1.0) {
                    ctx.font = 'bold 9px "Courier New", monospace';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = readyColor.replace('A)', '1)');
                    ctx.fillText('[' + key + '] GO!', keyX, y + barH / 2);
                } else {
                    _drawKey(y, key);
                }
            } else {
                self._drawLockedBar(ctx, barX, y, barW, barH, label, 'Cycle ' + lockWave);
            }
            row++;
        };

        // Ozone
        var hailUnlocked = !prog || prog.hasAttack('ozone');
        _drawChargeBar(this, 'OZONE', 'E', (rig.ozoneMeter || 0) / CFG.OZONE.METER_MAX,
            '#00ffff', 'rgba(0,255,255,A)', hailUnlocked, 3);

        // UV
        var ltngUnlocked = !prog || prog.hasAttack('uv');
        var ltngCharge = rig._effectiveUVCharge || CFG.UV_PULSE.CHARGE_TIME;
        _drawChargeBar(this, 'UV LIGHT', 'Q', (rig.uvCharge || 0) / ltngCharge,
            '#dd66ff', 'rgba(220,100,255,A)', ltngUnlocked, 6);

        // Coagulant
        var frstUnlocked = !prog || prog.hasAttack('coagulant');
        _drawChargeBar(this, 'COAG', 'R', (rig.coagulantCharge || 0) / CFG.COAGULANT.CHARGE_TIME,
            '#ffffff', 'rgba(255,255,255,A)', frstUnlocked, 8);

        // Backwash
        var tornUnlocked = !prog || prog.hasAttack('backwash');
        _drawChargeBar(this, 'VORTX', 'F', (rig.backwashCharge || 0) / CFG.BACKWASH.CHARGE_TIME,
            '#00aaff', 'rgba(0,170,255,A)', tornUnlocked, 10);

        // pH Shock
        var fogUnlocked = !prog || prog.hasAttack('ph');
        _drawChargeBar(this, 'pH SHOCK', 'T', (rig.phCharge || 0) / CFG.PH_SHOCK.CHARGE_TIME,
            '#88cc44', 'rgba(136,204,68,A)', fogUnlocked, 12);

        // Treatment points indicator
        if (prog) {
            ctx.font = '10px "Courier New", monospace';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#ffcc00';
            ctx.fillText('TP: ' + prog.treatmentPoints, barX, barY + gap * row + 4);
        }
    },

    _drawLockedBar: function (ctx, x, y, w, h, label, unlockText) {
        if (label) {
            ctx.font = 'bold 10px "Courier New", monospace';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#444444';
            ctx.fillText(label, x - 5, y + h / 2);
        }
        ctx.fillStyle = '#111118';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        ctx.font = '9px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#555555';
        ctx.fillText('\uD83D\uDD12 ' + unlockText, x + w / 2, y + h / 2);
    },

    // ── Power-up Inventory (below resource bars, left side) ─────────

    _drawInventory: function (ctx, game) {
        var pu = game.powerups;
        if (!pu || !pu.inventory) return;

        var x = 20;
        var y = 165; // below all 6 resource bars + SP indicator
        var slotW = 32;
        var slotH = 32;
        var gap = 6;

        this._shadowText(ctx, 'TREATMENT AIDS', x + (slotW * pu.inventory.length + gap * (pu.inventory.length - 1)) / 2, y - 12, '#777777',
            '9px "Courier New", monospace', 'center');

        for (var i = 0; i < pu.inventory.length; i++) {
            var sx = x + i * (slotW + gap);
            var item = pu.inventory[i];

            // Slot background
            ctx.fillStyle = item ? '#1a1a3a' : '#0a0a18';
            ctx.fillRect(sx, y, slotW, slotH);
            ctx.strokeStyle = item ? '#555566' : '#222233';
            ctx.lineWidth = 1;
            ctx.strokeRect(sx, y, slotW, slotH);

            // Key number
            ctx.font = '9px "Courier New", monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#444455';
            ctx.fillText('' + (i + 1), sx + 2, y + 1);

            if (item) {
                // Colored circle background
                ctx.fillStyle = item.type.color;
                ctx.beginPath();
                ctx.arc(sx + slotW / 2, y + slotH / 2, 11, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Custom icon
                ctx.save();
                ctx.translate(sx + slotW / 2, y + slotH / 2);
                if (item.type.drawIcon) {
                    item.type.drawIcon(ctx, 11);
                } else {
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 11px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(item.type.name.charAt(0), 0, 1);
                }
                ctx.restore();
            }
        }
    },

    // ── Wave Info (top-center) ─────────────────────────────────────

    _drawWaveInfo: function (ctx, game) {
        var waves = game.waves;
        if (!waves) return;

        var cx = CFG.WIDTH / 2;

        var waveNum = waves.waveNumber || 1;
        this._shadowText(ctx, 'TREATMENT CYCLE ' + waveNum, cx, 10, '#ffffff',
            'bold 22px "Courier New", monospace', 'center');

        // Kill counter during playing waves
        if (waves.state === 'playing') {
            var killed = (game.scoring && game.scoring.waveKills) || 0;
            var alive = game.pedManager ? game.pedManager.getAlive().length : 0;
            this._shadowText(ctx, killed + ' removed | ' + alive + ' pathogen load', cx, 36, '#aaaaaa',
                '12px "Courier New", monospace', 'center');
        }

        if (waves.state === 'intermission' && waves.intermissionText) {
            this._shadowText(ctx, waves.intermissionText, cx, 38, '#aaaacc',
                '12px "Courier New", monospace', 'center');
        }
    },

    // ── Score (top-right) ──────────────────────────────────────────

    _drawScore: function (ctx, game) {
        var scoring = game.scoring;
        if (!scoring) return;

        var rx = CFG.WIDTH - 20;

        ctx.font = 'bold 24px "Courier New", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#000000';
        ctx.fillText('' + (scoring.score || 0), rx + 1, 11);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('' + (scoring.score || 0), rx, 10);

        ctx.font = '12px "Courier New", monospace';
        ctx.fillStyle = '#000000';
        ctx.fillText('HI: ' + (scoring.highScore || 0), rx + 1, 39);
        ctx.fillStyle = '#888888';
        ctx.fillText('HI: ' + (scoring.highScore || 0), rx, 38);

        // Combo multiplier next to score
        if (scoring.combo > 0 && scoring.comboMultiplier > 1) {
            var tier = this._getComboTier(scoring.combo);
            var tierColor = tier ? tier.color : '#ffff00';
            var pulse = 1.0 + 0.15 * Math.sin(performance.now() * 0.006);

            ctx.save();
            ctx.translate(rx, 58);
            ctx.scale(pulse, pulse);
            ctx.font = 'bold 16px "Courier New", monospace';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#000000';
            ctx.fillText('x' + scoring.comboMultiplier.toFixed(1), 1, 1);
            ctx.fillStyle = tierColor;
            ctx.fillText('x' + scoring.comboMultiplier.toFixed(1), 0, 0);
            ctx.restore();
        }
    },

    // ── Combo Display (bottom-center) ──────────────────────────────

    _drawCombo: function (ctx, game) {
        var scoring = game.scoring;
        if (!scoring || scoring.combo <= 0) return;

        var cx = CFG.WIDTH / 2;
        var by = CFG.HEIGHT - 60;

        var tier = this._getComboTier(scoring.combo);
        var tierColor = tier ? tier.color : '#ffff00';
        var tierLabel = tier ? tier.label : '';

        this._shadowText(ctx, 'COMBO x' + scoring.combo, cx, by, '#ffffff',
            'bold 18px "Courier New", monospace', 'center');

        this._shadowText(ctx, 'x' + scoring.comboMultiplier.toFixed(1) + ' MULT', cx, by + 22, tierColor,
            '14px "Courier New", monospace', 'center');

        if (tierLabel) {
            var tierIndex = this._getComboTierIndex(scoring.combo);
            var shake = tierIndex >= 2 ? (Math.random() - 0.5) * tierIndex * 2 : 0;
            var pulse = 1.0 + 0.1 * (tierIndex + 1) * Math.sin(performance.now() * 0.008);

            ctx.save();
            ctx.translate(cx + shake, by + 42);
            ctx.scale(pulse, pulse);
            ctx.font = 'bold 20px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#000000';
            ctx.fillText(tierLabel, 1, 1);
            ctx.fillStyle = tierColor;
            ctx.fillText(tierLabel, 0, 0);
            ctx.restore();
        }
    },

    // ── Active Power-ups (right side) ──────────────────────────────

    _drawPowerups: function (ctx, game) {
        var powerups = game.powerups;
        if (!powerups || !powerups.activeEffects || powerups.activeEffects.length === 0) return;

        var rx = CFG.WIDTH - 20;
        var sy = 90;
        var gap = 28;

        var active = powerups.activeEffects;
        for (var i = 0; i < active.length; i++) {
            var pu = active[i];
            var y  = sy + i * gap;

            ctx.font = '11px "Courier New", monospace';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#000000';
            ctx.fillText(pu.name || 'AID', rx + 1, y + 1);
            ctx.fillStyle = pu.color || '#44ff44';
            ctx.fillText(pu.name || 'AID', rx, y);

            // Use remaining as proportion (assume max ~15s for display)
            var maxDur = pu.remaining + 0.01;
            var remaining = pu.remaining / Math.max(maxDur, 1);
            this.drawBar(ctx, rx - 100, y + 14, 100, 6, Math.min(1, pu.remaining / 15), pu.color || '#44ff44', '#1a1a2e');

            var secs = Math.ceil(pu.remaining || 0);
            ctx.font = '9px "Courier New", monospace';
            ctx.fillStyle = '#aaaaaa';
            ctx.fillText(secs + 's', rx, y + 14);
        }
    },

    // ── Wave Intermission Overlay ──────────────────────────────────

    _drawIntermission: function (ctx, game) {
        var waves = game.waves;
        if (!waves || waves.state !== 'intermission') return;

        var cx = CFG.WIDTH / 2;
        var cy = CFG.HEIGHT / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, 0, CFG.WIDTH, CFG.HEIGHT);

        this._shadowText(ctx, 'CYCLE ' + (waves.waveNumber || 1) + ' COMPLETE', cx, cy - 135, '#ffffff',
            'bold 30px "Courier New", monospace', 'center');

        var stats = waves.getWaveStats ? waves.getWaveStats() : {};
        if (!stats) stats = {};
        var statY = cy - 86;
        var statGap = 22;

        this._shadowText(ctx, 'Pathogens Removed: ' + (stats.kills || 0), cx, statY, '#88ff88',
            '16px "Courier New", monospace', 'center');
        this._shadowText(ctx, 'Score: +' + (stats.score || 0), cx, statY + statGap, '#ffff88',
            '16px "Courier New", monospace', 'center');

        // Sanitization points earned this wave
        var prog = game.progression;
        if (prog) {
            this._shadowText(ctx, 'Treatment Points: ' + prog.treatmentPoints + ' TP', cx, statY + statGap * 2, '#ffcc00',
                '14px "Courier New", monospace', 'center');
        }

        var report = game.treatmentReport ||
            (game.treatmentObjectives && game.treatmentObjectives.getLastReport ? game.treatmentObjectives.getLastReport() : null);

        if (report) {
            var reportY = cy - 2;
            var gradeColor = report.grade === 'A' || report.grade === 'B' ? '#44ff88' :
                report.grade === 'C' ? '#ffcc44' : '#ff8844';
            this._shadowText(ctx, 'OPERATOR REPORT: ' + report.title, cx, reportY, '#8fffee',
                'bold 15px "Courier New", monospace', 'center');
            this._shadowText(ctx, report.status + ' | Grade ' + report.grade + ' | Objective ' + report.progressPct + '%',
                cx, reportY + 22, gradeColor, '14px "Courier New", monospace', 'center');
            this._shadowText(ctx, '+' + report.bonusTP + ' TP treatment bonus', cx, reportY + 43, '#ffcc00',
                '13px "Courier New", monospace', 'center');

            if (report.metrics && report.metrics.length) {
                this._shadowText(ctx, report.metrics.join('   |   '), cx, reportY + 63, '#c8f7ff',
                    '11px "Courier New", monospace', 'center');
            }
        }

        if (waves.intermissionText) {
            this._shadowText(ctx, waves.intermissionText, cx, cy + 88, '#aaaacc',
                'italic 14px "Courier New", monospace', 'center');
        }

        // Player choice
        var choiceY = cy + 120;
        var blink = Math.sin(performance.now() * 0.004) > -0.3;
        if (blink) {
            this._shadowText(ctx, 'ENTER \u2014 Next Cycle', cx, choiceY, '#44ff88',
                'bold 18px "Courier New", monospace', 'center');
        }
        this._shadowText(ctx, 'S \u2014 Treatment Shop', cx, choiceY + 28, '#ffcc44',
            'bold 16px "Courier New", monospace', 'center');
    },

    // ── Combo tier helpers ─────────────────────────────────────────

    _getComboTier: function (count) {
        var tiers = CFG.COMBO.TIERS;
        var result = null;
        for (var i = 0; i < tiers.length; i++) {
            if (count >= tiers[i].threshold) {
                result = tiers[i];
            }
        }
        return result;
    },

    _getComboTierIndex: function (count) {
        var tiers = CFG.COMBO.TIERS;
        var idx = -1;
        for (var i = 0; i < tiers.length; i++) {
            if (count >= tiers[i].threshold) {
                idx = i;
            }
        }
        return idx;
    },
};
