import { useSpeech } from '@/lib/speech/useSpeech';

/**
 * 發音按鈕。瀏覽器沒有日文語音時整顆不顯示，不留一個按了沒反應的按鈕。
 *
 * mode：'reading' 給單字（唸假名，保證讀音正確），
 *       'text' 給句子（保留漢字，斷句與語調比較自然）。
 */
export function SpeakButton({
  text,
  mode = 'text',
  id,
  label = '發音',
  size = 'md',
}: {
  /** 標註格式的日文，例如 '募{つの}る' */
  text: string;
  mode?: 'text' | 'reading';
  /** 用來辨識是哪一個按鈕在播放，同一頁面內要唯一 */
  id: string;
  label?: string;
  size?: 'md' | 'sm';
}) {
  const { available, speakingId, speak } = useSpeech();
  if (!available) return null;

  const isSpeaking = speakingId === id;

  return (
    <button
      type="button"
      className={`speak${size === 'sm' ? ' speak--sm' : ''}${isSpeaking ? ' speak--active' : ''}`}
      onClick={() => speak(text, mode, id)}
      aria-label={isSpeaking ? `停止播放${label}` : `播放${label}`}
      title={isSpeaking ? '停止' : '發音'}
    >
      <span aria-hidden="true">{isSpeaking ? '■' : '▶'}</span>
      <span className="speak__label">{isSpeaking ? '停止' : label}</span>
    </button>
  );
}
