import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight 
} from 'lucide-react';
import { PaginationState } from './types';

interface DataTablePaginationProps {
  pagination: PaginationState;
  displayedCount: number;
}

export const DataTablePagination: React.FC<DataTablePaginationProps> = ({
  pagination,
  displayedCount,
}) => {
  const {
    currentPage,
    pageSize,
    totalCount,
    hasNextPage,
    hasPrevPage,
    onPageChange,
    onPageSizeChange,
    onNextPage,
    onPrevPage,
  } = pagination;

  const totalPages = totalCount !== undefined ? Math.ceil(totalCount / pageSize) : undefined;
  
  // Calculate display range
  const startItem = totalCount === 0 || displayedCount === 0 
    ? 0 
    : (currentPage - 1) * pageSize + 1;
    
  const endItem = totalCount !== undefined 
    ? Math.min(currentPage * pageSize, totalCount)
    : startItem + displayedCount - 1;

  const canGoPrev = hasPrevPage !== undefined ? hasPrevPage : currentPage > 1;
  const canGoNext = hasNextPage !== undefined ? hasNextPage : (totalPages !== undefined ? currentPage < totalPages : displayedCount >= pageSize);

  const handlePrev = () => {
    if (!canGoPrev) return;
    if (onPrevPage) {
      onPrevPage();
    } else if (onPageChange) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (!canGoNext) return;
    if (onNextPage) {
      onNextPage();
    } else if (onPageChange) {
      onPageChange(currentPage + 1);
    }
  };

  const handleFirst = () => {
    if (currentPage <= 1) return;
    if (onPageChange) onPageChange(1);
  };

  const handleLast = () => {
    if (totalPages && currentPage < totalPages && onPageChange) {
      onPageChange(totalPages);
    }
  };

  return (
    <div className="p-3.5 sm:p-4 bg-[#0e1015] border-t border-[#232734] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8e96a8]">
      {/* Left: Range Info */}
      <div className="flex items-center space-x-2">
        <span>
          Menampilkan{' '}
          <strong className="text-[#f1f3f7] font-mono">
            {displayedCount === 0 ? 0 : `${startItem} - ${endItem}`}
          </strong>
          {totalCount !== undefined && (
            <>
              {' '}dari <strong className="text-[#f1f3f7] font-mono">{totalCount}</strong> data
            </>
          )}
        </span>
      </div>

      {/* Right: Page Size Selector & Navigation Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Page Size Selector */}
        {onPageSizeChange && (
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] text-[#6b7280]">Baris per hal:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="py-1 px-2 bg-[#141722] border border-[#272d3e] text-[#e0e4eb] rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        )}

        {/* Page Counter Badge */}
        <div className="text-[11px] text-[#8e96a8] font-mono">
          Halaman <strong className="text-[#f1f3f7]">{currentPage}</strong>
          {totalPages !== undefined && <span> dari {totalPages || 1}</span>}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center space-x-1">
          {totalPages !== undefined && (
            <button
              type="button"
              onClick={handleFirst}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg bg-[#141722] border border-[#272d3e] text-[#c2c7d0] hover:text-[#f1f3f7] hover:bg-[#1b202e] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Halaman Pertama"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={handlePrev}
            disabled={!canGoPrev}
            className="p-1.5 rounded-lg bg-[#141722] border border-[#272d3e] text-[#c2c7d0] hover:text-[#f1f3f7] hover:bg-[#1b202e] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center space-x-1"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-[11px] font-medium pr-1">Prev</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext}
            className="p-1.5 rounded-lg bg-[#141722] border border-[#272d3e] text-[#c2c7d0] hover:text-[#f1f3f7] hover:bg-[#1b202e] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center space-x-1"
            title="Halaman Selanjutnya"
          >
            <span className="hidden sm:inline text-[11px] font-medium pl-1">Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          {totalPages !== undefined && (
            <button
              type="button"
              onClick={handleLast}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg bg-[#141722] border border-[#272d3e] text-[#c2c7d0] hover:text-[#f1f3f7] hover:bg-[#1b202e] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Halaman Terakhir"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
