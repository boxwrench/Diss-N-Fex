// ── Game Configuration ──────────────────────────────────────────
const CFG = {
    // Display
    WIDTH: 1280,
    HEIGHT: 720,
    GROUND_Y: 620,
    SKY_TOP: '#030c16',
    SKY_BOTTOM: '#0e2b45',

    // Operator rig (player)
    RIG: {
        SPEED: 280,
        WIDTH: 120,
        HEIGHT: 60,
        MIN_X: -200,
        MAX_X: 4200,
        MIN_Y: 30,
        MAX_Y: 350,
        START_X: 640,
        START_Y: 120,
        ANGER_DECAY: 0.5,
        ANGER_MAX: 10,
    },

    // Chlorine contact spray
    CHLORINE: {
        METER_MAX: 100,
        DRAIN_RATE: 45,
        REFILL_RATE: 22,
        DPS: 5,
        DROP_SPEED: 600,
        CONE_WIDTH: 80,
        DROPS_PER_SEC: 60,
        POINTS_MULT: 1,
    },

    // Ozone diffuser
    OZONE: {
        METER_MAX: 100,
        COST: 20,
        REFILL_RATE: 6,
        DAMAGE: 3,
        SPEED: 350,
        GRAVITY: 500,
        RADIUS: 5,
        POINTS_MULT: 3,
    },

    // UV reactor pulse
    UV_PULSE: {
        CHARGE_TIME: 15,
        DAMAGE: 10,
        AOE_RADIUS: 80,
        BOLT_DURATION: 0.3,
        FLASH_DURATION: 0.15,
        SHAKE_DURATION: 0.4,
        SHAKE_INTENSITY: 12,
        POINTS_MULT: 5,
    },

    // Filter backwash vortex
    BACKWASH: {
        CHARGE_TIME: 10,
        DAMAGE: 4,
        SPEED: 180,
        DURATION: 4,
        WIDTH: 40,
        HEIGHT: 80,
        POINTS_MULT: 2,
        HIT_INTERVAL: 0.3, // damage tick rate
    },

    // Coagulant injection
    COAGULANT: {
        CHARGE_TIME: 8,
        CONE_WIDTH: 180,
        CONE_LENGTH: 200,
        FREEZE_DURATION: 3.0,
        FREEZE_DPS: 0.5,      // cold damage while frozen (slow, gives time to shatter)
        DAMAGE_MULT: 1.3,     // frozen peds take 30% more damage from other attacks
        SHATTER_RADIUS: 60,   // AoE on frozen ped death
        SHATTER_DAMAGE: 3,
        POINTS_MULT: 1,
    },

    // pH shock zone
    PH_SHOCK: {
        CHARGE_TIME: 12,
        RADIUS: 350,
        DURATION: 6,
        DAMAGE_MULT: 1.5,     // peds in pH shock take 1.5x damage
        SLOW: 0.4,            // peds in pH shock move at 40%
        POINTS_MULT: 1,
    },

    // Combo
    COMBO: {
        WINDOW: 2.0,
        INCREMENT: 0.5,
        MAX_MULT: 10,
        TIERS: [
            { threshold: 5,  label: 'STABLE!',       color: '#ffff00' },
            { threshold: 10, label: 'STERILE!',      color: '#ff8800' },
            { threshold: 20, label: 'HYPER-PURE!',   color: '#ff0044' },
            { threshold: 30, label: 'DISTILLED!',    color: '#ff00ff' },
        ],
    },

    // Pedestrians
    PED: {
        HEIGHT: 25,
        WALK_SPEED: 40,
        FLEE_SPEED: 100,
        FLEE_RANGE: 200,
        SPAWN_MARGIN: 100,
    },

    // Waves
    WAVE: {
        BASE_COUNT: 5,
        PER_WAVE: 2,
        MAX_COUNT: 40,
        BOSS_INTERVAL: 5,
        INTERMISSION: 6,
    },

    // Powerups
    POWERUP: {
        FALL_SPEED: 50,
        SIZE: 24,
        SPAWN_CHANCE: 0.75,
        MID_WAVE_INTERVAL: 20,  // seconds between mid-wave spawn checks
        MID_WAVE_CHANCE: 0.6,
    },

    // City
    CITY: {
        WORLD_WIDTH: 4000,
        BUILDING_MIN_W: 80,
        BUILDING_MAX_W: 180,
        BUILDING_MIN_H: 100,
        BUILDING_MAX_H: 350,
        GAP: 4,
        PARALLAX: [0.2, 0.5, 1.0],
    },

    // Camera
    CAMERA: {
        LERP: 0.08,
        LOOK_AHEAD: 100,
    },

    // Day/Night
    DAY_NIGHT: {
        CYCLE_WAVES: 10,
    },

    // Physics
    GRAVITY: 500,

    // Idle
    IDLE_TIME: 10,
};
