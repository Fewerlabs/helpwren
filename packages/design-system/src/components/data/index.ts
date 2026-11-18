// Components that fetch through TanStack Query. They know nothing about endpoints:
// the caller supplies the key and the function. They need a QueryClientProvider.
export {
  QueryDetail,
  type QueryDetailMessages,
  type QueryDetailProps,
  type QueryDetailState,
} from "./query-detail";
export {
  QueryList,
  type QueryListMessages,
  type QueryListPage,
  type QueryListPagination,
  type QueryListProps,
  type QueryListRequest,
  type QueryListState,
} from "./query-list";
export type { QueryBehaviour, QueryErrorContext } from "./query-states";
