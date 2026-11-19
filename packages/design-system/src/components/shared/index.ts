// The shared layer's public API: composed pieces built only from base components.
export { AppLoader, type AppLoaderProps } from "./app-loader/app-loader";
export { ArticleCard, type ArticleCardProps } from "./article-card/article-card";
export {
  CodeSnippet,
  type CodeSnippetProps,
  type CodeSnippetTab,
} from "./code-snippet/code-snippet";
export {
  ConversationListItem,
  type ConversationListItemProps,
} from "./conversation-list-item/conversation-list-item";
export { EmptyState, type EmptyStateProps } from "./empty-state/empty-state";
export { Highlight, type HighlightProps } from "./highlight/highlight";
export { IconPicker, type IconPickerProps } from "./icon-picker/icon-picker";
export { MarginNote, type MarginNoteProps } from "./margin-note/margin-note";
export { MessageBubble, type MessageBubbleProps } from "./message-bubble/message-bubble";
export { PageHeader, type PageHeaderProps } from "./page-header/page-header";
export {
  RichText,
  richTextHeadings,
  safeHref,
  type RichTextHeading,
  type RichTextMark,
  type RichTextNode,
  type RichTextProps,
} from "./rich-text/rich-text";
export { RichTextEditor, type RichTextEditorProps } from "./rich-text-editor/rich-text-editor";
export { SearchField, type SearchFieldProps } from "./search-field/search-field";
export {
  TypingIndicator,
  typingLabel,
  type TypingIndicatorProps,
} from "./typing-indicator/typing-indicator";
