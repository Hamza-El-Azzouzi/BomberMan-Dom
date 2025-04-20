import { defineComponent, h } from "https://unpkg.com/obsydianjs@latest";

export const WaitingRoom = defineComponent({
  data() {
    return {
      countdown: this.props.countdown, // Initialize countdown from props
    };
  },
  onmount() {
    if (this.countdown > 0) {
      this.interval = setInterval(() => {
        if (this.countdown > 0) {
          this.countdown -= 1;
        } else {
          clearInterval(this.interval); // Stop the interval when countdown reaches 0
        }
      }, 1000); // Decrease countdown every second
    }
  },
  beforeUnmount() {
    if (this.interval) {
      clearInterval(this.interval); // Clean up the interval when the component is unmounted
    }
  },
  render() {
    return h("div", { class: "waiting-room" }, [
      h("h2", {}, [`Players Joined: ${this.props.playerCount}/4`]),
      this.props.countdown &&
      h("div", { class: "countdown" }, [
        `Game starting in ${this.countdown}s`,
      ]),
    ]);
  },
});
