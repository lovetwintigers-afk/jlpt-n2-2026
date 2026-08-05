import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getTodayInTaipei,
  isValidIsoDate,
  type IsoDate,
} from '@/lib/date/courseCalendar';

/**
 * 提供「今天」給整個 App。
 *
 * 正常情況下就是台北當地日期。但網址加上 ?today=2026-12-06 可以預覽
 * 任意日期的畫面 —— 這讓你可以先看看考試當日頁長什麼樣，
 * 也讓測試不必去改系統時鐘。
 */

interface TodayContextValue {
  /** 目前採用的日期 */
  today: IsoDate;
  /** 是否為網址覆寫的預覽日期 */
  isPreview: boolean;
  /** 實際的台北今天（預覽時仍可取得） */
  realToday: IsoDate;
}

const TodayContext = createContext<TodayContextValue | null>(null);

export function TodayProvider({
  children,
  overrideToday,
}: {
  children: ReactNode;
  /** 測試時直接注入，優先於網址參數 */
  overrideToday?: IsoDate;
}) {
  const [searchParams] = useSearchParams();
  const queryToday = searchParams.get('today');

  const value = useMemo<TodayContextValue>(() => {
    const realToday = getTodayInTaipei();
    if (overrideToday && isValidIsoDate(overrideToday)) {
      return { today: overrideToday, isPreview: true, realToday };
    }
    if (queryToday && isValidIsoDate(queryToday)) {
      return { today: queryToday, isPreview: true, realToday };
    }
    return { today: realToday, isPreview: false, realToday };
  }, [overrideToday, queryToday]);

  return <TodayContext.Provider value={value}>{children}</TodayContext.Provider>;
}

export function useToday(): TodayContextValue {
  const ctx = useContext(TodayContext);
  if (!ctx) {
    throw new Error('useToday 必須在 TodayProvider 內使用');
  }
  return ctx;
}
