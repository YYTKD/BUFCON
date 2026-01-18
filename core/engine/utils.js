(function (global) {
    const internal = global.JetPaletteEngineInternal = global.JetPaletteEngineInternal || {};

    internal.ensureArray = (value) => (Array.isArray(value) ? value : []);

    internal.escapeHtml = (text) => {
        if (typeof text !== 'string') return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };
})(window);
