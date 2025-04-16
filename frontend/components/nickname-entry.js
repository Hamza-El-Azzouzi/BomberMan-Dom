import { defineComponent, h } from "https://unpkg.com/obsydianjs@latest";

export const NicknameEntry = defineComponent({
  state() {
    return { nickname: "" };
  },
  handleSubmit(e) {
    e.preventDefault();
    if (this.state.nickname.trim()) {
      this.emit("nickname-submitted", this.state.nickname);
    }
  },
  render() {
    return h("div", { class: "nickname-container" }, [
      h("h1", {}, ["Enter Your Nickname"]),
      h("form", { on: { submit: (e) => this.handleSubmit(e) } }, [
        h("input", {
          type: "text",
          value: this.state.nickname,
          on: { input: (e) => this.updateState({ nickname: e.target.value }) },
        }),
        h("button", { type: "submit" }, ["Join Game"]),
      ]),
    ]);
  },
});
