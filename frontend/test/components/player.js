import { defineComponent, h } from "../../../framework/src/index.js";
import {
  TILE_SIZE,
  SPRITE_DIRECTIONS,
  PLAYER_STATES,
} from "../constants/game-constants.js";
import { checkCollision, getTilePosition } from "../utils/collision.js";

export const PlayerComponent = defineComponent({
  state() {
    return {
      x: 0,
      y: 0,
      direction: "down",
      frame: 0,
      speed: PLAYER_STATES.speed,
      isDying: false,
      activeKeys: new Set(),
    };
  },

  onMounted() {
    console.log(this.props);
    this.x = this.props.player.x;
    this.y = this.props.player.y;
    if (this.props.isCurrentPlayer) {
      window.addEventListener("keydown", this.handleKeyDown.bind(this));
      window.addEventListener("keyup", this.handleKeyUp.bind(this));

      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
    }
    this.lastAnimationTime = 0;
    this.frameInterval = 150;
  },

  handleKeyDown(event) {
    this.state.activeKeys.add(event.key);
    if (event.key === " ") {
      // Implement bomb placement later
      event.preventDefault();
    }
  },

  handleKeyUp(event) {
    this.state.activeKeys.delete(event.key);
  },

  animate(timestamp) {
    if (!this.state.isDying) {
      const deltaTime = (timestamp - (this.lastTimestamp || timestamp)) / 1000;
      this.lastTimestamp = timestamp;
      this.updatePosition(deltaTime);
    }
    requestAnimationFrame(this.animate);
  },

  updatePosition(deltaTime) {
    const lastKey = Array.from(this.state.activeKeys).pop();
    if (!lastKey) {
      this.updateState({ frame: 0 });
      return;
    }

    let newX = this.state.x;
    let newY = this.state.y;
    let direction = this.state.direction;

    const row = getTilePosition(this.state.y);
    const col = getTilePosition(this.state.x);

    const surroundings = checkCollision(
      this.state.x,
      this.state.y,
      this.props.tiles
    );

    switch (lastKey) {
      case "ArrowUp":
      case "w":
        if (surroundings.up) {
          direction = "up";
          newY -= this.state.speed * deltaTime;
        }
        break;
      case "ArrowDown":
      case "s":
        if (surroundings.down) {
          direction = "down";
          newY += this.state.speed * deltaTime;
        }
        break;
      case "ArrowLeft":
      case "a":
        if (surroundings.left) {
          direction = "left";
          newX -= this.state.speed * deltaTime;
        }
        break;
      case "ArrowRight":
      case "d":
        if (surroundings.right) {
          direction = "right";
          newX += this.state.speed * deltaTime;
        }
        break;
    }

    const snapThreshold = TILE_SIZE / 4;
    const xOffset = newX % TILE_SIZE;
    const yOffset = newY % TILE_SIZE;

    if (xOffset < snapThreshold)
      newX = Math.floor(newX / TILE_SIZE) * TILE_SIZE;
    if (xOffset > TILE_SIZE - snapThreshold)
      newX = Math.ceil(newX / TILE_SIZE) * TILE_SIZE;
    if (yOffset < snapThreshold)
      newY = Math.floor(newY / TILE_SIZE) * TILE_SIZE;
    if (yOffset > TILE_SIZE - snapThreshold)
      newY = Math.ceil(newY / TILE_SIZE) * TILE_SIZE;

    if (newX !== this.state.x || newY !== this.state.y) {
      const currentTime = performance.now();
      if (currentTime - this.lastAnimationTime > this.frameInterval) {
        this.updateState({
          frame: (this.state.frame + 1) % 4,
          x: newX,
          y: newY,
          direction,
        });
        this.lastAnimationTime = currentTime;
      } else {
        this.updateState({ x: newX, y: newY, direction });
      }
    }
  },

  render() {
    const spritePosition = `-${this.state.frame * TILE_SIZE}px -${
      SPRITE_DIRECTIONS[this.state.direction] * TILE_SIZE
    }px`;

    return h(
      "div",
      {
        className: `player ${this.props.isCurrentPlayer ? "current" : ""} ${
          this.state.isDying ? "player-death" : ""
        }`,
        style: {
          transform: `translate(${this.props.player.x}px, ${this.props.player.y}px)`,
          backgroundPosition: spritePosition,
        },
      },
      []
    );
  },
});
