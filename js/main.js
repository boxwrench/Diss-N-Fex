// ── Main Game Loop ──────────────────────────────────────────────
(function () {
    'use strict';

    var canvas = document.getElementById('gameCanvas');
    var ctx = canvas.getContext('2d');

    // ── Resolution scaling ──────────────────────────────────────
    // Game logic uses virtual 1280x720 coordinates.
    // Canvas resizes to fill the screen, scaled to fit with aspect ratio.
    var dpr = window.devicePixelRatio || 1;
    var gameScale = 1;

    function resizeCanvas() {
        var winW = window.innerWidth;
        var winH = window.innerHeight;
        var aspect = CFG.WIDTH / CFG.HEIGHT;
        var winAspect = winW / winH;

        var cssW, cssH;
        if (winAspect > aspect) {
            // Window is wider — fit to height
            cssH = winH;
            cssW = winH * aspect;
        } else {
            // Window is taller — fit to width
            cssW = winW;
            cssH = winW / aspect;
        }

        canvas.style.width = cssW + 'px';
        canvas.style.height = cssH + 'px';

        // Set actual pixel resolution (sharp on HiDPI)
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);

        gameScale = canvas.width / CFG.WIDTH;
        CFG._scale = gameScale; // expose for other files (HUD, projectiles)
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // ── Systems ─────────────────────────────────────────────────
    var camera      = new Camera();
    var city        = new City();
    var basinEffects     = new BasinEffects();
    var rig       = new OperatorRig();
    var particles   = new ParticleSystem();
    var projectiles = new ProjectileManager();
    var pedManager  = new PedestrianManager();
    var collision   = new CollisionSystem();
    var scoring     = new ScoringSystem();
    var waves       = new WaveSystem();
    var powerups    = new PowerUpSystem();
    var treatmentObjectives = new TreatmentObjectiveSystem();
    var textPopups  = TextPopupManager;
    var menu        = new MenuSystem();
    var progression = new Progression();
    var achievements = new AchievementSystem();

    // ── State ───────────────────────────────────────────────────
    var gameState = 'title';
    var lastTime = 0;
    var rainSpawnAcc = 0;
    var audioStarted = false;
    var hailCooldown = 0;
    var gameTime = 0;
    var powerupTimer = 0;
    var windSpeed = 0;        // environmental wind
    var windTarget = 0;
    var slowMoTimer = 0;      // slow-mo countdown
    var slowMoScale = 1;      // dt multiplier during slow-mo
    var multiKillCount = 0;
    var multiKillTimer = 0;
    var multiKillType = '';   // last attack type that killed
    var autoSaveTimer = 0;

    var MULTI_KILL_NAMES = [
        null,           // 0
        null,           // 1 (single kill, no popup)
        'DOUBLE',       // 2
        'TRIPLE',       // 3
        'QUADRA',       // 4
        'PENTA',        // 5
        'MEGA',         // 6
        'ULTRA',        // 7
        'MONSTER',      // 8
        'GODLIKE',      // 9
        'APOCALYPSE',   // 10+
    ];

    var MULTI_KILL_FLAVOR = {
        rain:      ['DISINFECT!', 'CHLORINATED!', 'PURGED!', 'STERILIZED!'],
        hail:      ['OZONE BLAST!', 'OXIDIZED!', 'OXYGENATED!', 'DISINTEGRATE!'],
        lightning: ['UV SMITE!', 'IRRADIATED!', 'DNA SHATTER!', 'STERILIZED!'],
        tornado:   ['VORTEX FLUSH!', 'CENTRIFUGED!', 'WHIRLPOOL!', 'DRAINED!'],
        frost:     ['CLUMPED!', 'COAGULATED!', 'FLOCCULATED!', 'PRECIPITATED!'],
        fog:       ['pH SHOCK!', 'ACIDIFIED!', 'CORRODED!', 'BUFFER BREAK!'],
    };

    // Pack references for HUD and external systems
    var game = {
        rig: rig,
        scoring: scoring,
        waves: waves,
        powerups: powerups,
        particles: particles,
        textPopups: textPopups,
        progression: progression,
        pedManager: pedManager,
        projectiles: projectiles,
        camera: camera,
        achievements: achievements,
        treatmentObjectives: treatmentObjectives,
        treatmentReport: null,
        _hadSecretCombo: false,
        _epicMusic: null,
        _epicMusicPlaying: false,
    };
    window.game = game;

    // Give menu access to progression & achievements for stats/cosmetics display
    menu.progression = progression;
    menu.scoring = scoring;
    menu.achievements = achievements;

    // ── Input Init ──────────────────────────────────────────────
    Input.init(canvas);

    // ── Analytics ───────────────────────────────────────────────
    function track(event, props) {
        try { if (window.posthog) posthog.capture(event, props); } catch(e) {}
    }

    // ── Audio Bootstrap ─────────────────────────────────────────
    function ensureAudio() {
        if (!audioStarted) {
            SFX.init();
            SFX.resume();
            Music.init();
            audioStarted = true;
        }
    }

    // ── Game Start / Restart ────────────────────────────────────
    function startGame() {
        ensureAudio();
        rig = new OperatorRig();
        pedManager.clear();
        projectiles.raindrops.length = 0;
        projectiles.ozoneProjectiles.length = 0;
        projectiles.lightningBolts.length = 0;
        projectiles.tornadoes.length = 0;
        projectiles.frostCones.length = 0;
        projectiles.fogZones.length = 0;
        projectiles.enemyBullets.length = 0;
        particles.particles.length = 0;
        scoring.reset();
        waves.reset();
        powerups.clear();
        treatmentObjectives.reset();
        textPopups.popups.length = 0;
        basinEffects.pools.length = 0;
        basinEffects.scorches.length = 0;
        city.timeOfDay = 0;
        gameState = 'playing';
        gameTime = 0;
        hailCooldown = 0;
        rainSpawnAcc = 0;
        powerupTimer = CFG.POWERUP.MID_WAVE_INTERVAL;
        
        NotificationSystem.announcementTimer = 0;
        NotificationSystem.announcementText = '';
        
        windSpeed = 0;
        windTarget = 0;
        slowMoTimer = 0;
        slowMoScale = 1;
        multiKillCount = 0;
        multiKillTimer = 0;
        multiKillType = '';
        autoSaveTimer = 0;

        game.rig = rig;
        game.treatmentReport = null;
        game._hadSecretCombo = false;
        if (game._epicMusic) {
            game._epicMusic.pause();
            game._epicMusicPlaying = false;
        }
        rig.cosmetic = progression.selectedCosmetic || 'none';
        achievements.resetRun();

        // Reset per-run state (SP, upgrades, attack unlocks)
        progression.unlockedAttacks = { rain: false, hail: false, lightning: false, tornado: false, frost: false, fog: false };
        progression.treatmentPoints = 0;
        progression.upgradeLevels = progression._defaultUpgradeLevels();
        progression.checkWaveUnlocks(1);

        waves.startWave(pedManager);
        treatmentObjectives.startCycle(waves.waveNumber);
        Music.start();
        track('game_start', { basin: SaveSystem.activeSlot });
    }

    function gameOver() {
        gameState = 'gameover';
        var wasNewHigh = scoring.score >= scoring.highScore && scoring.score > 0;
        scoring.saveHighScore();
        menu.setGameOverStats({
            waveNumber: waves.waveNumber,
            totalKills: scoring.totalKills,
            bestCombo:  scoring.bestCombo,
            score:      scoring.score,
            highScore:  scoring.highScore,
            isNewHigh:  wasNewHigh,
        });
        progression.updateStats(waves.waveNumber, scoring.totalKills);
        progression.addStormPoints(scoring.score);
        progression.save();
        SaveSystem.saveRun(game); // preserve progress — player can continue from this wave
        Music.stop();
        if (game._epicMusic) { game._epicMusic.pause(); game._epicMusicPlaying = false; }
        track('game_over', { wave: waves.waveNumber, score: scoring.score, kills: scoring.totalKills, bestCombo: scoring.bestCombo });
    }

    // ── Save Slots ──────────────────────────────────────────────────
    SaveSystem.migrateLegacySave();

    // ── Power-up filtering (only spawn relevant power-ups) ───────
    function getAvailablePowerupTypes() {
        var available = [];
        var waveNumber = waves.waveNumber || 1;
        // Map effects to required attacks
        var effectRequires = {
            chlorineBoost: 'chlorine', ozoneAuto: 'ozone', chainLightning: 'uv',
            ballLightning: 'uv', blizzard: 'coagulant',
        };
        for (var i = 0; i < POWERUP_TYPES.length; i++) {
            var pu = POWERUP_TYPES[i];
            if (pu.minWave && waveNumber < pu.minWave) continue;
            var req = effectRequires[pu.effect];
            if (req && !progression.hasAttack(req)) continue;
            available.push(pu);
        }
        return available.length > 0 ? available : POWERUP_TYPES;
    }


    // ── Update ──────────────────────────────────────────────────
    function update(dt) {
        if (dt > 0.1) dt = 0.1;

        // Slow-mo effect (last kill of wave)
        if (slowMoTimer > 0) {
            slowMoTimer -= dt;
            dt *= slowMoScale;
            if (slowMoTimer <= 0) {
                slowMoTimer = 0;
                slowMoScale = 1;
            }
        }

        // Update notification system
        NotificationSystem.update(dt);

        // Menu handling
        menu.state = gameState;
        var menuResult = menu.update(dt);

        if (menuResult.action === 'start' || menuResult.action === 'restart') {
            // Find first empty slot for new game
            SaveSystem.activeSlot = 0;
            for (var si = 0; si < SaveSystem.MAX_SLOTS; si++) {
                if (!SaveSystem.getSlotInfo(si)) { SaveSystem.activeSlot = si; break; }
            }
            SaveSystem.clearRunSave();
            startGame();
            return;
        }
        if (menuResult.action === 'loadslot') {
            var slot = menuResult.slot;
            var info = SaveSystem.getSlotInfo(slot);
            SaveSystem.activeSlot = slot;
            if (info) {
                // Load existing save
                startGame();
                if (SaveSystem.loadRun(game, slot)) {
                    pedManager.clear();
                    waves.startWave(pedManager);
                    treatmentObjectives.startCycle(waves.waveNumber);
                    NotificationSystem.showAnnouncement('Continuing Basin ' + (slot + 1) + ' - Cycle ' + waves.waveNumber);
                }
            } else {
                // Empty slot — start new game in this slot
                SaveSystem.clearRunSave();
                startGame();
                NotificationSystem.showAnnouncement('New Game - Slot ' + (slot + 1));
            }
            return;
        }
        if (menuResult.action === 'pause') {
            gameState = 'paused';
            Music.stop();
            if (game._epicMusic) { game._epicMusic.pause(); }
            return;
        }
        if (menuResult.action === 'resume') {
            gameState = 'playing';
            if (game._epicMusicPlaying && game._epicMusic) {
                game._epicMusic.play().catch(function(){});
            } else {
                Music.start();
            }
            return;
        }
        if (menuResult.action === 'deleteslot') {
            var slotInfo = SaveSystem.getSlotInfo(menuResult.slot);
            if (slotInfo) {
                var msg = 'Reset Basin ' + (menuResult.slot + 1) + '? (Cycle ' + slotInfo.waveNumber + ', Score ' + (slotInfo.score || 0) + ')\n\nThis cannot be undone!';
                if (confirm(msg)) {
                    SaveSystem.deleteSlot(menuResult.slot);
                    SFX.playMenuSelect();
                }
                // Clear stuck keys after dialog (browser swallows keyup during confirm)
                Input.keys = {};
                Input._justPressed = {};
            }
            return;
        }
        if (menuResult.action === 'howtoplay') {
            gameState = 'howtoplay';
            return;
        }
        if (menuResult.action === 'backtotitle') {
            gameState = 'title';
            return;
        }
        if (menuResult.action === 'quit') {
            SaveSystem.saveRun(game);
            progression.save();
            gameState = 'title';
            Music.stop();
            if (game._epicMusic) { game._epicMusic.pause(); game._epicMusicPlaying = false; }
            return;
        }
        if (menuResult.action === 'volumechange') {
            SFX.setVolume(menuResult.sfxVol);
            Music.setVolume(menuResult.musicVol);
            return;
        }
        if (menuResult.action === 'achievements') {
            gameState = 'achievements';
            return;
        }
        if (menuResult.action === 'closeshop') {
            gameState = 'playing';
            Music.setTrack('main');
            // Return to intermission — player can still press ENTER for next wave
            return;
        }
        if (menuResult.action === 'buyupgrade') {
            if (progression.buyUpgrade(menuResult.key)) {
                SFX.playMenuSelect();
                progression.save();
                track('shop_purchase', { upgrade: menuResult.key, level: progression.getUpgradeLevel(menuResult.key) });
            }
            return;
        }
        if (menuResult.action === 'resetsave') {
            progression.clearSave();
            scoring.reset();
            scoring.highScore = 0;
            scoring.saveHighScore();
            gameState = 'title';
            return;
        }
        if (menuResult.action === 'cosmeticprev' || menuResult.action === 'cosmeticnext') {
            var _unlocked = [];
            var _gearList = typeof OPERATOR_GEAR !== 'undefined' ? OPERATOR_GEAR :
                (typeof CLOUD_COSMETICS !== 'undefined' ? CLOUD_COSMETICS : []);
            if (typeof _gearList !== 'undefined') {
                for (var _ci = 0; _ci < _gearList.length; _ci++) {
                    var _cosm = _gearList[_ci];
                    var _wOk = _cosm.unlockWave === 0 || progression.highestWave >= _cosm.unlockWave;
                    var _aOk = !_cosm.unlockAch || achievements.isUnlocked(_cosm.unlockAch);
                    if (_cosm.id === 'none' || (_wOk && _aOk)) {
                        _unlocked.push(_cosm);
                    }
                }
            }
            if (_unlocked.length > 0) {
                if (menuResult.action === 'cosmeticnext') {
                    menu._cosmeticIndex = (menu._cosmeticIndex + 1) % _unlocked.length;
                } else {
                    menu._cosmeticIndex = (menu._cosmeticIndex - 1 + _unlocked.length) % _unlocked.length;
                }
                var _chosen = _unlocked[menu._cosmeticIndex];
                progression.setCosmetic(_chosen.id);
                rig.cosmetic = _chosen.id;
                SFX.playMenuSelect();
            }
            return;
        }

        if (gameState !== 'playing') return;

        // Time scale from power-ups
        var timeScale = powerups.getTimeScale();
        var scaledDt = dt * timeScale;
        var damageMult = powerups.getDamageMultiplier();
        // Kaiju mode: 4x damage on top of rage
        var activeCombo = powerups.getSecretCombo();
        if (activeCombo && activeCombo.type === 'kaiju') {
            damageMult *= 4;
        }
        // Toxic Storm: 5x rain damage
        if (activeCombo && activeCombo.type === 'toxicStorm') {
            damageMult *= 5;
        }

        gameTime += dt;

        // Effective stats from upgrades
        var effCloudSpeed = progression.getEffective('rigSpeed');
        var effRainDPS = progression.getEffective('chlorineDPS');
        var effRainCone = progression.getEffective('chlorineConeWidth');
        var effHailDmg = progression.getEffective('ozoneDamage');
        var effLightningAoE = progression.getEffective('uvAoE');
        var effLightningCharge = progression.getEffective('uvChargeTime');
        var effTornadoDur = progression.getEffective('backwashDuration');
        var effTornadoW = progression.getEffective('backwashWidth');
        var effRecharge = progression.getEffective('meterRechargeMultiplier');
        var effComboWindow = progression.getEffective('comboWindow');

        // Apply effective stats to rig for this frame
        rig._effectiveSpeed = effCloudSpeed;
        rig._effectiveRecharge = effRecharge;
        rig._effectiveLightningCharge = effLightningCharge;

        // Day/night cycle
        // Day/night cycle: oscillates 0 (noon) to 0.5 (midnight)
        // Full cycle every CYCLE_WAVES waves, with increasing darkness at higher waves
        var waveProgress = waves.waveNumber / CFG.DAY_NIGHT.CYCLE_WAVES;
        var baseCycle = (Math.sin(waveProgress * Math.PI * 2 - Math.PI / 2) + 1) / 2;
        // Scale: early waves dim slightly (0-0.25), late waves get truly dark (0-0.5)
        var darkScale = Math.min(0.5, 0.2 + waves.waveNumber * 0.015);
        city.timeOfDay = baseCycle * darkScale;

        // Environmental wind (increases with waves)
        if (waves.waveNumber >= 8) {
            if (Math.random() < 0.005) {
                windTarget = (Math.random() - 0.5) * Math.min(waves.waveNumber * 5, 80);
            }
            windSpeed += (windTarget - windSpeed) * 0.02;
        }

        // ── OperatorRig ───────────────────────────────────────────────
        rig.update(dt); // rig always moves at full speed (Time Warp slows world, not you)

        // ── Power-up inventory activation (1-5) ──────────────
        for (var si = 0; si < 5; si++) {
            if (Input.justPressed('Digit' + (si + 1)) && powerups.inventory[si]) {
                powerups.activateSlot(si, rig);
                SFX.playPowerUp();
            }
        }

        // ── Attacks ─────────────────────────────────────────────

        // Rain (always available from wave 1)
        var stormSurgeCount = powerups.countEffect('chlorineBoost');
        var hasStormSurge = stormSurgeCount > 0;
        if (progression.hasAttack('chlorine') && Input.wantsChlorine() && (rig.canRain() || hasStormSurge)) {
            if (!hasStormSurge) rig.useRain(dt);
            if (waves.activeMutator && waves.activeMutator.effect === 'rainDrain') rig.useRain(dt); // drain again = 2x
            rig.addAnger(0.3 * dt);
            achievements.trackAttack('chlorine');
            // Stacked Storm Surge = more drops (multiplicative)
            var rainMult = hasStormSurge ? stormSurgeCount + 1 : 1;
            rainSpawnAcc += CFG.CHLORINE.DROPS_PER_SEC * rainMult * dt;
            while (rainSpawnAcc >= 1) {
                projectiles.spawnRain(rig.x, rig.y + rig.height * 0.6, effRainCone * (rig.width / rig.baseWidth));
                rainSpawnAcc -= 1;
            }
            if (!SFX._rainPlaying) {
                SFX.playChlorineAmbient();
                SFX._rainPlaying = true;
            }
        } else {
            rig.stopRain();
            rainSpawnAcc = 0;
            if (SFX._rainPlaying) {
                SFX.stopChlorineAmbient();
                SFX._rainPlaying = false;
            }
        }

        // Hail (unlocks wave 3)
        var hasHailStorm = powerups.hasEffect('ozoneAuto');
        hailCooldown -= dt;
        if (progression.hasAttack('ozone') && Input.wantsOzone() && (rig.canHail() || hasHailStorm) && hailCooldown <= 0) {
            if (!hasHailStorm) rig.useHail();
            rig.addAnger(0.5);
            achievements.trackAttack('ozone');
            var hailTargetX = camera.worldX(Input.mouse.x);
            var hailTargetY = camera.worldY(Input.mouse.y);
            if (Input.mouse.x === 0 && Input.mouse.y === 0) {
                hailTargetX = rig.x;
                hailTargetY = CFG.GROUND_Y;
            }
            projectiles.spawnHail(rig.x, rig.y + rig.height * 0.5, hailTargetX, hailTargetY);
            // Apply wind to hail
            if (windSpeed !== 0) {
                var lastHail = projectiles.ozoneProjectiles[projectiles.ozoneProjectiles.length - 1];
                if (lastHail) lastHail.vx += windSpeed;
            }
            SFX.playOzoneThrow();
            hailCooldown = 0.15;
        }

        // Lightning (unlocks wave 6)
        if (progression.hasAttack('uv') && Input.wantsUV() && rig.canLightning()) {
            rig.useLightning();
            rig.addAnger(3);
            achievements.trackAttack('uv');
            if (powerups.hasEffect('chainLightning')) achievements.trackUVOverdrivePulse();
            var bolt = projectiles.spawnLightning(rig.x, rig.y + rig.height * 0.5);
            camera.shake();
            SFX.playUVPulse();
            basinEffects.addScorch(bolt.x, CFG.GROUND_Y);

            // Lightning damages nearest building (cosmetic)
            var ltngBuildings = city.layers[2];
            for (var lbi = 0; lbi < ltngBuildings.length; lbi++) {
                var lb = ltngBuildings[lbi];
                if (bolt.x > lb.x && bolt.x < lb.x + lb.width) {
                    basinEffects.damageBuilding(lb.x, lb.width);
                    break;
                }
            }

            // AoE damage with upgraded radius
            var origAoE = CFG.UV_PULSE.AOE_RADIUS;
            CFG.UV_PULSE.AOE_RADIUS = effLightningAoE;
            var lightningHits = collision.checkLightning(bolt, pedManager.getAlive(), particles);
            CFG.UV_PULSE.AOE_RADIUS = origAoE;

            achievements.trackUVKills(lightningHits.length);
            for (var i = 0; i < lightningHits.length; i++) {
                var lh = lightningHits[i];
                scoring.addKill(Math.floor(lh.points * CFG.UV_PULSE.POINTS_MULT * damageMult), lh.x, lh.y, 'uv', textPopups);
                multiKillCount++;
                multiKillTimer = 0.5;
                multiKillType = 'uv';
                achievements.trackKill(lh.typeName, 'uv', lh.frozen);
                if (lh.wasAttracted) achievements.trackTracerKill();
                if (lh.typeName === 'oldLady') {
                    textPopups.addGuilty(lh.x, lh.y - 40);
                }
                if (lh.complaint) {
                    NotificationSystem.showComplaint(lh.x, lh.y, lh.complaint, textPopups);
                    if (lh.complaint && AURORA_COMPLAINTS) achievements.trackAuroraComplaint();
                }
                if (PEOPLE_TYPES[lh.typeName] && PEOPLE_TYPES[lh.typeName].isBoss) achievements.trackBossKill();
                if (lh.isBounty) {
                    scoring.addBonus('BOUNTY KILLED', lh.bountyPoints, lh.x, lh.y, textPopups);
                    textPopups.add(lh.x, lh.y - 50, 'BOUNTY: ' + lh.bountyPoints + '!', { color: '#ffdd00', size: 22, life: 3.0, bold: true, vy: -40 });
                    camera.shake(5, 0.3);
                }
            }
            // Expression: evil grin after lightning kills
            if (lightningHits.length > 0) rig.setExpression('evil', 1.5);
        }

        // Tornado (unlocks wave 10)
        if (progression.hasAttack('backwash') && Input.wantsBackwash() && rig.canTornado()) {
            rig.useTornado();
            rig.addAnger(2);
            achievements.trackAttack('backwash');
            var tornadoDir = rig.vx >= 0 ? 1 : -1;
            var tornado = projectiles.spawnTornado(rig.x, tornadoDir);
            // Apply upgrade to tornado stats
            tornado.life = effTornadoDur;
            tornado.maxLife = effTornadoDur;
            tornado.width = effTornadoW;
            camera.shake(6, 0.3);
            SFX.playOzoneThrow();
        }

        // Frost (unlocks wave 8)
        if (progression.hasAttack('coagulant') && Input.wantsCoagulant() && rig.canFrost()) {
            rig.useFrost();
            rig.addAnger(1);
            achievements.trackAttack('coagulant');
            var frostDir = rig.vx >= 0 ? 1 : -1;
            var cone = projectiles.spawnFrost(rig.x, rig.y + rig.height * 0.5, frostDir);
            // Extend cone to reach the ground
            cone.length = CFG.GROUND_Y - rig.y;
            var effFreezeDur = progression.getEffective('coagulantDuration');
            var origFreeze = CFG.COAGULANT.FREEZE_DURATION;
            CFG.COAGULANT.FREEZE_DURATION = effFreezeDur;
            collision.checkFrost(cone, pedManager.getAlive(), particles);
            CFG.COAGULANT.FREEZE_DURATION = origFreeze;
            SFX.playOzoneThrow();
        }

        // Fog (unlocks wave 12)
        if (progression.hasAttack('ph') && Input.wantsPH() && rig.canFog()) {
            rig.useFog();
            rig.addAnger(0.5);
            achievements.trackAttack('ph');
            var effFogRadius = progression.getEffective('phRadius');
            var fogZone = projectiles.spawnFog(rig.x, CFG.GROUND_Y);
            fogZone.radius = effFogRadius;
        }

        // ── Projectiles ─────────────────────────────────────────
        projectiles.update(dt); // projectiles move at full speed (Time Warp slows peds, not your attacks)

        // ── Enemy bullet collision with rig ──────────────────
        for (var bi = projectiles.enemyBullets.length - 1; bi >= 0; bi--) {
            var eb = projectiles.enemyBullets[bi];
            var bdx = eb.x - rig.x;
            var bdy = eb.y - rig.y;
            if (Math.abs(bdx) < rig.width * 0.5 && Math.abs(bdy) < rig.height * 0.5) {
                rig.takeDamage(eb.damage);
                particles.hitEffect(rig.x + bdx * 0.5, rig.y + bdy * 0.5);
                textPopups.add(rig.x, rig.y - 20, '-' + eb.damage + ' HP', {
                    color: '#ff4444', size: 14, life: 1.2, bold: true, vy: -30,
                });
                camera.shake(3, 0.15);
                rig.setExpression('scared', 0.8);
                projectiles.enemyBullets.splice(bi, 1);
            }
        }

        // ── Fog status effect ───────────────────────────────────
        collision.checkFog(projectiles.fogZones, pedManager.getAlive());

        // ── Collisions ──────────────────────────────────────────
        var alivePeds = pedManager.getAlive();

        // Rain collisions (use effective DPS)
        var origRainDPS = CFG.CHLORINE.DPS;
        CFG.CHLORINE.DPS = effRainDPS;
        var rainHits = collision.checkRain(projectiles.raindrops, alivePeds, particles);
        CFG.CHLORINE.DPS = origRainDPS;

        for (var i = 0; i < rainHits.length; i++) {
            var rh = rainHits[i];
            if (rh.killed) {
                scoring.addKill(Math.floor(rh.points * CFG.CHLORINE.POINTS_MULT * damageMult), rh.x, rh.y, 'chlorine', textPopups);
                multiKillCount++;
                multiKillTimer = 0.5;
                multiKillType = 'chlorine';
                achievements.trackKill(rh.typeName, 'chlorine', rh.frozen);
                if (rh.wasAttracted) achievements.trackTracerKill();
                if (rh.typeName === 'oldLady') textPopups.addGuilty(rh.x, rh.y - 40);
                rig.addAnger(1);
                if (rh.isBounty) {
                    scoring.addBonus('BOUNTY KILLED', rh.bountyPoints, rh.x, rh.y, textPopups);
                    textPopups.add(rh.x, rh.y - 50, 'BOUNTY: ' + rh.bountyPoints + '!', { color: '#ffdd00', size: 22, life: 3.0, bold: true, vy: -40 });
                    camera.shake(5, 0.3);
                }
            } else if (rh.hit) {
                scoring.addHit(Math.floor(rh.points * 0.1), rh.x, rh.y, textPopups);
            }
            if (rh.groundHit) {
                basinEffects.addPool(rh.x, CFG.GROUND_Y);
            }
            if (rh.complaint) {
                NotificationSystem.showComplaint(rh.x, rh.y, rh.complaint, textPopups);
            }
        }

        // Hail collisions (use effective damage)
        var origHailDmg = CFG.OZONE.DAMAGE;
        CFG.OZONE.DAMAGE = effHailDmg;
        var hailHits = collision.checkHail(projectiles.ozoneProjectiles, alivePeds, particles);
        CFG.OZONE.DAMAGE = origHailDmg;

        for (var i = 0; i < hailHits.length; i++) {
            var hh = hailHits[i];
            if (hh.killed) {
                scoring.addKill(Math.floor(hh.points * CFG.OZONE.POINTS_MULT * damageMult), hh.x, hh.y, 'ozone', textPopups);
                multiKillCount++;
                multiKillTimer = 0.5;
                multiKillType = 'ozone';
                achievements.trackKill(hh.typeName, 'ozone', hh.frozen);
                if (hh.wasAttracted) achievements.trackTracerKill();
                if (hh.typeName === 'oldLady') textPopups.addGuilty(hh.x, hh.y - 40);
                rig.addAnger(1.5);
                if (hh.isBounty) {
                    scoring.addBonus('BOUNTY KILLED', hh.bountyPoints, hh.x, hh.y, textPopups);
                    textPopups.add(hh.x, hh.y - 50, 'BOUNTY: ' + hh.bountyPoints + '!', { color: '#ffdd00', size: 22, life: 3.0, bold: true, vy: -40 });
                    camera.shake(5, 0.3);
                }
            } else if (hh.hit) {
                scoring.addHit(Math.floor(hh.points * 0.3), hh.x, hh.y, textPopups);
            }
            if (hh.complaint) {
                NotificationSystem.showComplaint(hh.x, hh.y, hh.complaint, textPopups);
            }
        }

        // Tornado collisions
        var tornadoHits = collision.checkTornadoes(projectiles.tornadoes, alivePeds, particles);
        for (var i = 0; i < tornadoHits.length; i++) {
            var th = tornadoHits[i];
            if (th.killed) {
                scoring.addKill(Math.floor(th.points * CFG.BACKWASH.POINTS_MULT * damageMult), th.x, th.y, 'backwash', textPopups);
                multiKillCount++;
                multiKillTimer = 0.5;
                multiKillType = 'backwash';
                achievements.trackKill(th.typeName, 'backwash', th.frozen);
                if (th.wasAttracted) achievements.trackTracerKill();
                if (th.typeName === 'oldLady') textPopups.addGuilty(th.x, th.y - 40);
                rig.addAnger(1);
                if (th.isBounty) {
                    scoring.addBonus('BOUNTY KILLED', th.bountyPoints, th.x, th.y, textPopups);
                    textPopups.add(th.x, th.y - 50, 'BOUNTY: ' + th.bountyPoints + '!', { color: '#ffdd00', size: 22, life: 3.0, bold: true, vy: -40 });
                    camera.shake(5, 0.3);
                }
            } else if (th.hit) {
                scoring.addHit(Math.floor(th.points * 0.2), th.x, th.y, textPopups);
            }
            if (th.complaint) {
                NotificationSystem.showComplaint(th.x, th.y, th.complaint, textPopups);
            }
        }
        achievements.trackTornadoHits(tornadoHits.length);

        // Tornado damages nearby buildings (cosmetic)
        for (var tdi = 0; tdi < projectiles.tornadoes.length; tdi++) {
            var torn = projectiles.tornadoes[tdi];
            var tornBuildings = city.layers[2];
            for (var tbi = 0; tbi < tornBuildings.length; tbi++) {
                var tb = tornBuildings[tbi];
                if (torn.x > tb.x && torn.x < tb.x + tb.width) {
                    basinEffects.damageBuilding(tb.x, tb.width);
                    break;
                }
            }
        }

        // Multi-kill timer
        if (multiKillTimer > 0) {
            multiKillTimer -= dt;
            if (multiKillTimer <= 0 && multiKillCount >= 2) {
                // Expression: evil grin on multi-kill of 3+
                if (multiKillCount >= 3) rig.setExpression('evil', 2.0);
                // Show multi-kill popup
                var mkName = MULTI_KILL_NAMES[Math.min(multiKillCount, 10)] || 'APOCALYPSE';
                var flavor = MULTI_KILL_FLAVOR[multiKillType];
                var flavorText = flavor ? flavor[Math.min(multiKillCount - 2, flavor.length - 1)] : 'KILL!';
                var mkText = mkName + ' ' + flavorText;
                var mkSize = 20 + Math.min(multiKillCount, 8) * 2;
                var mkColor = multiKillCount >= 5 ? '#ff00ff' : multiKillCount >= 3 ? '#ff4400' : '#ffcc00';
                textPopups.add(rig.x, rig.y + 50, mkText, {
                    color: mkColor, size: mkSize, life: 2.5, bold: true, vy: -50, scale: 2.0,
                });
                if (multiKillCount >= 5) camera.shake(4, 0.2);
            }
            if (multiKillTimer <= 0) {
                multiKillCount = 0;
                multiKillType = '';
            }
        }

        // ── Active power-up effects on peds ─────────────────────
        var hasAcidRain = powerups.hasEffect('breakpointChlorine');
        var hasBlizzard = powerups.hasEffect('blizzard');
        var hasAurora = powerups.hasEffect('aurora');

        // ── Frost shatter AoE — frozen peds that die damage nearby ─
        var allPedsForShatter = pedManager.pedestrians;
        for (var si = allPedsForShatter.length - 1; si >= 0; si--) {
            var sp = allPedsForShatter[si];
            if (sp._shattered) {
                sp._shattered = false;
                particles.lightningParticles(sp.x, sp.y - 12);
                textPopups.add(sp.x, sp.y - 30, 'SHATTER!', {
                    color: '#88ddff', size: 18, life: 1.5, bold: true, vy: -40,
                });
                // AoE damage to nearby peds
                for (var sj = 0; sj < allPedsForShatter.length; sj++) {
                    var other = allPedsForShatter[sj];
                    if (other === sp || !other.alive) continue;
                    if (Math.abs(other.x - sp.x) < CFG.COAGULANT.SHATTER_RADIUS) {
                        other.takeDamage(CFG.COAGULANT.SHATTER_DAMAGE, 'coagulant');
                        particles.hitEffect(other.x, other.y - 12);
                    }
                }
                scoring.addKill(Math.floor((sp.type ? sp.type.points : 50) * CFG.COAGULANT.POINTS_MULT * damageMult), sp.x, sp.y, 'coagulant', textPopups);
            }
        }

        // ── Pedestrian special behaviors ────────────────────────
        for (var i = 0; i < alivePeds.length; i++) {
            var ped = alivePeds[i];

            // Reset per-frame flags
            ped._shielded = false;

            // Acid Rain: strip umbrella + ignore rain resist
            if (hasAcidRain) {
                if (ped.hasBiofilmShield) ped.hasBiofilmShield = false;
                ped._acidRain = true;
            } else {
                ped._acidRain = false;
            }

            // Blizzard: multiplicative slow (1x=0.3, 2x=0.09, 3x=0.027)
            var blizzardCount = powerups.countEffect('blizzard');
            if (blizzardCount > 0 && !ped._frozen) {
                ped._blizzardSlow = blizzardCount;
            } else {
                ped._blizzardSlow = 0;
            }

            // Aurora: mesmerize all peds (freeze in place, staring up)
            if (hasAurora && ped.state !== 'dead' && ped.state !== 'zapped') {
                ped._frozen = true;
                ped._frozenTimer = 0.5;
                ped._mesmerized = true;
            } else if (!hasAurora && ped._mesmerized) {
                ped._mesmerized = false;
            }

            // Flooding: slow peds in surge zones
            var surge = basinEffects.getSurgeAtX ? basinEffects.getSurgeAtX(ped.x) : null;
            if (surge) {
                ped._inFlood = true;
            } else {
                ped._inFlood = false;
            }

            // Ambient chatter (low frequency, camera-visible peds only)
            var chatter = PED_CHATTER[ped.typeName];
            if (chatter && ped.alive) {
                if (!ped._chatterTimer) ped._chatterTimer = 3 + Math.random() * 5;
                ped._chatterTimer -= scaledDt;
                if (ped._chatterTimer <= 0) {
                    ped._chatterTimer = 5 + Math.random() * 8;
                    // Only show if on screen
                    var screenX = ped.x - camera.x;
                    if (screenX > -50 && screenX < CFG.WIDTH + 50) {
                        var lines = null;
                        if (ped.state === 'flee' && chatter.flee) {
                            lines = chatter.flee;
                        } else if (ped.state === 'walk' && chatter.walk) {
                            // Child in rain says happy things
                            if (ped.typeName === 'child' && rig.isDosing && chatter.rainHappy) {
                                var distToRain = Math.abs(ped.x - rig.x);
                                if (distToRain < CFG.PED.FLEE_RANGE) {
                                    lines = chatter.rainHappy;
                                }
                            }
                            if (!lines) lines = chatter.walk;
                        }
                        if (lines) {
                            var line = lines[Math.floor(Math.random() * lines.length)];
                            var chatColor = '#cccccc';
                            if (ped.typeName === 'child') chatColor = '#88ff88';
                            else if (ped.typeName === 'vip') chatColor = '#ffdd44';
                            else if (ped.typeName === 'oldLady') chatColor = '#ffaacc';
                            else if (ped.typeName === 'weatherReporter') chatColor = '#ff8844';
                            textPopups.add(ped.x, ped.y - 32, line, {
                                color: chatColor, size: 14, life: 2.5, vy: -20,
                            });
                        }
                    }
                }
            }

            // Ped conversations (two peds near each other)
            if (ped.state === 'walk' && !ped._chatting && Math.random() < 0.001) {
                for (var ci = 0; ci < alivePeds.length; ci++) {
                    var chatOther = alivePeds[ci];
                    if (chatOther === ped || chatOther.state !== 'walk' || chatOther._chatting) continue;
                    if (Math.abs(chatOther.x - ped.x) < 40) {
                        var conv = PED_CONVERSATIONS[Math.floor(Math.random() * PED_CONVERSATIONS.length)];
                        var chatScreenX = ped.x - camera.x;
                        if (chatScreenX > 0 && chatScreenX < CFG.WIDTH) {
                            textPopups.add(ped.x, ped.y - 35, conv[0], { color: '#ccddcc', size: 11, life: 2.5, vy: -15 });
                            chatOther._chatReply = { text: conv[1], timer: 1.0, x: chatOther.x };
                        }
                        ped._chatting = 3;
                        chatOther._chatting = 3;
                        break;
                    }
                }
            }
            if (ped._chatting > 0) ped._chatting -= scaledDt;
            if (ped._chatReply) {
                ped._chatReply.timer -= scaledDt;
                if (ped._chatReply.timer <= 0) {
                    textPopups.add(ped.x, ped.y - 35, ped._chatReply.text, { color: '#ddcccc', size: 11, life: 2.5, vy: -15 });
                    ped._chatReply = null;
                }
            }

            // Police: chase rig when nearby, shout warnings
            if (ped.type.chasesCloud && ped.state === 'walk') {
                var distToCloud = Math.abs(ped.x - rig.x);
                if (distToCloud < ped.type.alertRadius && rig.isDosing) {
                    ped.dir = ped.x < rig.x ? 1 : -1;
                    // Shout periodically
                    if (!ped._shoutTimer) ped._shoutTimer = 1;
                    ped._shoutTimer -= scaledDt;
                    if (ped._shoutTimer <= 0) {
                        ped._shoutTimer = 2.5 + Math.random() * 2;
                        var shout = POLICE_SHOUTS[Math.floor(Math.random() * POLICE_SHOUTS.length)];
                        textPopups.add(ped.x, ped.y - 35, shout, {
                            color: '#4488ff', size: 13, life: 2.0, bold: true, vy: -30,
                        });
                    }
                    // Alert nearby peds to flee
                    for (var j = 0; j < alivePeds.length; j++) {
                        if (j !== i && Math.abs(alivePeds[j].x - ped.x) < 100) {
                            if (alivePeds[j].state === 'walk' && !alivePeds[j].type.chasesCloud) {
                                alivePeds[j].flee(rig.x);
                            }
                        }
                    }
                }
            }

            // Military/boss: shoot bullet at rig
            if (ped.type.shootsBack && ped.alive && !ped._frozen) {
                if (!ped._shootTimer) ped._shootTimer = ped.type.shootInterval;
                ped._shootTimer -= scaledDt;
                var distToCloud2 = Math.abs(ped.x - rig.x);
                if (ped._shootTimer <= 0 && distToCloud2 < ped.type.shootRange) {
                    ped._shootTimer = ped.type.shootInterval;
                    // Spawn visible bullet instead of instant damage
                    var shooterDrawY = ped.type.floats ? ped.y - 200 : ped.y;
                    projectiles.spawnEnemyBullet(ped.x, shooterDrawY - 15, rig.x, rig.y, ped.type.shootDamage);
                    particles.hitEffect(ped.x, shooterDrawY - 15);
                    // Military callout
                    if (PED_CHATTER.military && PED_CHATTER.military.shoot && Math.random() < 0.4) {
                        var callout = PED_CHATTER.military.shoot[Math.floor(Math.random() * PED_CHATTER.military.shoot.length)];
                        textPopups.add(ped.x, ped.y - 35, callout, {
                            color: '#44aa44', size: 11, life: 1.5, bold: true, vy: -25,
                        });
                    }
                }
            }

            // Scientist: deploy basinEffects shield on any nearby attack, recharges
            if (ped.type.deploysShield && ped.alive) {
                if (!ped._shieldCooldown) ped._shieldCooldown = 0;
                if (ped._shieldTimer > 0) {
                    ped._shieldTimer -= scaledDt;
                    // Protect nearby peds from rain
                    for (var j = 0; j < alivePeds.length; j++) {
                        if (Math.abs(alivePeds[j].x - ped.x) < ped._shieldRadius) {
                            alivePeds[j]._shielded = true;
                        }
                    }
                    if (ped._shieldTimer <= 0) {
                        ped._shieldCooldown = 8; // 8s cooldown before redeploying
                    }
                } else if (ped._shieldCooldown > 0) {
                    ped._shieldCooldown -= scaledDt;
                } else {
                    // Deploy if rig is nearby and attacking
                    var distToCloud3 = Math.abs(ped.x - rig.x);
                    var cloudAttacking = rig.isDosing || projectiles.ozoneProjectiles.length > 0 ||
                        projectiles.lightningBolts.length > 0 || projectiles.tornadoes.length > 0 ||
                        projectiles.frostCones.length > 0 || projectiles.fogZones.length > 0;
                    if (distToCloud3 < 300 && cloudAttacking) {
                        ped._shieldTimer = ped.type.shieldDuration;
                        ped._shieldRadius = ped.type.shieldRadius;
                    }
                }
            }

            // BasinEffects Reporter: spawns umbrella people after being alive 30s
            if (ped.type.spawnsUmbrellaAfter && ped.alive) {
                if (!ped._reporterTimer) ped._reporterTimer = 0;
                ped._reporterTimer += scaledDt;
                if (ped._reporterTimer >= ped.type.spawnsUmbrellaAfter && !ped._reporterSpawned) {
                    ped._reporterSpawned = true;
                    // Spawn 3 umbrella people nearby
                    for (var ui = 0; ui < 3; ui++) {
                        pedManager.spawn('biofilmPerson', ped.x + (ui - 1) * 40);
                    }
                    textPopups.add(ped.x, ped.y - 35, 'BROADCAST: Bring umbrellas!', {
                        color: '#ff8844', size: 13, life: 2.5, bold: true, vy: -25,
                    });
                }
            }

            // Bodyguard: stay near VIP, absorb hits
            if (ped.type.protectsVIP && ped.alive && ped.state === 'walk') {
                // Find nearest alive VIP
                for (var vi = 0; vi < alivePeds.length; vi++) {
                    if (alivePeds[vi].typeName === 'vip' && alivePeds[vi].alive) {
                        var vipDx = alivePeds[vi].x - ped.x;
                        if (Math.abs(vipDx) > 25) {
                            ped.dir = vipDx > 0 ? 1 : -1;
                        }
                        break;
                    }
                }
            }

            // Sun Deity boss: heals nearby peds
            if (ped.type.healsNearby && ped.alive) {
                for (var j = 0; j < alivePeds.length; j++) {
                    var other = alivePeds[j];
                    if (other === ped || !other.alive) continue;
                    if (Math.abs(other.x - ped.x) < ped.type.healRadius) {
                        other.hp = Math.min(other.maxHp, other.hp + ped.type.healRate * scaledDt);
                    }
                }
            }

            // Anti-OperatorRig boss: clears fog and frost in its radius
            if (ped.type.clearsEffects && ped.alive) {
                // Clear fog zones near the anti-rig
                for (var fi = projectiles.fogZones.length - 1; fi >= 0; fi--) {
                    if (Math.abs(projectiles.fogZones[fi].x - ped.x) < ped.type.healRadius) {
                        projectiles.fogZones.splice(fi, 1);
                    }
                }
                // Unfreeze nearby peds (counter the player's frost)
                for (var ui = 0; ui < alivePeds.length; ui++) {
                    if (Math.abs(alivePeds[ui].x - ped.x) < ped.type.healRadius && alivePeds[ui]._frozen) {
                        alivePeds[ui]._frozen = false;
                        alivePeds[ui]._frozenTimer = 0;
                    }
                }
            }

            // Normal flee from rain (skip bosses that float)
            if (!ped.type.floats) {
                var dx = ped.x - rig.x;
                var dy = ped.y - (rig.y + rig.height);
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (rig.isDosing && dist < CFG.PED.FLEE_RANGE) {
                    if (!ped.type.enjoysChlorine && !ped.type.chasesCloud) {
                        ped.flee(rig.x);
                    }
                }
            }
        }
        pedManager.update(scaledDt);

        // ── Power-ups ───────────────────────────────────────────
        powerups.update(dt, rig);

        var collected = collision.checkPowerups(powerups.powerups, rig);
        if (collected) {
            powerups.collect(collected, rig, textPopups);
            achievements.trackPowerup(collected.type.effect);
            track('power_up_collected', { type: collected.type.name });
            SFX.playPowerUp();
        }

        var attackCollected = collision.checkProjectilesVsPowerups(
            projectiles.raindrops, projectiles.ozoneProjectiles,
            projectiles.lightningBolts, powerups.powerups
        );
        for (var i = 0; i < attackCollected.length; i++) {
            powerups.collect(attackCollected[i], rig, textPopups);
            achievements.trackPowerup(attackCollected[i].type.effect);
            SFX.playPowerUp();
        }

        // Mid-wave powerup spawning
        if (waves.state === 'playing') {
            powerupTimer -= dt;
            if (powerupTimer <= 0) {
                powerupTimer = CFG.POWERUP.MID_WAVE_INTERVAL;
                if (Math.random() < CFG.POWERUP.MID_WAVE_CHANCE) {
                    var spawnX = rig.x + (Math.random() - 0.5) * CFG.WIDTH * 0.8;
                    spawnX = Math.max(50, Math.min(CFG.CITY.WORLD_WIDTH - 50, spawnX));
                    var avail = getAvailablePowerupTypes();
                    var type = avail[Math.floor(Math.random() * avail.length)];
                    powerups.powerups.push({
                        x: spawnX, y: -30, type: type, speed: CFG.POWERUP.FALL_SPEED
                    });
                }
            }
        }

        // Rainbow effect
        var rainbow = powerups.getRainbow();
        if (rainbow && !rainbow.spawned) {
            rainbow.spawned = true;
            var extraCount = 8 + Math.floor(Math.random() * 5);
            var availTypes = waves.getAvailableTypes(waves.waveNumber);
            for (var i = 0; i < extraCount; i++) {
                var side = Math.random() < 0.5 ? -30 : CFG.CITY.WORLD_WIDTH + 30;
                var tKey = availTypes[Math.floor(Math.random() * availTypes.length)];
                var ped = pedManager.spawn(tKey, side);
                ped.attract(rainbow.x);
            }
            var alive = pedManager.getAlive();
            for (var i = 0; i < alive.length; i++) {
                if (alive[i].state === 'walk' || alive[i].state === 'flee') {
                    alive[i].attract(rainbow.x);
                }
            }
        }
        if (!rainbow) {
            var allPeds = pedManager.getAlive();
            for (var i = 0; i < allPeds.length; i++) {
                if (allPeds[i].state === 'attracted') {
                    allPeds[i].state = 'walk';
                    allPeds[i].attractX = null;
                }
            }
        }

        // Ball Lightning: find nearest building target and spawn peds
        var bl = powerups.ballLightning;
        if (bl) {
            // Set target to nearest building door on first frame
            if (bl.phase === 'flying' && bl.targetX === 0 && bl.targetY === CFG.GROUND_Y) {
                var nearestBuilding = null;
                var nearestBDist = Infinity;
                var buildings = city.layers[2]; // foreground layer
                for (var i = 0; i < buildings.length; i++) {
                    var b = buildings[i];
                    var bCenterX = b.x + b.width / 2;
                    var d = Math.abs(bCenterX - bl.x);
                    if (d < nearestBDist) {
                        nearestBDist = d;
                        nearestBuilding = b;
                    }
                }
                if (nearestBuilding) {
                    bl.targetX = nearestBuilding.x + nearestBuilding.width / 2;
                    bl.targetY = CFG.GROUND_Y - 15; // door height
                    bl.buildingX = nearestBuilding.x;
                    bl.buildingW = nearestBuilding.width;
                    bl.buildingH = nearestBuilding.height;
                    bl.buildingY = nearestBuilding.y;
                }
            }
            // When flashing starts, spawn screaming peds from buildings
            // Stacks: 1=1 building, 2=3 buildings, 3=9 buildings (multiplicative)
            if (bl.phase === 'flashing' && !bl.spawned) {
                bl.spawned = true;
                var stacks = bl.stacks || 1;
                var buildingCount = Math.min(Math.pow(stacks, 2), 9);
                var availTypes = waves.getAvailableTypes(waves.waveNumber);
                var buildings = city.layers[2];

                // Find nearby buildings to hit
                var hitBuildings = [];
                var sortedByDist = buildings.slice().sort(function(a, b) {
                    return Math.abs(a.x + a.width/2 - bl.x) - Math.abs(b.x + b.width/2 - bl.x);
                });
                for (var bi = 0; bi < Math.min(buildingCount, sortedByDist.length); bi++) {
                    hitBuildings.push(sortedByDist[bi]);
                }
                // Store for visual flashing in draw code
                bl._hitBuildings = hitBuildings;

                for (var hi = 0; hi < hitBuildings.length; hi++) {
                    var hb = hitBuildings[hi];
                    var doorX = hb.x + hb.width / 2;
                    var spawnCount = 6 + Math.floor(Math.random() * 6);
                    for (var i = 0; i < spawnCount; i++) {
                        var tKey = availTypes[Math.floor(Math.random() * availTypes.length)];
                        var ped = pedManager.spawn(tKey, doorX + (Math.random() - 0.5) * 20);
                        ped.state = 'flee';
                        ped.fleeDir = Math.random() < 0.5 ? -1 : 1;
                        ped.dir = ped.fleeDir;
                        ped.stateTimer = 0;
                    }
                    textPopups.add(doorX, CFG.GROUND_Y - 40, 'GET OUT!', {
                        color: '#ffff00', size: 20, life: 2.0, bold: true,
                    });
                }
                SFX.playScream();
                if (stacks > 1) {
                    textPopups.add(rig.x, rig.y - 30, stacks + 'x BALL LIGHTNING!', {
                        color: '#88ffff', size: 22, life: 2.0, bold: true, vy: -40,
                    });
                }
            }
        }

        // Auto-ozone from Ozone Diffuser treatment aid (free, stacks = more targets)
        var hailAutoCount = powerups.countEffect('ozoneAuto');
        if (hailAutoCount > 0 && hailCooldown <= 0) {
            // Sort peds by distance, target up to hailAutoCount nearest
            var sortedPeds = alivePeds.slice().sort(function(a, b) {
                return Math.abs(a.x - rig.x) - Math.abs(b.x - rig.x);
            });
            var targets = Math.min(hailAutoCount, sortedPeds.length);
            for (var ht = 0; ht < targets; ht++) {
                projectiles.spawnHail(rig.x, rig.y + rig.height * 0.5, sortedPeds[ht].x, sortedPeds[ht].y);
            }
            if (targets > 0) hailCooldown = 0.2;
        }

        // ── Secret combo effects ────────────────────────────────
        var scaledDtObj = { value: scaledDt };
        ComboEffectsSystem.update(dt, game, scaledDtObj);
        scaledDt = scaledDtObj.value;

        treatmentObjectives.update(dt, game);

        // ── Special Event announcements ──────────────────────────
        if (waves._eventAnnouncement) {
            NotificationSystem.showAnnouncement(waves._eventAnnouncement);
            waves._eventAnnouncement = null;
            SFX.playPowerUp();
        }

        // ── Wave mutator announcement ────────────────────────────
        if (waves._mutatorAnnouncement) {
            NotificationSystem.showAnnouncement(waves._mutatorAnnouncement);
            waves._mutatorAnnouncement = null;
        }

        // ── Apply world-level mutator effects ────────────────────
        var mutator = waves.activeMutator;
        if (mutator && mutator.effect === 'permFog' && projectiles.fogZones.length === 0) {
            projectiles.spawnFog(rig.x, CFG.GROUND_Y);
            var lastFog = projectiles.fogZones[projectiles.fogZones.length - 1];
            if (lastFog) { lastFog.radius = 600; lastFog.life = 999; lastFog.maxLife = 999; }
        }
        if (mutator && mutator.effect === 'darkness') {
            city.timeOfDay = 0.5;
        }

        // ── Bounty announcement ──────────────────────────────────
        if (waves._bountyAnnouncement) {
            NotificationSystem.showAnnouncement(waves._bountyAnnouncement);
            waves._bountyAnnouncement = null;
        }

        // ── Spawn bounty target mid-wave ─────────────────────────
        if (waves.activeBounty && !waves.activeBounty.spawned && waves.totalSpawned > 3) {
            waves.activeBounty.spawned = true;
            var bountyTypes = ['vip', 'businessMan', 'tourist', 'jogger'];
            var bType = bountyTypes[Math.floor(Math.random() * bountyTypes.length)];
            var bountyPed = pedManager.spawn(bType, rig.x + (Math.random() - 0.5) * 400);
            bountyPed._isBounty = true;
            bountyPed._bountyName = waves.activeBounty.name;
            bountyPed._bountyPoints = waves.activeBounty.points;
            waves.activeBounty.pedRef = bountyPed;
        }

        // ── Last-kill slow-mo check ─────────────────────────────
        if (slowMoTimer <= 0 && waves.state === 'playing'
            && waves.totalSpawned >= waves.pedestriansToSpawn
            && pedManager.getAlive().length === 0) {
            slowMoTimer = 1.5;
            slowMoScale = 0.15;
        }

        // ── Waves ───────────────────────────────────────────────
        var waveState = waves.update(scaledDt, pedManager, rig);
        if (waveState === 'intermission_start') {
            // Grab wave score BEFORE startIntermission resets it
            // Stop epic music if playing
            if (game._epicMusicPlaying && game._epicMusic) {
                game._epicMusic.pause();
                game._epicMusicPlaying = false;
                Music.start();
            }

            var earnedWaveScore = scoring.waveScore;
            var treatmentReport = treatmentObjectives.completeCycle(game);
            game.treatmentReport = treatmentReport;
            var treatmentBonus = treatmentReport ? treatmentReport.bonusTP : 0;
            track('wave_completed', { wave: waves.waveNumber, waveScore: earnedWaveScore, totalScore: scoring.score, kills: scoring.waveKills });

            waves.startIntermission(scoring);
            // Expression: smug during intermission
            rig.setExpression('smug', 3.0);
            // Refill rig meters
            rig.hp = rig.maxHp;
            rig.chlorineMeter = CFG.CHLORINE.METER_MAX;
            rig.ozoneMeter = CFG.OZONE.METER_MAX;
            rig.uvCharge = CFG.UV_PULSE.CHARGE_TIME;
            rig.backwashCharge = CFG.BACKWASH.CHARGE_TIME;
            rig.coagulantCharge = CFG.COAGULANT.CHARGE_TIME;
            rig.phCharge = CFG.PH_SHOCK.CHARGE_TIME;

            // Award treatment points
            progression.addStormPoints(earnedWaveScore + treatmentBonus);
            progression.updateStats(waves.waveNumber, scoring.waveKills);

            // Check for attack unlocks on next wave
            progression.checkWaveUnlocks(waves.waveNumber + 1);
            NotificationSystem.checkAnnouncements(progression);

            // Save progress
            progression.save();
            SaveSystem.saveRun(game);

            // Maybe spawn powerup
            if (Math.random() < CFG.POWERUP.SPAWN_CHANCE) {
                powerups.spawn(CFG.CITY.WORLD_WIDTH, getAvailablePowerupTypes());
            }

            // Player will choose: next wave or shop (in intermission overlay)
        }

        // ── Intermission player choice ─────────────────────────
        if (waves.state === 'intermission') {
            if (Input.justPressed('Enter') || Input.justPressed('NumpadEnter')) {
                waves.startWave(pedManager);
                treatmentObjectives.startCycle(waves.waveNumber);
                game.treatmentReport = null;
            }
            if (Input.justPressed('KeyS')) {
                gameState = 'shop';
                Music.setTrack('shop');
                return;
            }
        }

        // ── Scoring / Combo ─────────────────────────────────────
        scoring.comboWindowOverride = effComboWindow;
        scoring.update(dt);

        // ── Achievements tracking ──────────────────────────────
        achievements.trackCombo(scoring.combo);
        // Expression: react to combo milestones
        if (scoring.combo >= 20) {
            rig.setExpression('evil', 2.0);
        } else if (scoring.combo >= 5 && scoring.combo < 20 && rig.expressionTimer <= 0) {
            rig.setExpression('happy', 1.0);
        }
        achievements.trackScore(scoring.score);
        achievements.trackWave(waves.waveNumber);
        if (rig.isSleeping) achievements.trackIdle();

        // Show achievement popups
        var ach = achievements.getJustUnlocked();
        if (ach) {
            var achDef = null;
            for (var ai = 0; ai < ACHIEVEMENTS.length; ai++) {
                if (ACHIEVEMENTS[ai].id === ach) { achDef = ACHIEVEMENTS[ai]; break; }
            }
            if (achDef) {
                NotificationSystem.showAnnouncement(achDef.icon + ' ' + achDef.name + '!');
                textPopups.add(CFG.WIDTH / 2, CFG.HEIGHT / 2 + 50, achDef.desc, {
                    color: '#ffdd44', size: 14, life: 3.0, bold: true, vy: -15,
                });
                track('achievement_unlocked', { achievement: achDef.name, wave: waves.waveNumber });
                SFX.playComboChime(3);
            }
        }

        // Update music intensity
        // Don't update procedural music while epic mp3 is playing
        if (!game._epicMusicPlaying) {
            Music.update({
                combo: scoring.combo,
                wave: waves.waveNumber,
                isBoss: waves.isBossWave(),
                isIntermission: waves.state === 'intermission',
                isShop: false,
                isTitle: false,
            });
        }

        // ── BasinEffects ─────────────────────────────────────────────
        basinEffects.update(scaledDt);

        // ── Particles ───────────────────────────────────────────
        particles.update(scaledDt);

        // ── Text Popups ─────────────────────────────────────────
        textPopups.update(dt);

        // ── Camera ──────────────────────────────────────────────
        camera.follow(rig, dt);

        // ── Periodic auto-save (every 10s) ─────────────────────
        autoSaveTimer += dt;
        if (autoSaveTimer >= 10) {
            autoSaveTimer = 0;
            SaveSystem.saveRun(game);
            progression.save();
        }

        // ── Death check ────────────────────────────────────────
        if (rig.isDead()) {
            gameOver();
        }
    }

    // ── Render ──────────────────────────────────────────────────
    function render() {
        // Reset transform and clear at actual canvas resolution
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Scale all drawing to game coordinates (1280x720 → actual pixels)
        ctx.setTransform(gameScale, 0, 0, gameScale, 0, 0);

        if (gameState === 'title' || gameState === 'howtoplay') {
            city.draw(ctx, camera);
            basinEffects.draw(ctx);
        }

        if (gameState === 'playing' || gameState === 'paused' || gameState === 'gameover') {
            city.draw(ctx, camera);

            // Aurora borealis sky effect
            if (powerups.hasEffect('aurora')) {
                ctx.save();
                var aTime = performance.now() * 0.001;
                for (var ai = 0; ai < 5; ai++) {
                    var ax = CFG.WIDTH * (0.1 + ai * 0.2) + Math.sin(aTime * 0.5 + ai) * 60;
                    var aColors = ['rgba(0,255,100,', 'rgba(100,0,255,', 'rgba(0,200,255,', 'rgba(255,0,200,', 'rgba(100,255,0,'];
                    var aAlpha = 0.12 + Math.sin(aTime * 2 + ai * 1.3) * 0.06;
                    var grad = ctx.createLinearGradient(ax, 0, ax, 250);
                    grad.addColorStop(0, aColors[ai % aColors.length] + aAlpha + ')');
                    grad.addColorStop(0.5, aColors[(ai + 1) % aColors.length] + (aAlpha * 0.6) + ')');
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = grad;
                    ctx.fillRect(ax - 80, 0, 160, 250);
                }
                ctx.restore();
            }

            camera.applyTransform(ctx);
            basinEffects.draw(ctx);
            pedManager.draw(ctx);
            projectiles.draw(ctx);
            rig.draw(ctx);
            particles.draw(ctx);
            textPopups.draw(ctx);
            camera.restore(ctx);

            // Powerups (world space)
            ctx.save();
            ctx.translate(-camera.x + camera.offsetX, -camera.y + camera.offsetY);
            powerups.draw(ctx);
            ctx.restore();

            // HUD (screen space)
            HUD.draw(ctx, game);

            // Off-screen indicators for bosses and bounties
            var indicatorPeds = pedManager.getAlive();
            for (var oi = 0; oi < indicatorPeds.length; oi++) {
                var op = indicatorPeds[oi];
                if (!op._isBoss && !op._isBounty) continue;
                if (!op.alive) continue;
                var screenX = op.x - camera.x + camera.offsetX;
                if (screenX >= 0 && screenX <= CFG.WIDTH) continue; // on screen, skip

                var arrowX = screenX < 0 ? 20 : CFG.WIDTH - 20;
                var arrowY = Math.min(CFG.HEIGHT - 100, Math.max(60, op.type.floats ? 150 : CFG.GROUND_Y - 50));
                var arrowColor = op._isBounty ? '#ffdd00' : '#ff4444';
                var arrowLabel = op._isBounty ? (op._bountyName || 'BOUNTY') : (op.type.name || 'BOSS');

                // Arrow triangle
                ctx.fillStyle = arrowColor;
                ctx.beginPath();
                if (screenX < 0) {
                    ctx.moveTo(arrowX - 8, arrowY);
                    ctx.lineTo(arrowX + 4, arrowY - 6);
                    ctx.lineTo(arrowX + 4, arrowY + 6);
                } else {
                    ctx.moveTo(arrowX + 8, arrowY);
                    ctx.lineTo(arrowX - 4, arrowY - 6);
                    ctx.lineTo(arrowX - 4, arrowY + 6);
                }
                ctx.fill();
                // Label
                ctx.font = 'bold 9px "Courier New", monospace';
                ctx.textAlign = screenX < 0 ? 'left' : 'right';
                ctx.textBaseline = 'middle';
                ctx.fillText(arrowLabel, screenX < 0 ? arrowX + 8 : arrowX - 8, arrowY + 3);
            }

            // Slow-mo vignette and "WAVE CLEAR" text
            if (slowMoTimer > 0 && waves.state !== 'intermission') {
                ctx.save();
                // Vignette (dark corners)
                var vigAlpha = Math.min(0.6, slowMoTimer / 0.3);
                var vigGrad = ctx.createRadialGradient(
                    CFG.WIDTH / 2, CFG.HEIGHT / 2, CFG.HEIGHT * 0.3,
                    CFG.WIDTH / 2, CFG.HEIGHT / 2, CFG.HEIGHT * 0.9
                );
                vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
                vigGrad.addColorStop(1, 'rgba(0,0,0,' + vigAlpha + ')');
                ctx.fillStyle = vigGrad;
                ctx.fillRect(0, 0, CFG.WIDTH, CFG.HEIGHT);

                // "WAVE CLEAR" text
                var textAlpha = Math.min(1, slowMoTimer / 0.5);
                var textPulse = 1 + Math.sin(performance.now() * 0.005) * 0.05;
                ctx.globalAlpha = textAlpha;
                ctx.save();
                ctx.translate(CFG.WIDTH / 2, CFG.HEIGHT / 2);
                ctx.scale(textPulse, textPulse);
                ctx.font = 'bold 56px "Courier New", monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#000';
                ctx.fillText('WAVE CLEAR', 2, 2);
                ctx.fillStyle = '#44ff88';
                ctx.fillText('WAVE CLEAR', 0, 0);
                ctx.restore();
                ctx.globalAlpha = 1;
                ctx.restore();
            }
        }

        // Blizzard visual overlay
        if (gameState === 'playing' && powerups.hasEffect('blizzard')) {
            ctx.fillStyle = 'rgba(200,220,255,0.08)';
            ctx.fillRect(0, 0, CFG.WIDTH, CFG.HEIGHT);
            // Snowflake particles
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            for (var si = 0; si < 15; si++) {
                var sx = (performance.now() * 0.02 * (si + 1) + si * 137) % CFG.WIDTH;
                var sy = (performance.now() * 0.04 * (si * 0.5 + 1) + si * 89) % CFG.HEIGHT;
                ctx.beginPath();
                ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Secret combo visuals
        ComboEffectsSystem.draw(ctx, game);

        // Menu overlays
        if (gameState === 'title') {
            menu.drawTitle(ctx, scoring);
        } else if (gameState === 'paused') {
            menu.drawPause(ctx);
        } else if (gameState === 'gameover') {
            menu.drawGameOver(ctx, scoring);
        } else if (gameState === 'howtoplay') {
            menu.drawHowToPlay(ctx);
        } else if (gameState === 'achievements') {
            menu.drawAchievements(ctx);
        } else if (gameState === 'shop') {
            menu.drawShop(ctx, progression);
        }

        // Intermission overlay
        if (gameState === 'playing' && waves.state === 'intermission') {
            HUD.drawIntermission(ctx, game);
        }

        // Announcement overlay (attack unlocks, etc.)
        if (NotificationSystem.announcementTimer > 0 && !(gameState === 'playing' && waves.state === 'intermission')) {
            var aAlpha = Math.min(1, NotificationSystem.announcementTimer / 0.5);
            ctx.save();
            ctx.globalAlpha = aAlpha;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, CFG.HEIGHT / 2 - 40, CFG.WIDTH, 80);
            ctx.font = 'bold 28px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#000';
            ctx.fillText(NotificationSystem.announcementText, CFG.WIDTH / 2 + 1, CFG.HEIGHT / 2 + 1);
            ctx.fillStyle = '#ffcc00';
            ctx.fillText(NotificationSystem.announcementText, CFG.WIDTH / 2, CFG.HEIGHT / 2);
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        // Wind indicator (when strong)
        if (Math.abs(windSpeed) > 10) {
            ctx.save();
            ctx.globalAlpha = Math.min(0.5, Math.abs(windSpeed) / 80);
            ctx.font = '12px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#aaaaaa';
            var windDir = windSpeed > 0 ? '>>>' : '<<<';
            ctx.fillText('WIND ' + windDir, CFG.WIDTH / 2, CFG.HEIGHT - 10);
            ctx.globalAlpha = 1;
            ctx.restore();
        }
    }

    // ── Game Loop ───────────────────────────────────────────────
    var loopErrorCount = 0;
    var lastLoopErrorLogAt = 0;

    function reportLoopError(err) {
        loopErrorCount++;
        game.lastLoopError = {
            count: loopErrorCount,
            message: err && err.message ? err.message : String(err),
        };

        var now = performance.now();
        if (now - lastLoopErrorLogAt > 2000) {
            lastLoopErrorLogAt = now;
            console.error('Recovered from game loop error:', err);
        }
    }

    function loop(timestamp) {
        var dt = (timestamp - lastTime) / 1000;
        lastTime = timestamp;

        if (dt > 0.5) dt = 0.016;

        try {
            update(dt);
            render();
        } catch (err) {
            reportLoopError(err);
        } finally {
            try {
                Input.endFrame();
            } catch (err) {
                reportLoopError(err);
            }
            requestAnimationFrame(loop);
        }
    }

    lastTime = performance.now();
    requestAnimationFrame(loop);

    document.addEventListener('click', ensureAudio, { once: false });
    document.addEventListener('keydown', ensureAudio, { once: false });

    // ── Debug console API ───────────────────────────────────────
    // Usage from browser DevTools: debug.combo('ragnarok')
    window.debug = {
        combo: function(name) {
            var effects = {
                ragnarok: [{e:'aurora',d:8},{e:'aurora',d:8},{e:'rainbow',d:12}],
                iceage:   [{e:'blizzard',d:8},{e:'blizzard',d:8},{e:'blizzard',d:8}],
                kaiju:    [{e:'rage',d:15},{e:'rage',d:15},{e:'growth',d:15}],
                timestop: [{e:'slowMo',d:5},{e:'slowMo',d:5},{e:'slowMo',d:5}],
                emp:      [{e:'ballLightning',d:10},{e:'ballLightning',d:10},{e:'chainLightning',d:10}],
                surge:    [{e:'chlorineBoost',d:12},{e:'chlorineBoost',d:12},{e:'chlorineBoost',d:12}],
                chain:    [{e:'ballLightning',d:5},{e:'ballLightning',d:5},{e:'ballLightning',d:5}],
                dblrainbow: [{e:'rainbow',d:15},{e:'rainbow',d:15}],
                toxic:    [{e:'breakpointChlorine',d:10},{e:'breakpointChlorine',d:10},{e:'breakpointChlorine',d:10}],
                tesla:    [{e:'chainLightning',d:8},{e:'chainLightning',d:8},{e:'chainLightning',d:8}],
            };
            var fx = effects[name];
            if (!fx) { console.log('Combos: ' + Object.keys(effects).join(', ')); return; }
            powerups.secretCombo = null;
            for (var i = 0; i < fx.length; i++) {
                powerups.activeEffects.push({effect:fx[i].e, remaining:fx[i].d, name:fx[i].e, color:'#fff'});
            }
            powerups._checkSecretCombos(rig);
            console.log('Triggered: ' + name);
        },
        wave: function(n) {
            waves.waveNumber = n - 1;
            pedManager.clear();
            waves.startWave(pedManager);
            treatmentObjectives.startCycle(waves.waveNumber);
            game.treatmentReport = null;
            console.log('Jumped to wave ' + n);
        },
        objective: function() {
            console.log(treatmentObjectives.getStatus());
            return treatmentObjectives.getStatus();
        },
        sp: function(n) { progression.treatmentPoints += (n||100); console.log('Added ' + (n||100) + ' SP'); },
        hp: function(n) { rig.hp = Math.min(rig.maxHp, rig.hp + (n||50)); console.log('Healed ' + (n||50)); },
        kill: function() { var a=pedManager.getAlive(); for(var i=0;i<a.length;i++) a[i].takeDamage(999,'uv'); console.log('Killed ' + a.length); },
        help: function() { console.log('debug.combo(name) - trigger combo: ragnarok/iceage/kaiju/timestop/emp/surge\ndebug.wave(n) - jump to wave\ndebug.objective() - inspect treatment objective\ndebug.sp(n) - add treatment points\ndebug.hp(n) - heal operator\ndebug.kill() - kill all peds'); },
    };

})();
