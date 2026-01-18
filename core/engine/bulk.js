(function (global) {
    const internal = global.JetPaletteEngineInternal = global.JetPaletteEngineInternal || {};

    internal.createBulkAdd = ({ data, getCollection, getCategories, getDefaultBuffColor, validateColor }) => {
        return (type, rawText) => {
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

                        return internal.normalizeBuff({
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
    };
})(window);
