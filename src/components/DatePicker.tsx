import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { format, isValid, parse, getYear, getMonth, setYear, setMonth, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';

interface DatePickerProps {
  value: string | undefined;
  onChange: (date: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onBlur?: () => void;
  disabled?: boolean;
}

export function DatePicker({ value, onChange, className, inputClassName, placeholder, autoFocus, onBlur, disabled }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [popupPosition, setPopupPosition] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Initialize input value from prop
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (isValid(date)) {
        setInputValue(formatDate(date));
        setCurrentMonth(date);
      } else {
        setInputValue(value);
      }
    } else {
      setInputValue('');
    }
  }, [value]);

  // Handle autoFocus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      setIsOpen(true);
    }
  }, [autoFocus]);

  // Update popup position when opening
  useLayoutEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      
      // Force bottom positioning as requested
      // "chỉ hiện ở 1 vị trí đó là hướng sổ xuống dưới ô nhập liệu data của deadline"
      setPopupPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    } else if (!isOpen) {
      setPopupPosition(null);
    }
  }, [isOpen]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(target);
      const isOutsidePopup = popupRef.current && !popupRef.current.contains(target);

      if (isOutsideContainer && isOutsidePopup) {
        setIsOpen(false);
        // Validate on close
        handleBlurInternal();
        if (onBlur) onBlur();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Close on scroll to avoid detached popup
      window.addEventListener('scroll', () => setIsOpen(false), { capture: true });
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', () => setIsOpen(false), { capture: true });
    };
  }, [isOpen, inputValue, onBlur]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleBlurInternal = () => {
    // Try to parse the input
    // Supported formats: yyyy-MM-dd, dd/MM/yyyy, dd-MM-yyyy
    let parsedDate: Date | undefined;
    
    const formats = ['yyyy-MM-dd', 'dd/MM/yyyy', 'dd-MM-yyyy', 'd/M/yyyy', 'd-M-yyyy'];
    
    for (const fmt of formats) {
      const d = parse(inputValue, fmt, new Date());
      if (isValid(d)) {
        parsedDate = d;
        break;
      }
    }

    if (parsedDate) {
      const formatted = format(parsedDate, 'yyyy-MM-dd');
      if (formatted !== value) {
        onChange(formatted);
      }
      setInputValue(formatted);
      setCurrentMonth(parsedDate);
    } else {
      if (value) {
         setInputValue(value);
      }
    }
  };

  const handleDayClick = (day: Date) => {
    const formatted = format(day, 'yyyy-MM-dd');
    onChange(formatted);
    setInputValue(formatDate(day));
    setIsOpen(false);
    if (onBlur) onBlur();
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value);
    setCurrentMonth(setYear(currentMonth, newYear));
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value);
    setCurrentMonth(setMonth(currentMonth, newMonth));
  };

  // Generate days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Generate years (100 years back, 10 years forward)
  const currentYear = getYear(new Date());
  const years = Array.from({ length: 110 }, (_, i) => currentYear - 100 + i).reverse();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={() => {
            // Defer blur handling to allow click outside logic to run first
            // or just rely on click outside. 
            // If we tab out, we want to validate.
            // setTimeout(() => {
            //   if (!containerRef.current?.contains(document.activeElement) && !popupRef.current?.contains(document.activeElement)) {
            //      handleBlurInternal();
            //      if (onBlur) onBlur();
            //      setIsOpen(false);
            //   }
            // }, 0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleBlurInternal();
              setIsOpen(false);
              if (onBlur) onBlur();
              inputRef.current?.blur();
            }
          }}
          onFocus={() => !disabled && setIsOpen(true)}
          placeholder={placeholder || "DD MMM YYYY"}
          disabled={disabled}
          className={cn(
            "w-full p-3 bg-white/5 text-white border border-white/10 rounded-xl placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all",
            inputClassName,
            "pr-10",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 text-white hover:text-slate-200 transition-colors",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <CalendarIcon className="w-5 h-5" />
        </button>
      </div>

      {isOpen && popupPosition && createPortal(
        <div 
          ref={popupRef}
          style={{ 
            top: popupPosition.top, 
            bottom: popupPosition.bottom,
            left: popupPosition.left,
            position: 'fixed'
          }}
          className="z-[9999] mt-2 p-4 bg-[#020617] border border-white/10 rounded-2xl shadow-2xl w-[320px] animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4 gap-2">
            <button onClick={prevMonth} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex gap-1 flex-1 justify-center font-bold text-white text-sm">
              <select 
                value={getMonth(currentMonth)} 
                onChange={handleMonthChange}
                className="bg-transparent hover:bg-white/5 rounded px-1 cursor-pointer focus:outline-none"
              >
                {months.map((month, i) => (
                  <option key={month} value={i} className="bg-[#020617] text-white">{month}</option>
                ))}
              </select>
              <select 
                value={getYear(currentMonth)} 
                onChange={handleYearChange}
                className="bg-transparent hover:bg-white/5 rounded px-1 cursor-pointer focus:outline-none"
              >
                {years.map(year => (
                  <option key={year} value={year} className="bg-[#020617] text-white">{year}</option>
                ))}
              </select>
            </div>

            <button onClick={nextMonth} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              const isSelected = value ? isSameDay(day, new Date(value)) : false;
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={i}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center text-xs transition-all font-medium",
                    !isCurrentMonth && "text-slate-800",
                    isCurrentMonth && "text-slate-300 hover:bg-white/5 hover:text-white",
                    isSelected && "bg-blue-500 text-white hover:bg-blue-600",
                    isToday && !isSelected && "text-blue-400 font-bold"
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
