import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Inbox, 
  Loader2 
} from 'lucide-react';
import { ColumnDef, DataTableProps, TableDensity, PaginationState } from './types';
import { DataTableToolbar } from './DataTableToolbar';
import { DataTablePagination } from './DataTablePagination';

export function DataTable<T>({
  tableKey,
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyIcon,
  emptyTitle = 'Tidak Ada Data',
  emptyDescription = 'Belum ada data yang tersedia untuk ditampilkan dalam tabel ini.',
  emptyAction,
  defaultSortKey,
  defaultSortOrder = 'asc',
  onSortChange,
  pagination,
  clientPagination = true,
  initialPageSize = 25,
  title,
  subtitle,
  showToolbar = true,
  toolbarActions,
  showColumnVisibility = true,
  showDensityToggle = true,
  containerClassName = '',
  tableClassName = '',
  headerClassName = '',
  rowClassName,
}: DataTableProps<T>) {
  // 1. Table Density State (Persisted in localStorage)
  const [density, setDensity] = useState<TableDensity>(() => {
    try {
      const saved = localStorage.getItem(`datatable_density_${tableKey}`);
      return (saved === 'compact' || saved === 'normal') ? saved : 'normal';
    } catch {
      return 'normal';
    }
  });

  const handleDensityChange = (newDensity: TableDensity) => {
    setDensity(newDensity);
    try {
      localStorage.setItem(`datatable_density_${tableKey}`, newDensity);
    } catch {
      // Ignore localStorage errors
    }
  };

  // 2. Column Visibility State (Persisted in localStorage)
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`datatable_cols_${tableKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return new Set(parsed);
        }
      }
    } catch {
      // fallback
    }
    // Default: all columns visible
    return new Set(columns.map(c => c.key));
  });

  const handleToggleColumn = useCallback((key: string) => {
    setVisibleColumnKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        // Prevent hiding all columns (must have at least one visible)
        if (next.size > 1) {
          next.delete(key);
        }
      } else {
        next.add(key);
      }
      try {
        localStorage.setItem(`datatable_cols_${tableKey}`, JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  }, [tableKey]);

  const handleResetColumns = useCallback(() => {
    const allKeys = new Set(columns.map(c => c.key));
    setVisibleColumnKeys(allKeys);
    try {
      localStorage.removeItem(`datatable_cols_${tableKey}`);
    } catch {
      // ignore
    }
  }, [columns, tableKey]);

  // Filter columns based on visibility
  const displayedColumns = useMemo(() => {
    return columns.filter(col => visibleColumnKeys.has(col.key));
  }, [columns, visibleColumnKeys]);

  // 3. Sorting State (Client or Callback)
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);

  const handleSort = (key: string) => {
    let nextOrder: 'asc' | 'desc' = 'asc';
    if (sortKey === key) {
      nextOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    }
    setSortKey(key);
    setSortOrder(nextOrder);

    if (onSortChange) {
      onSortChange(key, nextOrder);
    }
  };

  // 4. Client-side Sort Logic
  const sortedData = useMemo(() => {
    if (!sortKey || onSortChange) {
      return data;
    }

    const col = columns.find(c => c.key === sortKey);
    if (!col) return data;

    return [...data].sort((a: any, b: any) => {
      let valA = col.accessorKey ? a[col.accessorKey] : a[sortKey];
      let valB = col.accessorKey ? b[col.accessorKey] : b[sortKey];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
        return sortOrder === 'asc' ? cmp : -cmp;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortOrder, columns, onSortChange]);

  // 5. Client-side Pagination State (if server-side pagination is not supplied)
  const [clientCurrentPage, setClientCurrentPage] = useState(1);
  const [clientPageSize, setClientPageSize] = useState(initialPageSize);

  // Reset page when data length changes significantly
  useEffect(() => {
    if (!pagination) {
      setClientCurrentPage(1);
    }
  }, [data.length, pagination]);

  const activePagination: PaginationState = useMemo(() => {
    if (pagination) {
      return pagination;
    }
    return {
      currentPage: clientCurrentPage,
      pageSize: clientPageSize,
      totalCount: sortedData.length,
      hasNextPage: clientCurrentPage * clientPageSize < sortedData.length,
      hasPrevPage: clientCurrentPage > 1,
      onPageChange: (newPage: number) => setClientCurrentPage(newPage),
      onPageSizeChange: (newSize: number) => {
        setClientPageSize(newSize);
        setClientCurrentPage(1);
      },
    };
  }, [pagination, clientCurrentPage, clientPageSize, sortedData.length]);

  // Slice data if in clientPagination mode
  const currentPagedData = useMemo(() => {
    if (pagination && !clientPagination) {
      return sortedData;
    }
    const startIndex = (activePagination.currentPage - 1) * activePagination.pageSize;
    return sortedData.slice(startIndex, startIndex + activePagination.pageSize);
  }, [sortedData, pagination, clientPagination, activePagination.currentPage, activePagination.pageSize]);

  // 6. Horizontal Scroll Overflow Detection
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    checkScrollability();

    el.addEventListener('scroll', checkScrollability, { passive: true });
    window.addEventListener('resize', checkScrollability);

    return () => {
      el.removeEventListener('scroll', checkScrollability);
      window.removeEventListener('resize', checkScrollability);
    };
  }, [checkScrollability, displayedColumns, currentPagedData]);

  // Padding classes according to density
  const cellPadding = density === 'compact' ? 'py-2 px-3 text-[11px]' : 'py-3.5 px-4 text-xs';
  const headerPadding = density === 'compact' ? 'py-2.5 px-3 text-[10px]' : 'py-3.5 px-4 text-[11px]';

  return (
    <div className={`bg-[#13151c] rounded-2xl border border-[#232734] shadow-md overflow-hidden flex flex-col relative ${containerClassName}`}>
      {/* Top Toolbar */}
      {showToolbar && (
        <DataTableToolbar
          tableKey={tableKey}
          columns={columns}
          visibleColumnKeys={visibleColumnKeys}
          onToggleColumn={handleToggleColumn}
          onResetColumns={handleResetColumns}
          density={density}
          onChangeDensity={handleDensityChange}
          title={title}
          subtitle={subtitle}
          toolbarActions={toolbarActions}
          showColumnVisibility={showColumnVisibility}
          showDensityToggle={showDensityToggle}
        />
      )}

      {/* Horizontal Scroll Shadows / Indicators */}
      <div className="relative w-full overflow-hidden flex-1">
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-black/50 to-transparent pointer-events-none z-30 transition-opacity duration-200" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-black/50 to-transparent pointer-events-none z-30 transition-opacity duration-200" />
        )}

        {/* Main Table Scroll Container */}
        <div 
          ref={scrollContainerRef}
          className="overflow-x-auto custom-scrollbar w-full"
        >
          <table className={`w-full text-left border-collapse ${tableClassName}`}>
            {/* Sticky Table Header */}
            <thead className="sticky top-0 z-20 bg-[#0e1015]/95 backdrop-blur-md border-b border-[#232734]">
              <tr className={`text-[#8e96a8] font-bold uppercase tracking-wider ${headerClassName}`}>
                {displayedColumns.map((col) => {
                  const isLeftSticky = col.sticky === 'left';
                  const isRightSticky = col.sticky === 'right';

                  let stickyClasses = '';
                  if (isLeftSticky) {
                    stickyClasses = 'sticky left-0 z-25 bg-[#0e1015] border-r border-[#232734] shadow-[4px_0_8px_-3px_rgba(0,0,0,0.5)]';
                  } else if (isRightSticky) {
                    stickyClasses = 'sticky right-0 z-25 bg-[#0e1015] border-l border-[#232734] shadow-[-4px_0_8px_-3px_rgba(0,0,0,0.5)]';
                  }

                  const alignClass = 
                    col.align === 'center' ? 'text-center' : 
                    col.align === 'right' ? 'text-right' : 'text-left';

                  return (
                    <th
                      key={col.key}
                      className={`${headerPadding} ${alignClass} ${col.width || ''} ${stickyClasses} select-none transition-colors whitespace-nowrap`}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(col.key)}
                          className={`inline-flex items-center space-x-1.5 font-bold hover:text-blue-400 cursor-pointer transition-colors ${
                            col.align === 'center' ? 'justify-center mx-auto' :
                            col.align === 'right' ? 'justify-end ml-auto' : ''
                          }`}
                          title="Klik untuk mengurutkan"
                        >
                          <span>{col.header}</span>
                          {sortKey === col.key ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5 text-blue-400" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5 text-blue-400" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 text-[#50586c] opacity-60 group-hover:opacity-100" />
                          )}
                        </button>
                      ) : (
                        <span>{col.header}</span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-[#1f2330]">
              {loading ? (
                <tr>
                  <td colSpan={displayedColumns.length} className="py-20 text-center text-[#8e96a8]">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Loader2 className="h-7 w-7 text-blue-400 animate-spin" />
                      <p className="font-semibold text-xs text-[#c2c7d0]">Memuat data tabel...</p>
                    </div>
                  </td>
                </tr>
              ) : currentPagedData.length === 0 ? (
                <tr>
                  <td colSpan={displayedColumns.length} className="py-16 text-center text-[#8e96a8]">
                    <div className="max-w-md mx-auto space-y-3 px-4">
                      <div className="p-3 bg-[#181a24] rounded-2xl w-fit mx-auto border border-[#272d3e] text-blue-400">
                        {emptyIcon || <Inbox className="h-7 w-7" />}
                      </div>
                      <p className="font-bold text-[#f1f3f7] text-sm">{emptyTitle}</p>
                      <p className="text-xs text-[#8e96a8] leading-relaxed">
                        {emptyDescription}
                      </p>
                      {emptyAction && <div className="pt-1">{emptyAction}</div>}
                    </div>
                  </td>
                </tr>
              ) : (
                currentPagedData.map((row, rowIndex) => {
                  const rowKey = keyExtractor 
                    ? keyExtractor(row, rowIndex) 
                    : (row as any)?.id || (row as any)?.kd_med || (row as any)?.no_psb || rowIndex;

                  const customRowClass = rowClassName ? rowClassName(row, rowIndex) : '';

                  return (
                    <tr
                      key={rowKey}
                      className={`hover:bg-[#181b24]/90 transition-colors group ${customRowClass}`}
                    >
                      {displayedColumns.map((col) => {
                        const isLeftSticky = col.sticky === 'left';
                        const isRightSticky = col.sticky === 'right';

                        let stickyClasses = '';
                        if (isLeftSticky) {
                          stickyClasses = 'sticky left-0 z-10 bg-[#13151c] group-hover:bg-[#181b24] border-r border-[#232734] shadow-[4px_0_8px_-3px_rgba(0,0,0,0.5)]';
                        } else if (isRightSticky) {
                          stickyClasses = 'sticky right-0 z-10 bg-[#13151c] group-hover:bg-[#181b24] border-l border-[#232734] shadow-[-4px_0_8px_-3px_rgba(0,0,0,0.5)]';
                        }

                        const alignClass = 
                          col.align === 'center' ? 'text-center' : 
                          col.align === 'right' ? 'text-right' : 'text-left';

                        // Value evaluation
                        let cellContent: React.ReactNode = null;
                        if (col.render) {
                          cellContent = col.render(row, rowIndex);
                        } else if (col.accessorKey) {
                          const val = (row as any)[col.accessorKey];
                          cellContent = val !== undefined && val !== null ? String(val) : '-';
                        } else {
                          const val = (row as any)[col.key];
                          cellContent = val !== undefined && val !== null ? String(val) : '-';
                        }

                        // Truncation if text
                        const isSimpleString = typeof cellContent === 'string';
                        const shouldTruncate = col.truncate ?? false;

                        return (
                          <td
                            key={col.key}
                            className={`${cellPadding} ${alignClass} ${col.width || ''} ${stickyClasses} transition-colors`}
                          >
                            {shouldTruncate && isSimpleString ? (
                              <div 
                                className="truncate max-w-[220px]" 
                                title={cellContent}
                              >
                                {cellContent}
                              </div>
                            ) : (
                              cellContent
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Pagination Footer */}
      <DataTablePagination
        pagination={activePagination}
        displayedCount={currentPagedData.length}
      />
    </div>
  );
}
