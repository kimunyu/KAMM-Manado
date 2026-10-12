import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Inbox, 
  Loader2 
} from 'lucide-react';
import { ColumnDef, DataTableProps, TableDensity, TableViewMode, PaginationState } from './types';
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
  showViewModeToggle = true,
  viewMode: viewModeProp,
  defaultViewMode,
  onViewModeChange,
  renderCard,
  cardGridClassName = '',
  containerClassName = '',
  tableClassName = '',
  headerClassName = '',
  rowClassName,
}: DataTableProps<T>) {
  // 1. View Mode State: 'card' (Mobile-friendly) or 'table' (Spreadsheet)
  const [internalViewMode, setInternalViewMode] = useState<TableViewMode>(() => {
    if (viewModeProp) return viewModeProp;
    try {
      const saved = localStorage.getItem(`datatable_viewmode_${tableKey}`);
      if (saved === 'card' || saved === 'table') return saved;
    } catch {
      // ignore
    }
    if (defaultViewMode) return defaultViewMode;
    // Auto-detect mobile: default to 'card' on mobile (< 768px), 'table' on desktop
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'card';
    }
    return 'table';
  });

  const activeViewMode = viewModeProp || internalViewMode;

  const handleViewModeChange = (mode: TableViewMode) => {
    setInternalViewMode(mode);
    onViewModeChange?.(mode);
    try {
      localStorage.setItem(`datatable_viewmode_${tableKey}`, mode);
    } catch {
      // ignore
    }
  };

  // 2. Table Density State (Persisted in localStorage)
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
          viewMode={activeViewMode}
          onChangeViewMode={handleViewModeChange}
          showViewModeToggle={showViewModeToggle}
          title={title}
          subtitle={subtitle}
          toolbarActions={toolbarActions}
          showColumnVisibility={showColumnVisibility}
          showDensityToggle={showDensityToggle}
        />
      )}

      {/* Main Content: Card View (Mobile/Responsive) OR Table View (Desktop/Spreadsheet) */}
      {activeViewMode === 'card' ? (
        <div className="flex-1 p-3.5 sm:p-4">
          {loading ? (
            <div className="py-20 text-center text-[#8e96a8]">
              <div className="flex flex-col items-center justify-center space-y-3">
                <Loader2 className="h-7 w-7 text-blue-400 animate-spin" />
                <p className="font-semibold text-xs text-[#c2c7d0]">Memuat data...</p>
              </div>
            </div>
          ) : currentPagedData.length === 0 ? (
            <div className="py-16 text-center text-[#8e96a8]">
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
            </div>
          ) : (
            <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 ${cardGridClassName}`}>
              {currentPagedData.map((row, rowIndex) => {
                const rowKey = keyExtractor 
                  ? keyExtractor(row, rowIndex) 
                  : (row as any)?.firestore_id 
                    || (row as any)?.id 
                    || ((row as any)?.temp_id ? `${(row as any)?.kd_med || 'ROW'}_${(row as any)?.temp_id}` : null)
                    || ((row as any)?.kd_med ? `${(row as any)?.kd_med}_${rowIndex}` : null)
                    || (row as any)?.no_psb 
                    || rowIndex;

                if (renderCard) {
                  return (
                    <React.Fragment key={rowKey}>
                      {renderCard(row, rowIndex, { displayedColumns, visibleColumnKeys })}
                    </React.Fragment>
                  );
                }

                // Built-in Adaptive Fallback Card Generator:
                const primaryCol = displayedColumns[0];
                const actionCol = displayedColumns.find(c => c.key === 'actions' || c.key === 'action' || c.key === 'aksi');
                const otherCols = displayedColumns.filter(c => c !== primaryCol && c !== actionCol);

                return (
                  <div 
                    key={rowKey}
                    className="bg-[#12141c] hover:bg-[#161925] border border-[#232734] hover:border-blue-900/40 rounded-2xl p-4 shadow-md transition-all flex flex-col justify-between space-y-3"
                  >
                    {/* Card Header: Primary column & Actions */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#1f2330]">
                      {primaryCol && (
                        <div>
                          {primaryCol.render ? primaryCol.render(row, rowIndex) : (
                            <span className="font-bold text-white text-sm">
                              {String((row as any)[primaryCol.accessorKey || primaryCol.key] ?? '-')}
                            </span>
                          )}
                        </div>
                      )}
                      {actionCol && (
                        <div className="shrink-0">
                          {actionCol.render ? actionCol.render(row, rowIndex) : null}
                        </div>
                      )}
                    </div>

                    {/* Card Fields */}
                    <div className="space-y-2 text-xs flex-1">
                      {otherCols.map(col => {
                        let val: React.ReactNode = null;
                        if (col.render) {
                          val = col.render(row, rowIndex);
                        } else if (col.accessorKey) {
                          const raw = (row as any)[col.accessorKey];
                          val = raw !== undefined && raw !== null ? String(raw) : '-';
                        } else {
                          const raw = (row as any)[col.key];
                          val = raw !== undefined && raw !== null ? String(raw) : '-';
                        }

                        return (
                          <div key={col.key} className="flex items-start justify-between gap-3 py-0.5 border-b border-[#181a24]/60 last:border-0">
                            <span className="text-[#8e96a8] text-[11px] font-medium shrink-0">
                              {col.header}
                            </span>
                            <div className="text-right text-[#f1f3f7] font-medium max-w-[65%]">
                              {val}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Horizontal Scroll Shadows / Indicators & Table View */
        <div className="relative w-full overflow-hidden flex-1">
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-black/50 to-transparent pointer-events-none z-30 transition-opacity duration-200" />
          )}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-black/50 to-transparent pointer-events-none z-30 transition-opacity duration-200" />
          )}

          {/* Mobile Table Scroll Hint */}
          <div className="md:hidden px-3.5 py-1.5 bg-[#0b0d12] border-b border-[#1f2330] text-[10px] text-[#8e96a8] flex items-center justify-between">
            <span>💡 Geser tabel ke samping untuk melihat seluruh kolom</span>
            <span className="text-blue-400 font-bold">↔ Geser</span>
          </div>

          {/* Main Table Scroll Container */}
          <div 
            ref={scrollContainerRef}
            className="overflow-x-auto custom-scrollbar w-full"
          >
            <table className={`w-full text-left border-collapse min-w-[760px] ${tableClassName}`}>
              {/* Sticky Table Header */}
              <thead className="sticky top-0 z-20 bg-[#0e1015]/95 backdrop-blur-md border-b border-[#232734]">
                <tr className={`text-[#8e96a8] font-bold uppercase tracking-wider ${headerClassName}`}>
                  {displayedColumns.map((col) => {
                    const isLeftSticky = col.sticky === 'left';
                    const isRightSticky = col.sticky === 'right';

                    let stickyClasses = '';
                    if (isLeftSticky) {
                      stickyClasses = 'md:sticky md:left-0 z-10 md:z-25 bg-[#0e1015] border-r border-[#232734] md:shadow-[4px_0_8px_-3px_rgba(0,0,0,0.5)]';
                    } else if (isRightSticky) {
                      stickyClasses = 'md:sticky md:right-0 z-10 md:z-25 bg-[#0e1015] border-l border-[#232734] md:shadow-[-4px_0_8px_-3px_rgba(0,0,0,0.5)]';
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
                      : (row as any)?.firestore_id 
                        || (row as any)?.id 
                        || ((row as any)?.temp_id ? `${(row as any)?.kd_med || 'ROW'}_${(row as any)?.temp_id}` : null)
                        || ((row as any)?.kd_med ? `${(row as any)?.kd_med}_${rowIndex}` : null)
                        || (row as any)?.no_psb 
                        || rowIndex;

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
                            stickyClasses = 'md:sticky md:left-0 z-10 bg-[#13151c] group-hover:bg-[#181b24] border-r border-[#232734] md:shadow-[4px_0_8px_-3px_rgba(0,0,0,0.5)]';
                          } else if (isRightSticky) {
                            stickyClasses = 'md:sticky md:right-0 z-10 bg-[#13151c] group-hover:bg-[#181b24] border-l border-[#232734] md:shadow-[-4px_0_8px_-3px_rgba(0,0,0,0.5)]';
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
                                  title={typeof cellContent === 'string' ? cellContent : undefined}
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
      )}

      {/* Bottom Pagination Footer */}
      <DataTablePagination
        pagination={activePagination}
        displayedCount={currentPagedData.length}
      />
    </div>
  );
}
