import { defineComponent, h } from "https://unpkg.com/obsydianjs@latest";
import { NicknameEntry } from "./components/nickname-entry.js";
import { WaitingRoom } from "./components/waiting-room.js";
import { ChatComponent } from "./components/chat.js";
import { GameComponent } from "./components/game.js";

const App = defineComponent({
  state() {
    return {
      view: "nickname",
      nickname: null,
      playerCount: 0,
      countdown: null,
      ws: null,
      messages: [],
      map: [],
    };
  },
  handleNickname(nickname) {
    if (!nickname.trim()) return;
    const ws = new WebSocket("ws://10.1.6.3:8080/ws");

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "register",
          nickname: nickname.trim(),
        })
      );

      this.updateState({
        view: "waiting",
        nickname: nickname.trim(),
        ws: ws,
      });
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "player_count":
          this.updateState({ playerCount: data.count });
          break;
        case "countdown":
          if (data.seconds === 0) {
            return;
          }
          this.updateState({ countdown: data.seconds });
          break;
        case "start_game":
          this.updateState({
            map: data.map,
            view: "game",
            players: data.players,
          });
          break;
        case "nickname_taken":
          alert("Nickname already taken!");
          ws.close();
          break;
        case "chat":
          this.updateState({
            messages: [
              ...this.state.messages,
              {
                nickname: data.nickname,
                message: data.message,
                timestamp: data.timestamp,
              },
            ],
          });
          break;
      }
    };

    ws.onclose = () => {
      this.updateState({ view: "nickname" });
    };
  },
  render() {
    const mainContent = (() => {
      switch (this.state.view) {
        case "nickname":
          return h(NicknameEntry, {
            on: {
              "nickname-submitted": (nickname) => this.handleNickname(nickname),
            },
          });
        case "waiting":
          return h(WaitingRoom, {
            playerCount: this.state.playerCount,
            countdown: this.state.countdown,
          });
        case "game":
          return h(GameComponent, {
            nickname: this.state.nickname,
            ws: this.state.ws,
            players: this.state.players,
            map: this.state.map,
          });
        default:
          return h("div", {}, ["Loading..."]);
      }
    })();

    const chatComponent =
      this.state.view !== "nickname"
        ? h(ChatComponent, {
            ws: this.state.ws,
            nickname: this.state.nickname,
            messages: this.state.messages,
          })
        : null;

    return h("div", { class: "app-container" }, [mainContent, chatComponent]);
  },
});

export default App;
