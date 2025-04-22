import { defineComponent, h } from "https://unpkg.com/obsydianjs@latest";
import { TILE_TYPES } from "../constants/game-constants.js";

export const MapComponent = defineComponent({
  onMounted() {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        let blockSize = width / this.props.tiles[0].length;
        if (blockSize > 50) {
          blockSize = 50;
        }
        this.emit("container-resize", blockSize);
      }
    });

    resizeObserver.observe(this.firstElement);
  },

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
      ),
    ]);
  },
});
