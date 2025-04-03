import { defineComponent, h } from "../../../framework/src/index.js";
import { MapComponent } from "./map.js";
import { PlayerComponent } from "./player.js";

export const GameComponent = defineComponent({
  state() {
    return {
      players: [],
      currentPlayer: null,
      tiles: [],
      ws: null,
    };
  },

  onMounted() {
    this.updateState({
      players: this.props.players || [],
      currentPlayer: this.props.nickname || null,
      tiles: this.props.map,
      ws: this.props.ws,
    });

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
          this.handlePlayerMove(data.position);
        }
      };
    }
  },

  handlePlayerMove(position) {
    // Update other players' positions
    this.updateState({
      players: this.state.players.map((p) =>
        p.nickname === position.nickname
          ? {
              ...p,
              x: position.x,
              y: position.y,
              direction: position.direction,
              frame: position.frame
            }
          : p
      ),
    });
  },

  onMapUpdate(tiles) {
    if (!this.state.mapTiles) {
      this.updateState({ tiles: tiles });
    }
  },

  render() {
    return h("div", { class: "game-container" }, [
      h(
        MapComponent,
        {
          tiles: this.state.tiles,
        },
        // Only check for tiles, not mapTiles
        this.state.tiles
          ? this.state.players.map((player) =>
              h(PlayerComponent, {
                ws: this.state.ws,
                key: player.nickname,
                player,
                tiles: this.state.tiles,
                isCurrentPlayer: player.nickname === this.state.currentPlayer,
              })
            )
          : []
      ),
    ]);
  },
});
