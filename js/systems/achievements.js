/* achievements.js — Achievements / badges system for Diss N Fex
   Loaded via <script> tag.  Depends on globals: CFG                       */

var ACHIEVEMENTS = [
    // Combat
    { id: 'firstBlood',      name: 'First Removal',       desc: 'Remove your first pathogen', icon: '\u2620' },
    { id: 'combo10',         name: 'Steady Residual',     desc: 'Reach a x10 treatment chain', icon: '\uD83D\uDD25' },
    { id: 'combo30',         name: 'Plant Optimized',     desc: 'Reach a x30 treatment chain', icon: '\u26A1' },
    { id: 'kill100',         name: 'Century Sample',      desc: 'Remove 100 pathogens in one run', icon: '\uD83D\uDCA0' },
    { id: 'kill500',         name: 'Log Removal Legend',  desc: 'Remove 500 pathogens in one run', icon: '\u2622' },

    // Attacks
    { id: 'useAllAttacks',   name: 'Multi-Barrier Plant', desc: 'Use all 6 treatment barriers in one run', icon: '\uD83C\uDFAF' },
    { id: 'lightningX5',     name: 'UV Dose Verified',    desc: 'Remove 5 pathogens with one UV pulse', icon: '\u26A1' },
    { id: 'tornadoSweep',    name: 'Filter Run',          desc: 'Hit 10+ pathogens with one filter vortex', icon: '\uD83C\uDF2A' },
    { id: 'frostShatter',    name: 'Floc Settled',        desc: 'Remove a coagulated pathogen', icon: '\u2744' },

    // Pedestrians
    { id: 'zapOldLady',      name: 'UV Sensitive',         desc: 'Hit a protozoan with UV light', icon: '\uD83D\uDC75' },
    { id: 'soakChild',       name: 'Organic Load',         desc: 'Feed a micro-germ with organics', icon: '\uD83D\uDE04' },
    { id: 'defeatVIP',       name: 'Superbug Removed',     desc: 'Remove the Superbug King', icon: '\uD83D\uDC51' },
    { id: 'defeatMilitary',  name: 'Resistance Broken',    desc: 'Remove an antibiotic blaster', icon: '\uD83C\uDF96' },

    // Power-ups
    { id: 'rainbowTrap',     name: 'Tracer Study',         desc: 'Remove 5+ pathogens lured by dye', icon: '\uD83C\uDF08' },
    { id: 'teslaSpam',       name: 'UV Lamp Bank',         desc: 'Fire 5+ UV pulses during overclock', icon: '\u26A1' },
    { id: 'collectAll',      name: 'Plant Inventory',       desc: 'Collect every treatment aid type', icon: '\uD83C\uDFC6' },

    // Progression
    { id: 'survive10',       name: 'Operator Certified',    desc: 'Complete 10 treatment cycles', icon: '\uD83C\uDF29' },
    { id: 'survive20',       name: 'Plant Superintendent',  desc: 'Complete 20 treatment cycles', icon: '\uD83C\uDF2A' },
    { id: 'survive30',       name: 'Regional Utility Hero', desc: 'Complete 30 treatment cycles', icon: '\u2601' },
    { id: 'defeatBoss',      name: 'Basin Secured',         desc: 'Remove a boss contaminant', icon: '\uD83D\uDC7E' },
    { id: 'maxUpgrade',      name: 'Maxed Out',             desc: 'Max out any upgrade', icon: '\u2B06' },
    { id: 'score50k',        name: 'High Roller',           desc: 'Score 50,000+ in one run', icon: '\uD83D\uDCB0' },

    // Secret combos (vague descriptions to avoid spoilers)
    { id: 'comboRagnarok',   name: 'Operator Override',    desc: 'Trigger an ancient emergency protocol', icon: '\u2694' },
    { id: 'comboIceAge',     name: 'Flash Coagulation',    desc: 'Lock the whole basin into floc', icon: '\u2744' },
    { id: 'comboKaiju',      name: 'Oversized Operator',   desc: 'Become something enormous', icon: '\uD83D\uDC32' },
    { id: 'comboFlood',      name: 'Clearwell Surge',      desc: 'Flood the basin with finished water', icon: '\uD83C\uDF0A' },
    { id: 'comboEmp',        name: 'Mobile UV Lamp',       desc: 'Release an autonomous UV hunter', icon: '\u26A1' },
    { id: 'comboChain',      name: 'Contact Cascade',      desc: 'Chain removals through the basin', icon: '\uD83D\uDD17' },
    { id: 'comboDblRainbow', name: 'Double Tracer',        desc: 'Double the dye lure', icon: '\uD83C\uDF08' },
    { id: 'comboToxic',      name: 'Breakpoint Dose',      desc: 'Overwhelm the pathogen load with chlorine', icon: '\u2623' },
    { id: 'comboTesla',      name: 'UV Overdrive',         desc: 'Automate the UV reactor', icon: '\u26A1' },
    { id: 'comboTimeStop',   name: 'Long Contact Time',    desc: 'Hold the basin still', icon: '\u23F8' },

    // Fun/Easter eggs
    { id: 'idle',            name: 'Idle Operator',        desc: 'Let the operator nod off', icon: '\uD83D\uDCA4' },
    { id: 'auroraComplaints', name: 'Jar Test Critic',     desc: 'Hear 5 glow complaints in one run', icon: '\u2728' },
    { id: 'policeShouts5',   name: 'Bio-Shield Alarm',     desc: 'Have 5 shield cells shouting at once', icon: '\uD83D\uDE94' },
];

/* ------------------------------------------------------------------ */

function AchievementSystem() {
    this.unlocked      = {};
    this.justUnlocked  = [];
    this._runTracking  = this._freshTracking();
    this.load();
}

/* ---------- internal helpers -------------------------------------- */

AchievementSystem.prototype._freshTracking = function () {
    return {
        attacksUsed:       {},
        rainbowKills:      0,
        teslaLightnings:   0,
        auroraComplaints:  0,
        powerupsCollected: {},
        totalKills:        0
    };
};

/* ---------- core -------------------------------------------------- */

AchievementSystem.prototype.check = function (id) {
    if (this.unlocked[id]) return;
    this.unlocked[id] = true;
    this.justUnlocked.push(id);
    this.save();
};

AchievementSystem.prototype.isUnlocked = function (id) {
    return !!this.unlocked[id];
};

AchievementSystem.prototype.getJustUnlocked = function () {
    if (this.justUnlocked.length === 0) return null;
    return this.justUnlocked.shift();
};

/* ---------- tracking helpers -------------------------------------- */

AchievementSystem.prototype.trackAttack = function (type) {
    this._runTracking.attacksUsed[type] = true;
    if (Object.keys(this._runTracking.attacksUsed).length >= 6) {
        this.check('useAllAttacks');
    }
};

AchievementSystem.prototype.trackKill = function (pedTypeName, attackType, wasFrozen) {
    // First kill
    this._runTracking.totalKills++;
    if (this._runTracking.totalKills === 1) this.check('firstBlood');

    // Milestones
    if (this._runTracking.totalKills >= 100) this.check('kill100');
    if (this._runTracking.totalKills >= 500) this.check('kill500');

    // Pedestrian-specific
    if (pedTypeName === 'oldLady' && attackType === 'lightning') this.check('zapOldLady');
    if (pedTypeName === 'child'   && attackType === 'rain')      this.check('soakChild');
    if (pedTypeName === 'vip')                                    this.check('defeatVIP');
    if (pedTypeName === 'military')                               this.check('defeatMilitary');

    // Frozen shatter
    if (wasFrozen) this.check('frostShatter');
};

AchievementSystem.prototype.trackCombo = function (count) {
    if (count >= 10) this.check('combo10');
    if (count >= 30) this.check('combo30');
};

AchievementSystem.prototype.trackWave = function (waveNumber) {
    if (waveNumber >= 10) this.check('survive10');
    if (waveNumber >= 20) this.check('survive20');
    if (waveNumber >= 30) this.check('survive30');
};

AchievementSystem.prototype.trackScore = function (score) {
    if (score >= 50000) this.check('score50k');
};

AchievementSystem.prototype.trackPowerup = function (effectName) {
    this._runTracking.powerupsCollected[effectName] = true;
    var totalPowerupTypes = (typeof POWERUP_TYPES !== 'undefined') ? POWERUP_TYPES.length : 12;
    if (Object.keys(this._runTracking.powerupsCollected).length >= totalPowerupTypes) {
        this.check('collectAll');
    }
};

AchievementSystem.prototype.trackBossKill = function () {
    this.check('defeatBoss');
};

AchievementSystem.prototype.trackIdle = function () {
    this.check('idle');
};

AchievementSystem.prototype.trackLightningKills = function (count) {
    if (count >= 5) this.check('lightningX5');
};

AchievementSystem.prototype.trackTornadoHits = function (count) {
    if (count >= 10) this.check('tornadoSweep');
};

AchievementSystem.prototype.trackTeslaLightning = function () {
    this._runTracking.teslaLightnings++;
    if (this._runTracking.teslaLightnings >= 5) this.check('teslaSpam');
};

AchievementSystem.prototype.trackRainbowKill = function () {
    this._runTracking.rainbowKills++;
    if (this._runTracking.rainbowKills >= 5) this.check('rainbowTrap');
};

AchievementSystem.prototype.trackAuroraComplaint = function () {
    this._runTracking.auroraComplaints++;
    if (this._runTracking.auroraComplaints >= 5) this.check('auroraComplaints');
};

AchievementSystem.prototype.trackMaxUpgrade = function () {
    this.check('maxUpgrade');
};

/* ---------- run lifecycle ----------------------------------------- */

AchievementSystem.prototype.resetRun = function () {
    this._runTracking = this._freshTracking();
};

/* ---------- persistence ------------------------------------------- */

AchievementSystem.prototype.save = function () {
    try {
        localStorage.setItem('grumbulus_achievements', JSON.stringify(this.unlocked));
    } catch (e) { /* storage full or unavailable */ }
};

AchievementSystem.prototype.load = function () {
    try {
        var data = localStorage.getItem('grumbulus_achievements');
        if (data) this.unlocked = JSON.parse(data);
    } catch (e) {
        this.unlocked = {};
    }
};

/* ---------- queries ----------------------------------------------- */

AchievementSystem.prototype.getProgress = function () {
    var count = 0;
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
        if (this.unlocked[ACHIEVEMENTS[i].id]) count++;
    }
    return { unlocked: count, total: ACHIEVEMENTS.length };
};

AchievementSystem.prototype.getAll = function () {
    var result = [];
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
        var a = ACHIEVEMENTS[i];
        result.push({
            id:       a.id,
            name:     a.name,
            desc:     a.desc,
            icon:     a.icon,
            unlocked: !!this.unlocked[a.id]
        });
    }
    return result;
};
