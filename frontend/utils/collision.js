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
    (tileType >= TILE_TYPES.BOMB_POWERUP && tileType <= TILE_TYPES.SPEED_POWERUP);
}

export function isTileBreakable(tileType) {
  return tileType === TILE_TYPES.BREAKABLE;
}

export function canPlaceBomb(row, col, tiles) {
  return tiles[row][col] === TILE_TYPES.EMPTY;
}

export function calculateExplosion(row, col, range, tiles) {
  const explosions = [];

  explosions.push({ row, col, direction: 'center' });

  EXPLOSION_DIRECTIONS.forEach(dir => {
    for (let i = 1; i <= range; i++) {
      const newRow = row + (dir.dr * i);
      const newCol = col + (dir.dc * i);
      const tileType = tiles[newRow][newCol];

      if (tileType === TILE_TYPES.WALL) {
        break;
      }

      explosions.push({
        row: newRow,
        col: newCol,
        direction: dir.name
      });

      if (tileType === TILE_TYPES.BREAKABLE) {
        break;
      }
    }
  });

  return explosions;
}

export function isPlayerInExplosion(playerRow, playerCol, explosions) {
  return explosions.some(explosion =>
    playerRow === explosion.row && playerCol === explosion.col
  );
}