// FIX: Import the PlayerControls type to be used in PLAYER_CONTROLS.
import { PlayerControls } from './types';

export const CANVAS_WIDTH = 1600;
export const CANVAS_HEIGHT = 800;

// Ground plane dimensions
export const GROUND_WIDTH = 500;
export const GROUND_DEPTH = 500;

export const GRAVITY = 0.6;
export const JUMP_FORCE = 12;
export const MOVE_SPEED = 3;
export const STICKMAN_HEALTH = 100;
export const STICKMAN_MAX_MANA = 100;
export const ATTACK_MANA_COST = 35;
export const MANA_REGEN_RATE = 0.5;
export const STICKMAN_RADIUS = 10; // For collision
export const STICKMAN_HEIGHT = 50; // Visual height for drawing

export const ATTACK_RANGE = 60;
export const ATTACK_DAMAGE = 10; // Reduced from 15
export const ATTACK_DURATION = 15; // frames
export const ATTACK_COOLDOWN = 15; // frames
export const HIT_DURATION = 10; // frames for hit animation

export const OBSTACLE_COUNT = 15;
export const OBSTACLE_MIN_SIZE = 20;
export const OBSTACLE_MAX_SIZE = 70;

// Power-up Constants
export const HAMMER_SPAWN_INTERVAL = 900; // 15 seconds at 60fps
export const HAMMER_DURATION = 600; // 10 seconds at 60fps
export const HAMMER_DAMAGE_MULTIPLIER = 2.5;
export const POWERUP_PICKUP_RADIUS = 25;


export const PLAYER_CONTROLS: { [key: string]: PlayerControls } = {
    player1: {
        up: 'w',
        down: 's',
        left: 'a',
        right: 'd',
        jump: 'Enter',
        attack: ' ',
    },
    player2: {
        up: 'ArrowUp',
        down: 'ArrowDown',
        left: 'ArrowLeft',
        right: 'ArrowRight',
        jump: 'Enter',
        attack: ' ',
    }
};
