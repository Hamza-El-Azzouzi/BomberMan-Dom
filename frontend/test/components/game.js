import { defineComponent, h } from "../../../framework/src/index.js";
import { MapComponent } from "./map.js";
import { PlayerComponent } from "./player.js";

export const GameComponent = defineComponent({
  state() {
    return {
      players: [],
      currentPlayer: null,
      mapTiles: null
    };
  },

  onMounted() {
    console.log(this.props);
    
    this.updateState({
      players: this.props.players || [],
      currentPlayer: this.props.nickname || null
    });

    if (this.props.ws) {
      const existingHandler = this.props.ws.onmessage;
      
      this.props.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (existingHandler) {
          existingHandler(event);
        }
        
        if (data.type === 'start_game' && data.players) {
          console.log('Received players:', data.players);
          this.updateState({ players: data.players });
        }
      };
    }
  },

  onMapUpdate(tiles) {
    if (!this.state.mapTiles) {
      this.updateState({ mapTiles: tiles });
    }
  },

  render() {
    return h("div", { class: "game-container" }, [
      h(MapComponent, { 
        on: { 'map-update': this.onMapUpdate.bind(this) }
      }, [
        ...(this.state.mapTiles ? this.state.players.map(player =>
          h(PlayerComponent, { 
            key: player.nickname,
            player,
            tiles: this.state.mapTiles,
            isCurrentPlayer: player.nickname === this.state.currentPlayer
          })
        ) : [])
      ])
    ]);
  }
});
