// -- Treatment Objective System -----------------------------------------
// Adds plant-operation goals, SCADA alerts, and end-of-cycle reports.

var TREATMENT_OBJECTIVE_DEFS = [
    {
        cycle: 1,
        id: 'chlorineResidual',
        title: 'Maintain Chlorine Residual',
        shortTitle: 'CHLORINE RESIDUAL',
        event: 'Startup residual check',
        target: 'Keep residual above 0.8 mg/L',
    },
    {
        cycle: 2,
        id: 'turbidityRemoval',
        title: 'Reduce Turbidity',
        shortTitle: 'TURBIDITY REMOVAL',
        event: 'Raw-water turbidity spike',
        target: 'Drive turbidity below 1.0 NTU',
    },
    {
        cycle: 3,
        id: 'ozoneContact',
        title: 'Build Ozone Contact',
        shortTitle: 'OZONE CONTACT',
        event: 'Ozone contact run',
        target: 'Reach target ozone exposure',
    },
    {
        cycle: 4,
        id: 'clearwellCT',
        title: 'Clearwell CT Audit',
        shortTitle: 'CLEARWELL CT',
        event: 'Contact-time audit',
        target: 'Hold disinfectant contact time',
    },
    {
        cycle: 5,
        id: 'contaminationSpike',
        title: 'Contain Contamination Spike',
        shortTitle: 'CONTAMINATION SPIKE',
        event: 'Boss contaminant detected',
        target: 'Remove the spike before release',
    },
];

function _treatClamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function _treatPercent(value) {
    return Math.round(_treatClamp(value, 0, 1) * 100);
}

function _getTreatmentObjectiveDef(cycle) {
    for (var i = 0; i < TREATMENT_OBJECTIVE_DEFS.length; i++) {
        if (TREATMENT_OBJECTIVE_DEFS[i].cycle === cycle) return TREATMENT_OBJECTIVE_DEFS[i];
    }
    var idx = (Math.max(1, cycle) - 1) % TREATMENT_OBJECTIVE_DEFS.length;
    return TREATMENT_OBJECTIVE_DEFS[idx];
}

class TreatmentObjectiveSystem {
    constructor() {
        this.reset();
        this._chiefActive = false;   // "Chief Operator" buff currently held
        this._chiefAnnounced = false;
    }

    reset() {
        this.current = null;
        this.lastReport = null;
        this._lastKills = 0;
        this._bossSeen = false;
        this._bossDefeated = false;
    }

    startCycle(cycle) {
        var def = _getTreatmentObjectiveDef(cycle || 1);
        this.current = {
            def: def,
            cycle: cycle || 1,
            elapsed: 0,
            progress: 0,
            alerts: [],
            metrics: this._initialMetrics(def.id),
        };
        this.lastReport = null;
        this._lastKills = 0;
        this._bossSeen = false;
        this._bossDefeated = false;
        this._chiefActive = false;
        this._chiefAnnounced = false;
    }

    _initialMetrics(id) {
        if (id === 'chlorineResidual') {
            return { residual: 0.45, timeAtTarget: 0, removed: 0 };
        }
        if (id === 'turbidityRemoval') {
            return { turbidity: 8.0, removed: 0 };
        }
        if (id === 'ozoneContact') {
            return { ozoneDose: 0, removed: 0 };
        }
        if (id === 'clearwellCT') {
            return { contactTime: 0, residual: 0.55, removed: 0 };
        }
        if (id === 'contaminationSpike') {
            return { containment: 0, bossProgress: 0, removed: 0 };
        }
        return { removed: 0 };
    }

    update(dt, game) {
        if (!this.current || !game || !game.waves || game.waves.state !== 'playing') return;

        var c = this.current;
        var m = c.metrics;
        c.elapsed += Math.max(0, dt || 0);

        var kills = (game.scoring && game.scoring.waveKills) || 0;
        var killDelta = Math.max(0, kills - this._lastKills);
        this._lastKills = kills;
        m.removed = kills;

        var id = c.def.id;
        if (id === 'chlorineResidual') {
            this._updateChlorine(c, game, dt, killDelta);
        } else if (id === 'turbidityRemoval') {
            this._updateTurbidity(c, game, dt, killDelta);
        } else if (id === 'ozoneContact') {
            this._updateOzone(c, game, dt, killDelta);
        } else if (id === 'clearwellCT') {
            this._updateClearwell(c, game, dt, killDelta);
        } else if (id === 'contaminationSpike') {
            this._updateContamination(c, game, dt, killDelta);
        }

        c.alerts = this._buildAlerts(c, game);
    }

    _updateChlorine(c, game, dt, killDelta) {
        var m = c.metrics;
        var dosing = game.rig && game.rig.isDosing;
        var boosted = game.powerups && game.powerups.hasEffect && game.powerups.hasEffect('chlorineBoost');
        if (dosing || boosted) m.residual += (boosted ? 0.34 : 0.22) * dt;
        else m.residual -= 0.045 * dt;
        m.residual += killDelta * 0.025;
        m.residual = _treatClamp(m.residual, 0.2, 1.35);
        if (m.residual >= 0.8) m.timeAtTarget += dt;

        var timeScore = _treatClamp(m.timeAtTarget / 9, 0, 1);
        var killScore = this._killProgress(game, 0.55);
        c.progress = _treatClamp(timeScore * 0.65 + killScore * 0.35, 0, 1);
    }

    _updateTurbidity(c, game, dt, killDelta) {
        var m = c.metrics;
        var dyeActive = game.powerups && game.powerups.getRainbow && game.powerups.getRainbow();
        var dosing = game.rig && game.rig.isDosing;
        m.turbidity -= killDelta * 0.8;
        if (dyeActive) m.turbidity -= 0.7 * dt;
        if (dosing) m.turbidity -= 0.18 * dt;
        m.turbidity += 0.025 * dt;
        m.turbidity = _treatClamp(m.turbidity, 0.25, 8.5);
        c.progress = _treatClamp((8.0 - m.turbidity) / 7.0, 0, 1);
    }

    _updateOzone(c, game, dt, killDelta) {
        var m = c.metrics;
        var hailActive = game.projectiles && game.projectiles.ozoneProjectiles && game.projectiles.ozoneProjectiles.length > 0;
        var autoOzone = game.powerups && game.powerups.hasEffect && game.powerups.hasEffect('ozoneAuto');
        if (hailActive) m.ozoneDose += 13 * dt;
        if (autoOzone) m.ozoneDose += 18 * dt;
        m.ozoneDose += killDelta * 9;
        m.ozoneDose = _treatClamp(m.ozoneDose, 0, 115);
        c.progress = _treatClamp(m.ozoneDose / 100, 0, 1);
    }

    _updateClearwell(c, game, dt, killDelta) {
        var m = c.metrics;
        var dosing = game.rig && game.rig.isDosing;
        var hold = game.powerups && game.powerups.hasEffect && game.powerups.hasEffect('slowMo');
        var breakpoint = game.powerups && game.powerups.hasEffect && game.powerups.hasEffect('breakpointChlorine');

        if (dosing || breakpoint) m.residual += (breakpoint ? 0.24 : 0.15) * dt;
        else m.residual -= 0.035 * dt;
        m.residual = _treatClamp(m.residual, 0.25, 1.4);

        if (m.residual >= 0.75) m.contactTime += dt * (hold ? 1.8 : 1.0);
        if (breakpoint) m.contactTime += dt * 0.35;
        m.contactTime += killDelta * 0.45;
        c.progress = _treatClamp(m.contactTime / 18, 0, 1);
    }

    _updateContamination(c, game, dt, killDelta) {
        var m = c.metrics;
        var alive = game.pedManager ? game.pedManager.getAlive() : [];
        var boss = null;
        for (var i = 0; i < alive.length; i++) {
            if (alive[i]._isBoss) {
                boss = alive[i];
                break;
            }
        }

        if (boss) {
            this._bossSeen = true;
            m.bossProgress = _treatClamp(1 - boss.hp / Math.max(1, boss.maxHp), 0, 1);
        } else if (this._bossSeen || (game.waves && game.waves.totalSpawned >= game.waves.pedestriansToSpawn)) {
            this._bossDefeated = true;
            m.bossProgress = 1;
        }

        var killScore = this._killProgress(game, 0.75);
        m.containment = _treatClamp(killScore * 0.55 + m.bossProgress * 0.45, 0, 1);
        c.progress = m.containment;
    }

    _killProgress(game, targetRatio) {
        var waves = game.waves || {};
        var target = Math.max(1, Math.round((waves.pedestriansToSpawn || 8) * (targetRatio || 0.7)));
        var kills = (game.scoring && game.scoring.waveKills) || 0;
        return _treatClamp(kills / target, 0, 1);
    }

    _buildAlerts(c, game) {
        var alerts = [];
        var id = c.def.id;
        var m = c.metrics;

        alerts.push(c.def.event);

        if (id === 'chlorineResidual' && m.residual < 0.65) {
            alerts.push('SCADA: chlorine residual low');
        }
        if (id === 'turbidityRemoval' && m.turbidity > 4.5) {
            alerts.push('SCADA: high turbidity at filters');
        }
        if (id === 'ozoneContact' && c.elapsed > 8 && m.ozoneDose < 45) {
            alerts.push('SCADA: ozone contact lagging');
        }
        if (id === 'clearwellCT' && m.residual < 0.7) {
            alerts.push('SCADA: CT residual below audit target');
        }
        if (id === 'contaminationSpike' && m.bossProgress < 0.35 && c.elapsed > 10) {
            alerts.push('SCADA: contaminant spike still active');
        }
        if (c.progress >= 1) {
            alerts = [c.def.event, 'Target met - keep the train stable'];
        }

        return alerts.slice(0, 3);
    }

    getStatus() {
        if (!this.current) return null;
        var c = this.current;
        return {
            cycle: c.cycle,
            title: c.def.shortTitle,
            target: c.def.target,
            progress: c.progress,
            progressPct: _treatPercent(c.progress),
            metricLine: this._metricLine(c),
            alerts: c.alerts || [],
        };
    }

    // Live "Chief Operator" buff: keep the objective topped up to earn it.
    // Hysteresis so it doesn't flicker: engages at 85%, drops below 70%.
    getActiveBuff() {
        if (!this.current) { this._chiefActive = false; return null; }
        var p = this.current.progress || 0;
        if (this._chiefActive) {
            if (p < 0.70) { this._chiefActive = false; this._chiefAnnounced = false; }
        } else {
            if (p >= 0.85) { this._chiefActive = true; }
        }
        if (!this._chiefActive) return null;
        var justEarned = !this._chiefAnnounced;
        this._chiefAnnounced = true;
        return {
            id: 'chiefOperator',
            title: 'CHIEF OPERATOR',
            scoreMult: 1.5,
            rechargeMult: 1.25,
            justEarned: justEarned,
        };
    }

    completeCycle(game) {
        if (!this.current) return null;
        this.update(0, game);

        var c = this.current;
        var pct = _treatPercent(c.progress);
        var grade = this._gradeFor(c.progress);
        var bonusTP = Math.max(0, Math.round(c.progress * 60 + (grade === 'A' ? 15 : grade === 'B' ? 8 : 0)));
        var report = {
            cycle: c.cycle,
            title: c.def.title,
            target: c.def.target,
            progress: c.progress,
            progressPct: pct,
            grade: grade,
            bonusTP: bonusTP,
            status: pct >= 80 ? 'Target met' : pct >= 55 ? 'Partial treatment' : 'Needs operator review',
            metrics: this._reportMetrics(c),
        };

        this.lastReport = report;
        return report;
    }

    getLastReport() {
        return this.lastReport;
    }

    _gradeFor(progress) {
        if (progress >= 0.95) return 'A';
        if (progress >= 0.8) return 'B';
        if (progress >= 0.65) return 'C';
        if (progress >= 0.45) return 'D';
        return 'Review';
    }

    _metricLine(c) {
        var m = c.metrics;
        if (c.def.id === 'chlorineResidual') return 'Residual ' + m.residual.toFixed(2) + ' mg/L';
        if (c.def.id === 'turbidityRemoval') return 'Turbidity ' + m.turbidity.toFixed(1) + ' NTU';
        if (c.def.id === 'ozoneContact') return 'Ozone dose ' + Math.round(m.ozoneDose) + '%';
        if (c.def.id === 'clearwellCT') return 'CT ' + Math.round(m.contactTime) + 's | residual ' + m.residual.toFixed(2);
        if (c.def.id === 'contaminationSpike') return 'Spike containment ' + _treatPercent(m.containment) + '%';
        return 'Pathogens removed ' + (m.removed || 0);
    }

    _reportMetrics(c) {
        var m = c.metrics;
        if (c.def.id === 'chlorineResidual') {
            return ['Residual: ' + m.residual.toFixed(2) + ' mg/L', 'At target: ' + Math.round(m.timeAtTarget) + 's'];
        }
        if (c.def.id === 'turbidityRemoval') {
            return ['Finished turbidity: ' + m.turbidity.toFixed(1) + ' NTU', 'Pathogens removed: ' + (m.removed || 0)];
        }
        if (c.def.id === 'ozoneContact') {
            return ['Ozone exposure: ' + Math.round(m.ozoneDose) + '%', 'Pathogens removed: ' + (m.removed || 0)];
        }
        if (c.def.id === 'clearwellCT') {
            return ['CT held: ' + Math.round(m.contactTime) + 's', 'Residual: ' + m.residual.toFixed(2) + ' mg/L'];
        }
        if (c.def.id === 'contaminationSpike') {
            return ['Boss containment: ' + _treatPercent(m.bossProgress) + '%', 'Total containment: ' + _treatPercent(m.containment) + '%'];
        }
        return ['Pathogens removed: ' + (m.removed || 0)];
    }
}
