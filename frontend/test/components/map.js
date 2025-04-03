import { defineComponent, h } from "../../../framework/src/index.js";

const TILE_TYPES = {
  EMPTY: 0,
  WALL: 1,
  BREAKABLE: 2,
  BOMB_POWERUP: 3,
  FLAME_POWERUP: 4,
  SPEED_POWERUP: 5,
};

function generateInitialMap() {
  const ROWS = 13;
  const COLS = 15;
  const tiles = Array(ROWS)
    .fill()
    .map(() => Array(COLS).fill(TILE_TYPES.EMPTY));

  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < COLS; j++) {
      if (i === 0 || i === ROWS - 1 || j === 0 || j === COLS - 1) {
        tiles[i][j] = TILE_TYPES.WALL;
      }
    }
  }

  const countConsecutiveBlocks = (row, col, isHorizontal) => {
    let count = 0;
    if (isHorizontal) {
      for (
        let j = Math.max(1, col - 2);
        j <= Math.min(COLS - 2, col + 2);
        j++
      ) {
        if (tiles[row][j] === TILE_TYPES.BREAKABLE) count++;
      }
    } else {
      for (
        let i = Math.max(1, row - 2);
        i <= Math.min(ROWS - 2, row + 2);
        i++
      ) {
        if (tiles[i][col] === TILE_TYPES.BREAKABLE) count++;
      }
    }
    return count;
  };

  for (let i = 1; i < ROWS - 1; i++) {
    for (let j = 1; j < COLS - 1; j++) {
      if (i % 2 === 0 && j % 2 === 0) {
        tiles[i][j] = TILE_TYPES.WALL;
        continue;
      }

      const horizontalCount = countConsecutiveBlocks(i, j, true);
      const verticalCount = countConsecutiveBlocks(i, j, false);

      if (horizontalCount < 2 && verticalCount < 2 && Math.random() < 0.6) {
        tiles[i][j] = TILE_TYPES.BREAKABLE;
      }
    }
  }

  const safeZones = [
    [1, 1],
    [1, 2],
    [2, 1],
    [1, COLS - 2],
    [1, COLS - 3],
    [2, COLS - 2],
    [ROWS - 2, 1],
    [ROWS - 2, 2],
    [ROWS - 3, 1],
    [ROWS - 2, COLS - 2],
    [ROWS - 2, COLS - 3],
    [ROWS - 3, COLS - 2],
  ];

  safeZones.forEach(([row, col]) => {
    tiles[row][col] = TILE_TYPES.EMPTY;
  });

  return tiles;
}

export const MapComponent = defineComponent({
  state() {
    return {
      tiles: generateInitialMap()
    };
  },

  onMounted() {
    this.emit('map-update', this.state.tiles);
  },

  destroyBlock(x, y) {
    const tiles = [...this.state.tiles];
    if (tiles[y][x] === TILE_TYPES.BREAKABLE) {
      if (Math.random() < 0.3) {
        const powerupRoll = Math.random();
        if (powerupRoll < 0.33) {
          tiles[y][x] = TILE_TYPES.BOMB_POWERUP;
        } else if (powerupRoll < 0.66) {
          tiles[y][x] = TILE_TYPES.FLAME_POWERUP;
        } else {
          tiles[y][x] = TILE_TYPES.SPEED_POWERUP;
        }
      } else {
        tiles[y][x] = TILE_TYPES.EMPTY;
      }
      this.updateState({ tiles });
    }
  },

  render() {
    return h(
      "div",
      { class: "game-map" },
      [
        ...this.state.tiles.map((row, y) =>
          h(
            "div",
            { class: "row" },
            row.map((tile, x) => {
              let className = "cell ";
              switch (tile) {
                case TILE_TYPES.WALL: className += "wall"; break;
                case TILE_TYPES.BREAKABLE: className += "breakable"; break;
                case TILE_TYPES.BOMB_POWERUP: className += "powerup bomb"; break;
                case TILE_TYPES.FLAME_POWERUP: className += "powerup flame"; break;
                case TILE_TYPES.SPEED_POWERUP: className += "powerup speed"; break;
                default: className += "empty";
              }
              return h("div", {
                class: className,
                key: `${x}-${y}`,
                "data-x": x,
                "data-y": y,
              });
            })
          )
        ),
        ...(this.children || [])
      ]
    );
  },
});
