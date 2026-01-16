const JetPaletteEngine = (() => {
    const escapeHtml = (text) => {
        if (typeof text !== 'string') return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    const normalizeBuff = (buff = {}) => {
        const memoText = typeof buff.memo === 'string'
            ? buff.memo
            : (typeof buff.description === 'string' ? buff.description : '');
        const showSimpleMemo = typeof buff.showSimpleMemo === 'boolean'
            ? buff.showSimpleMemo
            : Boolean(buff.description);

        const { description, ...rest } = buff;
        return {
            ...rest,
            memo: memoText,
            showSimpleMemo
        };
    };

    const normalizeBuffs = (buffs = []) => {
        if (!Array.isArray(buffs)) return [];
        return buffs.map(normalizeBuff);
    };

    const ensureArray = (value) => (Array.isArray(value) ? value : []);

    const createStore = (initial = {}, options = {}) => {
        const data = initial || {};
        data.buffs = normalizeBuffs(data.buffs || []);
        data.buffCategories = ensureArray(data.buffCategories);
        data.judges = ensureArray(data.judges);
        data.judgeCategories = ensureArray(data.judgeCategories);
        data.attacks = ensureArray(data.attacks);
        data.attackCategories = ensureArray(data.attackCategories);
        data.userDictionary = ensureArray(data.userDictionary);

        const getDefaultBuffColor = options.getDefaultBuffColor || (() => '#BD93F9');
        const validateColor = options.validateColor || ((color) => {
            const hexPattern = /^#[0-9A-Fa-f]{6}$/;
            if (hexPattern.test(color)) return color;
            return getDefaultBuffColor();
        });

        const getCollection = (type) => {
            if (type === 'buff') return data.buffs;
            if (type === 'judge') return data.judges;
            if (type === 'attack') return data.attacks;
            return null;
        };

        const getCategories = (type) => {
            if (type === 'buff') return data.buffCategories;
            if (type === 'judge') return data.judgeCategories;
            if (type === 'attack') return data.attackCategories;
            return null;
        };

        const setState = (patch = {}) => {
            if (Object.prototype.hasOwnProperty.call(patch, 'buffs')) {
                data.buffs = normalizeBuffs(patch.buffs || []);
            }
            if (Object.prototype.hasOwnProperty.call(patch, 'buffCategories')) {
                data.buffCategories = ensureArray(patch.buffCategories);
            }
            if (Object.prototype.hasOwnProperty.call(patch, 'judges')) {
                data.judges = ensureArray(patch.judges);
            }
            if (Object.prototype.hasOwnProperty.call(patch, 'judgeCategories')) {
                data.judgeCategories = ensureArray(patch.judgeCategories);
            }
            if (Object.prototype.hasOwnProperty.call(patch, 'attacks')) {
                data.attacks = ensureArray(patch.attacks);
            }
            if (Object.prototype.hasOwnProperty.call(patch, 'attackCategories')) {
                data.attackCategories = ensureArray(patch.attackCategories);
            }
            if (Object.prototype.hasOwnProperty.call(patch, 'userDictionary')) {
                data.userDictionary = ensureArray(patch.userDictionary);
            }
            return data;
        };

        const addItem = (type, item) => {
            const list = getCollection(type);
            if (!list) return -1;
            list.push(item);
            return list.length - 1;
        };

        const updateItem = (type, index, patch) => {
            const list = getCollection(type);
            if (!list || index < 0 || index >= list.length) return false;
            list[index] = { ...list[index], ...patch };
            return true;
        };

        const removeItem = (type, index) => {
            const list = getCollection(type);
            if (!list || index < 0 || index >= list.length) return null;
            const [removed] = list.splice(index, 1);
            return removed;
        };

        const exportData = () => {
            const payload = {
                buffs: data.buffs,
                buffCategories: data.buffCategories,
                judges: data.judges,
                judgeCategories: data.judgeCategories,
                attacks: data.attacks,
                attackCategories: data.attackCategories,
                userDictionary: data.userDictionary
            };
            return JSON.stringify(payload, null, 2);
        };

        const importData = (json) => {
            const parsed = typeof json === 'string' ? JSON.parse(json) : json;
            if (!parsed || !parsed.buffs || !parsed.judges || !parsed.attacks) {
                throw new Error('無効なデータ形式です');
            }
            setState({
                buffs: parsed.buffs,
                buffCategories: parsed.buffCategories,
                judges: parsed.judges,
                judgeCategories: parsed.judgeCategories,
                attacks: parsed.attacks,
                attackCategories: parsed.attackCategories,
                userDictionary: parsed.userDictionary
            });
            return data;
        };

        const bulkAdd = (type, rawText) => {
            const list = getCollection(type);
            if (!list || typeof rawText !== 'string') {
                return { added: 0, errors: ['入力テキストが無効です'] };
            }

            const typeConfig = {
                buff: {
                    minParts: 1,
                    parser: (parts, index, category) => {
                        const name = parts[0];
                        const targetStr = parts[1] || '';
                        const colorPattern = /^#[0-9A-Fa-f]{6}$/;
                        const colorIndex = parts.findIndex((part, idx) => idx >= 2 && colorPattern.test(part));
                        const memoAfterColor = (colorIndex >= 0 && colorIndex + 1 < parts.length)
                            ? (parts[colorIndex + 1] || '')
                            : '';
                        const defaultColor = getDefaultBuffColor();
                        const color = validateColor(colorIndex >= 0
                            ? (parts[colorIndex] || defaultColor)
                            : (parts[4] || defaultColor));

                        const payloadEnd = colorIndex >= 0 ? colorIndex : parts.length;
                        const payload = parts.slice(2, payloadEnd);
                        const hasSimpleMemoField = payload.length >= 3;

                        const simpleMemo = hasSimpleMemoField ? (payload[0] || '') : '';
                        const effect = hasSimpleMemoField ? (payload[1] || '') : (payload[0] || '');
                        const turn = hasSimpleMemoField
                            ? (payload[2] ? parseInt(payload[2]) : null)
                            : (payload[1] ? parseInt(payload[1]) : null);
                        const memo = simpleMemo
                            ? `${simpleMemo}${memoAfterColor ? `\n${memoAfterColor}` : ''}`
                            : memoAfterColor;
                        if (!name) throw `行${index + 1}: バフ名が空です`;

                        const targetNames = targetStr.split(',').map(t => t.trim());
                        const targets = [];

                        targetNames.forEach((tName) => {
                            if (tName.startsWith('>>')) {
                                const catName = tName.replace(/^>>\s*/, '');
                                let matched = false;
                                if (data.judgeCategories.includes(catName)) {
                                    targets.push(`judge-category:${catName}`);
                                    matched = true;
                                }
                                if (data.attackCategories.includes(catName)) {
                                    targets.push(`attack-category:${catName}`);
                                    matched = true;
                                }
                                if (!matched) {
                                    throw `行${index + 1}: カテゴリ「${catName}」が見つかりません`;
                                }
                                return;
                            }
                            if (tName === 'なし' || tName === '') targets.push('none');
                            else if (tName === 'すべての判定') targets.push('all-judge');
                            else if (tName === 'すべての攻撃') targets.push('all-attack');
                            else {
                                const judge = data.judges.find(j => j.name === tName);
                                if (judge) targets.push(`judge:${tName}`);
                                else {
                                    const attack = data.attacks.find(a => a.name === tName);
                                    if (attack) targets.push(`attack:${tName}`);
                                    else throw `行${index + 1}: 効果先「${tName}」が見つかりません`;
                                }
                            }
                        });

                        if (targets.length === 0) throw `行${index + 1}: 有効な効果先がありません`;

                        return normalizeBuff({
                            name,
                            memo,
                            effect,
                            targets,
                            turn,
                            originalTurn: turn,
                            color,
                            active: true,
                            category
                        });
                    }
                },
                judge: {
                    minParts: 2,
                    parser: (parts, index, category) => {
                        const name = parts[0];
                        const roll = parts[1];
                        if (!name || !roll) throw `行${index + 1}: 必須項目が不足しています`;
                        return { name, roll, category };
                    }
                },
                attack: {
                    minParts: 2,
                    parser: (parts, index, category) => {
                        const name = parts[0];
                        const roll = parts[1];
                        if (!name || !roll) throw `行${index + 1}: 必須項目が不足しています`;
                        return { name, roll, category };
                    }
                }
            };

            const config = typeConfig[type];
            if (!config) return { added: 0, errors: ['無効な種類です'] };

            const lines = rawText.split('\n').filter(line => line.trim());
            let added = 0;
            let currentCategory = null;
            const errors = [];

            lines.forEach((line, index) => {
                const openMatch = line.match(/^<([^/][^>]*)>$/);
                const closeMatch = line.match(/^<\/([^>]+)>$/);

                if (openMatch) {
                    currentCategory = openMatch[1].trim();
                    const cats = getCategories(type);
                    if (cats && currentCategory && !cats.includes(currentCategory)) {
                        cats.push(currentCategory);
                    }
                    return;
                }

                if (closeMatch) {
                    currentCategory = null;
                    return;
                }

                try {
                    const parts = line.split('|').map(p => p.trim());
                    if (parts.length < config.minParts) return;
                    const item = config.parser(parts, index, currentCategory);
                    list.push(item);
                    added += 1;
                } catch (error) {
                    errors.push(String(error));
                }
            });

            return { added, errors };
        };

        const generateCommands = (type, index, options = {}) => {
            const list = getCollection(type);
            if (!list || index < 0 || index >= list.length) return null;

            const item = list[index];
            let command = item.roll || '';

            const filterKey = type === 'judge' ? 'judge:' : 'attack:';
            const categoryKey = type === 'judge' ? 'judge-category:' : 'attack-category:';
            const itemCategory = item.category || null;
            const activeBuffs = data.buffs.filter(b =>
                b.active &&
                b.effect &&
                (b.targets.includes(type === 'judge' ? 'all-judge' : 'all-attack') ||
                    b.targets.includes(filterKey + item.name) ||
                    (itemCategory && b.targets.includes(categoryKey + itemCategory)))
            );

            const slotMap = {};
            const normalEffects = [];
            const buffColorMap = {};

            activeBuffs.forEach((buff) => {
                const effects = String(buff.effect).split(',').map(e => e.trim());

                effects.forEach((effect) => {
                    const slotMatch = effect.match(/\/\/([^/]+)=(.+)/);

                    if (slotMatch) {
                        const slotName = slotMatch[1];
                        const slotValue = slotMatch[2];

                        if (!slotMap[slotName]) {
                            slotMap[slotName] = [];
                            buffColorMap[slotName] = [];
                        }
                        slotMap[slotName].push(slotValue);
                        buffColorMap[slotName].push(buff.color);
                    } else if (effect) {
                        normalEffects.push({ text: effect, color: buff.color });
                    }
                });
            });

            const commandParts = [{ text: command, color: null }];
            commandParts[0].text = commandParts[0].text.replace(/\/\/([^/]+)\/\//g, (match, slotName) => {
                if (slotMap[slotName] && slotMap[slotName].length > 0) {
                    return `__SLOT_${slotName}__`;
                }
                return '';
            });

            const finalParts = [];
            const baseText = commandParts[0].text;
            let lastIndex = 0;
            const slotRegex = /__SLOT_([^_]+)__/g;
            let match;

            while ((match = slotRegex.exec(baseText)) !== null) {
                if (match.index > lastIndex) {
                    finalParts.push({
                        text: baseText.substring(lastIndex, match.index),
                        color: null
                    });
                }

                const slotName = match[1];
                if (slotMap[slotName]) {
                    slotMap[slotName].forEach((value, idx) => {
                        finalParts.push({
                            text: value,
                            color: buffColorMap[slotName][idx]
                        });
                    });
                }

                lastIndex = match.index + match[0].length;
            }

            if (lastIndex < baseText.length) {
                finalParts.push({
                    text: baseText.substring(lastIndex),
                    color: null
                });
            }

            normalEffects.forEach((effect) => {
                finalParts.push(effect);
            });

            let targetSuffix = '';
            if (type === 'judge') {
                const targetType = options.targetType || 'none';
                const targetValue = String(options.targetValue || '').trim();

                if (targetType === 'gte' && targetValue) {
                    targetSuffix = `>=${targetValue}`;
                } else if (targetType === 'lte' && targetValue) {
                    targetSuffix = `=<${targetValue}`;
                }
            }

            finalParts.push({ text: targetSuffix, color: null });
            finalParts.push({ text: ` ${item.name}`, color: null });

            const html = finalParts
                .map((part) => {
                    if (part.color) {
                        return `<span style="color: ${part.color}">${escapeHtml(part.text)}</span>`;
                    }
                    return escapeHtml(part.text);
                })
                .join('');

            const text = finalParts.map(part => part.text).join('');

            return { html, text, parts: finalParts };
        };

        return {
            getState: () => data,
            setState,
            addItem,
            updateItem,
            removeItem,
            exportData,
            importData,
            bulkAdd,
            generateCommands
        };
    };

    return {
        createStore,
        normalizeBuffs
    };
})();
