// -- Collision System ----------------------------------------------------
// Hit-testing between projectiles, pedestrians, powerups, and the cloud.
// Depends on global CFG.

class CollisionSystem {

    // -- Helpers ---------------------------------------------------------

    rectOverlap(a, b) {
        return a.x < b.x + b.w &&
               a.x + a.w > b.x &&
               a.y < b.y + b.h &&
               a.y + a.h > b.y;
    }

    pointInRect(px, py, rect) {
        return px >= rect.x && px <= rect.x + rect.w &&
               py >= rect.y && py <= rect.y + rect.h;
    }

    // -- Rain ------------------------------------------------------------

    checkRain(raindrops, pedestrians, particles) {
        var hits = [];
        var dmgPerDrop = CFG.RAIN.DPS / CFG.RAIN.DROPS_PER_SEC;

        for (var i = raindrops.length - 1; i >= 0; i--) {
            var drop    = raindrops[i];
            var removed = false;

            // -- Pedestrian collision --
            for (var p = 0; p < pedestrians.length; p++) {
                var ped = pedestrians[p];
                if (!ped.alive) continue;

                var pedCollY = ped.y;
                if (ped.type.floats && ped._isBoss) pedCollY = ped.y - 200;

                var halfW = ped.type.wideHitbox ? 18 : 10;
                var pedBox = {
                    x: ped.x - halfW,
                    y: pedCollY - 25,
                    w: halfW * 2,
                    h: 25
                };

                if (this.pointInRect(drop.x, drop.y, pedBox)) {
                    var wasAttracted = (ped.state === 'attracted');
                    var wasFrozen = !!ped._frozen;
                    var result = ped.takeDamage(dmgPerDrop, 'rain');
                    if (result.hit) {
                        particles.hitEffect(drop.x, drop.y);
                    }
                    if (result.killed) {
                        particles.deathPoof(ped.x, ped.y - 12);
                    }
                    hits.push({
                        x: ped.x,
                        y: ped.y,
                        hit: result.hit,
                        killed: result.killed,
                        points: ped.type ? ped.type.points : 100,
                        groundHit: false,
                        complaint: result.complaint,
                        typeName: ped.typeName,
                        frozen: wasFrozen,
                        wasAttracted: wasAttracted,
                        isBounty: !!ped._isBounty,
                        bountyPoints: ped._bountyPoints || 0,
                    });
                    raindrops.splice(i, 1);
                    removed = true;
                    break;
                }
            }

            if (removed) continue;

            // -- Ground collision --
            if (drop.y >= CFG.GROUND_Y) {
                particles.rainSplash(drop.x, CFG.GROUND_Y);
                hits.push({ x: drop.x, y: CFG.GROUND_Y, hit: false, killed: false, points: 0, groundHit: true });
                raindrops.splice(i, 1);
            }
        }

        return hits;
    }

    // -- Hail ------------------------------------------------------------

    checkHail(hailstones, pedestrians, particles) {
        var hits = [];

        for (var i = hailstones.length - 1; i >= 0; i--) {
            var stone   = hailstones[i];
            var removed = false;

            for (var p = 0; p < pedestrians.length; p++) {
                var ped = pedestrians[p];
                if (!ped.alive) continue;

                var pedCollY = ped.y;
                if (ped.type.floats && ped._isBoss) pedCollY = ped.y - 200;

                var halfW = ped.type.wideHitbox ? 20 : 12;
                var pedBox = {
                    x: ped.x - halfW,
                    y: pedCollY - 25,
                    w: halfW * 2,
                    h: 25
                };

                if (this.pointInRect(stone.x, stone.y, pedBox)) {
                    // Umbrella blocks one hit then breaks
                    if (ped.hasUmbrella) {
                        ped.hasUmbrella = false;
                        particles.hailImpact(stone.x, stone.y);
                        hits.push({ x: ped.x, y: ped.y, hit: false, killed: false, points: 0 });
                    } else if (ped.type.shieldBlocksHail) {
                        // Riot shield blocks hail from the front (based on facing)
                        var hailFromFront = (stone.x - ped.x) * ped.dir > 0;
                        if (hailFromFront) {
                            particles.hailImpact(stone.x, stone.y);
                            hits.push({ x: ped.x, y: ped.y, hit: false, killed: false, points: 0, typeName: ped.typeName, frozen: false, wasAttracted: false });
                            hailstones.splice(i, 1);
                            removed = true;
                            break;
                        }
                        // If from behind, hail hits normally - fall through to regular damage
                        var wasAttracted = (ped.state === 'attracted');
                        var wasFrozen = !!ped._frozen;
                        var result = ped.takeDamage(CFG.HAIL.DAMAGE, 'hail');
                        particles.hitEffect(stone.x, stone.y);
                        if (result.killed) {
                            particles.deathPoof(ped.x, ped.y - 12);
                        }
                        hits.push({
                            x: ped.x,
                            y: ped.y,
                            hit: result.hit,
                            killed: result.killed,
                            points: ped.type ? ped.type.points : 100,
                            complaint: result.complaint,
                            typeName: ped.typeName,
                            frozen: wasFrozen,
                            wasAttracted: wasAttracted,
                            isBounty: !!ped._isBounty,
                            bountyPoints: ped._bountyPoints || 0,
                        });
                    } else {
                        var wasAttracted = (ped.state === 'attracted');
                        var wasFrozen = !!ped._frozen;
                        var result = ped.takeDamage(CFG.HAIL.DAMAGE, 'hail');
                        particles.hitEffect(stone.x, stone.y);
                        if (result.killed) {
                            particles.deathPoof(ped.x, ped.y - 12);
                        }
                        hits.push({
                            x: ped.x,
                            y: ped.y,
                            hit: result.hit,
                            killed: result.killed,
                            points: ped.type ? ped.type.points : 100,
                            complaint: result.complaint,
                            typeName: ped.typeName,
                            frozen: wasFrozen,
                            wasAttracted: wasAttracted,
                            isBounty: !!ped._isBounty,
                            bountyPoints: ped._bountyPoints || 0,
                        });
                    }

                    particles.hailImpact(stone.x, stone.y);
                    hailstones.splice(i, 1);
                    removed = true;
                    break;
                }
            }

            if (removed) continue;

            if (stone.y >= CFG.GROUND_Y) {
                particles.hailImpact(stone.x, CFG.GROUND_Y);
                hailstones.splice(i, 1);
            }
        }

        return hits;
    }

    // -- Lightning -------------------------------------------------------

    checkLightning(bolt, pedestrians, particles) {
        if (!bolt) return [];

        var killed  = [];
        var radius  = CFG.LIGHTNING.AOE_RADIUS;

        for (var p = 0; p < pedestrians.length; p++) {
            var ped = pedestrians[p];
            if (!ped.alive) continue;

            var dx   = ped.x - bolt.x;
            var dist = Math.abs(dx);

            if (dist <= radius) {
                var wasAttracted = (ped.state === 'attracted');
                var wasFrozen = !!ped._frozen;
                var result = ped.takeDamage(CFG.LIGHTNING.DAMAGE, 'lightning');
                particles.lightningParticles(ped.x, ped.y - 12);

                if (!ped.alive) {
                    particles.deathPoof(ped.x, ped.y - 12);
                    killed.push({
                        x: ped.x,
                        y: ped.y,
                        points: ped.type ? ped.type.points : 100,
                        typeName: ped.typeName,
                        complaint: result.complaint,
                        frozen: wasFrozen,
                        wasAttracted: wasAttracted,
                        isBounty: !!ped._isBounty,
                        bountyPoints: ped._bountyPoints || 0,
                    });
                }
            }
        }

        particles.lightningParticles(bolt.x, CFG.GROUND_Y);
        return killed;
    }

    // -- Tornado -----------------------------------------------------------

    checkTornadoes(tornadoes, pedestrians, particles) {
        var hits = [];

        for (var t = 0; t < tornadoes.length; t++) {
            var tornado = tornadoes[t];
            if (tornado.hitTimer > 0) continue; // respect hit interval

            var halfW = tornado.width / 2;

            for (var p = 0; p < pedestrians.length; p++) {
                var ped = pedestrians[p];
                if (!ped.alive) continue;

                var dx = Math.abs(ped.x - tornado.x);
                if (dx <= halfW) {
                    // Check per-ped cooldown
                    var pedId = p;
                    var lastHit = tornado.hitPeds[pedId] || 0;
                    if (tornado.maxLife - tornado.life - lastHit < CFG.TORNADO.HIT_INTERVAL) continue;
                    tornado.hitPeds[pedId] = tornado.maxLife - tornado.life;

                    var wasAttracted = (ped.state === 'attracted');
                    var wasFrozen = !!ped._frozen;
                    var result = ped.takeDamage(CFG.TORNADO.DAMAGE, 'tornado');
                    if (result.hit) {
                        particles.hitEffect(ped.x, ped.y - 12);
                        // Fling ped sideways
                        ped.x += tornado.dir * (30 + Math.random() * 20);
                    }
                    if (result.killed) {
                        particles.deathPoof(ped.x, ped.y - 12);
                    }
                    hits.push({
                        x: ped.x,
                        y: ped.y,
                        hit: result.hit,
                        killed: result.killed,
                        points: ped.type ? ped.type.points : 100,
                        complaint: result.complaint,
                        typeName: ped.typeName,
                        frozen: wasFrozen,
                        wasAttracted: wasAttracted,
                        isBounty: !!ped._isBounty,
                        bountyPoints: ped._bountyPoints || 0,
                    });
                }
            }
        }

        return hits;
    }

    // -- Frost ---------------------------------------------------------------

    checkFrost(cone, pedestrians, particles) {
        var hits = [];
        if (!cone) return hits;

        var halfW = cone.width / 2;
        var top = cone.y;
        var bottom = cone.y + cone.length;

        for (var p = 0; p < pedestrians.length; p++) {
            var ped = pedestrians[p];
            if (!ped.alive) continue;
            if (ped._frozen) continue; // already frozen

            var pedCollY = ped.y;
            if (ped.type.floats && ped._isBoss) pedCollY = ped.y - 200;

            // Check if ped is within the cone area
            var dx = Math.abs(ped.x - cone.x);
            if (dx <= halfW && pedCollY >= top && pedCollY <= bottom) {
                ped._frozen = true;
                ped._frozenTimer = CFG.FROST.FREEZE_DURATION;
                // Create ice particles at ped position
                if (particles && particles.hitEffect) {
                    particles.hitEffect(ped.x, ped.y - 12);
                }
                hits.push({ x: ped.x, y: ped.y, frozen: true });
            }
        }

        return hits;
    }

    // -- Fog -----------------------------------------------------------------

    checkFog(fogZones, pedestrians) {
        for (var f = 0; f < fogZones.length; f++) {
            var fog = fogZones[f];

            for (var p = 0; p < pedestrians.length; p++) {
                var ped = pedestrians[p];
                if (!ped.alive) continue;

                var dx = Math.abs(ped.x - fog.x);
                if (dx <= fog.radius) {
                    ped._inFog = true;
                }
            }
        }
    }

    // -- Projectiles vs Powerups -----------------------------------------

    checkProjectilesVsPowerups(raindrops, hailstones, bolts, powerups) {
        var collected = [];
        var halfSize = CFG.POWERUP.SIZE / 2;

        for (var i = powerups.length - 1; i >= 0; i--) {
            var pu = powerups[i];
            var puBox = {
                x: pu.x - halfSize,
                y: pu.y - halfSize,
                w: CFG.POWERUP.SIZE,
                h: CFG.POWERUP.SIZE
            };
            var hit = false;

            // Rain
            for (var r = raindrops.length - 1; r >= 0; r--) {
                if (this.pointInRect(raindrops[r].x, raindrops[r].y, puBox)) {
                    raindrops.splice(r, 1);
                    hit = true;
                    break;
                }
            }

            // Hail
            if (!hit) {
                for (var h = hailstones.length - 1; h >= 0; h--) {
                    if (this.pointInRect(hailstones[h].x, hailstones[h].y, puBox)) {
                        hailstones.splice(h, 1);
                        hit = true;
                        break;
                    }
                }
            }

            // Lightning AoE
            if (!hit) {
                for (var b = 0; b < bolts.length; b++) {
                    if (Math.abs(pu.x - bolts[b].x) <= CFG.LIGHTNING.AOE_RADIUS &&
                        pu.y > bolts[b].segments[0].y) {
                        hit = true;
                        break;
                    }
                }
            }

            if (hit) {
                powerups.splice(i, 1);
                collected.push(pu);
            }
        }

        return collected;
    }

    // -- Powerups (cloud body) -------------------------------------------

    checkPowerups(powerups, cloud) {
        var cloudBox = {
            x: cloud.x - cloud.width / 2,
            y: cloud.y - cloud.height / 2,
            w: cloud.width,
            h: cloud.height
        };

        for (var i = powerups.length - 1; i >= 0; i--) {
            var pu    = powerups[i];
            var puBox = {
                x: pu.x - CFG.POWERUP.SIZE / 2,
                y: pu.y - CFG.POWERUP.SIZE / 2,
                w: CFG.POWERUP.SIZE,
                h: CFG.POWERUP.SIZE
            };

            if (this.rectOverlap(cloudBox, puBox)) {
                powerups.splice(i, 1);
                return pu;
            }
        }

        return null;
    }
}
