import {
  defineComponent,
  h,
} from "../../../framework/src/index.js";
import { MapComponent } from "./map.js";
import { PlayerComponent } from "./player.js";

export const GameComponent = defineComponent({
  state() {
    return {
      players: [],
      currentPlayer: null,
      tiles: [],
      ws: null,
      activeKeys: [],
    };
  },

  onMounted() {
    this.updateState({
      players: this.props.players || [],
      currentPlayer: this.props.nickname || null,
      tiles: this.props.map,
      ws: this.props.ws,
    });

    this.firstElement.focus();

    if (this.props.ws) {
      const existingHandler = this.props.ws.onmessage;

      this.props.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (existingHandler) {
          existingHandler(event);
        }
        if (data.type === "start_game") {
          this.updateState({
            players: data.players,
            tiles: data.map,
          });
        } else if (data.type === "player_move") {
          this.handlePlayerMove(data);
        }
      };
    }
  },

  handleKeyDown(event) {
    if (!this.state.activeKeys.includes(event.key)) {
      this.updateState({
        activeKeys: [...this.state.activeKeys, event.key],
      });
    }
  },

  handleKeyUp(event) {
    const index = this.state.activeKeys.indexOf(event.key);
    if (index !== -1) {
      const newKeys = [...this.state.activeKeys];
      newKeys.splice(index, 1);
      this.updateState({ activeKeys: newKeys });
    }
  },

  handlePlayerMove(data) {
    this.updateState({
      players: this.state.players.map((p) =>
        p.nickname === data.nickname
          ? {
              ...p,
              x: data.position.x,
              y: data.position.y,
              direction: data.position.direction,
              frame: data.position.frame,
            }
          : p
      ),
    });
  },

  onMapUpdate(tiles) {
    if (!this.state.tiles) {
      this.updateState({ tiles: tiles });
    }
  },

  render() {
    return h(
      "div",
      {
        class: "game-container",
        tabIndex: "0",
        on: {
          keydown: (event) => this.handleKeyDown(event),
          keyup: (event) => this.handleKeyUp(event),
        },
      },
      [
        h(
          MapComponent,
          {
            tiles: this.state.tiles,
          },
          this.state.tiles
            ? this.state.players.map((player) =>
                h(PlayerComponent, {
                  ws: this.state.ws,
                  key: player.nickname,
                  player,
                  tiles: this.state.tiles,
                  isCurrentPlayer: player.nickname === this.state.currentPlayer,
                  activeKeys: this.state.activeKeys,
                })
              )
            : []
        ),
      ]
    );
  },
});
