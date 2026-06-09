// -- Wave System ---------------------------------------------------------
// Manages wave progression, pedestrian spawning, and intermissions.
// Depends on globals CFG, PEOPLE_TYPES.

var SPECIAL_EVENTS = [
    {
        name: 'Colony Spreading Event',
        announcement: '🦠 A biofilm colony is migrating through the channel!',
        spawnCount: 12,
        types: ['businessMan', 'businessWoman', 'businessMan', 'businessWoman', 'businessMan', 'businessWoman', 'oldLady', 'child', 'child', 'tourist', 'tourist', 'tourist'],
        formation: 'line',
        bonusPoints: 500,
    },
    {
        name: 'Micro-Germ Bloom',
        announcement: '🔬 A massive bloom of micro-germs detected!',
        spawnCount: 10,
        types: ['child', 'child', 'child', 'child', 'child', 'child', 'child', 'child', 'oldLady', 'oldLady'],
        formation: 'cluster',
        bonusPoints: 300,
    },
    {
        name: 'Pathogen Parade',
        announcement: '🧬 A mixed microbial stream is passing through the basin!',
        spawnCount: 15,
        types: ['streetPerformer', 'streetPerformer', 'tourist', 'tourist', 'tourist', 'child', 'child', 'businessMan', 'businessWoman', 'dogWalker', 'jogger', 'cyclist', 'cyclist', 'oldLady', 'iceCreamVendor'],
        formation: 'line',
        bonusPoints: 750,
    },
    {
        name: 'Nutrient Spill Anomaly',
        announcement: '🧪 A concentration of organic nutrients is pulling pathogens in!',
        spawnCount: 10,
        types: ['tourist', 'tourist', 'tourist', 'businessMan', 'businessWoman', 'child', 'child', 'jogger', 'cyclist', 'dogWalker'],
        formation: 'cluster',
        bonusPoints: 400,
    },
];

var WAVE_MUTATORS = [
    { name: 'Hyper-Motile', desc: 'All germs move 2x faster!', effect: 'speedBoost' },
    { name: 'Biofilm Epidemic', desc: 'All germs have developed biofilm shields!', effect: 'allUmbrellas' },
    { name: 'Antibiotic Spike', desc: 'Extra antibiotic-resistant blaster cells!', effect: 'extraMilitary' },
    { name: 'Cell Wall Mutation', desc: 'All germs have +2 HP!', effect: 'extraHP' },
    { name: 'Acidic Turmoil', desc: 'Permanent acidic pH covers the chamber!', effect: 'permFog' },
    { name: 'Chlorine Depletion', desc: 'Chlorine drains 2x faster!', effect: 'rainDrain' },
    { name: 'Shield Wall', desc: 'Biofilm gladiators everywhere!', effect: 'shieldWall' },
    { name: 'High Turbidity', desc: 'Total darkness and murky water!', effect: 'darkness' },
];

class WaveSystem {

    constructor() {
        this.waveNumber       = 0;
        this.state            = 'title';   // 'title' | 'playing' | 'intermission' | 'gameover'
        this.timer            = 0;
        this.pedestriansToSpawn = 0;
        this.spawnTimer       = 0;
        this.totalSpawned     = 0;
        this.intermissionText = '';
        this._waveStats       = null;
        this.specialEvent     = null;  // current active event
        this.eventCooldown    = 0;     // waves until next event possible
        this.activeMutator    = null;  // wave mutator (every 5 waves after 20)
        this.activeBounty     = null;  // bounty target (waves 15+)

        this.FORECASTS = [
            "Next cycle: high raw-water contamination",
            "CT target met: pathogen survival dropping",
            "Operators report excellent log removal",
            "Turbidity low, residual steady",
            "Biofilm integrity failing across the basin",
            "Filter headloss stable after backwash",
            "Clearwell sample: no detectable pathogens",
            "UV dose rising, Giardia regrets everything",
            "Coagulation basin forming beautiful floc",
            "Forecast: 100% chance of cell wall lysis",
        ];
    }

    // -- Wave start ------------------------------------------------------

    startWave(pedManager) {
        this.waveNumber++;
        this.state = 'playing';
        if (this.eventCooldown > 0) this.eventCooldown--;

        var count = CFG.WAVE.BASE_COUNT + this.waveNumber * CFG.WAVE.PER_WAVE;
        if (count > CFG.WAVE.MAX_COUNT) count = CFG.WAVE.MAX_COUNT;

        this.pedestriansToSpawn = count;
        this.totalSpawned       = 0;
        this.spawnTimer         = 0;

        // Boss wave spawns a boss entity
        if (this.isBossWave() && pedManager && pedManager.spawnBoss) {
            pedManager.spawnBoss(this.waveNumber);
        }

        // Mutator every 5 waves after wave 20
        if (this.waveNumber > 20 && this.waveNumber % 5 === 0) {
            this.activeMutator = WAVE_MUTATORS[Math.floor(Math.random() * WAVE_MUTATORS.length)];
            this._mutatorAnnouncement = 'MUTATOR: ' + this.activeMutator.name + ' — ' + this.activeMutator.desc;
        } else {
            this.activeMutator = null;
        }

        // Bounty target (50% chance each wave after wave 15)
        if (this.waveNumber >= 15 && Math.random() < 0.5) {
            var bountyNames = ['Pseudomonas Rex', 'E. Coli Alpha', 'Salmonella Super', 'C. Difficile', 'Listeria Prime', 'Amoeba Gigas'];
            this.activeBounty = {
                name: bountyNames[Math.floor(Math.random() * bountyNames.length)],
                points: 2000 + this.waveNumber * 100,
                spawned: false,
                pedRef: null,
            };
            this._bountyAnnouncement = 'BOUNTY: ' + this.activeBounty.name + ' — ' + this.activeBounty.points + ' pts!';
        } else {
            this.activeBounty = null;
        }
    }

    // -- Update ----------------------------------------------------------

    update(dt, pedManager, rig) {
        if (this.state === 'playing') {
            return this._updatePlaying(dt, pedManager);
        } else if (this.state === 'intermission') {
            this._updateIntermission(dt, pedManager, rig);
        }
        return null;
    }

    _updatePlaying(dt, pedManager) {
        // Staggered spawning: 2-3 pedestrians per second
        if (this.totalSpawned < this.pedestriansToSpawn) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                var types     = this.getAvailableTypes(this.waveNumber);
                var typeKey   = types[Math.floor(Math.random() * types.length)];

                if (pedManager && pedManager.spawn) {
                    var margin = CFG.PED.SPAWN_MARGIN || 100;
                    var spawnX = margin + Math.random() * (CFG.CITY.WORLD_WIDTH - margin * 2);
                    var spawnedPed = pedManager.spawn(typeKey, spawnX);

                    // Apply active mutator effects to spawned ped
                    if (spawnedPed && this.activeMutator) {
                        var eff = this.activeMutator.effect;
                        if (eff === 'speedBoost') spawnedPed.speed *= 2;
                        if (eff === 'allUmbrellas') spawnedPed.hasBiofilmShield = true;
                        if (eff === 'extraHP') { spawnedPed.hp += 2; spawnedPed.maxHp += 2; }
                        if (eff === 'extraMilitary' && Math.random() < 0.3 && PEOPLE_TYPES.military) {
                            pedManager.spawn('military', spawnX + (Math.random()-0.5)*100);
                        }
                        if (eff === 'shieldWall' && Math.random() < 0.3 && PEOPLE_TYPES.riotPolice) {
                            pedManager.spawn('riotPolice', spawnX + (Math.random()-0.5)*100);
                        }
                    }

                    // VIP spawns with 2 bodyguards
                    if (typeKey === 'vip' && PEOPLE_TYPES.bodyguard) {
                        for (var bg = 0; bg < 2; bg++) {
                            pedManager.spawn('bodyguard', spawnX + (bg === 0 ? -30 : 30));
                        }
                    }
                }
                this.totalSpawned++;

                // Next spawn in 0.33-0.5 s  (2-3 per second)
                this.spawnTimer = 0.33 + Math.random() * 0.17;

                // Special event chance (8% per spawn tick)
                if (this.eventCooldown <= 0 && !this.specialEvent && Math.random() < 0.08) {
                    var event = SPECIAL_EVENTS[Math.floor(Math.random() * SPECIAL_EVENTS.length)];
                    this.specialEvent = event;
                    this.eventCooldown = 3;

                    // Spawn event pedestrians
                    if (pedManager && pedManager.spawn) {
                        if (event.formation === 'line') {
                            // Line formation: spawn at one edge, all walking same direction, spaced 30px apart
                            var edgeX = Math.random() < 0.5 ? -30 : CFG.CITY.WORLD_WIDTH + 30;
                            var dir = edgeX < 0 ? 1 : -1;
                            for (var ei = 0; ei < event.spawnCount && ei < event.types.length; ei++) {
                                var ped = pedManager.spawn(event.types[ei], edgeX - dir * ei * 30);
                                if (ped) ped.dir = dir;
                            }
                        } else if (event.formation === 'cluster') {
                            // Cluster formation: spawn at a random x, clustered within 100px
                            var margin = CFG.PED.SPAWN_MARGIN || 100;
                            var clusterX = margin + Math.random() * (CFG.CITY.WORLD_WIDTH - margin * 2);
                            for (var ei = 0; ei < event.spawnCount && ei < event.types.length; ei++) {
                                var spawnXe = clusterX + (Math.random() - 0.5) * 100;
                                pedManager.spawn(event.types[ei], spawnXe);
                            }
                        }
                    }

                    // The announcement text is available for main.js to read
                    this._eventAnnouncement = event.announcement;
                }
            }
        }

        // Check if wave is complete: all spawned and all dead
        if (this.totalSpawned >= this.pedestriansToSpawn && pedManager) {
            var alive = 0;
            var peds  = pedManager.pedestrians || pedManager.peds || [];
            for (var i = 0; i < peds.length; i++) {
                if (peds[i].alive) alive++;
            }
            if (alive === 0) {
                return 'intermission_start';
            }
        }
    }

    _updateIntermission(dt, pedManager, rig) {
        // Timer counts down for display but does NOT auto-advance.
        // Player chooses: next wave or shop (handled by main.js).
        if (this.timer > 0) this.timer -= dt;
    }

    // -- Intermission ----------------------------------------------------

    startIntermission(scoring) {
        this.state = 'intermission';
        this.timer = CFG.WAVE.INTERMISSION;

        // Store wave stats for display
        if (scoring) {
            this._waveStats = scoring.getWaveStats();
            scoring.resetWaveStats();
        }

        // Pick a random funny forecast
        this.intermissionText = this.FORECASTS[
            Math.floor(Math.random() * this.FORECASTS.length)
        ];
    }

    // -- Available types per wave ----------------------------------------

    getAvailableTypes(wave) {
        var types = ['businessMan', 'businessWoman', 'tourist'];

        if (wave >= 3) {
            types.push('jogger', 'child');
        }
        if (wave >= 4) {
            types.push('cyclist');
        }
        if (wave >= 5) {
            types.push('endosporePerson', 'biofilmPerson');
        }
        if (wave >= 7) {
            types.push('oldLady', 'dogWalker', 'police');
        }
        if (wave >= 8) {
            types.push('streetPerformer', 'iceCreamVendor', 'weatherReporter');
        }
        if (wave >= 10) {
            types.push('vip');
        }
        if (wave >= 12) {
            types.push('constructionWorker');
        }
        if (wave >= 15) {
            types.push('riotPolice');
        }
        if (wave >= 18) {
            types.push('scientist');
        }
        if (wave >= 20) {
            types.push('military');
        }

        return types;
    }

    // -- Boss waves ------------------------------------------------------

    isBossWave() {
        return this.waveNumber > 0 && this.waveNumber % CFG.WAVE.BOSS_INTERVAL === 0;
    }

    // -- Special Events ---------------------------------------------------

    getSpecialEvent() {
        return this.specialEvent || null;
    }

    clearSpecialEvent() {
        this.specialEvent = null;
    }

    // -- Accessors -------------------------------------------------------

    getWaveStats() {
        return this._waveStats;
    }

    // -- Reset -----------------------------------------------------------

    reset() {
        this.waveNumber        = 0;
        this.state             = 'title';
        this.timer             = 0;
        this.pedestriansToSpawn = 0;
        this.spawnTimer        = 0;
        this.totalSpawned      = 0;
        this.intermissionText  = '';
        this._waveStats        = null;
        this.specialEvent      = null;
        this.eventCooldown     = 0;
        this.activeMutator     = null;
        this.activeBounty      = null;
    }
}
