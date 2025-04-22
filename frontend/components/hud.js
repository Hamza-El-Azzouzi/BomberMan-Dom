import { defineComponent, h } from "https://unpkg.com/obsydianjs@latest";

export const HudComponent = defineComponent({
    state() {
        return {
            startTime: Date.now(),
            elapsedTime: "00:00",
            currentPlayer: {},
        };
    },

    onMounted() {
        this.interval = setInterval(() => {
            if (this.props.gameOver) {
                clearInterval(this.interval);
                return;
            }

            const now = Date.now();
            const diff = Math.floor((now - this.state.startTime) / 1000);
            const minutes = String(Math.floor(diff / 60)).padStart(2, '0');
            const seconds = String(diff % 60).padStart(2, '0');
            this.updateState({ elapsedTime: `${minutes}:${seconds}` });
        }, 1000);
    },

    onUnmounted() {
        clearInterval(this.interval);
    },

    render() {
        return h("div", { class: "game-hud" }, [

            h("div", {
                class: `hud-player me`
            }, [
                h("div", {
                    class: "player-character",
                    style: {
                        backgroundImage: `url("./assets/players/player-${this.props.currentPlayer.character}.png")`,
                    },
                }),
                h("span", { class: "player-lives" },
                    [this.props.lives ? Array(this.props.lives).fill("❤️").join(" ") : "You lost !"]
                )
            ]),

            h("div", { class: "hud-timer" }, [`⏱️ ${this.state.elapsedTime}`]),
        ]);
    }
});
