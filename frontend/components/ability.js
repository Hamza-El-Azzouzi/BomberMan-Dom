import { defineComponent, h } from "https://unpkg.com/obsydianjs@latest";

export const AbilityComponent = defineComponent({
  render() {
    const size = this.props.TILE_SIZE * 0.65;
    const offset = (this.props.TILE_SIZE - size) / 2;
    const x = this.props.col * this.props.TILE_SIZE + offset;
    const y = this.props.row * this.props.TILE_SIZE + offset;

    return h(
      "div",
      {
        style: {
          position: "absolute",
          transform: `translate(${x}px, ${y}px)`,
          width: `${size}px`,
          height: `${size}px`,
        },
      },
      [
        h("img", {
          class: "ability " + this.props.type,
          src: `./assets/abilities/${this.props.type}.png`,
          style: {
            width: `${size}px`,
            height: `${size}px`,
            position: "fixed",
          },
        }),
      ]
    );
  },
});
