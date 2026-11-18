// Kept apart from the theme's hooks so the root layout, which renders on the server, can use it.

/** Where the choice of theme is kept in the browser. */
export const THEME_STORAGE_KEY = "helpwren:theme";

/**
 * Run before the page paints, so a dark page never flashes light. The team's screens and the
 * help center follow the choice made with their theme buttons, and until one is made, what the
 * device prefers. The chat is left alone: it sits inside someone else's page.
 */
export const themeScript = `(function(){try{var p=location.pathname;if(p.indexOf("/dashboard")!==0&&p.indexOf("/help")!==0&&p!=="/login")return;var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="dark"||(t===null&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}})()`;
