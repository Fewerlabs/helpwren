// Kept apart from the theme's hooks so the root layout, which renders on the server, can use it.

/** Where the choice of theme is kept in the browser. */
export const THEME_STORAGE_KEY = "helpwren:theme";

/**
 * Run before the page paints, so a dark page never flashes light. Only the team's screens
 * follow the choice: the chat and the help center are shown to visitors, in the brand's look.
 */
export const themeScript = `(function(){try{var p=location.pathname;if(p.indexOf("/dashboard")!==0&&p!=="/login")return;var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="dark"||(t===null&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}})()`;
