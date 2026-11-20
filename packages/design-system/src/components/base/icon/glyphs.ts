// Single icons for components sent to the browser that need only a few (with `IconGlyph`). Each
// comes from its own file in the icon library, so a page that imports these downloads these icons
// and not the whole set (importing them from `registry` would bring every icon in the registry).
// The registry and this file are the only ones allowed to import the icon library.
export { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
export { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
export { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
export { DesktopIcon } from "@phosphor-icons/react/dist/ssr/Desktop";
export { MoonIcon } from "@phosphor-icons/react/dist/ssr/Moon";
export { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
