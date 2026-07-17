export const ocrParser = {
  parse(rawText) {
    const suggestions = {}

    if (!rawText) return suggestions

    // 2. Production Date
    const prodRegex = /(?:生产日期|生产|制造日期|MFG)[\s:：]*((?:20\d{2})[-/年.](?:0?[1-9]|1[0-2])(?:[-/月.](?:0?[1-9]|[12]\d|3[01])日?)?)/i;
    const prodMatch = rawText.match(prodRegex);
    if (prodMatch && prodMatch[1]) {
      suggestions.productionDate = this.normalizeDate(prodMatch[1]);
    }

    // 3. Expiry Date (Reference)
    const expRegex = /(?:有效期至|到期|EXP|Best Before)[\s:：]*((?:20\d{2})[-/年.](?:0?[1-9]|1[0-2])(?:[-/月.](?:0?[1-9]|[12]\d|3[01])日?)?)/i;
    const expMatch = rawText.match(expRegex);
    if (expMatch && expMatch[1]) {
      suggestions.expiryDateReference = this.normalizeDate(expMatch[1]);
    }

    // 4. Shelf Life
    const shelfLifeRegex = /(?:保质期)[\s:：]*([一二三四五六七八九十\d]+)个?(年|月|天|日)/;
    const shelfLifeMatch = rawText.match(shelfLifeRegex);
    if (shelfLifeMatch) {
      const val = this.parseChineseNum(shelfLifeMatch[1]);
      let unit = shelfLifeMatch[2];
      if (unit === '日') unit = '天';
      if (val) {
        suggestions.shelfLifeValue = val.toString();
        suggestions.shelfLifeUnit = unit === '年' ? 'year' : unit === '月' ? 'month' : 'day';
      }
    } else {
      // Shorter forms like "12个月", "三年"
      const shortShelfRegex = /([一二三四五六七八九十\d]+)个?(年|月|天|日)保质期?/
      const shortShelfMatch = rawText.match(shortShelfRegex);
      if (shortShelfMatch) {
        const val = this.parseChineseNum(shortShelfMatch[1]);
        let unit = shortShelfMatch[2];
        if (unit === '日') unit = '天';
        if (val) {
          suggestions.shelfLifeValue = val.toString();
          suggestions.shelfLifeUnit = unit === '年' ? 'year' : unit === '月' ? 'month' : 'day';
        }
      }
    }

    // 5. After Opening Shelf Life
    const aoRegex = /(?:开封后)[\s:：]*(\d+)个?(月|天)/;
    const aoMatch = rawText.match(aoRegex);
    if (aoMatch) {
      suggestions.afterOpeningShelfLifeValue = aoMatch[1];
      suggestions.afterOpeningShelfLifeUnit = aoMatch[2] === '月' ? 'month' : 'day';
    } else {
      // 6M, 12M
      const mRegex = /\b(\d+)\s*M\b/i;
      const mMatch = rawText.match(mRegex);
      if (mMatch) {
        suggestions.afterOpeningShelfLifeValue = mMatch[1];
        suggestions.afterOpeningShelfLifeUnit = 'month';
      }
    }

    // 7. Fallback: Loose Date Matching for dates without prefixes
    if (!suggestions.productionDate && !suggestions.expiryDateReference) {
      const looseDateRegex = /((?:20\d{2})[-/年.](?:0?[1-9]|1[0-2])(?:[-/月.](?:0?[1-9]|[12]\d|3[01])日?)?)/g;
      const looseMatches = [];
      let match;
      while ((match = looseDateRegex.exec(rawText)) !== null) {
        looseMatches.push(this.normalizeDate(match[1]));
      }
      
      if (looseMatches.length > 0) {
        const uniqueDates = [...new Set(looseMatches)];
        // Sort chronologically
        uniqueDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        
        if (uniqueDates.length >= 2) {
          suggestions.productionDate = uniqueDates[0];
          suggestions.expiryDateReference = uniqueDates[uniqueDates.length - 1];
        } else if (uniqueDates.length === 1) {
          const d = new Date(uniqueDates[0]);
          const now = new Date();
          if (d.getFullYear() <= now.getFullYear()) {
             suggestions.productionDate = uniqueDates[0];
          } else {
             suggestions.expiryDateReference = uniqueDates[0];
          }
        }
      }
    }

    return suggestions;
  },

  normalizeDate(dateStr) {
    let s = dateStr.replace(/[年月日]/g, '-').replace(/\.$/, '');
    if (s.endsWith('-')) s = s.slice(0, -1);
    s = s.replace(/\./g, '-').replace(/\//g, '-');
    const parts = s.split('-');
    if (parts.length === 2) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}`;
    }
    if (parts.length === 3) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    return dateStr;
  },

  parseChineseNum(str) {
    const map = {
      '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5,
      '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
    };
    if (map[str]) return map[str];
    const n = parseInt(str);
    if (!isNaN(n)) return n;
    return null;
  }
}
