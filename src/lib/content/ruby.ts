/**
 * 振假名標註格式。
 *
 * 為了讓你手寫 JSON 時不痛苦，日文一律用「緊接在漢字後面的大括號」標讀音：
 *
 *   '大人{おとな}買{が}い'  →  <ruby>大人<rt>おとな</rt></ruby><ruby>買<rt>が</rt></ruby>い
 *   '今日{きょう}は寒{さむ}い'
 *   '募{つの}る'
 *
 * 規則只有一條：`{...}` 標的是「緊接在它前面那一串漢字」。
 * 不用自己拆陣列，也不用算位置。
 *
 * 為什麼不直接寫「漢字（かんじ）」這種純文字？
 * 因為那樣沒辦法用 <ruby>/<rt> 正確排版，也沒辦法做「隱藏振假名」的練習模式。
 */

/** 一段文字：base 是本文，rt 是它的讀音（沒有讀音就省略） */
export interface RubySegment {
  base: string;
  rt?: string;
}

/** 判斷是否為漢字（含「々」「ヶ」等常見疊字／略字符號） */
function isKanji(ch: string): boolean {
  const code = ch.codePointAt(0)!;
  return (
    (code >= 0x4e00 && code <= 0x9fff) || // CJK 統一漢字
    (code >= 0x3400 && code <= 0x4dbf) || // 擴充 A
    (code >= 0xf900 && code <= 0xfaff) || // 相容漢字
    ch === '々' ||
    ch === 'ヶ' ||
    ch === 'ケ' // 「一ケ月」這種寫法
  );
}

/**
 * 把標註格式解析成分段陣列。
 *
 * @throws 大括號沒有閉合、讀音為空、或大括號前面不是漢字時丟出錯誤，
 *         讓內容打錯字時在載入階段就被抓到，而不是畫面上默默少一塊。
 */
export function parseRuby(text: string): RubySegment[] {
  const segments: RubySegment[] = [];
  let plain = '';

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;

    if (ch === '}') {
      throw new SyntaxError(`振假名標註有多餘的「}」：${text}`);
    }

    if (ch !== '{') {
      plain += ch;
      continue;
    }

    // 找到閉合的大括號
    const close = text.indexOf('}', i + 1);
    if (close === -1) {
      throw new SyntaxError(`振假名標註缺少對應的「}」：${text}`);
    }
    const rt = text.slice(i + 1, close);
    if (rt.length === 0) {
      throw new SyntaxError(`振假名讀音不可為空：${text}`);
    }
    if (rt.includes('{')) {
      throw new SyntaxError(`振假名標註不可巢狀：${text}`);
    }

    // 往回抓緊鄰的漢字串當作 base
    let baseLen = 0;
    while (baseLen < plain.length && isKanji(plain[plain.length - 1 - baseLen]!)) {
      baseLen++;
    }
    if (baseLen === 0) {
      throw new SyntaxError(
        `「{${rt}}」前面必須是漢字，才知道要標在哪個字上：${text}`,
      );
    }

    const base = plain.slice(plain.length - baseLen);
    const before = plain.slice(0, plain.length - baseLen);
    if (before) segments.push({ base: before });
    segments.push({ base, rt });

    plain = '';
    i = close;
  }

  if (plain) segments.push({ base: plain });
  return segments;
}

/** 取得不含振假名的純文字（用於搜尋、比對、複製） */
export function rubyToPlainText(segments: RubySegment[]): string {
  return segments.map((s) => s.base).join('');
}

/** 取得全假名讀音（漢字換成讀音；沒標讀音的部分原樣保留） */
export function rubyToReading(segments: RubySegment[]): string {
  return segments.map((s) => s.rt ?? s.base).join('');
}
