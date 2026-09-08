import React from 'react';

export type TableDensity = 'compact' | 'normal';

export interface ColumnDef<T> {
  key: string;
  header: string | React.ReactNode;
  accessorKey?: keyof T;
  sticky?: 'left' | 'right';
  sortable?: boolean;
  hideable?: boolean; // Default: true
  width?: string;     // Tailwind width class or css min-width, e.g. "w-40" or "min-w-[150px]"
  align?: 'left' | 'center' | 'right';
  truncate?: boolean; // If true, truncates text with tooltip
  render?: (row: T, index: number) => React.ReactNode;
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalCount?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  onPageChange?: (newPage: number) => void;
  onPageSizeChange?: (newSize: number) => void;
  onNextPage?: () => void;
  onPrevPage?: () => void;
}

export interface DataTableProps<T> {
  tableKey: string;                          // Unique key for localStorage persistence (e.g., 'mediators-table')
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor?: (item: T, index: number) => string | number;
  
  // Loading & Empty States
  loading?: boolean;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;

  // Sorting
  defaultSortKey?: string;
  defaultSortOrder?: 'asc' | 'desc';
  onSortChange?: (key: string, order: 'asc' | 'desc') => void;

  // Pagination
  // If provided, table operates in controlled/server-side pagination mode.
  // If omitted or clientPagination is true, table paginates the passed `data` array automatically.
  pagination?: PaginationState;
  clientPagination?: boolean;
  initialPageSize?: number;

  // Toolbar & Customization
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  showToolbar?: boolean;                     // Default: true
  toolbarActions?: React.ReactNode;          // Right slot for export, search, or custom buttons
  showColumnVisibility?: boolean;            // Default: true
  showDensityToggle?: boolean;               // Default: true
  
  // Styling
  containerClassName?: string;
  tableClassName?: string;
  headerClassName?: string;
  rowClassName?: (row: T, index: number) => string;
}
