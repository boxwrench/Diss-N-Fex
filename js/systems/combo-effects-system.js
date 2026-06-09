// ── Secret Combo Effects System for Diss N Fex ──────────────────────────────
// Manages the state, updates, and custom visual overlays for special reactions.

const ComboEffectsSystem = (function () {
    'use strict';

    return {
        update: function (dt, game, scaledDtObj) {
            var combo = game.powerups.getSecretCombo();
            if (!combo) {
                if (game._hadSecretCombo) {
                    game._hadSecretCombo = false;
                    if (!game._epicMusicPlaying) {
                        if (typeof Music !== 'undefined') Music.start();
                    }
                }
                return;
            }

            game._hadSecretCombo = true;

            // Trigger announcement and start music
            if (combo.name && !combo._announced) {
                combo._announced = true;
                if (typeof NotificationSystem !== 'undefined') {
                    NotificationSystem.showAnnouncement(combo.name + '!');
                }
                game.camera.shake(15, 1.0);
                
                // Track secret combo activation
                try {
                    if (window.posthog) {
                        posthog.capture('secret_combo', { combo: combo.name, wave: game.waves.waveNumber });
                    }
                } catch (e) {}

                if (typeof SFX !== 'undefined') {
                    SFX.playLightningStrike();
                }

                // Check achievements
                var comboAchMap = {
                    ragnarok: 'comboRagnarok',
                    iceage: 'comboIceAge',
                    kaiju: 'comboKaiju',
                    flood: 'comboFlood',
                    emp: 'comboEmp',
                    chainReaction: 'comboChain',
                    doubleRainbow: 'comboDblRainbow',
                    toxicStorm: 'comboToxic',
                    teslaOverload: 'comboTesla',
                    timestop: 'comboTimeStop',
                };
                if (game.achievements && comboAchMap[combo.type]) {
                    game.achievements.check(comboAchMap[combo.type]);
                }

                // Ragnarök special music
                if (combo.type === 'ragnarok') {
                    combo._music = null;
                    combo._punchSound = null;
                }
            }

            // Ragnarök Smite Logic
            if (combo.type === 'ragnarok' && combo.phase === 'smite') {
                combo.smiteTimer += dt;
                if (combo.smiteTimer >= 0.4 && combo.smiteCount < 20) {
                    combo.smiteTimer = 0;
                    combo.smiteCount++;
                    var alive = game.pedManager.getAlive();
                    if (alive.length > 0) {
                        var victim = alive[Math.floor(Math.random() * alive.length)];
                        victim.takeDamage(999, 'lightning');
                        game.particles.lightningParticles(victim.x, victim.y - 12);
                        game.camera.shake(5, 0.2);
                        
                        if (typeof SFX !== 'undefined') {
                            SFX.playLightningStrike();
                        }
                        
                        game.scoring.addKill(
                            Math.floor((victim.type ? victim.type.points : 100) * 5),
                            victim.x,
                            victim.y,
                            'lightning',
                            game.textPopups
                        );

                        var smiteTexts = ['SMITED!', 'MJÖLNIR!', 'BY ODIN!', 'VALHALLA!', 'THUNDER!'];
                        if (Math.random() < 0.4) {
                            game.textPopups.add(
                                victim.x,
                                victim.y - 40,
                                smiteTexts[Math.floor(Math.random() * smiteTexts.length)],
                                { color: '#ffdd00', size: 20, life: 1.5, bold: true, vy: -50 }
                            );
                        }
                    }
                }
            }

            // Ice Age: freeze all pathogens
            if (combo.type === 'iceage') {
                var allPedsIce = game.pedManager.getAlive();
                for (var ii = 0; ii < allPedsIce.length; ii++) {
                    allPedsIce[ii]._frozen = true;
                    allPedsIce[ii]._frozenTimer = 1.0;
                }
            }

            // Long Contact Hold: nearly stop pathogens without making the wave look frozen.
            if (combo.type === 'timestop') {
                var allPedsStop = game.pedManager.getAlive();
                for (var ti = 0; ti < allPedsStop.length; ti++) {
                    allPedsStop[ti]._frozen = true;
                    allPedsStop[ti]._frozenTimer = 1.0;
                }
                scaledDtObj.value = Math.min(scaledDtObj.value, dt * 0.08);
            }

            // EMP Ball Lightning: chase nearest germ and zap
            if (combo.type === 'emp') {
                if (!combo._orbX) {
                    combo._orbX = game.cloud.x;
                    combo._orbY = CFG.GROUND_Y - 30;
                    combo._zapTimer = 0;
                }
                var empPeds = game.pedManager.getAlive();
                var empTarget = null;
                var empDist = Infinity;
                for (var ei = 0; ei < empPeds.length; ei++) {
                    var ed = Math.abs(empPeds[ei].x - combo._orbX);
                    if (ed < empDist) {
                        empDist = ed;
                        empTarget = empPeds[ei];
                    }
                }
                if (empTarget) {
                    var edx = empTarget.x - combo._orbX;
                    combo._orbX += (edx > 0 ? 1 : -1) * 250 * dt;
                }
                combo._zapTimer += dt;
                if (combo._zapTimer >= 0.3 && empTarget && empDist < 80) {
                    combo._zapTimer = 0;
                    empTarget.takeDamage(8, 'lightning');
                    game.particles.lightningParticles(empTarget.x, empTarget.y - 12);
                    if (!empTarget.alive) {
                        game.particles.deathPoof(empTarget.x, empTarget.y - 12);
                        game.scoring.addKill(
                            Math.floor((empTarget.type ? empTarget.type.points : 100) * 3),
                            empTarget.x,
                            empTarget.y,
                            'lightning',
                            game.textPopups
                        );
                    }
                    game.camera.shake(2, 0.1);
                }
                // Disable enemy shooters and shields
                for (var ei2 = 0; ei2 < empPeds.length; ei2++) {
                    if (empPeds[ei2].type.shootsBack) empPeds[ei2]._shootTimer = 2.0;
                    if (empPeds[ei2]._shieldDeployed) empPeds[ei2]._shieldTimer = 0;
                }
            }

            // Flooding: Water level rises and drowns pathogens below line
            if (combo.type === 'flood') {
                combo.waterLevel -= 15 * dt;
                var waterY = Math.max(combo.waterLevel, CFG.GROUND_Y - 180);
                var floodPeds = game.pedManager.getAlive();
                for (var fi = 0; fi < floodPeds.length; fi++) {
                    var fp = floodPeds[fi];
                    if (fp.y > waterY) {
                        fp.x += (Math.sin(performance.now() * 0.003 + fi) * 80) * dt;
                        if (!fp._drownTimer) fp._drownTimer = 0;
                        fp._drownTimer += dt;
                        if (fp._drownTimer >= 0.5) {
                            fp._drownTimer = 0;
                            var dr = fp.takeDamage(3, 'rain');
                            if (dr.killed) {
                                game.particles.deathPoof(fp.x, fp.y - 12);
                                game.scoring.addKill(
                                    Math.floor((fp.type ? fp.type.points : 50) * 2),
                                    fp.x,
                                    fp.y,
                                    'rain',
                                    game.textPopups
                                );
                                if (Math.random() < 0.2) {
                                    game.textPopups.add(fp.x, fp.y - 30, 'DROWNED!', {
                                        color: '#4488ff', size: 16, life: 1.5, bold: true, vy: -40
                                    });
                                }
                            }
                        }
                    }
                }
            }

            // Chain Reaction: chains lightning through pathogens one by one
            if (combo.type === 'chainReaction') {
                combo._zapTimer += dt;
                if (combo._zapTimer >= 0.15) {
                    combo._zapTimer = 0;
                    var crPeds = game.pedManager.getAlive();
                    for (var ci = 0; ci < crPeds.length; ci++) {
                        if (!combo._zapped[ci]) {
                            combo._zapped[ci] = true;
                            var cp = crPeds[ci];
                            cp.takeDamage(999, 'lightning');
                            game.particles.lightningParticles(cp.x, cp.y - 12);
                            if (!cp.alive) {
                                game.scoring.addKill(
                                    Math.floor((cp.type ? cp.type.points : 50) * 3),
                                    cp.x,
                                    cp.y,
                                    'lightning',
                                    game.textPopups
                                );
                            }
                            if (ci + 1 < crPeds.length) {
                                combo._chainFrom = { x: cp.x, y: cp.y - 12 };
                                combo._chainTo = { x: crPeds[ci + 1].x, y: crPeds[ci + 1].y - 12 };
                            }
                            break;
                        }
                    }
                }
            }

            // Double Rainbow: lure all pathogens on the screen
            if (combo.type === 'doubleRainbow' && !combo._spawned) {
                combo._spawned = true;
                var allPedsDR = game.pedManager.getAlive();
                for (var dri = 0; dri < allPedsDR.length; dri++) {
                    allPedsDR[dri].attract(game.cloud.x);
                }
                var drTypes = game.waves.getAvailableTypes(game.waves.waveNumber);
                for (var drs = 0; drs < 20; drs++) {
                    var drSide = Math.random() < 0.5 ? -30 : CFG.CITY.WORLD_WIDTH + 30;
                    var drPed = game.pedManager.spawn(drTypes[Math.floor(Math.random() * drTypes.length)], drSide);
                    drPed.attract(game.cloud.x + (Math.random() - 0.5) * 200);
                }
            }

            // Tesla Overload: automatically strike random targets with lightning
            if (combo.type === 'teslaOverload') {
                combo._zapTimer += dt;
                if (combo._zapTimer >= 0.3) {
                    combo._zapTimer = 0;
                    var tlPeds = game.pedManager.getAlive();
                    if (tlPeds.length > 0) {
                        var tlTarget = tlPeds[Math.floor(Math.random() * tlPeds.length)];
                        game.projectiles.spawnLightning(tlTarget.x, game.cloud.y + game.cloud.height * 0.5);
                        tlTarget.takeDamage(CFG.LIGHTNING.DAMAGE, 'lightning');
                        game.particles.lightningParticles(tlTarget.x, tlTarget.y - 12);
                        if (!tlTarget.alive) {
                            game.particles.deathPoof(tlTarget.x, tlTarget.y - 12);
                            game.scoring.addKill(
                                Math.floor((tlTarget.type ? tlTarget.type.points : 50) * 5),
                                tlTarget.x,
                                tlTarget.y,
                                'lightning',
                                game.textPopups
                            );
                        }
                        game.camera.shake(3, 0.1);
                    }
                }
            }
        },

        draw: function (ctx, game) {
            var combo = game.powerups.getSecretCombo();
            if (!combo) return;

            var camera = game.camera;
            var cloud = game.cloud;

            // ── Ragnarök drawing: Thor holding Mjölnir ──────────────────
            if (combo.type === 'ragnarok') {
                var scale = 1.0;
                var S = scale;

                var tx = cloud.x - camera.x + camera.offsetX;
                var ty = cloud.y + cloud.height + 40;

                ctx.save();
                
                // Draw Golden Aura
                var auraRad = 50 * S;
                var auraGrad = ctx.createRadialGradient(tx, ty - 18 * S, 5 * S, tx, ty - 18 * S, auraRad);
                auraGrad.addColorStop(0, 'rgba(255, 220, 100, 0.5)');
                auraGrad.addColorStop(0.5, 'rgba(255, 180, 50, 0.2)');
                auraGrad.addColorStop(1, 'rgba(255, 150, 0, 0)');
                ctx.fillStyle = auraGrad;
                ctx.beginPath();
                ctx.arc(tx, ty - 18 * S, auraRad, 0, Math.PI * 2);
                ctx.fill();

                // Cape
                ctx.fillStyle = '#991111';
                ctx.beginPath();
                ctx.moveTo(tx - 6 * S, ty - 25 * S);
                ctx.quadraticCurveTo(tx - 18 * S, ty - 12 * S, tx - 16 * S, ty + 12 * S);
                ctx.lineTo(tx, ty + 12 * S);
                ctx.quadraticCurveTo(tx - 4 * S, ty - 12 * S, tx - 2 * S, ty - 25 * S);
                ctx.closePath();
                ctx.fill();

                // Legs
                ctx.fillStyle = '#222b35';
                ctx.fillRect(tx - 7 * S, ty, 3.5 * S, 14 * S);
                ctx.fillRect(tx - 1.5 * S, ty, 3.5 * S, 14 * S);
                
                // Boots
                ctx.fillStyle = '#3e2723';
                ctx.fillRect(tx - 8 * S, ty + 11 * S, 4.5 * S, 3.5 * S);
                ctx.fillRect(tx - 2 * S, ty + 11 * S, 4.5 * S, 3.5 * S);

                // Body (Chainmail plate)
                ctx.fillStyle = '#455a64';
                ctx.beginPath();
                ctx.moveTo(tx - 8 * S, ty - 25 * S);
                ctx.lineTo(tx + 3 * S, ty - 25 * S);
                ctx.lineTo(tx + 2 * S, ty);
                ctx.lineTo(tx - 7 * S, ty);
                ctx.closePath();
                ctx.fill();

                // Belt
                ctx.fillStyle = '#ffcc00';
                ctx.fillRect(tx - 7.5 * S, ty - 2 * S, 10 * S, 2 * S);

                // Left Arm
                ctx.fillStyle = '#616161';
                ctx.beginPath();
                ctx.moveTo(tx - 8 * S, ty - 23 * S);
                ctx.lineTo(tx - 12 * S, ty - 10 * S);
                ctx.lineTo(tx - 9 * S, ty - 9 * S);
                ctx.lineTo(tx - 6 * S, ty - 22 * S);
                ctx.closePath();
                ctx.fill();

                // Right arm + Mjölnir (extended to the right)
                ctx.fillStyle = '#616161'; // upper arm
                ctx.beginPath();
                ctx.moveTo(tx + 3 * S, ty - 23 * S);
                ctx.lineTo(tx + 12 * S, ty - 20 * S);
                ctx.lineTo(tx + 11 * S, ty - 16 * S);
                ctx.lineTo(tx + 2 * S, ty - 19 * S);
                ctx.closePath();
                ctx.fill();

                // Forearm extending outward
                ctx.fillStyle = '#ffb300'; // gold armguard
                ctx.beginPath();
                ctx.moveTo(tx + 11 * S, ty - 19 * S);
                ctx.lineTo(tx + 19 * S, ty - 15 * S);
                ctx.lineTo(tx + 18 * S, ty - 11 * S);
                ctx.lineTo(tx + 10 * S, ty - 15 * S);
                ctx.closePath();
                ctx.fill();

                // Bracer
                ctx.fillStyle = '#3e2723';
                ctx.fillRect(tx + 17 * S, ty - 16 * S, 2.5 * S, 4 * S);

                // Hammer handle
                ctx.strokeStyle = '#4e342e';
                ctx.lineWidth = 2.5 * S;
                ctx.beginPath();
                ctx.moveTo(tx + 18 * S, ty - 14 * S);
                ctx.lineTo(tx + 28 * S, ty - 9 * S);
                ctx.stroke();

                // Hammer head
                var hx = tx + 28 * S;
                var hy = ty - 9 * S;
                ctx.save();
                ctx.translate(hx, hy);
                ctx.rotate(0.46);
                
                // Mjölnir Head
                ctx.fillStyle = '#b0bec5';
                ctx.fillRect(-10 * S, -6 * S, 20 * S, 12 * S);
                ctx.strokeStyle = '#78909c';
                ctx.lineWidth = 1.5 * S;
                ctx.strokeRect(-10 * S, -6 * S, 20 * S, 12 * S);
                
                // Beveled top/bottom parts of Mjölnir
                ctx.fillStyle = '#90a4ae';
                ctx.beginPath();
                ctx.moveTo(-10 * S, -6 * S); ctx.lineTo(-8 * S, -9 * S); ctx.lineTo(8 * S, -9 * S); ctx.lineTo(10 * S, -6 * S);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(-10 * S, 6 * S); ctx.lineTo(-8 * S, 9 * S); ctx.lineTo(8 * S, 9 * S); ctx.lineTo(10 * S, 6 * S);
                ctx.closePath(); ctx.fill(); ctx.stroke();

                // Hammer glow
                if (combo.phase === 'charge' || Math.random() < 0.6) {
                    ctx.fillStyle = 'rgba(100, 240, 255, 0.4)';
                    ctx.fillRect(-12 * S, -11 * S, 24 * S, 22 * S);
                }
                ctx.restore();

                // Calculate screen position of hammer tip
                var hammerTipX = tx + 28 * S + Math.cos(0.46) * 10 * S;
                var hammerTipY = ty - 9 * S + Math.sin(0.46) * 10 * S;

                // Shoulders
                ctx.fillStyle = '#ffd54f';
                ctx.beginPath();
                ctx.arc(tx - 6 * S, ty - 25 * S, 3 * S, 0, Math.PI * 2);
                ctx.arc(tx + 2 * S, ty - 25 * S, 3 * S, 0, Math.PI * 2);
                ctx.fill();

                // Head
                ctx.fillStyle = '#ffcc80';
                ctx.beginPath();
                ctx.arc(tx - 2 * S, ty - 32 * S, 6 * S, 0, Math.PI * 2);
                ctx.fill();

                // Nose
                ctx.fillStyle = '#ffb74d';
                ctx.fillRect(tx + 1 * S, ty - 33 * S, 2.5 * S, 2 * S);

                // Eyes (glowing blue)
                ctx.fillStyle = '#00ffff';
                ctx.fillRect(tx - 1 * S, ty - 34.5 * S, 1.5 * S, 1.5 * S);
                ctx.fillRect(tx + 2.5 * S, ty - 34.5 * S, 1.5 * S, 1.5 * S);

                // Beard
                ctx.fillStyle = '#ff8f00';
                ctx.beginPath();
                ctx.moveTo(tx - 6 * S, ty - 30 * S);
                ctx.lineTo(tx - 3 * S, ty - 24 * S);
                ctx.lineTo(tx + 3 * S, ty - 24 * S);
                ctx.lineTo(tx + 5 * S, ty - 30 * S);
                ctx.closePath();
                ctx.fill();

                // Helmet
                ctx.fillStyle = '#78909c';
                ctx.beginPath();
                ctx.arc(tx - 2 * S, ty - 33 * S, 6 * S, Math.PI, 0);
                ctx.closePath();
                ctx.fill();
                
                // Helmet Wings
                ctx.fillStyle = '#cfd8dc';
                ctx.beginPath(); // left wing
                ctx.moveTo(tx - 8 * S, ty - 33 * S); ctx.lineTo(tx - 12 * S, ty - 38 * S); ctx.lineTo(tx - 8 * S, ty - 35 * S);
                ctx.closePath(); ctx.fill();
                ctx.beginPath(); // right wing
                ctx.moveTo(tx + 4 * S, ty - 33 * S); ctx.lineTo(tx + 8 * S, ty - 38 * S); ctx.lineTo(tx + 4 * S, ty - 35 * S);
                ctx.closePath(); ctx.fill();

                ctx.restore();

                // Lightning bolts emitting from hammer tip
                if (combo.phase === 'charge') {
                    var bolts = 3;
                    ctx.strokeStyle = 'rgba(136,220,255,0.7)';
                    ctx.lineWidth = 1.5;
                    for (var b = 0; b < bolts; b++) {
                        ctx.beginPath();
                        ctx.moveTo(hammerTipX, hammerTipY);
                        var curX = hammerTipX;
                        var curY = hammerTipY;
                        for (var seg = 0; seg < 4; seg++) {
                            curX += (Math.random() - 0.5) * 40;
                            curY -= 20;
                            ctx.lineTo(curX, curY);
                        }
                        ctx.stroke();
                    }
                } else if (combo.phase === 'smite') {
                    // Strike path to ground
                    var peds = game.pedManager.getAlive();
                    if (peds.length > 0) {
                        var target = peds[Math.floor(Math.random() * peds.length)];
                        var targetScreenX = target.x - camera.x + camera.offsetX;
                        if (Math.random() < 0.4) {
                            ctx.strokeStyle = 'rgba(255,255,136,' + (0.5 + Math.random() * 0.5) + ')';
                            ctx.lineWidth = 2 + Math.random() * 3;
                            ctx.beginPath();
                            ctx.moveTo(hammerTipX, hammerTipY);
                            ctx.lineTo(hammerTipX + (targetScreenX - hammerTipX) * 0.3, (hammerTipY + CFG.GROUND_Y) / 2);
                            ctx.lineTo(targetScreenX, CFG.GROUND_Y);
                            ctx.stroke();
                        }
                    }
                }
            }

            // ── Ice Age: snow overlay ──────────────────────────────────
            if (combo.type === 'iceage') {
                ctx.fillStyle = 'rgba(180,210,255,0.12)';
                ctx.fillRect(0, 0, CFG.WIDTH, CFG.HEIGHT);
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                for (var ii = 0; ii < 40; ii++) {
                    var ix = (performance.now() * 0.03 * (ii + 1) + ii * 97) % CFG.WIDTH;
                    var iy = (performance.now() * 0.05 * (ii * 0.4 + 1) + ii * 67) % CFG.HEIGHT;
                    ctx.beginPath();
                    ctx.arc(ix, iy, 2 + Math.sin(ii) * 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // ── Kaiju Mode: screen shake + storm overlay ────────────────
            if (combo.type === 'kaiju') {
                cloud._growthStacks = 4;
                cloud.growthTimer = 2;
                if (Math.random() < 0.08) {
                    camera.shake(4, 0.15);
                }
                ctx.fillStyle = 'rgba(20,10,30,0.06)';
                ctx.fillRect(0, 0, CFG.WIDTH, CFG.HEIGHT);
            }

            // ── Time Stop: sepia overlay + pause symbol ───────────────
            if (combo.type === 'timestop') {
                ctx.fillStyle = 'rgba(180,160,120,0.1)';
                ctx.fillRect(0, 0, CFG.WIDTH, CFG.HEIGHT);
                ctx.font = 'bold 60px "Courier New", monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.globalAlpha = 0.15;
                ctx.fillStyle = '#ffffff';
                ctx.fillText('\u23F8', CFG.WIDTH / 2, CFG.HEIGHT / 2);
                ctx.globalAlpha = 1;
            }

            // ── EMP: Electric ball lightning orb ────────────────────────
            if (combo.type === 'emp' && combo._orbX) {
                var empOx = combo._orbX - camera.x + camera.offsetX;
                var empOy = combo._orbY;
                var empPulse = 1 + Math.sin(performance.now() * 0.015) * 0.25;
                
                // Outer glow
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = '#44ffff';
                ctx.beginPath();
                ctx.arc(empOx, empOy, 30 * empPulse, 0, Math.PI * 2);
                ctx.fill();
                
                // Core
                ctx.globalAlpha = 0.9;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(empOx, empOy, 12, 0, Math.PI * 2);
                ctx.fill();
                
                // Electric arcs
                ctx.strokeStyle = '#66eeff';
                ctx.lineWidth = 2;
                for (var ea = 0; ea < 6; ea++) {
                    var eAngle = performance.now() * 0.01 + ea * Math.PI / 3;
                    var eLen = 20 + Math.random() * 25;
                    ctx.globalAlpha = 0.4 + Math.random() * 0.4;
                    ctx.beginPath();
                    ctx.moveTo(empOx, empOy);
                    var eMid = eLen * 0.5;
                    ctx.lineTo(
                        empOx + Math.cos(eAngle) * eMid,
                        empOy + Math.sin(eAngle) * eMid + (Math.random() - 0.5) * 10
                    );
                    ctx.lineTo(empOx + Math.cos(eAngle) * eLen, empOy + Math.sin(eAngle) * eLen);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;

                // Glitch line overlays
                if (Math.random() < 0.1) {
                    ctx.fillStyle = 'rgba(0,255,255,0.05)';
                    ctx.fillRect(0, Math.random() * CFG.HEIGHT, CFG.WIDTH, 2 + Math.random() * 4);
                }
            }

            // ── Flood: Water body rising + surface waves ───────────────
            if (combo.type === 'flood') {
                var waterY = Math.max(combo.waterLevel, CFG.GROUND_Y - 180);
                var waterH = CFG.GROUND_Y + 20 - waterY;
                if (waterH > 0) {
                    var wGrad = ctx.createLinearGradient(0, waterY, 0, CFG.GROUND_Y + 20);
                    wGrad.addColorStop(0, 'rgba(30,80,180,0.5)');
                    wGrad.addColorStop(0.3, 'rgba(20,60,150,0.6)');
                    wGrad.addColorStop(1, 'rgba(10,30,100,0.8)');
                    ctx.fillStyle = wGrad;
                    ctx.fillRect(0, waterY, CFG.WIDTH, waterH);

                    // Wave outline
                    ctx.strokeStyle = 'rgba(100,180,255,0.4)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    for (var wx = 0; wx < CFG.WIDTH; wx += 3) {
                        var wy = waterY + Math.sin(wx * 0.03 + performance.now() * 0.003) * 4;
                        if (wx === 0) ctx.moveTo(wx, wy);
                        else ctx.lineTo(wx, wy);
                    }
                    ctx.stroke();

                    // Wave foam bubbles
                    ctx.fillStyle = 'rgba(200,230,255,0.3)';
                    for (var bi = 0; bi < 12; bi++) {
                        var bx = (performance.now() * 0.02 * (bi + 1) + bi * 107) % CFG.WIDTH;
                        var by = waterY + 5 + Math.random() * 20;
                        ctx.beginPath();
                        ctx.arc(bx, by, 2 + Math.random() * 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }

            // ── Chain Reaction: draw connecting electrical arcs ───────
            if (combo.type === 'chainReaction' && combo._chainFrom && combo._chainTo) {
                ctx.strokeStyle = 'rgba(100,200,255,0.7)';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#44aaff';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(combo._chainFrom.x - camera.x + camera.offsetX, combo._chainFrom.y);
                ctx.lineTo(combo._chainTo.x - camera.x + camera.offsetX, combo._chainTo.y);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            // ── Double Rainbow ──────────────────────────────────────────
            if (combo.type === 'doubleRainbow') {
                var drColors = [
                    'rgba(255,0,0,',
                    'rgba(255,127,0,',
                    'rgba(255,255,0,',
                    'rgba(0,200,0,',
                    'rgba(0,0,255,',
                    'rgba(148,0,211,'
                ];
                for (var drr = 0; drr < 2; drr++) {
                    var drRadius = 300 + drr * 50;
                    var drAlpha = 0.15 - drr * 0.04;
                    for (var drc = 0; drc < drColors.length; drc++) {
                        ctx.strokeStyle = drColors[drc] + drAlpha + ')';
                        ctx.lineWidth = 6;
                        ctx.beginPath();
                        ctx.arc(CFG.WIDTH / 2, CFG.HEIGHT, drRadius - drc * 6, Math.PI, 0);
                        ctx.stroke();
                    }
                }
                if (combo.timer > 13) {
                    ctx.globalAlpha = Math.min(1, (15 - combo.timer) / 2);
                    ctx.font = 'bold 24px "Courier New", monospace';
                    ctx.textAlign = 'center';
                    ctx.fillStyle = '#ffdd44';
                    ctx.fillText('WHAT DOES IT MEAN?!', CFG.WIDTH / 2, 80);
                    ctx.globalAlpha = 1;
                }
            }

            // ── Toxic Storm: green mist overlay + spores ────────────────
            if (combo.type === 'toxicStorm') {
                ctx.fillStyle = 'rgba(80,180,0,0.08)';
                ctx.fillRect(0, 0, CFG.WIDTH, CFG.HEIGHT);
                ctx.fillStyle = 'rgba(120,255,0,0.3)';
                for (var ti = 0; ti < 10; ti++) {
                    var tpx = (performance.now() * 0.015 * (ti + 1) + ti * 127) % CFG.WIDTH;
                    var tpy = (performance.now() * 0.025 * (ti * 0.7 + 1) + ti * 83) % CFG.HEIGHT;
                    ctx.beginPath();
                    ctx.arc(tpx, tpy, 2 + Math.sin(ti + performance.now() * 0.005) * 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // ── Tesla Overload: electrical lines ────────────────────────
            if (combo.type === 'teslaOverload') {
                ctx.strokeStyle = 'rgba(255,255,100,0.15)';
                ctx.lineWidth = 1;
                for (var eli = 0; eli < 5; eli++) {
                    var elx1 = Math.random() * CFG.WIDTH;
                    var elx2 = elx1 + (Math.random() - 0.5) * 200;
                    ctx.beginPath();
                    ctx.moveTo(elx1, 0);
                    ctx.lineTo(elx2, CFG.HEIGHT);
                    ctx.stroke();
                }
            }
        }
    };
})();
