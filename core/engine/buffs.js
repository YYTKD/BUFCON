(function (global) {
    const internal = global.JetPaletteEngineInternal = global.JetPaletteEngineInternal || {};

    internal.normalizeBuff = (buff = {}) => {
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

    internal.normalizeBuffs = (buffs = []) => {
        if (!Array.isArray(buffs)) return [];
        return buffs.map(internal.normalizeBuff);
    };
})(window);
