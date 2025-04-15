import { EXPLOSION_DIRECTIONS, TILE_TYPES } from '../constants/game-constants.js';

export function checkCollision(row, col, tiles) {
  return {
    up: row > 0 && isTileWalkable(tiles[row - 1][col]),
    down: row < tiles.length - 1 && isTileWalkable(tiles[row + 1][col]),
    left: col > 0 && isTileWalkable(tiles[row][col - 1]),
    right: col < tiles[0].length - 1 && isTileWalkable(tiles[row][col + 1])
  };
}

export function isTileWalkable(tileType) {
  return tileType === TILE_TYPES.EMPTY ||
    (tileType >= TILE_TYPES.BOMB_POWERUP && tileType <= TILE_TYPES.SPEED_POWERUP) || (tileType === TILE_TYPES.BOMB);
}

export function isTileBreakable(tileType) {
  return tileType === TILE_TYPES.BREAKABLE;
}

// Check if the tile is empty and walkable
export function canPlaceBomb(row, col, tiles) {
  return tiles[row][col] === TILE_TYPES.EMPTY;
}

export function calculateExplosion(row, col, range, tiles) {
  const explosions = [];

  // Add center explosion
  explosions.push({ row, col, direction: 'center' });

  EXPLOSION_DIRECTIONS.forEach(dir => {
    // Check each tile in the explosion range
    for (let i = 1; i <= range; i++) {
      const newRow = row + (dir.dr * i);
      const newCol = col + (dir.dc * i);

      // Check if out of bounds
      if (newRow < 0 || newRow >= tiles.length ||
        newCol < 0 || newCol >= tiles[0].length) {
        break;
      }

      const tileType = tiles[newRow][newCol];

      // Add explosion at this position
      explosions.push({
        row: newRow,
        col: newCol,
        direction: dir.name
      });

      // Stop if hit a wall or breakable object
      if (tileType === TILE_TYPES.WALL || tileType === TILE_TYPES.BREAKABLE) {
        break;
      }
    }
  });

  return explosions;
}

// Check if the player's position matches any explosion tile
export function isPlayerInExplosion(playerRow, playerCol, explosions) {
  return explosions.some(explosion =>
    Math.abs(playerRow - explosion.row) < 0.5 &&
    Math.abs(playerCol - explosion.col) < 0.5
  );
}