import { defineComponent, h } from "https://unpkg.com/obsydianjs@latest";
import { BOMB_CONFIG } from "../constants/game-constants.js";

export const ExplosionComponent = defineComponent({
    state() {
        return {
            frame: 0,
            totalFrames: 16,
            duration: BOMB_CONFIG.explosionDuration, 
            frameInterval: 100, 
            intervalId: null
        };
    },

    onMounted() {
        this.animateExplosion();

        setTimeout(() => {
            this.emit("explosion-complete", {
                row: this.props.row,
                col: this.props.col,
            });
        }, this.state.duration);
    },

    onUnmounted() {
        if (this.state.intervalId) {
            clearInterval(this.state.intervalId);
        }
    },

    animateExplosion() {
        const intervalId = setInterval(() => {
            if (this.state.frame < this.state.totalFrames - 1) {
                this.updateState({ frame: this.state.frame + 1 });
            }
        }, this.state.frameInterval);
        this.updateState({ intervalId });
    },

    render() {
        const row = Math.floor(this.state.frame / 4);
        const col = this.state.frame % 4;

        const backgroundPosition = `-${col * this.props.TILE_SIZE}px -${row * this.props.TILE_SIZE}px`;

        let className = "explosion";
        if (this.props.direction) {
            className += ` explosion-${this.props.direction}`;
        } else {
            className += " explosion-center";
        }

        return h("div", {
            class: className,
            style: {
                transform: `translate(${this.props.col * this.props.TILE_SIZE}px, ${this.props.row * this.props.TILE_SIZE}px)`,
                width: `${this.props.TILE_SIZE}px`,
                height: `${this.props.TILE_SIZE}px`,
                backgroundPosition: backgroundPosition
            }
        });
    },
});