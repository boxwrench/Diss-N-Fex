// ── Pedestrian & Manager ────────────────────────────────────────
// Depends on globals: CFG, PEOPLE_TYPES

var FROST_COMPLAINTS = ["I'm coagulating!", "C-clumping up!", "Can't swim... flocculating!", "System clogged!", "Membrane clumping!", "Help, my cells are clumping!"];

var FOG_COMPLAINTS = ["pH level is critically low!", "Acidic shock!", "My membrane is dissolving!", "Too acidic!", "pH out of safe range!", "Help, pH shock!"];

var POLICE_SHOUTS = ["Warning: Disinfectant detected!", "Activate drug-resistance genes!", "Flee the Sanitizer!", "Bio-shield breached!", "Membrane damage imminent!", "Pathogens, take cover!"];

var AURORA_COMPLAINTS = ["Radiation damage!", "The glowing water is a trap!", "My cellular DNA is mutating!", "So bright... so toxic!", "UV radiation overload!"];

var PED_CHATTER = {
    tourist: {
        walk: ["Just wiggling along...", "Look at that sugar molecule!", "Time to replicate!", "Fascinating environment!", "Binary fission timer counting down!"],
        flee: ["My membrane is leaking!", "Sanitization imminent!", "Lysis incoming!"],
        hit: ["Ah, my cytoplasm!", "My cell wall!"]
    },
    child: {
        walk: ["Wiggle wiggle!", "I want to divide!", "Nutrients, yay!"],
        rainHappy: ["Organic matter!", "Replication speed 2x!", "Dividing! Whee!"],
        flee: ["SCARY OXIDIZER!", "Apoptosis!"]
    },
    vip: {
        walk: ["I am drug-resistant!", "MRSA rules this tank!", "None can kill me!", "Plaque champion!"],
        flee: ["My outer membrane is breaking!", "Not the UV light!", "I'm lysing!", "Call the mutation response!"],
        hit: ["How DARE you!", "I am the Superbug King!"]
    },
    oldLady: {
        walk: ["Back in my day, we were in a spore state...", "Such nice warm broth...", "Where did my plasmid go?"],
        flee: ["Oh my ribosome!", "Help! Lysis!", "My protein coat is denaturing!"],
        hit: ["Was that really necessary?", "You horrible chemicals!", "My DNA is mutating!"]
    },
    jogger: {
        walk: ["Swim swim swim!", "Look at that flagella go!", "Ribosomes pumping!"],
        flee: ["Sprinting out of the UV zone!", "Aerotaxis activated!", "Swim faster!"]
    },
    streetPerformer: {
        walk: ["Replicating capsids...", "Host found!", "For my next division..."],
        hit: ["My capsid!", "Tough host!", "Not my viral envelope!"]
    },
    weatherReporter: {
        walk: ["Spreading spores...", "Turbidity levels rising...", "As you can see behind me, clean water incoming..."],
        hit: ["Sensor damage!", "This just in: Lysis!", "Don't cut my flagella!"]
    },
    dogWalker: {
        walk: ["Good bud!", "Dividing now!", "Who wants a plasmid?"],
        flee: ["Bud away, buddy!", "Toxin alert!"]
    },
    businessMan: {
        flee: ["My replication cycle!", "Not the membrane!", "I have a division deadline!"],
        hit: ["My nucleotides!"]
    },
    businessWoman: {
        flee: ["My cell division!", "Cancel all replications!", "This is lysing!"]
    },
    military: {
        shoot: ["Target acquired!", "Toxin discharge!", "Engaging sanitizer!", "Toxins free!", "For the colony!"]
    },
    scientist: {
        walk: ["Analyzing resistance...", "Plasmid transfer complete!", "UV is mutagenic!", "Mutating..."],
        hit: ["My nucleotide sequence!", "My mutation history!", "My DNA is scrambled!", "Error in replication!", "NOT my plasmid!", "My codon layout is ruined!"],
        flee: ["SOS: DNA polymerase error!", "DNA helicase is failing!", "Apoptosis!"]
    },
    cyclist: {
        walk: ["Swim swim swim!", "Spiral power!", "Helicobacter moving!"],
        flee: ["TOO SLIPPERY!", "Flagella locked!", "I should have encysted!", "NOT MY CELL WALL!"],
        hit: ["My helical shape!", "My membrane!"]
    }
};

var PED_CONVERSATIONS = [
    ['Nice warm water today!', 'Is it though?'],
    ['Did you hear about the UV light?', "Don't scare me..."],
    ['Love the biofilm we built.', 'Is that... chlorine dripping?'],
    ['Plasmid swap later?', "If we don't lyse!"],
    ['How are the daughter cells?', 'Mutated.'],
    ['Any plans for replication?', 'Staying in the biofilm.'],
    ['I got a capsule shell!', "Won't protect against UV."],
    ['The mutation rates here...', 'Tell me about it!'],
];

var RAINBOW_COMPLAINTS = ["The nutrient broth was a trap!", "Nasty chemical lure!", "Lured to my doom!", "Nutrient bait alert!"];

class Pedestrian {
    constructor(x, y, typeName) {
        this.x = x;
        this.y = y;
        this.typeName = typeName;
        this.type = PEOPLE_TYPES[typeName];
        this.hp = this.type.hp;
        this.maxHp = this.type.hp;
        this.dir = Math.random() < 0.5 ? 1 : -1;
        this.speed = CFG.PED.WALK_SPEED * (this.type.speed || 1);
        this.state = 'walk';
        this.walkFrame = 0;
        this.walkTimer = 0;
        this.stateTimer = 0;
        this.fleeDir = 0;
        this.hasBiofilmShield = typeName === 'biofilmPerson';
        this.deathTimer = 0;
        this.alive = true;
        this.alpha = 1;
        this.tilt = 0;
        this.flashTimer = 0;
        this.skeletonFlash = 0;
    }

    // ── Damage ──────────────────────────────────────────────────

    takeDamage(amount, type) {
        if (!this.alive || this.state === 'dead' || this.state === 'zapped') {
            return { hit: false, killed: false, points: 0 };
        }

        // Scientist shield blocks chlorine damage
        if (this._shielded && type === 'chlorine') {
            return { hit: false, killed: false, points: 0 };
        }

        // Chlorine resistance (acid chlorine bypasses all)
        if (type === 'chlorine' && !this._acidRain) {
            if (this.hasBiofilmShield) {
                return { hit: false, killed: false, points: 0 };
            }
            if (this.type.chlorineResist) {
                amount *= (1 - this.type.chlorineResist);
            }
        }

        // Construction worker hard hat resists ozone
        if (type === 'ozone' && this.type.highHailResist) {
            amount *= 0.4; // 60% ozone damage reduction
        }

        // Track if they were lured/mesmerized
        var wasAttracted = (this.state === 'attracted');
        var wasMesmerized = !!this._mesmerized;

        // pH Shock: peds take 1.5x damage
        if (this._inFog) {
            amount *= CFG.PH_SHOCK.DAMAGE_MULT;
        }
        // Frozen peds take bonus damage
        if (this._frozen) {
            amount *= CFG.COAGULANT.DAMAGE_MULT;
        }
        this.hp -= amount;
        this.flashTimer = 0.1;

        // Pick complaint source
        var complaint = null;
        if (wasAttracted) {
            complaint = RAINBOW_COMPLAINTS[Math.floor(Math.random() * RAINBOW_COMPLAINTS.length)];
        } else if (wasMesmerized) {
            complaint = AURORA_COMPLAINTS[Math.floor(Math.random() * AURORA_COMPLAINTS.length)];
        } else if (this._frozen) {
            complaint = FROST_COMPLAINTS[Math.floor(Math.random() * FROST_COMPLAINTS.length)];
        } else if (this._inFog) {
            complaint = FOG_COMPLAINTS[Math.floor(Math.random() * FOG_COMPLAINTS.length)];
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
            if (type === 'uv') {
                this.state = 'zapped';
                this.stateTimer = 0;
                this.skeletonFlash = 0.6;
            } else {
                this.state = 'dead';
                this.stateTimer = 0;
                this.deathTimer = 1.0;
            }
            // Frozen peds shatter on death from any attack
            if (this._frozen) {
                this._shattered = true;
            }
            var pts = (this.type.points || 10);
            return { hit: true, killed: true, points: pts, complaint: complaint };
        }

        // Brief stun on hit
        if (this.state !== 'stunned') {
            this.state = 'stunned';
            this.stateTimer = 0.3;
        }

        return { hit: true, killed: false, points: 0, complaint: complaint };
    }

    // ── Flee ────────────────────────────────────────────────────

    flee(fromX) {
        if (this.state === 'dead' || this.state === 'zapped') return;
        this.state = 'flee';
        this.fleeDir = this.x < fromX ? -1 : 1;
        this.dir = this.fleeDir;
        this.stateTimer = 0;
    }

    // ── Rainbow attraction ────────────────────────────────────────

    attract(targetX) {
        if (this.state === 'dead' || this.state === 'zapped') return;
        this.state = 'attracted';
        this.attractX = targetX + (Math.random() - 0.5) * 120; // spread around target
        this.dir = this.attractX > this.x ? 1 : -1;
    }

    // ── Dog walker ability ──────────────────────────────────────

    alertNearby(pedestrians) {
        for (var i = 0; i < pedestrians.length; i++) {
            var other = pedestrians[i];
            if (other === this) continue;
            if (!other.alive || other.state === 'dead' || other.state === 'zapped') continue;
            var dx = other.x - this.x;
            if (Math.abs(dx) < 150) {
                other.flee(this.x - this.fleeDir * 50);
            }
        }
    }

    // ── Update ──────────────────────────────────────────────────

    update(dt) {
        // Track time for boss animations
        if (this._time != null) this._time += dt;

        // Boss rotor animation (fast frame toggle)
        if (this._isBoss) {
            this.walkTimer += dt;
            if (this.walkTimer >= 0.05) {
                this.walkTimer -= 0.05;
                this.walkFrame = this.walkFrame === 0 ? 1 : 0;
            }
        }

        // Flash timer
        if (this.flashTimer > 0) this.flashTimer -= dt;

        // Frozen state — can't act. Cold DPS only from coagulant, not aurora/iceage
        if (this._frozenTimer > 0) {
            this._frozenTimer -= dt;
            // Cold damage only if frozen by coagulant (not mesmerized by aurora)
            if (this.alive && CFG.COAGULANT.FREEZE_DPS && !this._mesmerized) {
                this.hp -= CFG.COAGULANT.FREEZE_DPS * dt;
                if (this.hp <= 0) {
                    this.hp = 0;
                    this.alive = false;
                    this.state = 'dead';
                    this.stateTimer = 0;
                    this.deathTimer = 1.0;
                    this._shattered = true; // flag for AoE shatter
                }
            }
            if (this._frozenTimer <= 0) {
                this._frozen = false;
            }
            return; // can't do anything while frozen
        }

        // pH Shock confusion
        if (this._inFog && (this.state === 'walk' || this.state === 'flee')) {
            // Can't flee in pH shock — forced back to confused walking
            if (this.state === 'flee') {
                this.state = 'walk';
            }
            // Random direction changes much more frequently
            if (Math.random() < 0.05) {
                this.dir *= -1;
            }
        }
        // Reset pH shock flag each frame (re-applied by collision check)
        this._inFog = false;

        switch (this.state) {

            case 'walk':
                var moveSpeed = this.speed;
                if (this._blizzardSlow) moveSpeed *= Math.pow(0.3, this._blizzardSlow);
                if (this._inFog) moveSpeed *= CFG.PH_SHOCK.SLOW;
                if (this._inFlood) moveSpeed *= 0.5;

                // Tourist: occasionally stops for photos
                var isPhotoStopping = false;
                if (this.type.stopsForPhotos) {
                    if (!this._photoTimer) this._photoTimer = 3 + Math.random() * 5;
                    this._photoTimer -= dt;
                    if (this._photoTimer <= 0) {
                        this._photoTimer = 4 + Math.random() * 6;
                        this._photoStop = 1.5; // stand still for 1.5s
                    }
                    if (this._photoStop > 0) {
                        this._photoStop -= dt;
                        isPhotoStopping = true;
                    }
                }

                if (!isPhotoStopping) {
                    this.x += this.dir * moveSpeed * dt;
                }

                // Walk animation
                this.walkTimer += dt;
                if (this.walkTimer >= 0.3) {
                    this.walkTimer -= 0.3;
                    this.walkFrame = this.walkFrame === 0 ? 1 : 0;
                }

                // Random direction change
                if (Math.random() < 0.003) {
                    this.dir *= -1;
                }

                // Boundary handling: reverse at world edges
                if (this.x < CFG.PED.SPAWN_MARGIN) {
                    this.x = CFG.PED.SPAWN_MARGIN;
                    this.dir = 1;
                } else if (this.x > CFG.CITY.WORLD_WIDTH - CFG.PED.SPAWN_MARGIN) {
                    this.x = CFG.CITY.WORLD_WIDTH - CFG.PED.SPAWN_MARGIN;
                    this.dir = -1;
                }
                break;

            case 'flee':
                var fleeSpd = CFG.PED.FLEE_SPEED;
                if (this._blizzardSlow) fleeSpd *= Math.pow(0.3, this._blizzardSlow);
                if (this._inFog) fleeSpd *= CFG.PH_SHOCK.SLOW;
                if (this._inFlood) fleeSpd *= 0.5;
                this.x += this.fleeDir * fleeSpd * dt;

                // Walk animation (faster)
                this.walkTimer += dt;
                if (this.walkTimer >= 0.15) {
                    this.walkTimer -= 0.15;
                    this.walkFrame = this.walkFrame === 0 ? 1 : 0;
                }

                this.stateTimer += dt;

                // Return to walk after leaving threat range
                if (this.stateTimer > 2.0) {
                    this.state = 'walk';
                    this.stateTimer = 0;
                }

                // Boundary wrap while fleeing
                if (this.x < -50) {
                    this.x = CFG.CITY.WORLD_WIDTH + 50;
                } else if (this.x > CFG.CITY.WORLD_WIDTH + 50) {
                    this.x = -50;
                }
                break;

            case 'attracted':
                // Walk toward attractX at normal speed, looking happy
                if (this.attractX != null) {
                    var toTarget = this.attractX - this.x;
                    this.dir = toTarget > 0 ? 1 : -1;
                    this.x += this.dir * this.speed * 1.3 * dt;
                    // Walk animation
                    this.walkTimer += dt;
                    if (this.walkTimer >= 0.25) {
                        this.walkTimer -= 0.25;
                        this.walkFrame = this.walkFrame === 0 ? 1 : 0;
                    }
                    // Stop near target
                    if (Math.abs(toTarget) < 20) {
                        this.state = 'walk';
                        this.attractX = null;
                    }
                } else {
                    this.state = 'walk';
                }
                break;

            case 'stunned':
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) {
                    this.state = 'walk';
                    this.stateTimer = 0;
                }
                break;

            case 'dead':
                this.stateTimer += dt;
                // Tilt over
                this.tilt = Math.min(Math.PI / 2, this.stateTimer * 5);
                // Fade out
                this.alpha = Math.max(0, 1 - this.stateTimer / this.deathTimer);
                break;

            case 'zapped':
                this.stateTimer += dt;
                this.skeletonFlash -= dt;
                // Quick flash then fade
                if (this.stateTimer < 0.3) {
                    this.alpha = (Math.sin(this.stateTimer * 40) > 0) ? 1 : 0.3;
                } else {
                    this.alpha = Math.max(0, 1 - (this.stateTimer - 0.3) / 0.7);
                }
                break;
        }
    }

    // ── Rendering ───────────────────────────────────────────────

    draw(ctx) {
        if (this.alpha <= 0) return;

        ctx.save();
        // Bosses that float draw elevated above ground
        var drawY = this.y;
        if (this.type.floats && this._isBoss) {
            var floatBob = Math.sin((this._time || 0) * 1.5) * 5;
            drawY = this.y - 200 + floatBob; // draw 200px above their collision y
        }
        ctx.translate(this.x, drawY);

        // Death tilt
        if (this.state === 'dead') {
            ctx.rotate(this.tilt * this.dir);
        }

        // Flip for facing direction
        ctx.scale(this.dir, 1);

        ctx.globalAlpha = this.alpha;

        // Stunned flash
        if (this.state === 'stunned' || this.flashTimer > 0) {
            ctx.globalAlpha = this.alpha * (0.5 + 0.5 * Math.sin(performance.now() * 0.03));
        }

        // Zapped skeleton effect
        if (this.state === 'zapped' && this.skeletonFlash > 0) {
            this._drawSkeleton(ctx);
        } else if (this.type.draw) {
            // Call the type's custom draw function
            this.type.draw(ctx, this);
        } else {
            // Fallback generic pedestrian
            this._drawGeneric(ctx);
        }

        // Frozen visual overlay
        if (this._frozen || this._frozenTimer > 0) {
            // Blue tint over the character
            ctx.save();
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = 'rgba(100,180,255,0.5)';
            var fh = CFG.PED.HEIGHT;
            ctx.fillRect(-8, -fh - 8, 16, fh + 12);

            // Ice crystal shapes around them
            ctx.globalAlpha = 0.7;
            ctx.strokeStyle = '#aaddff';
            ctx.lineWidth = 1.5;
            var crystals = [
                { cx: -10, cy: -fh * 0.5, s: 4 },
                { cx: 10, cy: -fh * 0.3, s: 3 },
                { cx: -7, cy: -fh * 0.8, s: 3.5 },
                { cx: 8, cy: -fh * 0.7, s: 2.5 },
            ];
            for (var ic = 0; ic < crystals.length; ic++) {
                var cr = crystals[ic];
                // Draw a small 6-pointed star (ice crystal)
                ctx.beginPath();
                for (var ray = 0; ray < 6; ray++) {
                    var angle = ray * Math.PI / 3;
                    ctx.moveTo(cr.cx, cr.cy);
                    ctx.lineTo(cr.cx + Math.cos(angle) * cr.s, cr.cy + Math.sin(angle) * cr.s);
                }
                ctx.stroke();
            }
            ctx.restore();
        }

        // Shield dome visual (scientist protecting nearby peds)
        if (this._shieldTimer > 0 && this.type.deploysShield) {
            ctx.strokeStyle = 'rgba(100,200,255,0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, -CFG.PED.HEIGHT / 2, this._shieldRadius || 60, Math.PI, 0);
            ctx.stroke();
            // Inner glow
            ctx.globalAlpha = 0.08;
            ctx.fillStyle = '#88ccff';
            ctx.beginPath();
            ctx.arc(0, -CFG.PED.HEIGHT / 2, this._shieldRadius || 60, Math.PI, 0);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Shielded indicator (small shield icon above head)
        if (this._shielded && !this.type.deploysShield) {
            ctx.fillStyle = 'rgba(100,200,255,0.5)';
            ctx.beginPath();
            ctx.arc(0, -CFG.PED.HEIGHT - 6, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Bounty target indicator (arrow + name above head)
        if (this._isBounty && this.alive) {
            ctx.save();
            ctx.scale(this.dir, 1); // counter parent dir scale so text stays readable
            ctx.fillStyle = '#ffdd00';
            ctx.beginPath();
            ctx.moveTo(0, -CFG.PED.HEIGHT - 20);
            ctx.lineTo(-5, -CFG.PED.HEIGHT - 12);
            ctx.lineTo(5, -CFG.PED.HEIGHT - 12);
            ctx.closePath();
            ctx.fill();
            ctx.font = 'bold 8px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(this._bountyName || 'BOUNTY', 0, -CFG.PED.HEIGHT - 22);
            ctx.restore();
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    }

    _drawGeneric(ctx) {
        var h = CFG.PED.HEIGHT;
        // Body
        ctx.fillStyle = this.type.color || '#888888';
        ctx.fillRect(-5, -h, 10, h - 4);
        // Head
        ctx.fillStyle = this.type.skinColor || '#ffcc99';
        ctx.beginPath();
        ctx.arc(0, -h - 4, 5, 0, Math.PI * 2);
        ctx.fill();
        // Legs
        var legOffset = this.walkFrame === 0 ? 3 : -3;
        ctx.strokeStyle = this.type.color || '#888888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-2, 0);
        ctx.lineTo(-2 + legOffset, 4);
        ctx.moveTo(2, 0);
        ctx.lineTo(2 - legOffset, 4);
        ctx.stroke();
    }

    _drawSkeleton(ctx) {
        var h = CFG.PED.HEIGHT;
        // Bright yellow-white skeleton silhouette
        ctx.strokeStyle = '#ffffaa';
        ctx.fillStyle = '#ffffaa';
        ctx.lineWidth = 2;

        // Skull
        ctx.beginPath();
        ctx.arc(0, -h - 4, 5, 0, Math.PI * 2);
        ctx.fill();
        // Eye sockets
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(-2, -h - 5, 1.2, 0, Math.PI * 2);
        ctx.arc(2, -h - 5, 1.2, 0, Math.PI * 2);
        ctx.fill();
        // Spine
        ctx.strokeStyle = '#ffffaa';
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(0, -4);
        ctx.stroke();
        // Ribs
        for (var rib = 0; rib < 3; rib++) {
            var ry = -h + 4 + rib * 5;
            ctx.beginPath();
            ctx.moveTo(-5, ry);
            ctx.quadraticCurveTo(0, ry + 2, 5, ry);
            ctx.stroke();
        }
        // Legs
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(-4, 4);
        ctx.moveTo(0, -4);
        ctx.lineTo(4, 4);
        ctx.stroke();
    }

    // ── Helpers ──────────────────────────────────────────────────

    isRemovable() {
        if (this.state === 'dead') return this.stateTimer >= this.deathTimer;
        if (this.state === 'zapped') return this.stateTimer >= 1.0;
        return false;
    }

    getCenter() {
        return { x: this.x, y: this.y - CFG.PED.HEIGHT / 2 };
    }

    getBounds() {
        return {
            x: this.x - 8,
            y: this.y - CFG.PED.HEIGHT,
            w: 16,
            h: CFG.PED.HEIGHT + 4,
        };
    }
}


// ── Pedestrian Manager ──────────────────────────────────────────

class PedestrianManager {
    constructor() {
        this.pedestrians = [];
        this._drawBuffer = [];   // reused each frame for painter-order sort
    }

    spawn(typeName, x) {
        var ped = new Pedestrian(x, CFG.GROUND_Y, typeName);
        this.pedestrians.push(ped);
        return ped;
    }

    spawnGroup(count, availableTypes, worldWidth) {
        if (!availableTypes || availableTypes.length === 0) return;

        var margin = CFG.PED.SPAWN_MARGIN;
        var usable = worldWidth - margin * 2;
        var spacing = usable / (count + 1);

        for (var i = 0; i < count; i++) {
            var typeName = availableTypes[Math.floor(Math.random() * availableTypes.length)];
            // Distribute evenly with some random jitter to avoid bunching
            var baseX = margin + spacing * (i + 1);
            var jitter = (Math.random() - 0.5) * spacing * 0.6;
            var x = Math.max(margin, Math.min(worldWidth - margin, baseX + jitter));
            this.spawn(typeName, x);
        }
    }

    update(dt) {
        for (var i = this.pedestrians.length - 1; i >= 0; i--) {
            var ped = this.pedestrians[i];
            ped.update(dt);

            // Remove fully dead pedestrians
            if (ped.isRemovable()) {
                this.pedestrians.splice(i, 1);
                continue;
            }

            // Dog walker: alert nearby peds when fleeing
            if (ped.typeName === 'dogWalker' && ped.state === 'flee') {
                ped.alertNearby(this.pedestrians);
            }
        }
    }

    draw(ctx) {
        // Painter's order: sort by y so peds closer to bottom draw on top.
        // Reuse a persistent buffer + hoisted comparator to avoid per-frame
        // array + closure allocations.
        var buf = this._drawBuffer;
        buf.length = 0;
        for (var k = 0; k < this.pedestrians.length; k++) {
            if (this.pedestrians[k].alive) buf.push(this.pedestrians[k]);
        }
        buf.sort(PedestrianManager._byY);
        for (var i = 0; i < buf.length; i++) {
            buf[i].draw(ctx);
        }
        // Also draw dead/zapped ones underneath
        for (var j = 0; j < this.pedestrians.length; j++) {
            var p = this.pedestrians[j];
            if (p.state === 'dead' || p.state === 'zapped') {
                p.draw(ctx);
            }
        }
    }

    getAlive() {
        var result = [];
        for (var i = 0; i < this.pedestrians.length; i++) {
            if (this.pedestrians[i].alive) {
                result.push(this.pedestrians[i]);
            }
        }
        return result;
    }

    spawnBoss(waveNumber) {
        var bossKey = null;
        if (waveNumber >= 25 && PEOPLE_TYPES.bossAntiCloud) bossKey = 'bossAntiCloud';
        else if (waveNumber >= 15 && PEOPLE_TYPES.bossSun)       bossKey = 'bossSun';
        else if (waveNumber >= 10 && PEOPLE_TYPES.bossBalloon) bossKey = 'bossBalloon';
        else if (waveNumber >= 5 && PEOPLE_TYPES.bossHelicopter) bossKey = 'bossHelicopter';

        if (!bossKey) return null;

        // Spawn boss at center of world
        var boss = this.spawn(bossKey, CFG.CITY.WORLD_WIDTH / 2);
        // Bosses stay at ground level so attacks can hit them
        // Their draw functions render them visually elevated
        boss._isBoss = true;
        boss._time = 0;
        return boss;
    }

    clear() {
        this.pedestrians.length = 0;
    }
}

// Hoisted comparator for painter-order draw sort (avoids per-frame closures).
PedestrianManager._byY = function (a, b) { return a.y - b.y; };
