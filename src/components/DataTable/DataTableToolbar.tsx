import React, { useState, useRef, useEffect } from 'react';
import { Columns, SlidersHorizontal, RotateCcw, Check, ChevronDown } from 'lucide-react';
import { ColumnDef, TableDensity } from './types';

interface DataTableToolbarProps<T> {
  tableKey: string;
  columns: ColumnDef<T>[];
  visibleColumnKeys: Set<string>;
  onToggleColumn: (key: string) => void;
  onResetColumns: () => void;
  density: TableDensity;
  onChangeDensity: (density: TableDensity) => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  toolbarActions?: React.ReactNode;
  showColumnVisibility?: boolean;
  showDensityToggle?: boolean;
}

export function DataTableToolbar<T>({
  columns,
  visibleColumnKeys,
  onToggleColumn,
  onResetColumns,
  density,
  onChangeDensity,
  title,
  subtitle,
  toolbarActions,
  showColumnVisibility = true,
  showDensityToggle = true,
}: DataTableToolbarProps<T>) {
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsColumnDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hideableColumns = columns.filter(c => c.hideable !== false);

  return (
    <div className="p-3.5 sm:p-4 border-b border-[#232734] bg-[#0e1015]/60 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      {/* Title & Subtitle or Left Slot */}
      <div>
        {title && <div className="text-sm font-bold text-[#f1f3f7] flex items-center space-x-2">{title}</div>}
        {subtitle && <div className="text-xs text-[#8e96a8] mt-0.5">{subtitle}</div>}
      </div>

      {/* Right Controls: Density, Column Visibility & Custom Actions */}
      <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
        {/* Custom Actions (e.g. Export, Import, Filter buttons) */}
        {toolbarActions && (
          <div className="flex items-center gap-2">
            {toolbarActions}
          </div>
        )}

        {/* Density Toggle */}
        {showDensityToggle && (
          <div className="flex items-center p-0.5 bg-[#141722] border border-[#272d3e] rounded-xl text-xs font-semibold text-[#8e96a8]">
            <button
              type="button"
              onClick={() => onChangeDensity('compact')}
              title="Kerapatan Padat (Compact)"
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1 ${
                density === 'compact'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'hover:text-[#c2c7d0] hover:bg-[#1f2433]'
              }`}
            >
              <SlidersHorizontal className="h-3 w-3" />
              <span className="hidden sm:inline">Padat</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeDensity('normal')}
              title="Kerapatan Normal (Standar)"
              className={`px-2.5 py-1 rounded-lg transition-all ${
                density === 'normal'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'hover:text-[#c2c7d0] hover:bg-[#1f2433]'
              }`}
            >
              <span className="hidden sm:inline">Normal</span>
            </button>
          </div>
        )}

        {/* Column Visibility Dropdown */}
        {showColumnVisibility && hideableColumns.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
              className="px-3 py-1.5 bg-[#141722] hover:bg-[#1b202e] border border-[#272d3e] text-[#c2c7d0] hover:text-[#f1f3f7] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
              title="Pengaturan Tampilan Kolom"
            >
              <Columns className="h-3.5 w-3.5 text-blue-400" />
              <span>Kelola Kolom</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-blue-950/80 text-blue-300 border border-blue-800/60 rounded-full font-mono font-bold">
                {visibleColumnKeys.size}/{columns.length}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isColumnDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isColumnDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#141722] border border-[#272d3e] rounded-xl shadow-2xl z-50 p-2 text-xs backdrop-blur-lg animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-[#232734] px-1">
                  <span className="font-bold text-[#f1f3f7]">Visibilitas Kolom</span>
                  <button
                    type="button"
                    onClick={onResetColumns}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center space-x-1 transition-colors"
                    title="Kembalikan ke kolom bawaan"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset</span>
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                  {hideableColumns.map(col => {
                    const isVisible = visibleColumnKeys.has(col.key);
                    const labelText = typeof col.header === 'string' ? col.header : col.key;

                    return (
                      <label
                        key={col.key}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#1b202e] cursor-pointer text-[#c2c7d0] transition-colors select-none"
                      >
                        <span className="truncate pr-2">{labelText}</span>
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                            isVisible
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'border-[#384056] bg-[#0d0e12]'
                          }`}
                        >
                          {isVisible && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={isVisible}
                          onChange={() => onToggleColumn(col.key)}
                        />
                      </label>
                    );
                  })}
                </div>
                <div className="pt-2 mt-1 border-t border-[#232734] text-[10px] text-[#6b7280] text-center">
                  Preferensi kolom disimpan otomatis
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
