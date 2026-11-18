// The public help center's screens. Code outside this folder imports only from here. Its data
// comes from `@/lib/help-center-data`, which only the server may load.
export { ArticleView, type ArticleViewProps } from "./components/article-view";
export { Breadcrumbs, type Crumb } from "./components/breadcrumbs";
export { ArticleList, CollectionGrid, iconOf } from "./components/collection-grid";
export { HelpChatLauncher } from "./components/help-chat";
export { HelpFooter } from "./components/help-footer";
export {
  HelpHomePreview,
  type HelpHomePreviewProps,
  type PreviewCollection,
} from "./components/help-home-preview";
export { HelpHeader, type HelpHeaderProps } from "./components/help-header";
export { JsonLd } from "./components/json-ld";
export { countArticles } from "./format";
export { helpMetadata, type HelpPage } from "./metadata";
export { articlePath, canonicalUrl, collectionPath, HELP_PATH, searchPath } from "./urls";
