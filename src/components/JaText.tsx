import { useMemo } from 'react';
import { parseRuby } from '@/lib/content/ruby';
import { useProgressOptional } from '@/state/ProgressProvider';

export type FuriganaMode = 'always' | 'hidden' | 'none';

interface JaTextProps {
  /** 標註格式的日文，例如 '今日{きょう}は寒{さむ}い' */
  text: string;
  /**
   * always —— 顯示振假名
   * hidden —— 保留版面但看不見（練習用）
   * none   —— 完全不輸出 rt
   *
   * 不指定時採用設定頁的全域選擇。
   */
  furigana?: FuriganaMode;
  className?: string;
  /** 預設是 span；長文可用 p */
  as?: 'span' | 'p' | 'div';
}

/**
 * 日文文字渲染。
 *
 * 一律輸出 lang="ja"。沒有它，繁中系統會用中文字體渲染日文漢字，
 * 字形不同（例如「直」「骨」「今」），長期閱讀會記成錯的字形。
 */
export function JaText({ text, furigana, className, as = 'span' }: JaTextProps) {
  const progress = useProgressOptional();
  const mode: FuriganaMode = furigana ?? progress?.state.settings.furiganaMode ?? 'always';

  const segments = useMemo(() => {
    try {
      return parseRuby(text);
    } catch {
      // 標註寫錯時退回顯示原字串，不讓整個畫面掛掉。
      // 真正的錯誤訊息由 registry 在載入階段報出。
      return [{ base: text }];
    }
  }, [text]);

  const Tag = as;
  const classes = [className, mode === 'hidden' ? 'furigana-hidden' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <Tag lang="ja" className={classes || undefined}>
      {segments.map((segment, i) =>
        segment.rt && mode !== 'none' ? (
          <ruby key={i}>
            {segment.base}
            <rt>{segment.rt}</rt>
          </ruby>
        ) : (
          <span key={i}>{segment.base}</span>
        ),
      )}
    </Tag>
  );
}
