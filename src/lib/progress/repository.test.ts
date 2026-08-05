import { describe, it, expect } from 'vitest';
import {
  LocalStorageProgressRepository,
  MemoryStore,
  STORAGE_KEY,
} from './repository';
import { createEmptySnapshot, CURRENT_SCHEMA_VERSION } from './schema';

const NOW = '2026-08-16T10:00:00.000Z';

function makeRepo() {
  const store = new MemoryStore();
  const repo = new LocalStorageProgressRepository(store, () => NOW);
  return { store, repo };
}

describe('載入', () => {
  it('第一次使用時給空白進度', async () => {
    const { repo } = makeRepo();
    const { snapshot, recovered } = await repo.load();
    expect(recovered).toBe(false);
    expect(snapshot.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(snapshot.tasks).toEqual({});
    expect(snapshot.answers).toEqual([]);
  });

  it('存進去再讀出來是同一份資料', async () => {
    const { repo } = makeRepo();
    const snapshot = createEmptySnapshot(NOW);
    snapshot.tasks['w2d1:vocabulary:voc-w02'] = {
      status: 'done',
      completedAt: '2026-08-16',
      manualOverride: true,
    };
    await repo.save(snapshot);

    const loaded = await repo.load();
    expect(loaded.snapshot.tasks['w2d1:vocabulary:voc-w02']).toEqual({
      status: 'done',
      completedAt: '2026-08-16',
      manualOverride: true,
    });
  });

  it('save 會更新 updatedAt', async () => {
    const store = new MemoryStore();
    let clock = '2026-08-16T10:00:00.000Z';
    const repo = new LocalStorageProgressRepository(store, () => clock);
    await repo.save(createEmptySnapshot('2026-08-01T00:00:00.000Z'));
    clock = '2026-08-17T08:00:00.000Z';
    await repo.save(createEmptySnapshot('2026-08-01T00:00:00.000Z'));
    const { snapshot } = await repo.load();
    expect(snapshot.updatedAt).toBe('2026-08-17T08:00:00.000Z');
  });
});

describe('資料損毀時的處理（十七週的紀錄不能因為一次解析失敗就消失）', () => {
  it('不是合法 JSON 時保留原始字串，並以空白進度啟動', async () => {
    const { store, repo } = makeRepo();
    store.setItem(STORAGE_KEY, '{{{ 這不是 JSON');

    const result = await repo.load();
    expect(result.recovered).toBe(true);
    expect(result.snapshot.tasks).toEqual({});
    expect(store.getItem(result.backupKey!)).toBe('{{{ 這不是 JSON');
  });

  it('JSON 合法但結構不符時也會備份', async () => {
    const { store, repo } = makeRepo();
    store.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, tasks: '不該是字串' }));

    const result = await repo.load();
    expect(result.recovered).toBe(true);
    expect(store.getItem(result.backupKey!)).toContain('不該是字串');
  });

  it('備份不會覆蓋掉正常的資料鍵', async () => {
    const { store, repo } = makeRepo();
    store.setItem(STORAGE_KEY, 'broken');
    const result = await repo.load();
    expect(result.backupKey).not.toBe(STORAGE_KEY);
  });
});

describe('匯出與匯入', () => {
  it('匯出 → 清空 → 匯入，進度完全還原', async () => {
    const { repo } = makeRepo();
    const snapshot = createEmptySnapshot(NOW);
    snapshot.tasks['w1d1:quiz:diag-01'] = { status: 'done', completedAt: '2026-08-09', manualOverride: true };
    snapshot.mistakes['q-w01-v01'] = {
      questionId: 'q-w01-v01',
      skill: 'vocabulary',
      week: 1,
      tags: ['漢字読み'],
      firstWrongAt: NOW,
      lastAttemptAt: NOW,
      wrongCount: 1,
      retryCount: 0,
      lastResult: 'wrong',
      consecutiveCorrect: 0,
      resolved: false,
    };
    await repo.save(snapshot);

    const exported = await repo.exportJson();
    await repo.clear();
    expect((await repo.load()).snapshot.tasks).toEqual({});

    const restored = await repo.importJson(exported);
    expect(restored.tasks['w1d1:quiz:diag-01']?.status).toBe('done');
    expect(restored.mistakes['q-w01-v01']?.wrongCount).toBe(1);

    // 確認也寫回了儲存
    expect((await repo.load()).snapshot.mistakes['q-w01-v01']).toBeDefined();
  });

  it('匯出的是格式化過的 JSON，方便自己檢視', async () => {
    const { repo } = makeRepo();
    const exported = await repo.exportJson();
    expect(exported).toContain('\n');
    expect(() => JSON.parse(exported)).not.toThrow();
  });

  it('匯入非 JSON 檔會給看得懂的錯誤訊息', async () => {
    const { repo } = makeRepo();
    await expect(repo.importJson('這不是備份檔')).rejects.toThrow(/不是有效的 JSON/);
  });

  it('匯入結構不符的檔案會指出是哪個欄位', async () => {
    const { repo } = makeRepo();
    await expect(
      repo.importJson(JSON.stringify({ schemaVersion: 1, createdAt: 1234 })),
    ).rejects.toThrow(/格式不正確/);
  });

  it('匯入失敗時不會破壞現有的進度', async () => {
    const { repo } = makeRepo();
    const snapshot = createEmptySnapshot(NOW);
    snapshot.tasks['keep-me'] = { status: 'done', manualOverride: true };
    await repo.save(snapshot);

    await expect(repo.importJson('壞掉的內容')).rejects.toThrow();
    expect((await repo.load()).snapshot.tasks['keep-me']).toBeDefined();
  });
});

describe('清除', () => {
  it('clear 之後回到空白進度', async () => {
    const { repo } = makeRepo();
    const snapshot = createEmptySnapshot(NOW);
    snapshot.tasks['x'] = { status: 'done', manualOverride: true };
    await repo.save(snapshot);

    await repo.clear();
    const { snapshot: after } = await repo.load();
    expect(after.tasks).toEqual({});
  });
});
