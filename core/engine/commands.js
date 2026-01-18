(function (global) {
    const internal = global.JetPaletteEngineInternal = global.JetPaletteEngineInternal || {};

    internal.createCommandGenerator = ({ data, getCollection }) => {
        return (type, index, options = {}) => {
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
                        return `<span style="color: ${part.color}">${internal.escapeHtml(part.text)}</span>`;
                    }
                    return internal.escapeHtml(part.text);
                })
                .join('');

            const text = finalParts.map(part => part.text).join('');

            return { html, text, parts: finalParts };
        };
    };
})(window);
