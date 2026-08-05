import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JaText } from './JaText';

describe('JaText', () => {
  it('輸出正確的 ruby / rt 結構', () => {
    const { container } = render(<JaText text="今日{きょう}は寒{さむ}い" />);
    const rubies = container.querySelectorAll('ruby');
    expect(rubies).toHaveLength(2);
    expect(rubies[0]).toHaveTextContent('今日きょう');
    expect(container.querySelectorAll('rt')).toHaveLength(2);
    expect(container.querySelectorAll('rt')[0]).toHaveTextContent('きょう');
    expect(container.querySelectorAll('rt')[1]).toHaveTextContent('さむ');
  });

  it('一定帶 lang="ja"（否則日文漢字會被中文字體渲染成錯字形）', () => {
    const { container } = render(<JaText text="日本語{にほんご}" />);
    expect(container.firstElementChild).toHaveAttribute('lang', 'ja');
  });

  it('furigana="none" 不輸出 rt', () => {
    const { container } = render(<JaText text="今日{きょう}は" furigana="none" />);
    expect(container.querySelectorAll('rt')).toHaveLength(0);
    expect(container.textContent).toBe('今日は');
  });

  it('furigana="hidden" 保留 rt 但加上隱藏類名（版面不跳動）', () => {
    const { container } = render(<JaText text="今日{きょう}は" furigana="hidden" />);
    expect(container.querySelectorAll('rt')).toHaveLength(1);
    expect(container.firstElementChild).toHaveClass('furigana-hidden');
  });

  it('沒有標註時原樣輸出', () => {
    render(<JaText text="そうですね" />);
    expect(screen.getByText('そうですね')).toBeInTheDocument();
  });

  it('標註寫錯時退回顯示原字串，不讓畫面掛掉', () => {
    const { container } = render(<JaText text="募{つの" />);
    expect(container.textContent).toBe('募{つの');
    expect(container.querySelectorAll('rt')).toHaveLength(0);
  });

  it('可指定為段落元素', () => {
    const { container } = render(<JaText text="本文{ほんぶん}" as="p" className="ja-passage" />);
    expect(container.firstElementChild?.tagName).toBe('P');
    expect(container.firstElementChild).toHaveClass('ja-passage');
  });

  it('純文字內容不含大括號', () => {
    const { container } = render(<JaText text="大人{おとな}買{が}い" />);
    expect(container.textContent).toBe('大人おとな買がい');
    expect(container.textContent).not.toContain('{');
  });
});
