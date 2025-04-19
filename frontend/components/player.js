import { defineComponent, h } from "https://unpkg.com/obsydianjs@latest";
import { TILE_SIZE, SPRITE_DIRECTIONS, BOMB_CONFIG } from "../constants/game-constants.js";
import { checkCollision, canPlaceBomb } from "../utils/collision.js";

export const PlayerComponent = defineComponent({
  state() {
    return {
      x: 0,
      y: 0,
      direction: "down",
      frame: 0,
      speed: 150,
      isDying: false,
      row: 1,
      col: 1,
      lastAnimationTime: 0,
      moving: false,
      witness: false,
      // Bomb-related state
      bombLimit: BOMB_CONFIG.defaultLimit,
      bombsPlaced: 0,
      bombRange: BOMB_CONFIG.defaultRange,
      lastBombTime: 0,
      bombCooldown: 500  // Prevent rapid bomb placement
    };
  },

  onMounted() {
    if (typeof this.props.ref === 'function') {
      this.props.ref(this);
    }

    this.updateState({
      x: this.props.player.x,
      y: this.props.player.y,
    });

    if (this.props.isCurrentPlayer) {
      this.animate = this.animate.bind(this);
      this.animate();
    }
  },

  resetPlayer() {
    this.updateState({
      isDying: false,
      x: TILE_SIZE,
      y: TILE_SIZE,
      col: 1,
      row: 1,
      direction: "down",
      frame: 0,
      bombsPlaced: 0
    });
  },

  animate(timestamp) {
    if (!this.state.isDying) {
      const deltaTime = (timestamp - (this.lastTimestamp || timestamp)) / 1000;
      this.lastTimestamp = timestamp;
      this.update(deltaTime);
    }
    requestAnimationFrame(this.animate);
  },

  sendPlayerMoves(newState) {
    this.props.ws.send(
      JSON.stringify({
        nickname: this.props.player.nickname,
        type: "player_move",
        position: {
          x: newState.x,
          y: newState.y,
          frame: newState.frame,
          direction: newState.direction,
        },
      })
    );
  },

  placeBomb() {
    if (this.state.bombsPlaced >= this.state.bombLimit) {
      return;
    }

    const row = Math.round(this.state.y / TILE_SIZE);
    const col = Math.round(this.state.x / TILE_SIZE);


    if (!canPlaceBomb(row, col, this.props.tiles)) {
      return;
    }

    const currentTime = performance.now();
    if (currentTime - this.state.lastBombTime < this.state.bombCooldown) {
      return;
    }

    this.updateState({
      bombsPlaced: this.state.bombsPlaced + 1,
      lastBombTime: currentTime
    });

    this.emit("bomb-placed", {
      row,
      col,
      range: this.state.bombRange,
      nickname: this.props.player.nickname
    });

    this.props.ws.send(
      JSON.stringify({
        type: "bomb_placed",
        nickname: this.props.player.nickname,
        position: {
          row,
          col,
          range: this.state.bombRange
        }
      })
    );
  },

  handleBombCompleted() {
    this.updateState({ bombsPlaced: Math.max(0, this.state.bombsPlaced - 1) });
  },

  upgrade(powerupType) {
    switch (powerupType) {
      case 3: // Bomb powerup
        this.updateState({ bombLimit: this.state.bombLimit + 1 });
        break;
      case 4: // Flame powerup
        this.updateState({ bombRange: this.state.bombRange + 1 });
        break;
      case 5: // Speed powerup
        this.updateState({ speed: this.state.speed + 25 });
        break;
    }
  },

  update(deltaTime) {
    if (this.state.isDying) return;

    if (this.props.activeKeys.length === 0 && !this.state.witness) {
      this.updateState({ frame: 0, witness: true });
      let newState = { ...this.state };
      this.sendPlayerMoves(newState);
      return;
    }

    if (this.props.activeKeys.includes(" ")) {
      this.placeBomb();
      // Remove spacebar from active keys to prevent continuous bomb placement
      const index = this.props.activeKeys.indexOf(" ") !== -1
        ? this.props.activeKeys.indexOf(" ")
        : this.props.activeKeys.indexOf("Spacebar");
      if (index !== -1) {
        this.props.activeKeys.splice(index, 1);
      }
    }

    const lastKey = this.props.activeKeys[this.props.activeKeys.length - 1];
    const threshold = TILE_SIZE / 2;

    let row =
      this.state.y % TILE_SIZE > threshold
        ? Math.ceil(this.state.y / TILE_SIZE)
        : Math.floor(this.state.y / TILE_SIZE);

    let col =
      this.state.x % TILE_SIZE > threshold
        ? Math.ceil(this.state.x / TILE_SIZE)
        : Math.floor(this.state.x / TILE_SIZE);

    let surroundings;
    let newState = { ...this.state };

    switch (lastKey) {
      case "ArrowUp":
      case "w":
        row = Math.ceil(newState.y / TILE_SIZE);
        newState.direction = "up";
        surroundings = checkCollision(row, col, this.props.tiles);
        if (surroundings.up) {
          if (newState.x % TILE_SIZE > threshold) {
            newState.x = Math.ceil(newState.x / TILE_SIZE) * TILE_SIZE;
          } else {
            newState.x = Math.floor(newState.x / TILE_SIZE) * TILE_SIZE;
          }
          newState.y -= this.state.speed * deltaTime;
        } else {
          newState.y = Math.ceil(newState.y / TILE_SIZE) * TILE_SIZE;
        }
        this.state.moving = true;
        break;
      case "ArrowDown":
      case "s":
        newState.direction = "down";
        row = Math.floor(newState.y / TILE_SIZE);
        surroundings = checkCollision(row, col, this.props.tiles);
        if (surroundings.down) {
          if (newState.x % TILE_SIZE > threshold) {
            newState.x = Math.ceil(newState.x / TILE_SIZE) * TILE_SIZE;
          } else {
            newState.x = Math.floor(newState.x / TILE_SIZE) * TILE_SIZE;
          }
          newState.y += this.state.speed * deltaTime;
        } else {
          newState.y = Math.floor(newState.y / TILE_SIZE) * TILE_SIZE;
        }
        this.state.moving = true;
        break;
      case "ArrowLeft":
      case "a":
        newState.direction = "left";
        col = Math.ceil(newState.x / TILE_SIZE);
        surroundings = checkCollision(row, col, this.props.tiles);
        if (surroundings.left) {
          if (newState.y % TILE_SIZE > threshold) {
            newState.y = Math.ceil(newState.y / TILE_SIZE) * TILE_SIZE;
          } else {
            newState.y = Math.floor(newState.y / TILE_SIZE) * TILE_SIZE;
          }
          newState.x -= this.state.speed * deltaTime;
        } else {
          newState.x = Math.ceil(newState.x / TILE_SIZE) * TILE_SIZE;
        }
        this.state.moving = true;
        break;
      case "ArrowRight":
      case "d":
        newState.direction = "right";
        col = Math.floor(newState.x / TILE_SIZE);
        surroundings = checkCollision(row, col, this.props.tiles);
        if (surroundings.right) {
          if (newState.y % TILE_SIZE > threshold) {
            newState.y = Math.ceil(newState.y / TILE_SIZE) * TILE_SIZE;
          } else {
            newState.y = Math.floor(newState.y / TILE_SIZE) * TILE_SIZE;
          }
          newState.x += this.state.speed * deltaTime;
        } else {
          newState.x = Math.floor(newState.x / TILE_SIZE) * TILE_SIZE;
        }
        this.state.moving = true;
        break;
    }

    if (this.state.moving) {
      const currentTime = performance.now();
      newState.row = Math.round(newState.y / TILE_SIZE);
      newState.col = Math.round(newState.x / TILE_SIZE);

      if (currentTime - this.state.lastAnimationTime > 150) {
        newState.frame = (newState.frame + 1) % 4;
        newState.lastAnimationTime = currentTime;
      }
      newState.witness = false;
      this.sendPlayerMoves(newState);
    }

    this.updateState(newState);
    this.emit("update-player", {
      newState: {
        x: newState.x,
        y: newState.y,
        row: newState.row,
        col: newState.col
      }
    });
  },

  hitPlayer() {
    console.log("Player hit");
  },

  render() {
    const spritePosition = `-${(this.props.isCurrentPlayer
      ? this.state.frame
      : this.props.player.frame) * TILE_SIZE
      }px -${SPRITE_DIRECTIONS[
      this.props.isCurrentPlayer
        ? this.state.direction
        : this.props.player.direction
      ] * TILE_SIZE
      }px`;

    return h(
      "div",
      {
        class: `player ${this.props.isCurrentPlayer ? "current" : ""} ${this.state.isDying ? "player-death" : ""
          }`,
        style: {
          transform: `translate(${this.props.isCurrentPlayer ? this.state.x : this.props.player.x
            }px, ${this.props.isCurrentPlayer ? this.state.y : this.props.player.y
            }px)`,
          backgroundPosition: spritePosition,
        },
      },
      []
    );
  },
});