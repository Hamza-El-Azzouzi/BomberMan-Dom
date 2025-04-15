import { defineComponent, h } from "../../../framework/src/index.js";
import { TILE_SIZE, BOMB_CONFIG } from "../constants/game-constants.js";

export const BombComponent = defineComponent({
    state() {
        return {
            timer: BOMB_CONFIG.timer,
        };
    },

    onMounted() {
        setTimeout(() => {
            this.explode();
        }, this.state.timer);
    },

    explode() {
        this.emit("explosion", {
            row: this.props.row,
            col: this.props.col,
            range: this.props.range || 1
        });
    },

    render() {
        return h("div", {
            class: "bomb",
            style: {
                width: `${TILE_SIZE}px`,
                height: `${TILE_SIZE}px`,
                transform: `translate(${this.props.col * TILE_SIZE}px, ${this.props.row * TILE_SIZE}px)`,
            }
        });
    },
});