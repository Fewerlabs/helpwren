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
  type QueryListFooterOptions,
  type QueryListState,
} from "./query-list";
export {
  QueryTable,
  type QueryTableMessages,
  type QueryTableProps,
  type QueryTableReorder,
} from "./query-table";
export type { QueryBehaviour, QueryErrorContext } from "./query-states";
