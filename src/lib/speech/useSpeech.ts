import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useProgress } from '@/state/ProgressProvider';
import { filterJapaneseVoices, pickVoice, textForSpeech, type VoiceOption } from './speech';

/**
 * 包住瀏覽器的語音合成 API。
 *
 * 幾個實作上的坑，都在這裡處理掉：
 * 1. 語音清單是非同步載入的 —— 第一次呼叫 getVoices() 常常是空陣列，
 *    要等 voiceschanged 事件。
 * 2. 同時只唸一句 —— 按第二個發音鍵時要先取消前一句，否則會排隊唸。
 * 3. 元件卸載或換頁時要停掉，否則語音會繼續唸下去。
 */

export interface SpeechController {
  /** 這個瀏覽器有沒有可用的日文語音 */
  available: boolean;
  /** 正在唸的那一段文字（用來讓對應的按鈕顯示播放中）*/
  speakingId: string | null;
  /** annotated 是標註格式的日文；id 用來辨識是哪個按鈕在播 */
  speak: (annotated: string, mode: 'text' | 'reading', id: string) => void;
  stop: () => void;
  voices: VoiceOption[];
}

function getSynth(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  return 'speechSynthesis' in window ? window.speechSynthesis : null;
}

export function useSpeech(): SpeechController {
  const { state } = useProgress();
  const synth = getSynth();

  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // 語音清單是非同步載入的，要同時讀一次並監聽事件
  useEffect(() => {
    if (!synth) return;
    const load = () => {
      const list = synth.getVoices().map((voice) => ({
        name: voice.name,
        lang: voice.lang,
        localService: voice.localService,
      }));
      setVoices(filterJapaneseVoices(list));
    };
    load();
    synth.addEventListener('voiceschanged', load);
    return () => synth.removeEventListener('voiceschanged', load);
  }, [synth]);

  const stop = useCallback(() => {
    if (!synth) return;
    synth.cancel();
    utteranceRef.current = null;
    setSpeakingId(null);
  }, [synth]);

  // 離開頁面時停掉，不要讓語音繼續唸
  useEffect(() => stop, [stop]);

  const speak = useCallback(
    (annotated: string, mode: 'text' | 'reading', id: string) => {
      if (!synth) return;

      // 再按一次同一個按鈕就是停止
      if (speakingId === id) {
        stop();
        return;
      }
      synth.cancel();

      const text = textForSpeech(annotated, mode);
      if (!text) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = state.settings.speechRate;

      const chosen = pickVoice(synth.getVoices(), state.settings.speechVoiceName);
      if (chosen) utterance.voice = chosen as SpeechSynthesisVoice;

      utterance.onend = () => {
        utteranceRef.current = null;
        setSpeakingId((current) => (current === id ? null : current));
      };
      utterance.onerror = () => {
        utteranceRef.current = null;
        setSpeakingId((current) => (current === id ? null : current));
      };

      utteranceRef.current = utterance;
      setSpeakingId(id);
      synth.speak(utterance);
    },
    [synth, speakingId, stop, state.settings.speechRate, state.settings.speechVoiceName],
  );

  return useMemo(
    () => ({ available: !!synth && voices.length > 0, speakingId, speak, stop, voices }),
    [synth, voices, speakingId, speak, stop],
  );
}
