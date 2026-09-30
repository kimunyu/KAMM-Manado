import { ReactNode } from 'react';

export type TableDensity = 'compact' | 'normal' | 'relaxed';

export interface Column<T> {
  key: string;
  header: string | ReactNode;
  accessorKey?: string;
  render?: (item: T, index: number) => ReactNode;
  sortable?: boolean;
  hideable?: boolean;
  sticky?: 'left' | 'right' | boolean;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
  truncate?: boolean;
  className?: string;
  headerClassName?: string;
}


export type ColumnDef<T> = Column<T>;

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalCount?: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onNextPage?: () => void;
  onPrevPage?: () => void;
}



export interface DataTableProps<T> {
  tableKey?: string;
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor?: (item: T, index: number) => string | number;
  loading?: boolean;
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  defaultSortKey?: string;
  defaultSortOrder?: 'asc' | 'desc';
  onSortChange?: (key: string, order: 'asc' | 'desc') => void;
  pagination?: PaginationState;
  clientPagination?: boolean;
  initialPageSize?: number;
  title?: string | ReactNode;
  subtitle?: string | ReactNode;
  showToolbar?: boolean;
  toolbarActions?: ReactNode;
  showColumnVisibility?: boolean;
  showDensityToggle?: boolean;
  containerClassName?: string;
  tableClassName?: string;
  headerClassName?: string;
  rowClassName?: (item: T, index: number) => string;
  searchPlaceholder?: string;
  searchFilter?: (item: T, term: string) => boolean;
  pageSize?: number;
  initialSortKey?: string;
  initialSortDirection?: 'asc' | 'desc';
  headerActions?: ReactNode;
}

