// -- Progression System -----------------------------------------------------
// Treatment barrier unlocks, stat upgrades, treatment-point economy, and persistence.
// Depends on global CFG.

var ATTACK_UNLOCKS = {
    chlorine:      { wave: 1,  announcement: 'Chlorine feed primed — hold SPACE to spray' },
    ozone:      { wave: 3,  announcement: 'Ozone diffuser ready — press E (or click)' },
    uv: { wave: 6,  announcement: 'UV lamp bank ready — press Q (or right-click)' },
    backwash:   { wave: 10, announcement: 'Filter backwash ready — press F' },
    coagulant:     { wave: 8,  announcement: 'Coagulant feed primed — press R' },
    ph:       { wave: 12, announcement: 'pH shock ready — press T' },
};

var UPGRADES = {
    chlorineDamage:      { name: 'Chlorine Residual', maxLevel: 5, cost: [8,20,40,70,110],  desc: '+20% chlorine contact damage' },
    chlorineWidth:       { name: 'Contact Basin Spray', maxLevel: 3, cost: [12,30,60],      desc: '+25% spray dispersion angle' },
    ozoneDamage:      { name: 'Ozone Dose',        maxLevel: 5, cost: [8,22,45,80,120],  desc: '+1 ozone oxidation damage' },
    ozonePierce:      { name: 'Diffuser Manifold', maxLevel: 3, cost: [20,50,90],        desc: 'Ozone bubbles hit +1 pathogen' },
    uvAoe:    { name: 'UV Reactor Width',  maxLevel: 4, cost: [15,35,65,100],    desc: '+20% UV exposure radius' },
    uvCharge: { name: 'Lamp Warmup Tuning',maxLevel: 3, cost: [20,50,90],        desc: '-2s UV reactor recharge' },
    backwashDuration: { name: 'Filter Backwash',   maxLevel: 3, cost: [15,40,75],        desc: '+1s filter vortex duration' },
    backwashWidth:    { name: 'Sand Bed Suction',  maxLevel: 3, cost: [15,40,75],        desc: '+15px filter capture width' },
    coagulantDuration:   { name: 'Floc Contact Time', maxLevel: 3, cost: [15,40,75],        desc: '+1s coagulation clumping' },
    phRadius:       { name: 'pH Buffer Radius',  maxLevel: 3, cost: [15,40,75],        desc: '+50px adjustment zone' },
    meterRecharge:   { name: 'Chemical Feed Pumps', maxLevel: 4, cost: [12,30,55,90],   desc: '+25% reagent refill rate' },
    comboWindow:     { name: 'Contact Time',      maxLevel: 3, cost: [15,40,75],        desc: '+0.5s reaction combo timing' },
    moveSpeed:       { name: 'Operator Boots',    maxLevel: 3, cost: [10,25,50],        desc: '+15% operator movement speed' },
};

class Progression {

    constructor() {
        this.unlockedAttacks = { chlorine: true, ozone: false, uv: false, backwash: false, coagulant: false, ph: false };
        this.upgradeLevels   = this._defaultUpgradeLevels();
        this.treatmentPoints      = 0;
        this.totalTreatmentPoints = 0;
        this.highestWave      = 0;
        this.totalKills       = 0;
        this.selectedCosmetic = 'none';

        this.pendingAnnouncements = [];

        this.load();
    }

    // -- Defaults --------------------------------------------------------

    _defaultUpgradeLevels() {
        var levels = {};
        for (var key in UPGRADES) {
            if (UPGRADES.hasOwnProperty(key)) {
                levels[key] = 0;
            }
        }
        return levels;
    }

    // -- Attack Unlocks --------------------------------------------------

    /**
     * Check whether the given wave unlocks any new attacks.
     * Pushes announcement strings for anything newly unlocked.
     */
    checkWaveUnlocks(waveNumber) {
        for (var name in ATTACK_UNLOCKS) {
            if (!ATTACK_UNLOCKS.hasOwnProperty(name)) continue;
            var info = ATTACK_UNLOCKS[name];
            if (waveNumber >= info.wave && !this.unlockedAttacks[name]) {
                this.unlockedAttacks[name] = true;
                this.pendingAnnouncements.push(info.announcement);
            }
        }
    }

    /**
     * Return true if the named attack is currently unlocked.
     */
    hasAttack(name) {
        return !!this.unlockedAttacks[name];
    }

    // -- Announcements ---------------------------------------------------

    /**
     * Shift and return the next pending announcement, or null.
     */
    getNextAnnouncement() {
        if (this.pendingAnnouncements.length > 0) {
            return this.pendingAnnouncements.shift();
        }
        return null;
    }

    // -- Upgrade Queries -------------------------------------------------

    getUpgradeLevel(key) {
        return this.upgradeLevels[key] || 0;
    }

    /**
     * Return the treatment-point cost for the next level, or null if maxed.
     */
    getUpgradeCost(key) {
        var def   = UPGRADES[key];
        if (!def) return null;
        var level = this.getUpgradeLevel(key);
        if (level >= def.maxLevel) return null;
        return def.cost[level];
    }

    canAfford(key) {
        var cost = this.getUpgradeCost(key);
        if (cost === null) return false;
        return this.treatmentPoints >= cost;
    }

    /**
     * Attempt to purchase the next level of an upgrade.
     * Returns true on success, false if maxed or can't afford.
     */
    buyUpgrade(key) {
        var cost = this.getUpgradeCost(key);
        if (cost === null) return false;
        if (this.treatmentPoints < cost) return false;

        this.treatmentPoints -= cost;
        this.upgradeLevels[key]++;
        return true;
    }

    // -- Treatment Points ------------------------------------------------

    /**
     * Convert a raw score into treatment points and bank them.
     */
    addTreatmentPoints(score) {
        var earned = Math.floor(score / 1000);
        this.treatmentPoints      += earned;
        this.totalTreatmentPoints += earned;
    }

    // -- Effective Stats -------------------------------------------------

    /**
     * Return the effective value of a game stat after all upgrade
     * multipliers have been applied.  This is the single source of truth
     * that every other system should query.
     */
    getEffective(stat) {
        var lv = this.upgradeLevels;

        switch (stat) {
            case 'chlorineDPS':
                return CFG.CHLORINE.DPS * (1 + 0.2 * lv.chlorineDamage);

            case 'chlorineConeWidth':
                return CFG.CHLORINE.CONE_WIDTH * (1 + 0.25 * lv.chlorineWidth);

            case 'ozoneDamage':
                return CFG.OZONE.DAMAGE + lv.ozoneDamage;

            case 'ozonePierce':
                return 1 + lv.ozonePierce;

            case 'uvAoE':
                return CFG.UV_PULSE.AOE_RADIUS * (1 + 0.2 * lv.uvAoe);

            case 'uvChargeTime':
                return Math.max(5, CFG.UV_PULSE.CHARGE_TIME - 2 * lv.uvCharge);

            case 'backwashDuration':
                return CFG.BACKWASH.DURATION + lv.backwashDuration;

            case 'backwashWidth':
                return CFG.BACKWASH.WIDTH + 15 * lv.backwashWidth;

            case 'meterRechargeMultiplier':
                return 1 + 0.25 * lv.meterRecharge;

            case 'comboWindow':
                return CFG.COMBO.WINDOW + 0.5 * lv.comboWindow;

            case 'rigSpeed':
                return CFG.RIG.SPEED * (1 + 0.15 * lv.moveSpeed);

            case 'coagulantChargeTime':
                return CFG.COAGULANT.CHARGE_TIME;

            case 'phDuration':
                return CFG.PH_SHOCK.DURATION;

            case 'coagulantDuration':
                return CFG.COAGULANT.FREEZE_DURATION + lv.coagulantDuration;

            case 'phRadius':
                return CFG.PH_SHOCK.RADIUS + 50 * lv.phRadius;

            default:
                return 0;
        }
    }

    // -- Cosmetics -------------------------------------------------------

    setCosmetic(id) {
        this.selectedCosmetic = id;
        this.save();
    }

    // -- Stats -----------------------------------------------------------

    /**
     * Update lifetime stats with end-of-wave data.
     */
    updateStats(waveNumber, kills) {
        if (waveNumber > this.highestWave) {
            this.highestWave = waveNumber;
        }
        this.totalKills += kills;
    }

    // -- Persistence -----------------------------------------------------

    save() {
        try {
            var data = {
                unlockedAttacks: this.unlockedAttacks,
                upgradeLevels:   this.upgradeLevels,
                treatmentPoints:     this.treatmentPoints,
                totalTreatmentPoints: this.totalTreatmentPoints,
                highestWave:     this.highestWave,
                totalKills:      this.totalKills,
                selectedCosmetic: this.selectedCosmetic,
            };

            // Include high score from the scoring system if available
            try {
                var hs = localStorage.getItem('dissnfex_highscore') ||
                         localStorage.getItem('grumbulus_highscore');
                if (hs) data.highScore = parseInt(hs, 10) || 0;
            } catch (e) { /* ignore */ }

            localStorage.setItem('dissnfex_save', JSON.stringify(data));
        } catch (e) {
            // localStorage may be unavailable
        }
    }

    load() {
        try {
            // One-time migration from the former save key.
            var raw = localStorage.getItem('dissnfex_save');
            if (!raw) {
                var legacy = localStorage.getItem('grumbulus_save');
                if (legacy) {
                    localStorage.setItem('dissnfex_save', legacy);
                    localStorage.removeItem('grumbulus_save');
                    raw = legacy;
                }
            }
            if (!raw) return;

            var data = JSON.parse(raw);

            // Unlocked attacks
            if (data.unlockedAttacks && typeof data.unlockedAttacks === 'object') {
                for (var atk in this.unlockedAttacks) {
                    if (this.unlockedAttacks.hasOwnProperty(atk) && data.unlockedAttacks[atk] === true) {
                        this.unlockedAttacks[atk] = true;
                    }
                }
            }

            // Upgrade levels – only accept valid numeric values within range
            if (data.upgradeLevels && typeof data.upgradeLevels === 'object') {
                for (var key in this.upgradeLevels) {
                    if (!this.upgradeLevels.hasOwnProperty(key)) continue;
                    var val = data.upgradeLevels[key];
                    if (typeof val === 'number' && val >= 0) {
                        var max = UPGRADES[key] ? UPGRADES[key].maxLevel : 0;
                        this.upgradeLevels[key] = Math.min(val, max);
                    }
                }
            }

            // Numeric fields
            if (typeof data.treatmentPoints === 'number' && data.treatmentPoints >= 0) {
                this.treatmentPoints = data.treatmentPoints;
            }
            if (typeof data.totalTreatmentPoints === 'number' && data.totalTreatmentPoints >= 0) {
                this.totalTreatmentPoints = data.totalTreatmentPoints;
            }
            if (typeof data.highestWave === 'number' && data.highestWave >= 0) {
                this.highestWave = data.highestWave;
            }
            if (typeof data.totalKills === 'number' && data.totalKills >= 0) {
                this.totalKills = data.totalKills;
            }
            if (typeof data.selectedCosmetic === 'string') {
                this.selectedCosmetic = data.selectedCosmetic;
            }
        } catch (e) {
            // Corrupted or missing data – keep defaults
        }
    }

    clearSave() {
        try {
            localStorage.removeItem('dissnfex_save');
            localStorage.removeItem('grumbulus_save');
        } catch (e) { /* ignore */ }

        // Reset to defaults
        this.unlockedAttacks      = { chlorine: true, ozone: false, uv: false, backwash: false, coagulant: false, ph: false };
        this.upgradeLevels        = this._defaultUpgradeLevels();
        this.treatmentPoints          = 0;
        this.totalTreatmentPoints     = 0;
        this.highestWave          = 0;
        this.totalKills           = 0;
        this.selectedCosmetic     = 'none';
        this.pendingAnnouncements = [];
    }
}
