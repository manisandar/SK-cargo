import React, { createContext, useContext, useState } from 'react';
import { getTodayIsoDate, stepIsoDate } from '../utils/date';

interface DateFilterContextType {
  selectedDate: string; // 'YYYY-MM-DD' or 'all'
  setSelectedDate: (date: string | ((prev: string) => string)) => void;
  stepDate: (days: number) => void;
  todayIso: string;
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

export const DateFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const todayIso = getTodayIsoDate();
  const [selectedDate, setSelectedDateState] = useState<string>(() => {
    return localStorage.getItem('sk_selected_date') || todayIso;
  });

  const setSelectedDate = (valOrFn: string | ((prev: string) => string)) => {
    setSelectedDateState((prev) => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      localStorage.setItem('sk_selected_date', next);
      return next;
    });
  };

  const stepDate = (days: number) => {
    setSelectedDate((prev) => {
      const base = prev === 'all' ? todayIso : prev;
      return stepIsoDate(base, days);
    });
  };

  return (
    <DateFilterContext.Provider value={{ selectedDate, setSelectedDate, stepDate, todayIso }}>
      {children}
    </DateFilterContext.Provider>
  );
};

export const useDateFilter = (): DateFilterContextType => {
  const ctx = useContext(DateFilterContext);
  if (!ctx) throw new Error('useDateFilter must be used within DateFilterProvider');
  return ctx;
};

