import {
  clampSquareToBounds,
  makeSquareFromDrag,
  squareIsValid
} from "../shared/selectionMath.js";

export class SelectionController {
  constructor(options) {
    this.overlay = options.overlay;
    this.squareElement = options.squareElement;
    this.boundsProvider = options.boundsProvider;
    this.onSelected = options.onSelected;
    this.minimumSize = options.minimumSize ?? 48;
    this.dragState = null;

    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
  }

  enable() {
    this.overlay.classList.remove("hidden");
    this.overlay.addEventListener("mousedown", this.handleMouseDown);
  }

  disable() {
    this.overlay.classList.add("hidden");
    this.overlay.removeEventListener("mousedown", this.handleMouseDown);
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mouseup", this.handleMouseUp);
    this.dragState = null;
    this.renderSquare(null);
  }

  handleMouseDown(event) {
    const bounds = this.boundsProvider();
    const startPoint = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top
    };

    this.dragState = { startPoint };
    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("mouseup", this.handleMouseUp);
  }

  handleMouseMove(event) {
    if (!this.dragState) {
      return;
    }

    const bounds = this.boundsProvider();
    const nextSquare = clampSquareToBounds(
      makeSquareFromDrag(this.dragState.startPoint, {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top
      }),
      bounds,
      this.minimumSize
    );

    this.dragState.square = nextSquare;
    this.renderSquare(nextSquare);
  }

  handleMouseUp() {
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mouseup", this.handleMouseUp);

    const selectedSquare = this.dragState?.square ?? null;
    this.dragState = null;

    if (squareIsValid(selectedSquare, this.minimumSize)) {
      this.onSelected(selectedSquare);
      this.disable();
      return;
    }

    this.renderSquare(null);
  }

  renderSquare(square) {
    if (!square) {
      this.squareElement.style.display = "none";
      return;
    }

    this.squareElement.style.display = "block";
    this.squareElement.style.left = `${square.x}px`;
    this.squareElement.style.top = `${square.y}px`;
    this.squareElement.style.width = `${square.size}px`;
    this.squareElement.style.height = `${square.size}px`;
  }
}
