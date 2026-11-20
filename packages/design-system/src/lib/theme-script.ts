// Kept apart from the theme's hooks so a server-rendered layout can use it.

/** Where the choice of theme is kept in the browser. */
export const THEME_STORAGE_KEY = "helpwren:theme";

/**
 * A script to run in the page's head, before it paints, so a dark page never flashes light. It
 * applies the stored choice, or the device's preference until one is made. Pass `paths` to limit
 * it to addresses starting with one of them; without, it runs on every page.
 */
export function themeScript({ paths }: { paths?: readonly string[] } = {}): string {
  const guard =
    paths === undefined
      ? ""
      : `var p=location.pathname;if(!${JSON.stringify(paths)}.some(function(x){return p===x||p.indexOf(x+"/")===0}))return;`;
  return `(function(){try{${guard}var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="dark"||(t===null&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}})()`;
}
