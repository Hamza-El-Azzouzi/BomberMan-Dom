import { defineComponent, h } from "https://unpkg.com/obsydianjs@latest";

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
