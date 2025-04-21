import { defineComponent, h } from "https://unpkg.com/obsydianjs@latest";

export const HudComponent = defineComponent({
    state() {
        return {
            startTime: Date.now(),
            elapsedTime: "00:00",
            players: [],
            currentPlayer: null,
        };
    },

    onMounted() {
        this.updateState({
            players: this.props.players,
            currentPlayer: this.props.nickname,
        });

        this.interval = setInterval(() => {
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
            h("div", { class: "hud-timer" }, [
                h('span', { class: "animated-clock" },['⏱️']),
                `${this.state.elapsedTime}`
            ]),

            // h("div", { class: "hud-players" }, this.props.players.map(player =>
            //     h("div", {
            //         class: `hud-player ${player.nickname === this.props.currentPlayer ? "me" : ""}`
            //     }, [
            //         h("span", { class: "player-name" }, player.nickname),
            //         // h("span", { class: "player-lives" },
            //         //     Array(player.lives ?? 3).fill("❤️").join(" ")
            //         // )
            //     ])
            // ))
        ]);
    }
});
