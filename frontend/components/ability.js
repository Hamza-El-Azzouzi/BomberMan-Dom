import { defineComponent, h } from "https://unpkg.com/obsydianjs@latest";
import { TILE_SIZE } from "../constants/game-constants.js";

export const AbilityComponent = defineComponent({

    render() {
        const size = TILE_SIZE * 0.65;
        const offset = (TILE_SIZE - size) / 2;
        const x = this.props.col * TILE_SIZE + offset;
        const y = this.props.row * TILE_SIZE;

        return h("div", {
            style: {
                position: "absolute",
                transform: `translate(${x}px, ${y}px)`,
            }
        }, [
            h("img", {
                class: "ability " + this.props.type,
                src: `./assets/abilities/${this.props.type}.png`,
                style: {
                    width: `${size}px`,
                    height: `${size}px`,
                }
            })
        ]);
    }
});