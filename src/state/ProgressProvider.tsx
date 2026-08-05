import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  createBrowserRepository,
  type ProgressRepository,
} from '@/lib/progress/repository';
import { progressReducer, type ProgressAction } from '@/lib/progress/reducer';
import { createEmptySnapshot, type ProgressSnapshot } from '@/lib/progress/schema';

/**
 * 進度狀態。整個 App 只有這一個地方會寫入 localStorage。
 *
 * 寫入策略：狀態變更後延遲 500 毫秒才寫（避免連續勾選時反覆寫入），
 * 另外在頁面被切走或關閉時強制寫入，確保不會漏掉最後一次操作。
 */

const SAVE_DEBOUNCE_MS = 500;

interface ProgressContextValue {
  state: ProgressSnapshot;
  dispatch: (action: ProgressAction) => void;
  /** 資料還在讀取中 */
  loading: boolean;
  /** 原本的資料讀不出來，已改用空白進度啟動 */
  recovered: boolean;
  repository: ProgressRepository;
  /** 立刻寫入，不等 debounce */
  flush: () => Promise<void>;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({
  children,
  repository: injected,
  /** 測試用：直接給定初始狀態，跳過非同步載入 */
  initialSnapshot,
}: {
  children: ReactNode;
  repository?: ProgressRepository;
  initialSnapshot?: ProgressSnapshot;
}) {
  const repository = useMemo(
    () => injected ?? createBrowserRepository(),
    [injected],
  );

  const [state, dispatch] = useReducer(
    progressReducer,
    initialSnapshot ?? createEmptySnapshot(new Date().toISOString()),
  );
  const [loading, setLoading] = useState(!initialSnapshot);
  const [recovered, setRecovered] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 啟動時載入一次
  useEffect(() => {
    if (initialSnapshot) return;
    let cancelled = false;
    void repository.load().then((result) => {
      if (cancelled) return;
      dispatch({ type: 'snapshot/replace', snapshot: result.snapshot });
      setRecovered(result.recovered);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [repository, initialSnapshot]);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    await repository.save(stateRef.current);
  }, [repository]);

  const dispatchAndSave = useCallback(
    (action: ProgressAction) => {
      dispatch(action);
      dirtyRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (!dirtyRef.current) return;
        dirtyRef.current = false;
        void repository.save(stateRef.current);
      }, SAVE_DEBOUNCE_MS);
    },
    [repository],
  );

  // 頁面被切走或關閉時強制寫入 —— 手機上切換 App 走的就是這條路徑
  useEffect(() => {
    const handleHide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    document.addEventListener('visibilitychange', handleHide);
    window.addEventListener('pagehide', handleHide);
    return () => {
      document.removeEventListener('visibilitychange', handleHide);
      window.removeEventListener('pagehide', handleHide);
      void flush();
    };
  }, [flush]);

  const value = useMemo<ProgressContextValue>(
    () => ({ state, dispatch: dispatchAndSave, loading, recovered, repository, flush }),
    [state, dispatchAndSave, loading, recovered, repository, flush],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress 必須在 ProgressProvider 內使用');
  return ctx;
}

/** 在沒有 Provider 時回傳 null，給可以獨立使用的展示元件用 */
export function useProgressOptional(): ProgressContextValue | null {
  return useContext(ProgressContext);
}
