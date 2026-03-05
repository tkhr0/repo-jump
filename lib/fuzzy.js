// lib/fuzzy.js - スコアリング付き fuzzy search アルゴリズム

// eslint-disable-next-line no-unused-vars
const FuzzySearch = (() => {
  const SCORE_EXACT = 1000;
  const SCORE_PREFIX = 800;
  const SCORE_SUBSTRING = 600;
  const SCORE_FUZZY = 400;

  /**
   * fuzzy match を行い、スコアとハイライト位置を返す
   * @param {string} query - 検索クエリ
   * @param {string} text - 検索対象テキスト
   * @returns {{ matched: boolean, score: number, highlights: number[] }}
   */
  function fuzzyMatch(query, text) {
    if (!query) {
      return { matched: true, score: 0, highlights: [] };
    }

    const lowerQuery = query.toLowerCase();
    const lowerText = text.toLowerCase();

    // 完全一致
    if (lowerText === lowerQuery) {
      const highlights = Array.from({ length: text.length }, (_, i) => i);
      return { matched: true, score: SCORE_EXACT, highlights };
    }

    // 前方一致
    if (lowerText.startsWith(lowerQuery)) {
      const highlights = Array.from({ length: query.length }, (_, i) => i);
      return { matched: true, score: SCORE_PREFIX + query.length, highlights };
    }

    // 部分一致（連続）
    const substringIndex = lowerText.indexOf(lowerQuery);
    if (substringIndex !== -1) {
      const highlights = Array.from(
        { length: query.length },
        (_, i) => substringIndex + i,
      );
      return {
        matched: true,
        score: SCORE_SUBSTRING + query.length,
        highlights,
      };
    }

    // fuzzy 一致（非連続）
    const highlights = [];
    let qi = 0;
    for (let ti = 0; ti < lowerText.length && qi < lowerQuery.length; ti++) {
      if (lowerText[ti] === lowerQuery[qi]) {
        highlights.push(ti);
        qi++;
      }
    }

    if (qi === lowerQuery.length) {
      // 連続するマッチにボーナスを与える
      let consecutiveBonus = 0;
      for (let i = 1; i < highlights.length; i++) {
        if (highlights[i] === highlights[i - 1] + 1) {
          consecutiveBonus += 10;
        }
      }
      return {
        matched: true,
        score: SCORE_FUZZY + consecutiveBonus + query.length,
        highlights,
      };
    }

    return { matched: false, score: 0, highlights: [] };
  }

  /**
   * リストを fuzzy 検索してスコア降順でソート
   * @param {string} query - 検索クエリ
   * @param {Array} items - 検索対象の配列
   * @param {function} getText - 各アイテムからテキストを取り出す関数
   * @returns {Array<{ item: *, score: number, highlights: number[] }>}
   */
  function fuzzyFilter(query, items, getText) {
    if (!query) {
      return items.map((item) => ({ item, score: 0, highlights: [] }));
    }

    const results = [];
    for (const item of items) {
      const text = getText(item);
      const result = fuzzyMatch(query, text);
      if (result.matched) {
        results.push({
          item,
          score: result.score,
          highlights: result.highlights,
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results;
  }

  return { fuzzyMatch, fuzzyFilter };
})();
