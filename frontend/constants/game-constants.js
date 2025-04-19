export const TILE_SIZE = 50;

export const SPRITE_DIRECTIONS = {
  down: 0,
  left: 1,
  right: 2,
  up: 3
};

export const PLAYER_STATES = {
  speed: 150,
  frame: 0,
  isDying: false
};

export const TILE_TYPES = {
  EMPTY: 0,
  WALL: 1,
  BREAKABLE: 2,
  BOMB_POWERUP: 3,
  FLAME_POWERUP: 4,
  SPEED_POWERUP: 5,
  BOMB: 6
};

export const EXPLOSION_DIRECTIONS = [
  { dr: -1, dc: 0, name: 'up' },    // Up
  { dr: 1, dc: 0, name: 'down' },   // Down
  { dr: 0, dc: -1, name: 'left' },  // Left
  { dr: 0, dc: 1, name: 'right' }   // Right
];

export const BOMB_CONFIG = {
  timer: 1500,             // Bomb explosion timer (1.5 seconds)
  explosionDuration: 1600, // Explosion animation duration (1.6 seconds)
  defaultLimit: 1,         // Default max bombs per player
  defaultRange: 1          // Default explosion range
};