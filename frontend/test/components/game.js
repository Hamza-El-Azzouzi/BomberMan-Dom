import {
  defineComponent,
  h,
} from "../../../framework/src/index.js";
import { MapComponent } from "./map.js";
import { PlayerComponent } from "./player.js";
import { BombComponent } from "./bomb.js";
import { ExplosionComponent } from "./explosion.js";
import { TILE_SIZE, TILE_TYPES } from "../constants/game-constants.js";
import { calculateExplosion, isPlayerInExplosion, isTileBreakable } from "../utils/collision.js";

export const GameComponent = defineComponent({
  state() {
    return {
      players: [],
      currentPlayer: null,
      tiles: [],
      ws: null,
      activeKeys: [],
      bombs: [],
      explosions: [],
    };
  },

  onMounted() {
    this.updateState({
      players: this.props.players,
      currentPlayer: this.props.nickname,
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
        switch (data.type) {
          case "player_move":
            this.handlePlayerMove(data);
            break;
          case "bomb_placed":
            if (data.nickname !== this.state.currentPlayer) {
              this.handleRemoteBombPlaced(data);
            }
            break;
          case "block_destroyed":
            this.handleBlockDestroyed(data);
            break;
          case "player_hit":
            this.handlePlayerHit(data);
            break;
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

  handleBombPlaced(bombData) {
    // Add bomb to the list
    const newBombs = [...this.state.bombs];
    newBombs.push({
      id: `bomb-${Date.now()}-${bombData.row}-${bombData.col}`,
      row: bombData.row,
      col: bombData.col,
      range: bombData.range,
      owner: bombData.nickname,
      timestamp: Date.now()
    });

    // Update the tiles grid to mark bomb position
    const newTiles = [...this.state.tiles];
    newTiles[bombData.row][bombData.col] = TILE_TYPES.BOMB;

    this.updateState({
      bombs: newBombs,
      tiles: newTiles
    });
  },

  handleRemoteBombPlaced(data) {
    this.handleBombPlaced({
      row: data.position.row,
      col: data.position.col,
      range: data.position.range,
      nickname: data.nickname
    });
  },

  handleExplosion(explosionData) {
    const { row, col, range } = explosionData;

    // Remove the bomb
    const newBombs = this.state.bombs.filter(
      bomb => !(bomb.row === row && bomb.col === col)
    );

    // Update the tile to be empty instead of bomb
    const newTiles = [...this.state.tiles];
    newTiles[row][col] = TILE_TYPES.EMPTY;

    // Calculate explosion area
    const explosions = calculateExplosion(row, col, range, this.state.tiles);

    // Process each explosion tile
    explosions.forEach(explosion => {
      const newExplosions = [...this.state.explosions];
      newExplosions.push({
        id: `explosion-${Date.now()}-${explosion.row}-${explosion.col}`,
        row: explosion.row,
        col: explosion.col,
        direction: explosion.direction,
        timestamp: Date.now()
      });

      // Check if explosion hits a destructible block
      if (isTileBreakable(newTiles[explosion.row][explosion.col])) {
        newTiles[explosion.row][explosion.col] = TILE_TYPES.EMPTY;

        // Broadcast block destruction
        this.props.ws.send(
          JSON.stringify({
            type: "block_destroyed",
            position: {
              row: explosion.row,
              col: explosion.col,
              newTile: newTiles[explosion.row][explosion.col]
            }
          })
        );
      }

      this.updateState({
        bombs: newBombs,
        explosions: newExplosions,
        tiles: newTiles
      });
    });

    // Check if any player is hit by the explosion
    this.state.players.forEach(player => {
      if (player.nickname === this.state.currentPlayer) {
        const playerRow = Math.round(player.y / TILE_SIZE);
        const playerCol = Math.round(player.x / TILE_SIZE);

        if (isPlayerInExplosion(playerRow, playerCol, explosions)) {
          this.getPlayerComponent(player.nickname).hitPlayer();

          // Notify other players
          this.props.ws.send(
            JSON.stringify({
              type: "player_hit",
              nickname: player.nickname
            })
          );
        }
      }
    });

    // If this explosion was from current player's bomb, update their bomb count
    if (explosionData.owner === this.state.currentPlayer) {
      const playerComponent = this.getPlayerComponent(this.state.currentPlayer);
      if (playerComponent) {
        setTimeout(() => {
          playerComponent.handleBombCompleted();
        }, 1000)
      }
    }
  },

  handleExplosionComplete(explosionData) {
    // Remove explosion from the list
    const newExplosions = this.state.explosions.filter(
      explosion => !(explosion.row === explosionData.row && explosion.col === explosionData.col)
    );

    this.updateState({
      explosions: newExplosions
    });
  },

  handleBlockDestroyed(data) {
    // Update the tile
    const newTiles = [...this.state.tiles];
    newTiles[data.position.row][data.position.col] = data.position.newTile;

    this.updateState({
      tiles: newTiles
    });
  },

  handlePlayerHit(data) {
    // Find the player component and trigger kill animation
    const playerComponent = this.getPlayerComponent(data.nickname);
    if (playerComponent) {
      // playerComponent.killPlayer();
    }
  },

  handleBombRemoved(bombData) {
    // Remove bomb from the state
    const newBombs = this.state.bombs.filter(
      bomb => !(bomb.row === bombData.row && bomb.col === bombData.col)
    );

    this.updateState({
      bombs: newBombs
    });
  },

  getPlayerComponent(nickname) {
    // This method will be used to access player component instances
    // The component reference will be available after rendering
    return this[`player-${nickname}`];
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
          [
            // Render players
            ...this.state.players.map((player) =>
              h(PlayerComponent, {
                ws: this.state.ws,
                key: player.nickname,
                player,
                tiles: this.state.tiles,
                isCurrentPlayer: player.nickname === this.state.currentPlayer,
                activeKeys: this.state.activeKeys,
                ref: (component) => {
                  this[`player-${player.nickname}`] = component;
                },
                on: {
                  "bomb-placed": (bombData) => this.handleBombPlaced(bombData)
                }
              })
            ),

            // Render bombs
            ...this.state.bombs.map(bomb =>
              h(BombComponent, {
                key: bomb.id,
                row: bomb.row,
                col: bomb.col,
                owner: bomb.owner,
                range: bomb.range,
                on: {
                  "explosion": (data) => this.handleExplosion({ ...data, owner: bomb.owner }),
                  "bomb-removed": (data) => this.handleBombRemoved(data)
                }
              })
            ),

            // Render explosions
            ...this.state.explosions.map(explosion =>
              h(ExplosionComponent, {
                key: explosion.id,
                row: explosion.row,
                col: explosion.col,
                direction: explosion.direction,
                on: {
                  "explosion-complete": (data) => this.handleExplosionComplete(data)
                }
              })
            )
          ]
        ),
      ]
    );
  },
});