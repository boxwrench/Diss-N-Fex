// ── Pedestrian Behavior System ──────────────────────────────────────
// Per-pedestrian special behaviors (flee, chatter, conversations, police
// chase, military fire, scientist shields, boss heal/clear, bodyguard, etc.)
// Extracted from main.js update() loop. Mutates pedestrian objects only;
// returns nothing. All frame context is passed in via ctx.
//
// Globals used directly: CFG, PED_CHATTER, PED_CONVERSATIONS, POLICE_SHOUTS,
// PEOPLE_TYPES, Math, performance.

var PedestrianBehaviorSystem = {
    update: function (ctx) {
        var rig          = ctx.rig;
        var scaledDt     = ctx.scaledDt;
        var alivePeds    = ctx.alivePeds;
        var projectiles  = ctx.projectiles;
        var textPopups   = ctx.textPopups;
        var camera       = ctx.camera;
        var basinEffects = ctx.basinEffects;
        var powerups     = ctx.powerups;
        var pedManager   = ctx.pedManager;
        var particles    = ctx.particles;
        var hasAcidRain  = ctx.hasAcidRain;
        var hasBlizzard  = ctx.hasBlizzard;
        var hasAurora    = ctx.hasAurora;

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
                            // Child in chlorine says happy things
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
                    // Protect nearby peds from chlorine
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
                        projectiles.uvBolts.length > 0 || projectiles.backwashes.length > 0 ||
                        projectiles.coagulantCones.length > 0 || projectiles.phZones.length > 0;
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

            // Anti-OperatorRig boss: clears pH shock and coagulant in its radius
            if (ped.type.clearsEffects && ped.alive) {
                // Clear pH shock zones near the anti-rig
                for (var fi = projectiles.phZones.length - 1; fi >= 0; fi--) {
                    if (Math.abs(projectiles.phZones[fi].x - ped.x) < ped.type.healRadius) {
                        projectiles.phZones.splice(fi, 1);
                    }
                }
                // Unfreeze nearby peds (counter the player's coagulant)
                for (var ui = 0; ui < alivePeds.length; ui++) {
                    if (Math.abs(alivePeds[ui].x - ped.x) < ped.type.healRadius && alivePeds[ui]._frozen) {
                        alivePeds[ui]._frozen = false;
                        alivePeds[ui]._frozenTimer = 0;
                    }
                }
            }

            // Normal flee from chlorine (skip bosses that float)
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
    }
};
