import { defineComponent, h } from "https://unpkg.com/obsydianjs@latest";

export const GameOverComponent = defineComponent({
    state() {
        return {
            visible: this?.props.visible,
            winner: this?.props.winner,
            isCurrentPlayerWinner: false
        };
    },


    render() {
        if (!this.props.visible) {
            return h("div", {});
        }

        return h("div", { class: "game-over-overlay" }, [
            h("div", { class: "game-over-container" }, [
                h("h1", { class: "game-over-title" }, ["Game Over"]),
                h("div", { class: "game-over-content" }, [
                    h("p", { class: "game-over-winner" }, [
                        h("span", {}, ["Winner: "]),
                        h("span", { class: "winner-name" }, [this.props.winner])
                    ]),
                    this.props.isCurrentPlayerWinner ?
                        h("p", { class: "winner-message" }, ["Congratulations! You won!"]) :
                        h("p", { class: "loser-message" }, ["Better luck next time!"])
                ]
                )
            ])
        ]);
    }
});