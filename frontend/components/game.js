import {
  defineComponent,
  h,
} from "https://unpkg.com/obsydianjs@latest";
import { MapComponent } from "./map.js";
import { PlayerComponent } from "./player.js";
import { BombComponent } from "./bomb.js";
import { ExplosionComponent } from "./explosion.js";
import { TILE_SIZE, TILE_TYPES } from "../constants/game-constants.js";
import { calculateExplosion, isPlayerInExplosion, isTileBreakable } from "../utils/collision.js";
import { getRandomAbility } from "../utils/abilities.js"
import { AbilityComponent } from "./ability.js";
import { HudComponent } from "./hud.js";
import { GameOverComponent } from "./gameOver.js";

export const GameComponent = defineComponent({
  state() {
    return {
      players: [],
      gameOver: false,
      winner: null,
      currentPlayer: null,
      currentPlayerData: {},
      tiles: [],
      ws: null,
      activeKeys: [],
      bombs: [],
      explosions: [],
      abilities: [],
      lives: 3,
    };
  },

  onMounted() {
    let currentPlayerData

    this.props.players.forEach(player => {
      if (player.nickname === this.props.nickname) {
        currentPlayerData = player;
      }
    });

    this.updateState({
      players: this.props.players,
      currentPlayer: this.props.nickname,
      currentPlayerData: currentPlayerData,
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
            this.handleBombPlaced({
              row: data.position.row,
              col: data.position.col,
              range: data.position.range,
              nickname: data.nickname
            });
            break;
          case "explosion":
            this.handleExplosion({
              row: data.row,
              col: data.col,
              range: data.range,
              owner: data.owner
            });
            break;
          case "block_destroyed":
            this.handleBlockDestroyed(data);
            break;
          case "player_hit":
            this.handlePlayerHit(data);
            break;
          case "ability":
            this.handleCommingAbilities(data)
            break;
          case "player_killed":
            this.handleRemotePlayerKilled(data)
            break;
          default:
            console.log("Unhandled message:", data);
        }
      };
    }
  },

  handleRemotePlayerKilled(data) {
    if (data.livesLeft === 0) {
      const newPlayers = this.state.players.filter(player => player.nickname != data.nickname)

      this.updateState({
        players: newPlayers,
      })
    } else {
      const playerComponent = this.getPlayerComponent(data.nickname);
      if (playerComponent) {
        playerComponent.state.isWaving = true

        playerComponent.updateState({
          isWaving: true
        })

        setTimeout(() => {
          playerComponent.updateState({ isWaving: false })
        }, 4000)
      }

    }
  },

  handleCommingAbilities(data) {
    switch (data.action) {
      case "add":
        this.state.abilities.push(data.ability);
        break;
      case "remove":
        const newAbilities = this.state.abilities.filter(a => a.id !== data.ability.id);
        this.updateState({
          abilities: newAbilities
        });
        break;
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
    if (bombData.nickname === this.state.currentPlayer) {
      this.props.ws.send(
        JSON.stringify({
          type: "bomb_placed",
          nickname: bombData.nickname,
          position: {
            row: bombData.row,
            col: bombData.col,
            range: bombData.range,
          }
        })
      );
    }

    const newBombs = [...this.state.bombs];
    const bombId = `bomb-${Date.now()}-${bombData.row}-${bombData.col}`;

    newBombs.push({
      id: bombId,
      row: bombData.row,
      col: bombData.col,
      range: bombData.range,
      owner: bombData.nickname,
      timestamp: Date.now()
    });

    const newTiles = [...this.state.tiles];
    newTiles[bombData.row][bombData.col] = TILE_TYPES.BOMB;

    this.updateState({
      bombs: newBombs,
      tiles: newTiles
    });
  },

  handleExplosion(explosionData) {
    const { row, col, range } = explosionData;
    const newBombs = this.state.bombs.filter(
      bomb => !(bomb.row === row && bomb.col === col)
    );
    const newTiles = [...this.state.tiles];
    newTiles[row][col] = TILE_TYPES.EMPTY;
    const explosions = calculateExplosion(row, col, range, this.state.tiles);

    explosions.forEach(explosion => {
      const newExplosions = [...this.state.explosions];
      newExplosions.push({
        id: `explosion-${Date.now()}-${explosion.row}-${explosion.col}`,
        row: explosion.row,
        col: explosion.col,
        direction: explosion.direction,
        timestamp: Date.now()
      });

      if (isTileBreakable(newTiles[explosion.row][explosion.col])) {
        newTiles[explosion.row][explosion.col] = TILE_TYPES.EMPTY;
        if (explosionData.owner === this.state.currentPlayer) {
          const abilityType = getRandomAbility()
          if (abilityType) {
            const ability = {
              row: explosion.row,
              col: explosion.col,
              type: abilityType,
              id: `ability-${Date.now()}-${explosion.row}-${explosion.col}`,
            }

            this.state.abilities.push(ability);

            this.props.ws.send(
              JSON.stringify({
                type: "ability",
                ability: ability,
                action: "add",
                nickname: this.state.currentPlayer
              })
            );
          }
        }
      }

      this.updateState({
        bombs: newBombs,
        explosions: newExplosions,
        tiles: newTiles
      });
    });

    this.state.players.forEach(player => {
      if (player.nickname === this.state.currentPlayer) {
        const playerRow = Math.round(player.y / TILE_SIZE);
        const playerCol = Math.round(player.x / TILE_SIZE);

        if (isPlayerInExplosion(playerRow, playerCol, explosions)) {
          this.getPlayerComponent(player.nickname).hitPlayer();

          this.props.ws.send(
            JSON.stringify({
              type: "player_hit",
              nickname: player.nickname
            })
          );
        }
      }
    });

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
    const newExplosions = this.state.explosions.filter(
      explosion => !(explosion.row === explosionData.row && explosion.col === explosionData.col)
    );

    this.updateState({
      explosions: newExplosions
    });
  },

  handleBlockDestroyed(data) {
    const newTiles = [...this.state.tiles];
    newTiles[data.position.row][data.position.col] = data.position.newTile;

    this.updateState({
      tiles: newTiles
    });
  },

  handlePlayerHit(data) {
    const playerComponent = this.getPlayerComponent(data.nickname);
    if (playerComponent) {
      // playerComponent.killPlayer();
    }
  },

  handleBombRemoved(bombData) {
    const newBombs = this.state.bombs.filter(
      bomb => !(bomb.row === bombData.row && bomb.col === bombData.col)
    );

    this.updateState({
      bombs: newBombs
    });
  },

  getPlayerComponent(nickname) {
    return this[`player-${nickname}`];
  },

  handlePlayerUpdate(data) {
    this.updateState({
      players: this.state.players.map(player =>
        player.nickname === this.state.currentPlayer
          ? {
            ...player,
            x: data.newState.x,
            y: data.newState.y
          }
          : player
      )
    });
  },

  handlePlayerGetKilled(nickname) {
    let states = {
      type: "player_killed",
      nickname: nickname,
      livesLeft: 0
    }

    if (this.state.lives > 1) {
      states.livesLeft = this.state.lives - 1
      this.props.ws.send(
        JSON.stringify(states)
      );

      this.updateState({
        lives: this.state.lives - 1
      })
    } else {
      this.props.ws.send(
        JSON.stringify(states)
      );


      const newPlayers = this.state.players.filter(player => player.nickname != nickname)
      this.updateState({
        players: newPlayers,
        lives: 0
      })
    }
  },

  handlePickupAbility(data) {
    const ability = this.state.abilities.find(ability => ability.id === data.id);
    if (ability) {
      const newAbilities = this.state.abilities.filter(a => a.id !== data.id);
      this.updateState({
        abilities: newAbilities
      });
      // TODO : Notify other players about the ability pickup using ws

      this.props.ws.send(
        JSON.stringify({
          type: "ability",
          ability: ability,
          action: "remove",
          nickname: this.state.currentPlayer
        })
      );
    }
  },

  render() {
    if (!this.state.gameOver && this.state.players?.length === 1) {
      this.updateState({
        gameOver: true,
        winner: this.state.players[0].nickname,
      })
    }

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
        h(HudComponent, {
          currentPlayer: this.state.currentPlayerData,
          lives: this.state.lives,
          gameOver: this.state.gameOver,
        }),
        h(GameOverComponent, {
          visible: this.state.gameOver,
          winner: this.state.winner,
          currentPlayer: this.state.currentPlayer,
          isCurrentPlayerWinner: this.state.winner === this.state.currentPlayer,
          // onPlayAgain: () => this.handlePlayAgain()
        }),
        h(
          MapComponent,
          {
            tiles: this.state.tiles,
          },
          [
            ...this.state.players.map((player) =>
              h(PlayerComponent, {
                ws: this.state.ws,
                key: player.nickname,
                player,
                tiles: this.state.tiles,
                isCurrentPlayer: player.nickname === this.state.currentPlayer,
                activeKeys: this.state.activeKeys,
                abilities: this.state.abilities,
                ref: (component) => {
                  this[`player-${player.nickname}`] = component;
                },
                on: {
                  "bomb-placed": (bombData) => this.handleBombPlaced(bombData),
                  "ability-pickup": (data) => this.handlePickupAbility(data),
                  "update-player": (data) => this.handlePlayerUpdate(data),
                  "player-killed": (nickname) => this.handlePlayerGetKilled(nickname),
                }
              })
            ),

            ...this.state.bombs.map(bomb =>
              h(BombComponent, {
                ws: this.state.ws,
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
            ),
            ...this.state.abilities.map(ability =>
              h(AbilityComponent, {
                key: ability.id,
                row: ability.row,
                col: ability.col,
                type: ability.type,
              })
            ),
          ]
        ),
      ]
    );
  },
});