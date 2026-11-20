// Kept apart from the hooks so the server-rendered layout can use it.

/** Where the footer's "Animations" switch is remembered. */
export const MOTION_STORAGE_KEY = "helpwren-site:motion";

/**
 * Runs in the head before the page paints, so a page with animations turned off never starts
 * one: it marks `<html data-motion-pref="off">`, which the stylesheet reads. With JavaScript
 * off, the drawings still draw themselves with CSS, and everything ends drawn.
 */
export const motionScript = `(function(){try{document.documentElement.dataset.motionPref=localStorage.getItem(${JSON.stringify(MOTION_STORAGE_KEY)})==="off"?"off":"on"}catch(e){}})()`;
