import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Clock, 
  CalendarDays,
  Check
} from 'lucide-react';

interface SingleDatePickerProps {
  id?: string;
  value: string; // Format: DD/MM/YYYY
  onChange: (val: string) => void;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  minDate?: string; // DD/MM/YYYY
  maxDate?: string; // DD/MM/YYYY
  helperText?: string;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

// Helper to parse DD/MM/YYYY to Date object
function parseDDMMYYYY(str: string): Date | null {
  if (!str) return null;
  const trimmed = str.trim();
  
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        const date = new Date(y, m, d, 0, 0, 0, 0);
        if (!isNaN(date.getTime()) && date.getDate() === d) return date;
      }
    }
  }

  // Fallback ISO format YYYY-MM-DD
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        const date = new Date(y, m, d, 0, 0, 0, 0);
        if (!isNaN(date.getTime()) && date.getDate() === d) return date;
      }
    }
  }

  return null;
}

// Helper to format Date object to DD/MM/YYYY
function formatToDDMMYYYY(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export const SingleDatePicker: React.FC<SingleDatePickerProps> = ({
  id,
  value,
  onChange,
  label,
  disabled = false,
  required = false,
  placeholder = 'DD/MM/YYYY',
  className = '',
  helperText,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [dropUpward, setDropUpward] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const initialDate = parseDDMMYYYY(value) || new Date();
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth());
  const [typedInput, setTypedInput] = useState<string>(value || '');

  // Synchronize when external value changes
  useEffect(() => {
    setTypedInput(value || '');
    const parsed = parseDDMMYYYY(value);
    if (parsed) {
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    }
  }, [value]);

  // Smart positioning: check viewport distance to decide whether to open upward or downward
  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const spaceBelow = windowHeight - rect.bottom;
      // If remaining height below is less than 350px and above has more space, open upward
      if (spaceBelow < 350 && rect.top > 320) {
        setDropUpward(true);
      } else {
        setDropUpward(false);
      }
    }
  };

  const handleToggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      const parsed = parseDDMMYYYY(value);
      if (parsed) {
        setViewYear(parsed.getFullYear());
        setViewMonth(parsed.getMonth());
      }
    }
    setIsOpen(prev => !prev);
  };

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  // Handle direct manual typing in text field with auto slash
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw.length > 8) raw = raw.slice(0, 8);

    let formatted = raw;
    if (raw.length > 4) {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`;
    } else if (raw.length > 2) {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }

    setTypedInput(formatted);

    // If completely filled 10 characters (DD/MM/YYYY), validate and push to parent
    if (formatted.length === 10) {
      const parsed = parseDDMMYYYY(formatted);
      if (parsed) {
        onChange(formatted);
        setViewYear(parsed.getFullYear());
        setViewMonth(parsed.getMonth());
      }
    } else if (formatted.length === 0) {
      onChange('');
    }
  };

  const handleInputBlur = () => {
    if (typedInput && typedInput.length === 10) {
      const parsed = parseDDMMYYYY(typedInput);
      if (parsed) {
        onChange(typedInput);
      } else {
        // Revert to valid value if invalid
        setTypedInput(value || '');
      }
    } else if (typedInput && typedInput.length !== 10) {
      setTypedInput(value || '');
    }
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const newDate = new Date(viewYear, viewMonth, day);
    const formatted = formatToDDMMYYYY(newDate);
    onChange(formatted);
    setTypedInput(formatted);
    setIsOpen(false);
  };

  const handleQuickSelect = (date: Date) => {
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());
    const formatted = formatToDDMMYYYY(date);
    onChange(formatted);
    setTypedInput(formatted);
    setIsOpen(false);
  };

  const handleToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleQuickSelect(new Date());
  };

  const handleYesterday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    handleQuickSelect(yesterday);
  };

  // Build calendar matrix
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday

  const selectedDateObj = parseDDMMYYYY(value);
  const isSelected = (day: number) => {
    if (!selectedDateObj) return false;
    return (
      selectedDateObj.getDate() === day &&
      selectedDateObj.getMonth() === viewMonth &&
      selectedDateObj.getFullYear() === viewYear
    );
  };

  const todayObj = new Date();
  const isToday = (day: number) => {
    return (
      todayObj.getDate() === day &&
      todayObj.getMonth() === viewMonth &&
      todayObj.getFullYear() === viewYear
    );
  };

  // List of selectable years (e.g. current year - 5 to current year + 5)
  const currentYearNum = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYearNum - 5 + i);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Label Bar */}
      {label && (
        <label 
          htmlFor={id} 
          className="block text-xs font-semibold text-[#8e96a8] mb-1.5 flex items-center justify-between"
        >
          <span>
            {label} {required && <span className="text-red-400">*</span>}
          </span>
          {value && (
            <span className="text-[11px] text-purple-400 font-mono font-bold">
              {value}
            </span>
          )}
        </label>
      )}

      {/* Input Group: Direct Typing + Interactive Calendar Toggle Button */}
      <div 
        className={`relative flex items-center bg-[#181a24] border rounded-xl transition-all ${
          disabled
            ? 'opacity-60 cursor-not-allowed border-[#272d3e]'
            : isOpen
            ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-md shadow-purple-950/20'
            : 'border-[#272d3e] hover:border-[#3a435d]'
        }`}
      >
        <input
          id={id}
          type="text"
          disabled={disabled}
          value={typedInput}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          maxLength={10}
          className="w-full bg-transparent px-3.5 py-2.5 text-sm text-white font-mono placeholder-[#5a6275] focus:outline-none disabled:cursor-not-allowed"
        />

        {/* Clear Button (if value exists and not disabled) */}
        {value && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
              setTypedInput('');
            }}
            className="p-1 text-[#8e96a8] hover:text-white hover:bg-[#272d3e] rounded-md mr-1 transition-colors cursor-pointer"
            title="Hapus tanggal"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Calendar Picker Trigger Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={handleToggleOpen}
          className={`p-2.5 mr-1 text-[#8e96a8] hover:text-purple-300 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center justify-center ${
            isOpen ? 'text-purple-400 bg-[#242a3a]' : 'hover:bg-[#202534]'
          }`}
          title="Buka Kalender"
          aria-label="Pilih tanggal dari kalender"
        >
          <CalendarIcon className="h-4 w-4" />
        </button>
      </div>

      {helperText && (
        <p className="text-[11px] text-[#8e96a8] mt-1">{helperText}</p>
      )}

      {/* Calendar Dropdown Popover (Smart Positioning: Drop-up vs Drop-down) */}
      {isOpen && !disabled && (
        <div 
          ref={popoverRef}
          className={`absolute z-[99] w-80 bg-[#141721] border border-[#2e3549] rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150 ${
            dropUpward 
              ? 'bottom-full mb-2 left-0' 
              : 'top-full mt-2 left-0'
          }`}
          style={{ maxWidth: 'calc(100vw - 32px)' }}
        >
          {/* Header: Month & Year Quick Selectors + Navigation Arrows */}
          <div className="flex items-center justify-between gap-1 mb-3 pb-2.5 border-b border-[#232734]">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-[#8e96a8] hover:text-white hover:bg-[#232734] transition-colors cursor-pointer shrink-0"
              aria-label="Bulan sebelumnya"
              title="Bulan sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Quick Month & Year Dropdowns */}
            <div className="flex items-center space-x-1.5">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="bg-[#1b1f2d] border border-[#2b3245] text-white text-xs font-bold rounded-lg px-2 py-1 focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="bg-[#1b1f2d] border border-[#2b3245] text-white text-xs font-bold rounded-lg px-2 py-1 font-mono focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                {yearOptions.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-[#8e96a8] hover:text-white hover:bg-[#232734] transition-colors cursor-pointer shrink-0"
              aria-label="Bulan berikutnya"
              title="Bulan berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Preset Buttons (Hari Ini, Kemarin) */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1a1e2b] hover:bg-purple-900/40 text-purple-300 border border-purple-800/40 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Clock className="h-3 w-3 text-purple-400" />
              <span>Hari Ini</span>
            </button>
            <button
              type="button"
              onClick={handleYesterday}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1a1e2b] hover:bg-[#23293c] text-[#8e96a8] hover:text-white border border-[#272d3e] transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <CalendarDays className="h-3 w-3 text-[#8e96a8]" />
              <span>Kemarin (H-1)</span>
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {DAY_NAMES.map((d, i) => (
              <span
                key={d}
                className={`text-[10px] font-extrabold uppercase py-0.5 ${
                  i === 0 ? 'text-rose-400' : 'text-[#8e96a8]'
                }`}
              >
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid - All 6 rows guaranteed fully visible */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Empty slots before day 1 */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-8 w-8" />
            ))}

            {/* Actual Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const selected = isSelected(day);
              const today = isToday(day);
              const isSunday = (firstDayIndex + idx) % 7 === 0;

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 w-8 rounded-lg text-xs font-medium transition-all flex items-center justify-center cursor-pointer relative ${
                    selected
                      ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-950/60 ring-2 ring-purple-400'
                      : today
                      ? 'bg-[#1e2433] text-purple-300 font-bold border border-purple-500/50 hover:bg-[#2a3247]'
                      : isSunday
                      ? 'text-rose-300/90 hover:bg-[#222736] hover:text-white'
                      : 'text-[#d1d7e0] hover:bg-[#222736] hover:text-white'
                  }`}
                >
                  <span>{day}</span>
                  {today && !selected && (
                    <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-purple-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Popover Footer */}
          <div className="mt-3 pt-2.5 border-t border-[#232734] flex items-center justify-between text-xs">
            <span className="text-[11px] text-[#717b94] font-mono">
              {value ? `Terpilih: ${value}` : 'Pilih tanggal'}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 rounded-lg bg-[#1f2433] hover:bg-[#2a3145] text-white text-[11px] font-semibold transition-colors cursor-pointer"
            >
              Selesai / Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
