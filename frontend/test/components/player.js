import { defineComponent, h } from "../../../framework/src/index.js";
import { TILE_SIZE, SPRITE_DIRECTIONS } from "../constants/game-constants.js";
import { checkCollision } from "../utils/collision.js";

export const PlayerComponent = defineComponent({
  state() {
    return {
      x: 0,
      y: 0,
      direction: "down",
      frame: 0,
      speed: 150,
      isDying: false,
      activeKeys: [],
      row: 1,
      col: 1,
      lastAnimationTime: 0,
      moving: false,
    };
  },

  onMounted() {
    this.updateState({
      x: this.props.player.x || 0,
      y: this.props.player.y || 0,
      frame: this.props.frame || 0,
      direction: this.props.direction || "down",
    });
    if (this.props.isCurrentPlayer) {
      document.addEventListener("keydown", this.handleKeyDown.bind(this));
      document.addEventListener("keyup", this.handleKeyUp.bind(this));
      document.addEventListener("keydown", this.handleBombPlacement.bind(this));

      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
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

  handleBombPlacement(event) {
    if (event.key === " " && !this.state.isDying) {
      event.preventDefault();
      //todo Implement bomb placement later
    }
  },

  killPlayer() {
    this.updateState({ isDying: true });
    const resetAfterAnimation = () => {
      this.resetPlayer();
      this.$el.removeEventListener("animationend", resetAfterAnimation);
    };
    this.$el.addEventListener("animationend", resetAfterAnimation);
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

  update(deltaTime) {
    if (this.state.isDying) return;

    if (this.state.activeKeys.length === 0) {
      this.updateState({ frame: 0 });
      return;
    }

    const lastKey = this.state.activeKeys[this.state.activeKeys.length - 1];
    const threshold = TILE_SIZE / 2;
    let moving = false;

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
        //case "w":
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
        }
        moving = true;
        break;
      case "ArrowDown":
        //case "s":
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
        }
        moving = true;
        break;
      case "ArrowLeft":
        //case "a":
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
        }
        moving = true;
        break;
      case "ArrowRight":
        //case "d":
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
        }
        moving = true;
        break;
    }

    if (moving) {
      const currentTime = performance.now();
      newState.row = Math.round(newState.y / TILE_SIZE);
      newState.col = Math.round(newState.x / TILE_SIZE);

      if (currentTime - this.state.lastAnimationTime > 150) {
        newState.frame = (newState.frame + 1) % 4;
        newState.lastAnimationTime = currentTime;
      }

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
      console.log(this.props.ws);
    } else {
      newState.frame = 0;
    }

    this.updateState(newState);
  },

  render() {
    const spritePosition = `-${
      (this.props.isCurrentPlayer
        ? this.state.frame
        : this.props.player.frame || 0) * TILE_SIZE
    }px -${
      SPRITE_DIRECTIONS[
        this.props.isCurrentPlayer
          ? this.state.direction
          : this.props.player.direction || "down"
      ] * TILE_SIZE
    }px`;

    return h(
      "div",
      {
        class: `player ${this.props.isCurrentPlayer ? "current" : ""} ${
          this.state.isDying ? "player-death" : ""
        }`,
        style: {
          transform: `translate(${
            this.props.isCurrentPlayer ? this.state.x : this.props.player.x
          }px, ${
            this.props.isCurrentPlayer ? this.state.y : this.props.player.y
          }px)`,
          backgroundPosition: spritePosition,
        },
      },
      []
    );
  },
});
