import { describe, it, expect } from 'vitest';
import {
  filterJapaneseVoices,
  pickVoice,
  textForSpeech,
  normalizeForSpeech,
  formatRate,
  RATE_OPTIONS,
  DEFAULT_RATE,
} from './speech';

const voices = [
  { name: 'Samantha', lang: 'en-US', localService: true },
  { name: 'Kyoko', lang: 'ja-JP', localService: true },
  { name: 'Hattori', lang: 'ja-JP', localService: true },
  { name: 'Google 日本語', lang: 'ja-JP', localService: false },
  { name: '美佳', lang: 'zh-TW', localService: true },
];

describe('挑選語音', () => {
  it('只留日文語音', () => {
    expect(filterJapaneseVoices(voices).map((v) => v.name)).toEqual([
      'Kyoko',
      'Hattori',
      'Google 日本語',
    ]);
  });

  it('接受 ja 與 ja-JP 兩種寫法', () => {
    const mixed = [
      { name: 'A', lang: 'ja', localService: true },
      { name: 'B', lang: 'JA-JP', localService: true },
    ];
    expect(filterJapaneseVoices(mixed)).toHaveLength(2);
  });

  it('使用者指定的語音優先', () => {
    expect(pickVoice(voices, 'Hattori')?.name).toBe('Hattori');
  });

  it('指定的語音不存在時退回預設，不會壞掉', () => {
    expect(pickVoice(voices, '不存在的語音')?.name).toBe('Kyoko');
  });

  it('沒有指定時優先選本機語音（離線可用、無延遲）', () => {
    const remoteFirst = [
      { name: 'Google 日本語', lang: 'ja-JP', localService: false },
      { name: 'Kyoko', lang: 'ja-JP', localService: true },
    ];
    expect(pickVoice(remoteFirst)?.name).toBe('Kyoko');
  });

  it('只有雲端語音時也還是能用', () => {
    const onlyRemote = [{ name: 'Google 日本語', lang: 'ja-JP', localService: false }];
    expect(pickVoice(onlyRemote)?.name).toBe('Google 日本語');
  });

  it('完全沒有日文語音時回傳 null（呼叫端要據此隱藏按鈕）', () => {
    expect(pickVoice([{ name: 'Samantha', lang: 'en-US', localService: true }])).toBeNull();
    expect(pickVoice([])).toBeNull();
  });
});

describe('要唸出來的文字', () => {
  it('例句保留漢字（語音引擎對漢字文本的斷句比較自然）', () => {
    expect(textForSpeech('今日{きょう}は寒{さむ}いですね', 'text')).toBe('今日は寒いですね');
  });

  it('單字轉成假名（保證聽到的是我們要教的讀音）', () => {
    expect(textForSpeech('行{おこな}った', 'reading')).toBe('おこなった');
    expect(textForSpeech('大人{おとな}買{が}い', 'reading')).toBe('おとながい');
  });

  it('沒有標註時兩種模式相同', () => {
    expect(textForSpeech('そうですね', 'text')).toBe('そうですね');
    expect(textForSpeech('そうですね', 'reading')).toBe('そうですね');
  });

  it('大括號不會被唸出來', () => {
    const spoken = textForSpeech('募{つの}る', 'text');
    expect(spoken).not.toContain('{');
    expect(spoken).not.toContain('}');
    expect(spoken).toBe('募る');
  });
});

describe('normalizeForSpeech', () => {
  it('挖空符號換成停頓，不會被唸成「アンダーライン」', () => {
    expect(normalizeForSpeech('収入＿＿保険料が決まる。')).toBe('収入　保険料が決まる。');
  });

  it('單一底線不受影響', () => {
    expect(normalizeForSpeech('A_B')).toBe('A_B');
  });

  it('括號裡的假名註記不唸', () => {
    expect(normalizeForSpeech('供給（きょうきゅう）')).toBe('供給');
  });

  it('壓縮多餘空白', () => {
    expect(normalizeForSpeech('  今日   は  寒い  ')).toBe('今日 は 寒い');
  });

  it('空字串不會出錯', () => {
    expect(normalizeForSpeech('')).toBe('');
  });
});

describe('語速', () => {
  it('提供的選項涵蓋放慢與稍快', () => {
    expect(RATE_OPTIONS).toContain(0.7);
    expect(RATE_OPTIONS).toContain(1);
    expect(DEFAULT_RATE).toBe(1);
  });

  it('顯示文字', () => {
    expect(formatRate(1)).toBe('正常');
    expect(formatRate(0.7)).toBe('0.7×');
    expect(formatRate(1.15)).toBe('1.15×');
  });
});
