import { defineComponent, h } from "./../../../framework/src/index.js";

export const ChatComponent = defineComponent({
  state() {
    return {
      message: "",
    };
  },
  sendMessage() {
    if (this.state.message.trim() && this.props.ws) {
      this.props.ws.send(
        JSON.stringify({
          nickname: this.props.nickname,
          type: "chat",
          message: this.state.message,
        })
      );
      this.updateState({ message: "" });
    }
  },
  render() {
    return h("div", { class: "chat-container" }, [
      h(
        "div",
        { class: "chat-messages" },
        this.props.messages
          .filter((msg) => msg)
          .map((msg) =>
            h("div", { class: "message" }, [
              h("div", { class: "message-header" }, [
                h("span", { class: "message-nickname" }, [msg.nickname]),
                h("span", { class: "message-time" }, [
                  new Date(msg.timestamp).toLocaleTimeString(),
                ]),
              ]),
              h("div", { class: "message-content" }, [msg.message]),
            ])
          )
      ),
      h("div", { class: "chat-input" }, [
        h("input", {
          type: "text",
          value: this.state.message,
          on: {
            input: (e) => this.updateState({ message: e.target.value }),
            keydown: (event) => {
              if (event.key === "Enter"){
                this.sendMessage()
              }
            },
          },
        }),
        h(
          "button",
          {
            on: { click: () => this.sendMessage() },
          },
          ["Send"]
        ),
      ]),
    ]);
  },
});
