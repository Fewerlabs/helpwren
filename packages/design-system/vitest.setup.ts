import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// Browser APIs that Radix primitives and Sonner use and jsdom does not implement.
class ResizeObserverStub implements ResizeObserver {
  observe(): void {
    // Layout never changes in jsdom, so there is nothing to observe.
  }
  unobserve(): void {
    // See observe().
  }
  disconnect(): void {
    // See observe().
  }
}

globalThis.ResizeObserver = ResizeObserverStub;
Element.prototype.hasPointerCapture = () => false;
Element.prototype.setPointerCapture = () => undefined;
Element.prototype.releasePointerCapture = () => undefined;
Element.prototype.scrollIntoView = () => undefined;

// Every screen is wide unless a test says otherwise, by stubbing its own.
window.matchMedia = (query: string) =>
  // The components listen with addEventListener, which EventTarget gives; the deprecated
  // addListener and removeListener the type still lists are never called.
  Object.assign(new EventTarget(), {
    matches: false,
    media: query,
    onchange: null,
  }) as MediaQueryList;
