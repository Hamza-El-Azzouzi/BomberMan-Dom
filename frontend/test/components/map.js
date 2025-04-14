import { defineComponent, h } from "../../../framework/src/index.js";

const TILE_TYPES = {
  EMPTY: 0,
  WALL: 1,
  BREAKABLE: 2,
  BOMB_POWERUP: 3,
  FLAME_POWERUP: 4,
  SPEED_POWERUP: 5,
};

export const MapComponent = defineComponent({
  render() {
    return h("div", { class: "game-map" }, [
        ...this.props.tiles.map((row, y) =>
        h(
          "div",
          { class: "row" },
          row.map((tile, x) => {
            let className = "cell ";
            switch (tile) {
              case TILE_TYPES.WALL:
                className += "wall";
                break;
              case TILE_TYPES.BREAKABLE:
                className += "breakable";
                break;
              case TILE_TYPES.BOMB_POWERUP:
                className += "powerup bomb";
                break;
              case TILE_TYPES.FLAME_POWERUP:
                className += "powerup flame";
                break;
              case TILE_TYPES.SPEED_POWERUP:
                className += "powerup speed";
                break;
              default:
                className += "empty";
            }
            return h("div", {
              class: className,
              key: `${x}-${y}`,
              "data-x": x,
              "data-y": y,
            });
          })
        )
      )
    ]);
  },
});
