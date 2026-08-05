/**
 * 日文發音的純函式部分（不碰 React，也不碰瀏覽器 API 的狀態）。
 *
 * 用的是瀏覽器內建的語音合成（Web Speech API）。這台 Mac 上有 Kyoko、
 * Hattori、O-Ren 三個本機日文語音 —— 本機代表離線可用、不需要網路、
 * 不產生費用，也沒有音檔授權問題。
 *
 * 限制要講清楚：
 * 1. 語調（ピッチアクセント）不完全可靠，不要拿 TTS 來記重音。
 * 2. 語速與自然度跟正式聽解考題有差距，它適合跟讀語彙與例句，
 *    不能取代聽解訓練。
 */

import { parseRuby, rubyToPlainText, rubyToReading } from '@/lib/content/ruby';

export interface VoiceOption {
  name: string;
  lang: string;
  /** 本機語音（離線可用、延遲低）*/
  localService: boolean;
}

export const RATE_OPTIONS = [0.7, 0.85, 1, 1.15] as const;
export type SpeechRate = (typeof RATE_OPTIONS)[number];
export const DEFAULT_RATE: SpeechRate = 1;

/** 只留日文語音 */
export function filterJapaneseVoices<T extends { lang: string }>(voices: readonly T[]): T[] {
  return voices.filter((voice) => voice.lang.toLowerCase().startsWith('ja'));
}

/**
 * 選一個日文語音。
 * 優先序：使用者指定的 → 本機語音 → 任何日文語音 → 沒有就回傳 null。
 * 偏好本機語音是因為離線可用，而且不會有網路延遲。
 */
export function pickVoice<T extends VoiceOption>(
  voices: readonly T[],
  preferredName?: string,
): T | null {
  const japanese = filterJapaneseVoices(voices);
  if (japanese.length === 0) return null;
  if (preferredName) {
    const exact = japanese.find((voice) => voice.name === preferredName);
    if (exact) return exact;
  }
  return japanese.find((voice) => voice.localService) ?? japanese[0]!;
}

/**
 * 把標註格式的日文轉成要唸出來的文字。
 *
 * mode 的差別很重要：
 * - 'text'    保留漢字。日文語音引擎是為漢字文本設計的，句子用這個唸起來
 *             斷句與語調比較自然。例句一律用這個。
 * - 'reading' 全部轉成假名。單字卡用這個，因為單獨一個詞（例如「行った」）
 *             有多種讀法時，唸假名才能保證聽到的是我們要教的那個讀音。
 */
export function textForSpeech(annotated: string, mode: 'text' | 'reading'): string {
  const segments = parseRuby(annotated);
  const raw = mode === 'reading' ? rubyToReading(segments) : rubyToPlainText(segments);
  return normalizeForSpeech(raw);
}

/**
 * 清掉會讓語音引擎唸出奇怪東西的字元。
 * 挖空符號「＿＿」若原樣送進去，有些引擎會唸成「アンダーライン」。
 */
export function normalizeForSpeech(text: string): string {
  return (
    text
      // 先壓縮既有空白。這一步必須在插入停頓之前 ——
      // JS 的 \s 也會匹配全形空白，順序反了會把停頓符一起吃掉。
      .replace(/\s+/g, ' ')
      .trim()
      // 中文說明裡的讀音註記不用唸
      .replace(/[（(][ぁ-んァ-ヶー]+[）)]/g, '')
      // 挖空換成全形空白當停頓
      .replace(/[＿_]{2,}/g, '　')
  );
}

/** 語速的顯示文字 */
export function formatRate(rate: number): string {
  if (rate === 1) return '正常';
  return `${rate}×`;
}
