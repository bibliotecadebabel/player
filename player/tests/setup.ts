class MockResizeObserver {
  observe(): void {}

  unobserve(): void {}

  disconnect(): void {}
}

if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = MockResizeObserver as typeof ResizeObserver;
}

if (!('PointerEvent' in globalThis)) {
  globalThis.PointerEvent = MouseEvent as typeof PointerEvent;
}
