// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { SelectionController } from "../../src/renderer/selectionController.js";

describe("SelectionController", () => {
  let overlay;
  let squareElement;
  let onSelected;
  let controller;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="overlay" class="hidden">
        <div id="square"></div>
      </div>
    `;

    overlay = document.getElementById("overlay");
    squareElement = document.getElementById("square");
    onSelected = vi.fn();
    controller = new SelectionController({
      overlay,
      squareElement,
      boundsProvider: () => ({
        left: 0,
        top: 0,
        width: 600,
        height: 400
      }),
      onSelected,
      minimumSize: 48
    });
  });

  it("emits a normalized square after a valid drag", () => {
    controller.enable();
    overlay.dispatchEvent(new MouseEvent("mousedown", { clientX: 100, clientY: 120, bubbles: true }));
    window.dispatchEvent(new MouseEvent("mousemove", { clientX: 220, clientY: 200, bubbles: true }));
    window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    expect(onSelected).toHaveBeenCalledWith({
      x: 100,
      y: 120,
      size: 120
    });
    expect(overlay.classList.contains("hidden")).toBe(true);
  });

  it("upgrades undersized drags to the minimum supported square", () => {
    controller.enable();
    overlay.dispatchEvent(new MouseEvent("mousedown", { clientX: 40, clientY: 40, bubbles: true }));
    window.dispatchEvent(new MouseEvent("mousemove", { clientX: 60, clientY: 60, bubbles: true }));
    window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    expect(onSelected).toHaveBeenCalledWith({
      x: 40,
      y: 40,
      size: 48
    });
    expect(overlay.classList.contains("hidden")).toBe(true);
  });
});
