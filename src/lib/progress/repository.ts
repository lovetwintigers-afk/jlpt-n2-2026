/**
 * 進度資料的存取。
 *
 * 所有方法都回傳 Promise —— 即使 localStorage 是同步的。
 * 這樣未來換成資料庫或雲端同步時，只要換掉這個檔案的實作，
 * 呼叫端一行都不用改。
 */

import {
  createEmptySnapshot,
  migrate,
  progressSnapshotSchema,
  type ProgressSnapshot,
} from './schema';

export interface LoadResult {
  snapshot: ProgressSnapshot;
  /** 原本的資料讀不出來，已改用空白進度啟動 */
  recovered: boolean;
  /** 損毀備份存放的位置 */
  backupKey?: string;
}

export interface ProgressRepository {
  load(): Promise<LoadResult>;
  save(snapshot: ProgressSnapshot): Promise<void>;
  exportJson(): Promise<string>;
  importJson(json: string): Promise<ProgressSnapshot>;
  clear(): Promise<void>;
}

export const STORAGE_KEY = 'jlpt-n2-2026:v1';
const CORRUPT_BACKUP_KEY = `${STORAGE_KEY}:corrupt-backup`;

/** 可注入的儲存介面，測試時用記憶體版本 */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryStore implements KeyValueStore {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

export class LocalStorageProgressRepository implements ProgressRepository {
  constructor(
    private store: KeyValueStore,
    private now: () => string = () => new Date().toISOString(),
  ) {}

  async load(): Promise<LoadResult> {
    const raw = this.store.getItem(STORAGE_KEY);
    if (raw === null) {
      return { snapshot: createEmptySnapshot(this.now()), recovered: false };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return this.recover(raw);
    }

    const result = progressSnapshotSchema.safeParse(migrate(parsed));
    if (!result.success) {
      return this.recover(raw);
    }
    return { snapshot: result.data, recovered: false };
  }

  /**
   * 讀不出來時，把原始字串另存一份再以空白進度啟動。
   * 十七週的紀錄不能因為一次解析失敗就消失。
   */
  private recover(raw: string): LoadResult {
    try {
      this.store.setItem(CORRUPT_BACKUP_KEY, raw);
    } catch {
      // 連備份都寫不進去就算了，至少不要讓 App 開不起來
    }
    return {
      snapshot: createEmptySnapshot(this.now()),
      recovered: true,
      backupKey: CORRUPT_BACKUP_KEY,
    };
  }

  async save(snapshot: ProgressSnapshot): Promise<void> {
    const next = { ...snapshot, updatedAt: this.now() };
    this.store.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  async exportJson(): Promise<string> {
    const { snapshot } = await this.load();
    return JSON.stringify(snapshot, null, 2);
  }

  async importJson(json: string): Promise<ProgressSnapshot> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('這個檔案不是有效的 JSON，請確認選到的是匯出的備份檔。');
    }

    const result = progressSnapshotSchema.safeParse(migrate(parsed));
    if (!result.success) {
      const first = result.error.issues[0];
      throw new Error(
        `備份檔的格式不正確（${first?.path.join('.') || '根層級'}：${first?.message ?? '未知錯誤'}）。`,
      );
    }

    await this.save(result.data);
    return result.data;
  }

  async clear(): Promise<void> {
    this.store.removeItem(STORAGE_KEY);
  }
}

/** 瀏覽器環境用的實例。localStorage 不可用時（無痕模式等）退回記憶體版本。 */
export function createBrowserRepository(): LocalStorageProgressRepository {
  let store: KeyValueStore;
  try {
    const probe = '__jlpt_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    store = window.localStorage;
  } catch {
    store = new MemoryStore();
  }
  return new LocalStorageProgressRepository(store);
}
