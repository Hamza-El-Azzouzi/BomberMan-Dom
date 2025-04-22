import { defineComponent, h } from "https://unpkg.com/obsydianjs@latest";
import { BOMB_CONFIG } from "../constants/game-constants.js";

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
            owner: this.props.owner,
            row: this.props.row,
            col: this.props.col,
            range: this.props.range || 1
        });
    },

    render() {
        return h("div", {
            class: "bomb",
            style: {
                width: `${this.props.TILE_SIZE}px`,
                height: `${this.props.TILE_SIZE}px`,
                transform: `translate(${this.props.col * this.props.TILE_SIZE}px, ${this.props.row * this.props.TILE_SIZE}px)`,
            }
        });
    },
});