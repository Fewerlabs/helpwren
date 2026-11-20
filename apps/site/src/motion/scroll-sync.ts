"use client";

/*
 * Things that must move in the same frame as the page, such as the fixed layer the wren flies
 * in. The motion engine calls them right after smooth scrolling has moved the page each frame,
 * so nothing lags a frame behind the content.
 */

const callbacks = new Set<() => void>();

/** Runs `callback` every frame, after the page has scrolled. Returns a function that stops it. */
export function afterScroll(callback: () => void): () => void {
  callbacks.add(callback);
  return () => {
    callbacks.delete(callback);
  };
}

/** Called by the engine once per frame, after Lenis. */
export function runAfterScroll() {
  for (const callback of callbacks) callback();
}
