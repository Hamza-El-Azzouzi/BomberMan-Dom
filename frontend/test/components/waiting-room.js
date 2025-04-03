import { defineComponent, h } from "../../../framework/src/index.js";

export const WaitingRoom = defineComponent({
  render() {
    return h("div", { class: "waiting-room" }, [
      h("h2", {}, [`Players Joined: ${this.props.playerCount}/4`]),
      this.props.countdown &&
        h("div", { class: "countdown" }, [
          `Game starting in ${this.props.countdown}s`,
        ]),
    ]);
  },
});
