const JetPaletteConverters = (() => {
  const abilityNames = ['器用', '敏捷', '筋力', '生命', '知力', '精神'];
  const abilitySet = new Set(abilityNames);

  const specialVariables = new Set([
    '器用増強',
    '敏捷増強',
    '筋力増強',
    '生命増強',
    '知力増強',
    '精神増強',
    '命中修正',
    'C修正',
    '追加D修正',
    '魔力修正',
    '行使修正',
    '魔法D修正',
    '回復量修正',
    '生命抵抗修正',
    '精神抵抗修正',
    '回避修正',
    'クリレイ',
    '必殺効果'
  ]);

  const normalizeNewlines = (text) => text.replace(/\r\n?/g, '\n');

  const parseAssignments = (lines) => {
    const assignments = new Map();
    const pattern = /^\/\/\s*([^=]+?)\s*=\s*(.+)$/;
    lines.forEach((line) => {
      const match = line.match(pattern);
      if (match) {
        assignments.set(match[1].trim(), match[2].trim());
      }
    });
    return assignments;
  };

  const createExpander = (assignments, dictionarySet) => {
    const cache = new Map();

    const registerDictionary = (name) => {
      dictionarySet.add(name);
      return `//${name}//`;
    };

    const expandVariable = (name, stack) => {
      const trimmed = name.trim();
      if (!trimmed) return '{}';

      if (specialVariables.has(trimmed)) {
        return registerDictionary(trimmed);
      }
      if (abilitySet.has(trimmed)) {
        return `{${trimmed}}`;
      }
      if (cache.has(trimmed)) {
        return cache.get(trimmed);
      }
      if (stack.has(trimmed)) {
        return `{${trimmed}}`;
      }
      if (!assignments.has(trimmed)) {
        return `{${trimmed}}`;
      }

      stack.add(trimmed);
      const expanded = expandExpression(assignments.get(trimmed), stack);
      stack.delete(trimmed);
      cache.set(trimmed, expanded);
      return expanded;
    };

    const expandExpression = (expression, stack = new Set()) => {
      if (!expression) return '';
      return expression.replace(/(\$\+|[+\-#$])?\s*\{([^}]+)\}/g, (match, operator, variable) => {
        const trimmed = variable.trim();
        const expanded = expandVariable(trimmed, stack);
        if (specialVariables.has(trimmed)) {
          return expanded;
        }
        return `${operator || ''}${expanded}`;
      });
    };

    return {
      expandExpression,
      registerDictionary
    };
  };

  const sanitizeAttackName = (name) => {
    let result = name.trim();
    result = result.replace(/^(ダメージ／|回復量／)/, '').trim();
    while (/^\[[^\]]+\]/.test(result)) {
      result = result.replace(/^\[[^\]]+\]\s*/, '').trim();
    }
    return result;
  };

  const parseAbilityJudge = (name) => {
    const trimmed = name.trim();
    for (const ability of abilityNames) {
      if (trimmed === `冒険者＋${ability}`) {
        return ability;
      }
    }
    return null;
  };

  const convertYstToJetPalette = (input) => {
    const normalized = normalizeNewlines(input);
    const lines = normalized.split('\n');
    const assignments = parseAssignments(lines);

    if (assignments.size === 0) {
      throw new Error('代入定義（//変数=式）が見つかりません');
    }

    const dictionarySet = new Set();
    const { expandExpression, registerDictionary } = createExpander(assignments, dictionarySet);

    const judges = [];
    const judgeCategories = [];
    const attacks = [];
    const attackCategories = [];

    const addCategory = (list, name) => {
      if (name && !list.includes(name)) {
        list.push(name);
      }
    };

    let currentCategory = null;
    lines.forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) return;

      const sectionMatch = line.match(/^###\s*■\s*(.+)$/);
      if (sectionMatch) {
        currentCategory = sectionMatch[1].trim();
        return;
      }

      if (line.startsWith('[宣]')) {
        return;
      }

      if (/^\/\//.test(line)) {
        return;
      }

      if (/^2d/i.test(line)) {
        const match = line.match(/^(\S+)\s+(.+)$/);
        if (!match) return;

        const rollRaw = match[1];
        const nameRaw = match[2].trim();
        const ability = parseAbilityJudge(nameRaw);
        let name = nameRaw;
        let roll = rollRaw;

        if (ability) {
          name = `${ability}判定`;
          roll = `2d+{冒険者レベル}+(({${ability}}//${ability}増強//)/6)`;
          registerDictionary(`${ability}増強`);
        } else {
          roll = expandExpression(rollRaw);
        }

        judges.push({
          name,
          roll,
          category: currentCategory || null
        });
        addCategory(judgeCategories, currentCategory);
        return;
      }

      if (/^k\d+/i.test(line)) {
        const match = line.match(/^(\S+)\s+(.+)$/);
        if (!match) return;

        const rollRaw = match[1];
        const nameRaw = match[2].trim();
        const roll = expandExpression(rollRaw);
        const name = sanitizeAttackName(nameRaw);

        attacks.push({
          name,
          roll,
          category: currentCategory || null
        });
        addCategory(attackCategories, currentCategory);
      }
    });

    const buffs = [];
    const equipmentColor = '#6272A4';
    const diceColor = '#8BE9FD';

    abilityNames.forEach((ability) => {
      buffs.push({
        name: `${ability}装備`,
        memo: `${ability}+n`,
        showSimpleMemo: true,
        effect: '+0',
        targets: [`judge:${ability}判定`],
        turn: null,
        originalTurn: null,
        color: equipmentColor,
        category: '装備',
        active: true
      });
    });

    buffs.push(
      {
        name: '名前を入力',
        memo: '出目+n',
        showSimpleMemo: true,
        effect: '$+0',
        targets: ['attack-category:武器攻撃'],
        turn: null,
        originalTurn: null,
        color: diceColor,
        category: '出目修正',
        active: true
      },
      {
        name: '名前を入力',
        memo: '必殺効果',
        showSimpleMemo: true,
        effect: '#-0',
        targets: ['attack-category:武器攻撃'],
        turn: null,
        originalTurn: null,
        color: diceColor,
        category: '出目修正',
        active: true
      }
    );

    const userDictionary = Array.from(dictionarySet).map((name) => ({
      id: crypto.randomUUID(),
      text: `//${name}//`,
      category: '代入記法',
      usage: 0
    }));

    return {
      buffs,
      buffCategories: ['出目修正', '装備'],
      judges,
      judgeCategories,
      attacks,
      attackCategories,
      userDictionary
    };
  };

  const api = {
    convertYstToJetPalette,
    normalizeNewlines,
    parseAssignments,
    createExpander,
    sanitizeAttackName,
    parseAbilityJudge,
    abilityNames,
    specialVariables
  };

  if (typeof window !== 'undefined') {
    window.JetPaletteCore = window.JetPaletteCore || {};
    window.JetPaletteCore.convertYstToJetPalette = convertYstToJetPalette;
  }

  return api;
})();
