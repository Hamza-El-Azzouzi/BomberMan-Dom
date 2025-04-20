export const TILE_SIZE = 50;

export const SPRITE_DIRECTIONS = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};

export const PLAYER_STATES = {
  speed: 150,
  frame: 0,
  isDying: false,
};

export const TILE_TYPES = {
  EMPTY: 0,
  WALL: 1,
  BREAKABLE: 2,
  BOMB_POWERUP: 3,
  FLAME_POWERUP: 4,
  SPEED_POWERUP: 5,
  BOMB: 6,
};

export const EXPLOSION_DIRECTIONS = [
  { dr: -1, dc: 0, name: "up" },
  { dr: 1, dc: 0, name: "down" },
  { dr: 0, dc: -1, name: "left" },
  { dr: 0, dc: 1, name: "right" },
];

export const BOMB_CONFIG = {
  timer: 1500,
  explosionDuration: 1600,
  defaultLimit: 1,
  defaultRange: 1,
};
