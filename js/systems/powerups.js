// -- Power-Up System -----------------------------------------------------
// Falling collectibles and timed active effects.
// Depends on global CFG.

var POWERUP_TYPES = [
    { name: 'Chlorine Residual', color: '#0066ff', effect: 'chlorineBoost',      duration: 10, minWave: 1,
      drawIcon: function(ctx, r) { // 3 chlorine drops
        ctx.strokeStyle = '#88bbff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-3,-r*0.5); ctx.lineTo(-3,r*0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(3,-r*0.3);  ctx.lineTo(3,r*0.5);  ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-1,-r*0.1); ctx.lineTo(-1,r*0.6); ctx.stroke();
      }},
    { name: 'Ozone Diffuser',    color: '#4488aa', effect: 'ozoneAuto',       duration: 10, minWave: 3,
      drawIcon: function(ctx, r) { // 3 ice chunks (squares)
        ctx.fillStyle = '#cceeFF'; ctx.fillRect(-r*0.4,-r*0.4,r*0.35,r*0.35);
        ctx.fillRect(r*0.05,-r*0.1,r*0.35,r*0.35);
        ctx.fillRect(-r*0.15,r*0.15,r*0.35,r*0.35);
      }},
    { name: 'UV Lamp Bank',    color: '#ffdd00', effect: 'chainLightning', duration: 12, minWave: 6,
      drawIcon: function(ctx, r) { // zigzag bolt
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(0,-r*0.6); ctx.lineTo(-r*0.25,-r*0.1);
        ctx.lineTo(r*0.15,-r*0.1); ctx.lineTo(-r*0.1,r*0.6); ctx.stroke();
      }},
    { name: 'Operator Lift', color: '#22bb22', effect: 'growth',         duration: 15, minWave: 2,
      drawIcon: function(ctx, r) { // upward arrow
        ctx.strokeStyle = '#88ff88'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(0,r*0.5); ctx.lineTo(0,-r*0.4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-r*0.3,-r*0.1); ctx.lineTo(0,-r*0.5); ctx.lineTo(r*0.3,-r*0.1); ctx.stroke();
      }},
    { name: 'Contact Basin Hold', color: '#cc44ff', effect: 'slowMo',         duration: 8, minWave: 4,
      drawIcon: function(ctx, r) { // clock hands
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0,0,r*0.45,0,Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-r*0.35); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(r*0.25,r*0.1); ctx.stroke();
      }},
    { name: 'Oxidant Dose Boost',  color: '#dd0000', effect: 'rage',           duration: 12, minWave: 5,
      drawIcon: function(ctx, r) { // angry star/explosion
        ctx.fillStyle = '#ff4444';
        for (var i = 0; i < 6; i++) {
          var a = i * Math.PI / 3 - Math.PI/2;
          ctx.beginPath(); ctx.moveTo(0,0);
          ctx.lineTo(Math.cos(a-0.3)*r*0.3, Math.sin(a-0.3)*r*0.3);
          ctx.lineTo(Math.cos(a)*r*0.55, Math.sin(a)*r*0.55);
          ctx.lineTo(Math.cos(a+0.3)*r*0.3, Math.sin(a+0.3)*r*0.3);
          ctx.fill();
        }
      }},
    { name: 'Tracer Dye',           color: '#ff8800', effect: 'rainbow',        duration: 12, minWave: 2,
      drawIcon: function(ctx, r) { // rainbow arc
        var colors = ['#ff0000','#ff8800','#ffff00','#00cc00','#0044ff','#8800ff'];
        for (var i = 0; i < colors.length; i++) {
          ctx.strokeStyle = colors[i]; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(0, r*0.2, r*(0.5-i*0.05), Math.PI, 0); ctx.stroke();
        }
      }},
    { name: 'Breakpoint Chlorine',    color: '#aacc00', effect: 'breakpointChlorine',       duration: 10, minWave: 4,
      drawIcon: function(ctx, r) { // skull-ish toxic drop
        ctx.fillStyle = '#ddff00';
        ctx.beginPath(); ctx.moveTo(0,-r*0.5); ctx.bezierCurveTo(-r*0.4,0,-r*0.3,r*0.4,0,r*0.5);
        ctx.bezierCurveTo(r*0.3,r*0.4,r*0.4,0,0,-r*0.5); ctx.fill();
        ctx.fillStyle = '#446600'; ctx.fillRect(-r*0.12,-r*0.05,r*0.08,r*0.08);
        ctx.fillRect(r*0.05,-r*0.05,r*0.08,r*0.08);
      }},
    { name: 'Flash Coagulant',       color: '#6688cc', effect: 'blizzard',       duration: 10, minWave: 8,
      drawIcon: function(ctx, r) { // snowflake
        ctx.strokeStyle = '#ccddff'; ctx.lineWidth = 1.5;
        for (var i = 0; i < 6; i++) {
          var a = i * Math.PI / 3;
          ctx.beginPath(); ctx.moveTo(0,0);
          ctx.lineTo(Math.cos(a)*r*0.5, Math.sin(a)*r*0.5); ctx.stroke();
        }
      }},
    { name: 'Jar Test Lamp',        color: '#dd44dd', effect: 'aurora',         duration: 8, minWave: 8,
      drawIcon: function(ctx, r) { // wavy vertical lines
        ctx.lineWidth = 2;
        var cols = ['#44ff88','#8844ff','#ff44aa'];
        for (var i = 0; i < 3; i++) {
          ctx.strokeStyle = cols[i]; ctx.beginPath();
          var x = (i-1)*r*0.3;
          ctx.moveTo(x,-r*0.5); ctx.quadraticCurveTo(x+r*0.2,0,x,r*0.5); ctx.stroke();
        }
      }},
    { name: 'UV Lamp Drone', color: '#44dddd', effect: 'ballLightning', duration: 0, minWave: 6,
      drawIcon: function(ctx, r) { // electric orb with sparks
        ctx.fillStyle = '#88ffff'; ctx.beginPath(); ctx.arc(0,0,r*0.25,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
        for (var i = 0; i < 4; i++) {
          var a = i*Math.PI/2; ctx.beginPath(); ctx.moveTo(Math.cos(a)*r*0.25,Math.sin(a)*r*0.25);
          ctx.lineTo(Math.cos(a)*r*0.5,Math.sin(a+0.3)*r*0.5); ctx.stroke();
        }
      }},
    { name: 'Pump Maintenance',    color: '#ff4488', effect: 'heal',           duration: 0, minWave: 1,
      drawIcon: function(ctx, r) { // heart / cross
        ctx.fillStyle = '#ff88aa';
        ctx.fillRect(-r*0.08,-r*0.35,r*0.16,r*0.7);
        ctx.fillRect(-r*0.35,-r*0.08,r*0.7,r*0.16);
      }},
];

class PowerUpSystem {

    constructor() {
        this.powerups      = [];   // falling pickups on screen
        this.activeEffects = [];   // { name, effect, remaining }
        this.inventory     = [null, null, null, null, null]; // 3 held slots
        this._time         = 0;    // running clock for animations
        this._trails       = [];   // small trail particles behind falling powerups
        this.rainbow       = null; // { x, remaining } when rainbow active
        this.ballLightning = null; // { x, y, targetX, targetY, phase, timer, buildingX, buildingW, buildingH }
    }

    // -- Spawn -----------------------------------------------------------

    spawn(worldWidth, availableTypes) {
        var pool = availableTypes || POWERUP_TYPES;
        var type = pool[Math.floor(Math.random() * pool.length)];
        this.powerups.push({
            x:        Math.random() * (worldWidth || CFG.CITY.WORLD_WIDTH),
            y:        -30,
            type:     type,
            speed:    CFG.POWERUP.FALL_SPEED,
        });
    }

    // -- Collect ---------------------------------------------------------

    collect(powerup, rig, textPopups) {
        // Text popup
        if (textPopups && textPopups.add) {
            textPopups.add(powerup.x, powerup.y, powerup.type.name + '!', {
                color:   powerup.type.color,
                size:    20,
                life:    1.5,
                bold:    true,
            });
        }

        // Try to store in inventory
        var stored = false;
        for (var i = 0; i < this.inventory.length; i++) {
            if (this.inventory[i] === null) {
                this.inventory[i] = { type: powerup.type, collectX: powerup.x };
                stored = true;
                break;
            }
        }

        // If inventory is full, activate immediately
        if (!stored) {
            this._activate(powerup.type, powerup.x, rig);
        }
    }

    /** Activate a power-up from inventory slot (0-2). Returns true if used. */
    activateSlot(slot, rig) {
        if (slot < 0 || slot >= this.inventory.length) return false;
        var item = this.inventory[slot];
        if (!item) return false;
        this.inventory[slot] = null;
        this._activate(item.type, item.collectX, rig);
        return true;
    }

    /** Internal: actually activate a power-up effect. */
    _activate(type, collectX, rig) {
        // Timed effect
        this.activeEffects.push({
            name:      type.name,
            effect:    type.effect,
            remaining: type.duration,
            duration:  type.duration,   // original, for HUD bar scaling
            color:     type.color,
        });

        // Check for secret combos
        this._checkSecretCombos(rig);

        // Rainbow: set anchor at activation position (use rig X for manual activation)
        if (type.effect === 'rainbow') {
            var rx = (rig && rig.x) ? rig.x : collectX;
            this.rainbow = { x: rx, remaining: type.duration, spawned: false };
        }

        // Heal: restore 40 HP instantly
        if (type.effect === 'heal' && rig) {
            rig.hp = Math.min(rig.maxHp, rig.hp + 40);
        }

        // Ball Lightning: start flying from rig to nearest building
        // Multiple stacks = more buildings hit (tracked via _ballLightningStacks)
        if (type.effect === 'ballLightning' && rig) {
            this._ballLightningStacks = (this._ballLightningStacks || 0) + 1;
            if (!this.ballLightning) {
                this.ballLightning = {
                    x: rig.x,
                    y: rig.y + 30,
                    targetX: 0,
                    targetY: CFG.GROUND_Y,
                    phase: 'flying',
                    timer: 0,
                    buildingX: 0,
                    buildingW: 0,
                    buildingH: 0,
                    buildingY: 0,
                    flashTimer: 0,
                    spawned: false,
                    stacks: this._ballLightningStacks,
                };
            } else {
                this.ballLightning.stacks = this._ballLightningStacks;
            }
        }
    }

    _applyInstant(type, rig) {
        // No instant-only effects currently
    }

    // -- Update ----------------------------------------------------------

    update(dt, rig) {
        this._time += dt;

        // Move falling powerups
        for (var i = this.powerups.length - 1; i >= 0; i--) {
            var pu = this.powerups[i];
            pu.y += pu.speed * dt;

            // Spawn trail particle
            if (Math.random() < 0.3) {
                this._trails.push({
                    x:    pu.x + (Math.random() - 0.5) * 6,
                    y:    pu.y,
                    life: 0.4,
                    maxLife: 0.4,
                    color: pu.type.color,
                    size:  2 + Math.random() * 2,
                });
            }

            // Off-screen removal
            if (pu.y > CFG.GROUND_Y + 40) {
                this.powerups.splice(i, 1);
            }
        }

        // Tick active effects
        for (var j = this.activeEffects.length - 1; j >= 0; j--) {
            var eff = this.activeEffects[j];
            eff.remaining -= dt;

            // Apply ongoing effects each frame
            this._applyOngoing(eff, dt, rig);

            if (eff.remaining <= 0) {
                this.activeEffects.splice(j, 1);
            }
        }

        // Tick rainbow
        if (this.rainbow) {
            this.rainbow.remaining -= dt;
            if (this.rainbow.remaining <= 0) {
                this.rainbow = null;
            }
        }

        // Tick secret combo
        if (this.secretCombo) {
            this.secretCombo.timer -= dt;
            if (this.secretCombo.type === 'ragnarok') {
                var sc = this.secretCombo;
                // Thor descends then smites
                if (sc.phase === 'descend') {
                    sc.thorY += 200 * dt;
                    if (sc.thorY >= 150) { sc.phase = 'smite'; sc.smiteTimer = 0; }
                } else if (sc.phase === 'smite') {
                    sc.smiteTimer += dt;
                }
            }
            if (this.secretCombo.timer <= 0) {
                // Stop combo music if playing
                if (this.secretCombo._music) {
                    this.secretCombo._music.pause();
                    this.secretCombo._music = null;
                }
                this.secretCombo = null;
            }
        }

        // Tick ball lightning
        if (this.ballLightning) {
            var bl = this.ballLightning;
            bl.timer += dt;
            if (bl.phase === 'flying') {
                // Fly toward target building door
                var dx = bl.targetX - bl.x;
                var dy = bl.targetY - bl.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 5) {
                    var speed = 400;
                    bl.x += (dx / dist) * speed * dt;
                    bl.y += (dy / dist) * speed * dt;
                    // Trail
                    this._trails.push({
                        x: bl.x + (Math.random() - 0.5) * 8,
                        y: bl.y + (Math.random() - 0.5) * 8,
                        life: 0.3, maxLife: 0.3,
                        color: '#aaffff', size: 3 + Math.random() * 3,
                    });
                } else {
                    bl.phase = 'flashing';
                    bl.timer = 0;
                    bl.flashTimer = 3.0;
                }
            } else if (bl.phase === 'flashing') {
                bl.flashTimer -= dt;
                if (bl.flashTimer <= 0) {
                    bl.phase = 'done';
                }
            } else {
                this.ballLightning = null;
                this._ballLightningStacks = 0;
            }
        }

        // Tick trail particles
        for (var t = this._trails.length - 1; t >= 0; t--) {
            this._trails[t].life -= dt;
            this._trails[t].y    -= 15 * dt; // drift up gently
            if (this._trails[t].life <= 0) {
                this._trails.splice(t, 1);
            }
        }
    }

    _applyOngoing(eff, dt, rig) {
        if (!rig) return;

        switch (eff.effect) {
            case 'chlorineBoost':
                // Unlimited chlorine — keep meter full while active
                if (rig.chlorineMeter != null) {
                    rig.chlorineMeter = CFG.CHLORINE.METER_MAX;
                }
                break;

            case 'chainLightning':
                // Unlimited UV — instant recharge after each strike
                var chargeMax = rig._effectiveUVCharge || CFG.UV_PULSE.CHARGE_TIME;
                rig.uvCharge = chargeMax;
                break;

            case 'growth':
                // Keep growth timer topped up while effect is active
                rig.growthTimer = Math.max(rig.growthTimer, 0.5);
                // Count active growth stacks
                var growthCount = 0;
                for (var gi = 0; gi < this.activeEffects.length; gi++) {
                    if (this.activeEffects[gi].effect === 'growth') growthCount++;
                }
                rig._growthStacks = growthCount;
                break;

            case 'breakpointChlorine':
                // Chlorine ignores resistance and melts umbrellas (handled by main.js checking hasEffect)
                break;

            case 'blizzard':
                // All peds slowed to 30% (handled by main.js checking hasEffect)
                break;

            case 'aurora':
                // All peds mesmerized/frozen in place (handled by main.js checking hasEffect)
                break;
        }
    }

    // -- Draw ------------------------------------------------------------

    draw(ctx) {
        var halfSize = CFG.POWERUP.SIZE / 2;

        // Trail particles
        for (var t = 0; t < this._trails.length; t++) {
            var tr    = this._trails[t];
            var tAlpha = Math.max(0, tr.life / tr.maxLife) * 0.5;
            ctx.globalAlpha = tAlpha;
            ctx.fillStyle   = tr.color;
            ctx.beginPath();
            ctx.arc(tr.x, tr.y, tr.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Falling powerups
        for (var i = 0; i < this.powerups.length; i++) {
            var pu = this.powerups[i];

            // Pulsing radius
            var pulse  = 1 + Math.sin(this._time * 5) * 0.12;
            var radius = halfSize * pulse;

            // Outer glow
            ctx.globalAlpha = 0.25 + Math.sin(this._time * 3) * 0.1;
            ctx.fillStyle   = pu.type.color;
            ctx.beginPath();
            ctx.arc(pu.x, pu.y, radius * 1.6, 0, Math.PI * 2);
            ctx.fill();

            // Main circle
            ctx.globalAlpha = 1;
            ctx.fillStyle   = pu.type.color;
            ctx.beginPath();
            ctx.arc(pu.x, pu.y, radius, 0, Math.PI * 2);
            ctx.fill();

            // White border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth   = 2;
            ctx.stroke();

            // Custom icon inside
            ctx.save();
            ctx.translate(pu.x, pu.y);
            if (pu.type.drawIcon) {
                pu.type.drawIcon(ctx, radius);
            } else {
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold ' + Math.floor(radius * 1.1) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(pu.type.name.charAt(0), 0, 1);
            }
            ctx.restore();
        }

        ctx.globalAlpha = 1;

        // Rainbow arc
        if (this.rainbow) {
            this._drawRainbow(ctx);
        }

        // Ball lightning
        if (this.ballLightning) {
            this._drawBallLightning(ctx);
        }
    }

    _drawRainbow(ctx) {
        var rb = this.rainbow;
        var fade = Math.min(1, rb.remaining / 2); // fade out in last 2s
        var pulse = 1 + Math.sin(this._time * 2) * 0.03;
        var colors = [
            'rgba(255,0,0,',
            'rgba(255,127,0,',
            'rgba(255,255,0,',
            'rgba(0,200,0,',
            'rgba(0,0,255,',
            'rgba(75,0,130,',
            'rgba(148,0,211,'
        ];
        var arcRadius = 160 * pulse;
        var bandWidth = 5;

        for (var i = 0; i < colors.length; i++) {
            var r = arcRadius - i * bandWidth;
            if (r <= 0) break;
            ctx.strokeStyle = colors[i] + (fade * 0.6) + ')';
            ctx.lineWidth = bandWidth + 1;
            ctx.beginPath();
            ctx.arc(rb.x, CFG.GROUND_Y, r, Math.PI, 0);
            ctx.stroke();
        }

        // Shimmer sparkles
        ctx.globalAlpha = fade * 0.8;
        for (var s = 0; s < 5; s++) {
            var angle = Math.PI * (0.1 + Math.random() * 0.8);
            var dist = (arcRadius - 15) * (0.5 + Math.random() * 0.5);
            var sx = rb.x + Math.cos(angle) * dist;
            var sy = CFG.GROUND_Y - Math.sin(angle) * dist;
            var sparkleSize = 2 + Math.sin(this._time * 8 + s) * 1.5;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(sx, sy, Math.max(0, sparkleSize), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    _drawBallLightning(ctx) {
        var bl = this.ballLightning;
        if (!bl) return;

        if (bl.phase === 'flying') {
            // Glowing electric orb
            var pulse = 1 + Math.sin(this._time * 15) * 0.2;
            // Outer glow
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#88ffff';
            ctx.beginPath();
            ctx.arc(bl.x, bl.y, 18 * pulse, 0, Math.PI * 2);
            ctx.fill();
            // Core
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(bl.x, bl.y, 8, 0, Math.PI * 2);
            ctx.fill();
            // Electric arcs around it
            ctx.strokeStyle = '#66eeff';
            ctx.lineWidth = 1.5;
            for (var a = 0; a < 4; a++) {
                var angle = this._time * 8 + a * Math.PI / 2;
                var r = 12 + Math.random() * 6;
                ctx.globalAlpha = 0.5 + Math.random() * 0.3;
                ctx.beginPath();
                ctx.moveTo(bl.x, bl.y);
                ctx.lineTo(bl.x + Math.cos(angle) * r, bl.y + Math.sin(angle) * r);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        if (bl.phase === 'flashing') {
            // Flash windows of ALL hit buildings
            var flashOn = Math.sin(bl.flashTimer * 20) > 0;
            var blds = bl._hitBuildings || [{ x: bl.buildingX, y: bl.buildingY, width: bl.buildingW, height: bl.buildingH }];
            for (var bi = 0; bi < blds.length; bi++) {
                var fb = blds[bi];
                if (flashOn) {
                    ctx.globalAlpha = 0.6;
                    ctx.fillStyle = '#aaeeff';
                    var winW = 8, winH = 8, gap = 4;
                    var cols = Math.floor((fb.width - gap * 2) / (winW + gap));
                    var rows = Math.floor((fb.height - 30) / (winH + gap));
                    for (var row = 0; row < rows; row++) {
                        for (var col = 0; col < cols; col++) {
                            if (Math.random() > 0.4) {
                                var wx = fb.x + gap + col * (winW + gap);
                                var wy = fb.y + 10 + row * (winH + gap);
                                ctx.fillRect(wx, wy, winW, winH);
                            }
                        }
                    }
                    ctx.globalAlpha = 1;
                }
                // Sparks from each door
                if (Math.random() < 0.3) {
                    var doorX = fb.x + fb.width / 2;
                    ctx.fillStyle = '#ffff88';
                    ctx.globalAlpha = 0.7;
                    ctx.beginPath();
                    ctx.arc(doorX + (Math.random() - 0.5) * 10, CFG.GROUND_Y - Math.random() * 5, 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }
            }
        }
    }

    // -- Secret Combos ---------------------------------------------------

    _checkSecretCombos(rig) {
        // Don't trigger if a combo is already active
        if (this.secretCombo) return;
        var c = this.countEffect.bind(this);

        // RAGNARÖK: Aurora x2 + Rainbow
        if (c('aurora') >= 2 && c('rainbow') >= 1) {
            this.secretCombo = {
                name: 'EMERGENCY OVERRIDE',
                type: 'ragnarok',
                timer: 6.0,
                phase: 'descend', // descend → smite → ascend
                thorX: rig ? rig.x : CFG.WIDTH / 2,
                thorY: -100,
                smiteTimer: 0,
                smiteCount: 0,
            };
        }

        // ICE AGE: Blizzard x3
        if (c('blizzard') >= 3) {
            this.secretCombo = {
                name: 'FLASH COAGULATION',
                type: 'iceage',
                timer: 8.0,
            };
        }

        // KAIJU MODE: Rage x2 + Growth
        if (c('rage') >= 2 && c('growth') >= 1) {
            if (rig) {
                rig._growthStacks = 4; // big but not absurd (1.4^4 = ~3.8x size)
                rig.growthTimer = 20;
            }
            this.secretCombo = {
                name: 'PLANT UPSIZE',
                type: 'kaiju',
                timer: 20.0,
                _attackTimer: 0,
            };
        }

        // TIME STOP: Time Warp x3
        if (c('slowMo') >= 3) {
            this.secretCombo = {
                name: 'LONG CONTACT HOLD',
                type: 'timestop',
                timer: 5.0,
            };
        }

        // SUPER BALL UV_PULSE: Ball Lightning x2 + Tesla Coil
        if (c('ballLightning') >= 2 && c('chainLightning') >= 1) {
            this.secretCombo = {
                name: 'MOBILE UV LAMP',
                type: 'emp',
                timer: 10.0,
            };
        }

        // GREAT FLOOD: Storm Surge x3
        if (c('chlorineBoost') >= 3) {
            this.secretCombo = {
                name: 'CLEARWELL SURGE',
                type: 'surge',
                timer: 12.0,
                waterLevel: CFG.GROUND_Y,
            };
        }

        // CHAIN REACTION: Ball Lightning x3
        if (c('ballLightning') >= 3) {
            this.secretCombo = {
                name: 'CONTACT CASCADE',
                type: 'chainReaction',
                timer: 5.0,
                _zapTimer: 0,
                _zapped: {},
            };
        }

        // DOUBLE RAINBOW: Rainbow x2
        if (c('rainbow') >= 2 && c('aurora') < 2) { // avoid triggering Ragnarök
            this.secretCombo = {
                name: 'DOUBLE TRACER STUDY',
                type: 'doubleRainbow',
                timer: 15.0,
                _spawned: false,
            };
        }

        // TOXIC STORM: Acid Rain x3
        if (c('breakpointChlorine') >= 3) {
            this.secretCombo = {
                name: 'BREAKPOINT CHLORINATION',
                type: 'toxicStorm',
                timer: 10.0,
            };
        }

        // TESLA OVERLOAD: Tesla Coil x3
        if (c('chainLightning') >= 3 && c('ballLightning') < 2) { // avoid Super Ball Lightning
            this.secretCombo = {
                name: 'UV OVERDRIVE',
                type: 'teslaOverload',
                timer: 8.0,
                _zapTimer: 0,
            };
        }
    }

    /** Get active secret combo or null. */
    getSecretCombo() {
        return this.secretCombo || null;
    }

    // -- Queries ---------------------------------------------------------

    /** Check if a named effect is currently active. */
    hasEffect(name) {
        for (var i = 0; i < this.activeEffects.length; i++) {
            if (this.activeEffects[i].effect === name) return true;
        }
        return false;
    }

    /** Count how many active effects of a given type. */
    countEffect(name) {
        var count = 0;
        for (var i = 0; i < this.activeEffects.length; i++) {
            if (this.activeEffects[i].effect === name) count++;
        }
        return count;
    }

    /** Time Warp: multiplicative. 1x=0.5, 2x=0.25, 3x=0.125 */
    getTimeScale() {
        var count = this.countEffect('slowMo');
        return count > 0 ? Math.pow(0.5, count) : 1.0;
    }

    /** Rage Mode: multiplicative. 1x=2, 2x=4, 3x=8 */
    getDamageMultiplier() {
        var count = this.countEffect('rage');
        return count > 0 ? Math.pow(2, count) : 1.0;
    }

    /** Returns rainbow data if active, null otherwise. */
    getRainbow() {
        return this.rainbow;
    }

    // -- Cleanup ---------------------------------------------------------

    clear() {
        this.powerups      = [];
        this.activeEffects = [];
        this.inventory     = [null, null, null, null, null];
        this._trails       = [];
        this.rainbow       = null;
        this.ballLightning = null;
        this._ballLightningStacks = 0;
        this.secretCombo   = null;
    }
}
