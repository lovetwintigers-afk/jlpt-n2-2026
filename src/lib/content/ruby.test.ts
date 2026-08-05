import { describe, it, expect } from 'vitest';
import { parseRuby, rubyToPlainText, rubyToReading } from './ruby';

describe('parseRuby', () => {
  it('單一漢字加讀音', () => {
    expect(parseRuby('募{つの}る')).toEqual([
      { base: '募', rt: 'つの' },
      { base: 'る' },
    ]);
  });

  it('連續漢字視為一個單位', () => {
    expect(parseRuby('大人{おとな}買{が}い')).toEqual([
      { base: '大人', rt: 'おとな' },
      { base: '買', rt: 'が' },
      { base: 'い' },
    ]);
  });

  it('句子中混合假名與標註', () => {
    expect(parseRuby('今日{きょう}は寒{さむ}いですね')).toEqual([
      { base: '今日', rt: 'きょう' },
      { base: 'は' },
      { base: '寒', rt: 'さむ' },
      { base: 'いですね' },
    ]);
  });

  it('開頭為假名時保留前綴', () => {
    expect(parseRuby('ご無沙汰{ぶさた}')).toEqual([
      { base: 'ご' },
      { base: '無沙汰', rt: 'ぶさた' },
    ]);
  });

  it('完全沒有標註時回傳單一段落', () => {
    expect(parseRuby('そうですか')).toEqual([{ base: 'そうですか' }]);
  });

  it('漢字沒標讀音時原樣保留', () => {
    expect(parseRuby('日本語')).toEqual([{ base: '日本語' }]);
  });

  it('標點與英數字不影響解析', () => {
    expect(parseRuby('第{だい}1回{かい}、始{はじ}めます。')).toEqual([
      { base: '第', rt: 'だい' },
      { base: '1' },
      { base: '回', rt: 'かい' },
      { base: '、' },
      { base: '始', rt: 'はじ' },
      { base: 'めます。' },
    ]);
  });

  it('支援「々」疊字', () => {
    expect(parseRuby('人々{ひとびと}')).toEqual([{ base: '人々', rt: 'ひとびと' }]);
  });

  it('空字串回傳空陣列', () => {
    expect(parseRuby('')).toEqual([]);
  });
});

describe('parseRuby 的錯誤處理（讓打錯字在載入階段就被抓到）', () => {
  it('大括號未閉合', () => {
    expect(() => parseRuby('募{つの')).toThrow(/缺少對應的/);
  });

  it('多餘的右大括號', () => {
    expect(() => parseRuby('募る}')).toThrow(/多餘的/);
  });

  it('讀音為空', () => {
    expect(() => parseRuby('募{}る')).toThrow(/不可為空/);
  });

  it('大括號前面不是漢字', () => {
    expect(() => parseRuby('つの{つの}る')).toThrow(/前面必須是漢字/);
    expect(() => parseRuby('{つの}')).toThrow(/前面必須是漢字/);
  });

  it('巢狀大括號', () => {
    expect(() => parseRuby('募{つ{の}}る')).toThrow(/不可巢狀/);
  });
});

describe('rubyToPlainText / rubyToReading', () => {
  const segs = parseRuby('今日{きょう}は寒{さむ}い');

  it('純文字去掉讀音', () => {
    expect(rubyToPlainText(segs)).toBe('今日は寒い');
  });

  it('讀音把漢字換成假名', () => {
    expect(rubyToReading(segs)).toBe('きょうはさむい');
  });

  it('沒有標註時兩者相同', () => {
    const plain = parseRuby('そうですね');
    expect(rubyToPlainText(plain)).toBe('そうですね');
    expect(rubyToReading(plain)).toBe('そうですね');
  });
});
