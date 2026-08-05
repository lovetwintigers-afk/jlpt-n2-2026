import { useRef, useState } from 'react';
import { useProgress } from '@/state/ProgressProvider';
import { useToday } from '@/state/TodayProvider';
import {
  daysSinceBackup,
  getOverallProgress,
  getUnresolvedMistakeCount,
} from '@/lib/progress/selectors';
import { TIME_ZONE, formatDateWithWeekday } from '@/lib/date/courseCalendar';
import { JaText } from '@/components/JaText';
import { SpeakButton } from '@/components/SpeakButton';
import { useSpeech } from '@/lib/speech/useSpeech';
import { RATE_OPTIONS, formatRate } from '@/lib/speech/speech';

type Status = { kind: 'ok' | 'error'; message: string } | null;

const SAMPLE_SENTENCE = '会議{かいぎ}を円滑{えんかつ}に進{すす}めるために、事前{じぜん}に資料{しりょう}を配{くば}る。';

function SpeechSettings() {
  const { state, dispatch } = useProgress();
  const { available, voices } = useSpeech();

  return (
    <section className="card">
      <h2 className="card__title">日文發音</h2>

      {!available ? (
        <p className="empty-state">
          這個瀏覽器沒有可用的日文語音，發音按鈕不會顯示。
          在 macOS 可到「系統設定 → 輔助使用 → 朗讀內容 → 系統聲音」新增日文語音；
          iPhone 則在「設定 → 輔助使用 → 朗讀內容 → 聲音」新增。
        </p>
      ) : (
        <>
          <div className="stack stack--tight">
            <label className="mistake__field">
              <span className="mistake__label">語音</span>
              <select
                value={state.settings.speechVoiceName ?? ''}
                onChange={(event) =>
                  dispatch({
                    type: 'settings/update',
                    patch: {
                      speechVoiceName: event.target.value === '' ? undefined : event.target.value,
                    },
                  })
                }
              >
                <option value="">自動選擇</option>
                {voices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name}
                    {voice.localService ? '（本機）' : '（需連網）'}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="filtergroup">
              <legend className="filtergroup__legend">語速</legend>
              <div className="filtergroup__options">
                {RATE_OPTIONS.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    className={`chip${state.settings.speechRate === rate ? ' chip--active' : ''}`}
                    onClick={() => dispatch({ type: 'settings/update', patch: { speechRate: rate } })}
                    aria-pressed={state.settings.speechRate === rate}
                  >
                    {formatRate(rate)}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="example__row" style={{ marginTop: 'var(--space-4)' }}>
            <JaText text={SAMPLE_SENTENCE} className="ja-example" as="div" />
            <SpeakButton text={SAMPLE_SENTENCE} mode="text" id="settings-sample" label="試聽" size="sm" />
          </div>
        </>
      )}

      <p className="stat__hint" style={{ marginTop: 'var(--space-4)' }}>
        發音由瀏覽器內建的語音合成產生，離線可用。它適合確認讀音與跟讀例句，
        但語調（アクセント）不完全可靠，也不能取代正式聽解的語速與自然度。
      </p>
    </section>
  );
}

export function Settings() {
  const { state, dispatch, repository, flush } = useProgress();
  const { today, realToday } = useToday();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const overall = getOverallProgress(state);
  const sinceBackup = daysSinceBackup(state, today);

  async function handleExport() {
    await flush();
    const json = await repository.exportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jlpt-n2-2026-progress-${realToday}.json`;
    link.click();
    URL.revokeObjectURL(url);
    dispatch({ type: 'backup/recorded', today });
    setStatus({ kind: 'ok', message: '已下載備份檔。' });
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const snapshot = await repository.importJson(text);
      dispatch({ type: 'snapshot/replace', snapshot });
      setStatus({ kind: 'ok', message: '已匯入備份，進度已還原。' });
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : '匯入失敗。',
      });
    }
  }

  async function handleReset() {
    await repository.clear();
    const result = await repository.load();
    dispatch({ type: 'snapshot/replace', snapshot: result.snapshot });
    setConfirmingReset(false);
    setStatus({ kind: 'ok', message: '已清除所有學習紀錄。' });
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-header__title">設定</h1>
        <p className="page-header__desc">顯示偏好、資料備份與重置。</p>
      </div>

      {status && (
        <p
          className={`notice ${status.kind === 'error' ? 'notice--highlight' : 'notice--accent'}`}
          role="status"
          style={{ marginBottom: 'var(--space-5)' }}
        >
          {status.message}
        </p>
      )}

      <div className="stack">
        <section className="card">
          <h2 className="card__title">振假名顯示</h2>
          <div className="stack stack--tight">
            {(
              [
                ['always', '一律顯示', '所有標註過的漢字都顯示讀音。'],
                ['hidden', '隱藏（保留版面）', '看不見讀音，但版面不會跳動，適合自我測驗。'],
                ['none', '完全不顯示', '只看漢字。'],
              ] as const
            ).map(([value, label, hint]) => (
              <label key={value} className="radio-row">
                <input
                  type="radio"
                  name="furigana"
                  value={value}
                  checked={state.settings.furiganaMode === value}
                  onChange={() =>
                    dispatch({ type: 'settings/update', patch: { furiganaMode: value } })
                  }
                />
                <span>
                  <span className="radio-row__label">{label}</span>
                  <span className="radio-row__hint">{hint}</span>
                </span>
              </label>
            ))}
          </div>
          <p style={{ marginTop: 'var(--space-4)' }}>
            預覽：
            <JaText
              text="現状{げんじょう}を正確{せいかく}に把握{はあく}する。"
              furigana={state.settings.furiganaMode}
              className="ja-example"
            />
          </p>
        </section>

        <SpeechSettings />

        <section className="card">
          <h2 className="card__title">資料備份</h2>
          <p>
            學習紀錄只存在這個瀏覽器裡，沒有雲端同步。清除瀏覽資料或換裝置時會消失，
            請定期匯出備份。
          </p>
          <p className="stat__hint" style={{ marginTop: 'var(--space-2)' }}>
            {state.settings.lastBackupAt
              ? `上次備份：${formatDateWithWeekday(state.settings.lastBackupAt)}（${sinceBackup} 天前）`
              : '尚未備份過。'}
          </p>

          <div className="grid grid--2" style={{ marginTop: 'var(--space-4)' }}>
            <button type="button" className="btn btn--primary btn--block" onClick={handleExport}>
              匯出備份
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--block"
              onClick={() => fileInputRef.current?.click()}
            >
              匯入備份
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImportFile(file);
              event.target.value = '';
            }}
          />
          <p className="stat__hint" style={{ marginTop: 'var(--space-3)' }}>
            匯入會用備份檔完全取代目前的進度。
          </p>
        </section>

        <section className="card">
          <h2 className="card__title">目前紀錄</h2>
          <div className="grid grid--3">
            <div>
              <p className="stat__label">已完成任務</p>
              <p className="stat__value">
                {overall.done}
                <span className="stat__unit">/ {overall.total}</span>
              </p>
            </div>
            <div>
              <p className="stat__label">累積作答</p>
              <p className="stat__value">
                {state.answers.length}
                <span className="stat__unit">題</span>
              </p>
            </div>
            <div>
              <p className="stat__label">未消化錯題</p>
              <p className="stat__value">
                {getUnresolvedMistakeCount(state)}
                <span className="stat__unit">題</span>
              </p>
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="card__title">時區</h2>
          <p>
            日期一律以 <code>{TIME_ZONE}</code> 判定，與考試地點一致。
            出國或裝置時區改變都不會影響週次計算。
          </p>
          <p className="stat__hint" style={{ marginTop: 'var(--space-2)' }}>
            今天是 {formatDateWithWeekday(realToday)}
          </p>
        </section>

        <section className="card">
          <h2 className="card__title">重置</h2>
          <p>清除所有學習紀錄，回到剛開始的狀態。學習內容不會被刪除。</p>
          {!confirmingReset ? (
            <p style={{ marginTop: 'var(--space-4)' }}>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setConfirmingReset(true)}
              >
                清除所有學習紀錄
              </button>
            </p>
          ) : (
            <div className="notice notice--highlight" style={{ marginTop: 'var(--space-4)' }}>
              <p style={{ marginBottom: 'var(--space-3)' }}>
                這個動作無法復原。建議先匯出一份備份。確定要清除嗎？
              </p>
              <div className="grid grid--2">
                <button type="button" className="btn btn--secondary btn--block" onClick={handleReset}>
                  確定清除
                </button>
                <button
                  type="button"
                  className="btn btn--secondary btn--block"
                  onClick={() => setConfirmingReset(false)}
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
