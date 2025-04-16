import { TILE_SIZE } from '../constants/game-constants.js';

export function checkCollision(row, col, tiles) {  
  return {
    up: row > 0 && isTileWalkable(tiles[row - 1][col]),
    down: row < tiles.length - 1 && isTileWalkable(tiles[row + 1][col]),
    left: col > 0 && isTileWalkable(tiles[row][col - 1]),
    right: col < tiles[0].length - 1 && isTileWalkable(tiles[row][col + 1])
  };
}

function isTileWalkable(tileType) {
  return tileType === 0 || tileType >= 3;
}

