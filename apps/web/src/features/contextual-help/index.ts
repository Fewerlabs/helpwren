// The public API of contextual help in the dashboard. Code outside this folder imports only
// from here. The server side, shared with the API routes, is in `@/lib/contextual-help`.
export {
  ContextualHelpSettings,
  type ContextualHelpSettingsProps,
} from "./components/contextual-help-settings";
