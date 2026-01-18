const JetPaletteEngine = (() => {
    const internal = window.JetPaletteEngineInternal || {};
    const ensureArray = internal.ensureArray || ((value) => (Array.isArray(value) ? value : []));
    const normalizeBuffs = internal.normalizeBuffs || ((buffs = []) => (Array.isArray(buffs) ? buffs : []));
    const convertYstToJetPalette = (input) => {
        if (typeof internal.convertYstToJetPalette === 'function') {
            return internal.convertYstToJetPalette(input);
        }
        if (window.JetPaletteConverters?.convertYstToJetPalette) {
            return window.JetPaletteConverters.convertYstToJetPalette(input);
        }
        throw new Error('変換モジュールが読み込まれていません');
    };

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

        const bulkAdd = internal.createBulkAdd
            ? internal.createBulkAdd({
                data,
                getCollection,
                getCategories,
                getDefaultBuffColor,
                validateColor
            })
            : () => ({ added: 0, errors: ['bulkAddが初期化されていません'] });

        const generateCommands = internal.createCommandGenerator
            ? internal.createCommandGenerator({ data, getCollection })
            : () => null;

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
        normalizeBuffs,
        convertYstToJetPalette
    };
})();
