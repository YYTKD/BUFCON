// ========================================
// アプリケーション状態
// ========================================
const uiState = {
    draggedIndex: null,
    draggedType: null,
    draggedCategory: null,
    draggedCategoryType: null,
    draggedCategoryName: null,
    selectedBuffTargets: [],
    editMode: {
        active: false,
        type: null,
        index: null
    },
    macroEditingId: null
};

let store = null;

const TYPE_CONFIG = {
    buff: { collection: 'buffs', categories: 'buffCategories' },
    judge: { collection: 'judges', categories: 'judgeCategories' },
    attack: { collection: 'attacks', categories: 'attackCategories' }
};

function getCollection(type) {
    if (type === 'macro') {
        return store?.getState().userDictionary || [];
    }
    const config = TYPE_CONFIG[type];
    if (!config) return null;
    const data = store?.getState();
    if (!data) return null;
    return data[config.collection];
}

// ========================================
// コンテキストメニュー
// ========================================
let contextMenuElement = null;

function getContextMenu() {
    if (contextMenuElement) return contextMenuElement;

    contextMenuElement = document.createElement('div');
    contextMenuElement.id = 'item-context-menu';
    contextMenuElement.className = 'context-menu u-hidden';
    document.body.appendChild(contextMenuElement);

    document.addEventListener('click', hideContextMenu);
    window.addEventListener('resize', hideContextMenu);
    window.addEventListener('scroll', hideContextMenu, true);

    return contextMenuElement;
}

function hideContextMenu() {
    if (contextMenuElement) {
        contextMenuElement.classList.add('u-hidden');
    }
}

function showContextMenu(x, y, actions = []) {
    if (!actions.length) return;

    const menu = getContextMenu();
    menu.innerHTML = '';

    const openDialog = getActiveModal();
    if (openDialog) {
        openDialog.appendChild(contextMenuElement);
    }

    actions.forEach((action, index) => {
        if (index > 0) {
            const separator = document.createElement('div');
            separator.className = 'context-menu__separator';
            menu.appendChild(separator);
        }

        const button = document.createElement('button');
        button.className = 'context-menu__item';
        button.textContent = action.label;
        button.addEventListener('click', () => {
            action.onClick();
            hideContextMenu();
        });
        menu.appendChild(button);
    });

    menu.classList.remove('u-hidden');
    menu.style.visibility = 'hidden';
    menu.style.left = '0px';
    menu.style.top = '0px';

    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const viewportRight = window.scrollX + window.innerWidth;
    const viewportBottom = window.scrollY + window.innerHeight;

    let left = x;
    let top = y;

    if (left + menuWidth > viewportRight) {
        left = viewportRight - menuWidth - 8;
    }
    if (top + menuHeight > viewportBottom) {
        top = viewportBottom - menuHeight - 8;
    }

    left = Math.max(window.scrollX + 8, left);
    top = Math.max(window.scrollY + 8, top);

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.visibility = 'visible';
}

const ITEM_CONTEXT_ACTION_BUILDERS = {
    buff: (index) => ([
        { label: '編集', onClick: () => openBuffModal(index) },
        { label: 'テキストをコピー', onClick: () => copyItemData('buff', index) },
        { label: '削除', onClick: () => removeBuff(index) }
    ]),
    judge: (index) => ([
        { label: '編集', onClick: () => openJudgeModal(index) },
        { label: 'テキストをコピー', onClick: () => copyItemData('judge', index) },
        { label: '削除', onClick: () => removeJudge(index) }
    ]),
    attack: (index) => ([
        { label: '編集', onClick: () => openAttackModal(index) },
        { label: 'テキストをコピー', onClick: () => copyItemData('attack', index) },
        { label: '削除', onClick: () => removeAttack(index) }
    ]),
    macro: (index) => ([
        { label: '編集', onClick: () => startMacroEdit(index) },
        { label: '削除', onClick: () => deleteMacro(index) }
    ])
};

function getItemContextActions(type, index) {
    const builder = ITEM_CONTEXT_ACTION_BUILDERS[type];
    return builder ? builder(index) : [];
}

function openItemContextMenu(event, type, index) {
    event.preventDefault();
    const actions = getItemContextActions(type, index);

    hideContextMenu();
    showContextMenu(event.pageX, event.pageY, actions);
}

function openCategoryContextMenu(event, type, categoryName) {
    event.preventDefault();

    const actions = [
        { label: '編集', onClick: () => editCategory(type, categoryName) },
        { label: 'カテゴリ名をコピー', onClick: () => copyCategoryName(categoryName) },
        { label: '削除', onClick: () => removeCategory(type, categoryName) }
    ];

    hideContextMenu();
    showContextMenu(event.pageX, event.pageY, actions);
}

// ========================================
// 設定メニュー
// ========================================

function openSettingsModal(targetId) {
    const modal = document.getElementById(targetId);
    if (modal?.showModal) {
        modal.showModal();
    }
}

function setupSettingsMenu() {
    const toggle = document.getElementById('settingsToggle');
    const dropdown = document.getElementById('settingsDropdown');
    if (!toggle || !dropdown) return;

    const hideDropdown = () => {
        dropdown.classList.add('u-hidden');
        toggle.setAttribute('aria-expanded', 'false');
    };

    const showDropdown = () => {
        dropdown.classList.remove('u-hidden');
        toggle.setAttribute('aria-expanded', 'true');
    };

    toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        if (isExpanded) {
            hideDropdown();
        } else {
            showDropdown();
        }
    });

    dropdown.addEventListener('click', (event) => {
        const item = event.target.closest('.site-header__dropdown-item');
        if (!item) return;
        const targetId = item.dataset.target;
        hideDropdown();
        if (targetId) {
            openSettingsModal(targetId);
        }
    });

    document.addEventListener('click', (event) => {
        if (!dropdown.contains(event.target) && !toggle.contains(event.target)) {
            hideDropdown();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            hideDropdown();
        }
    });
}

function getCategories(type) {
    if (type === 'macro') {
        const categories = [];
        const dictionary = store?.getState().userDictionary || [];
        dictionary.forEach(item => {
            const name = item.category ? item.category.trim() : '';
            if (name && !categories.includes(name)) {
                categories.push(name);
            }
        });
        return categories;
    }
    const config = TYPE_CONFIG[type];
    if (!config) return null;
    const data = store?.getState();
    if (!data) return null;
    return data[config.categories];
}

// ========================================
// ユーティリティ関数
// ========================================

/**
 * 16進数カラーコードから適切なテキストカラーを計算
 */
function getContrastColor(hexColor) {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#282A36' : '#F8F8F2';
}

/**
 * HTMLエスケープ処理(XSS対策)
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * カラーコードバリデーション
 */
function validateColor(color) {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    if (hexPattern.test(color)) return color;
    return getThemeColorValue('--color-red', '#FF5555');
}

function getThemeColorValue(variable, fallback) {
    const value = getComputedStyle(document.documentElement)
        .getPropertyValue(variable)
        .trim();
    return value || fallback;
}

function getDefaultBuffColor() {
    return getThemeColorValue('--color-purple', '#BD93F9');
}

function getSecondaryBuffColor() {
    return getThemeColorValue('--color-orange', '#FFB86C');
}

store = JetPaletteEngine.createStore({}, {
    validateColor,
    getDefaultBuffColor
});

// ========================================
// テーマ管理
// ========================================
const THEME_STORAGE_KEY = 'theme';
const THEME_OPTIONS = {
    dracula: { label: 'Dracula', icon: 'dark_mode' },
    alucard: { label: 'Alucard', icon: 'light_mode' }
};

function applyTheme(theme, persist = true) {
    const normalized = theme === 'alucard' ? 'alucard' : 'dracula';
    document.documentElement.setAttribute('data-theme', normalized);
    updateThemeToggle(normalized);
    if (persist) {
        try {
            localStorage.setItem(THEME_STORAGE_KEY, normalized);
        } catch (e) {
            console.error('テーマ設定の保存に失敗:', e);
        }
    }

    updateColorDatalist();
}

function updateColorDatalist() {
    const datalist = document.getElementById('buffColor-list');
    if (!datalist) return;

    // 現在のテーマに応じたカラーを取得
    const colors = [
        getThemeColorValue('--color-cyan', '#8BE9FD'),
        getThemeColorValue('--color-purple', '#BD93F9'),
        getThemeColorValue('--color-pink', '#FF79C6'),
        getThemeColorValue('--color-red', '#FF5555'),
        getThemeColorValue('--color-orange', '#FFB86C'),
        getThemeColorValue('--color-yellow', '#F1FA8C'),
        getThemeColorValue('--color-green', '#50FA7B'),
        getThemeColorValue('--color-foreground', '#F8F8F2'),
        getThemeColorValue('--color-background', '#282A36'),
        getThemeColorValue('--color-selection', '#44475A')
    ];

    // datalistを更新
    datalist.innerHTML = colors
        .map(color => `<option value="${color}"></option>`)
        .join('');
}

function updateThemeToggle(theme) {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;
    const option = THEME_OPTIONS[theme] || THEME_OPTIONS.dracula;
    const icon = toggle.querySelector('.material-symbols-rounded');
    const text = toggle.querySelector('.site-header__dropdown-text');
    if (icon) icon.textContent = option.icon;
    if (text) text.textContent = `テーマ: ${option.label}`;
    toggle.setAttribute('aria-pressed', String(theme === 'alucard'));
}

function initTheme() {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    applyTheme(stored || 'dracula', false);
}

/**
 * トースト通知を表示(alert代替)
 */
function getActiveModal() {
    const openDialogs = Array.from(document.querySelectorAll('dialog[open]'));
    return openDialogs[openDialogs.length - 1] || null;
}

function showToast(message, type = 'info') {
    const activeModal = getActiveModal();
    const parent = activeModal || document.body;
    const top = activeModal ? '60px' : '80px';

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.style.top = top;
    toast.textContent = message;

    parent.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// アニメーション定義を追加
if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// ========================================
// セクション管理
// ========================================

function toggleSection(header) {
    header.classList.toggle('collapsed');
    const body = header.nextElementSibling;
    body.classList.toggle('collapsed');
    saveUIState();
}

function saveUIState() {
    try {
        const states = {};
        document.querySelectorAll('.section__header').forEach((header, i) => {
            states[i] = header.classList.contains('collapsed');
        });
        localStorage.setItem('uiState', JSON.stringify(states));
    } catch (e) {
        console.error('UI状態の保存に失敗:', e);
    }
}

function loadUIState() {
    try {
        const saved = localStorage.getItem('uiState');
        if (saved) {
            const states = JSON.parse(saved);
            document.querySelectorAll('.section__header').forEach((header, i) => {
                if (states[i]) {
                    header.classList.add('collapsed');
                    header.nextElementSibling.classList.add('collapsed');
                }
            });
        }
    } catch (e) {
        console.error('UI状態の読み込みに失敗:', e);
    }
}

// ========================================
// データ管理
// ========================================

function loadData() {
    try {
        const saved = localStorage.getItem('trpgData');
        if (saved) {
            store.importData(saved);
        } else {
            store.setState({
                buffs: getDefaultBuffs(),
                judges: getDefaultJudges(),
                attacks: getDefaultAttacks(),
                buffCategories: [],
                judgeCategories: [],
                attackCategories: []
            });
        }
    } catch (e) {
        console.error('データの読み込みに失敗:', e);
        showToast('データの読み込みに失敗しました', 'error');
        store.setState({
            buffs: getDefaultBuffs(),
            judges: getDefaultJudges(),
            attacks: getDefaultAttacks(),
            buffCategories: [],
            judgeCategories: [],
            attackCategories: []
        });
    }

    updateBuffCategorySelect();
    updateJudgeCategorySelect();
    updateAttackCategorySelect();
    renderBuffs();
    renderPackage('judge');
    renderPackage('attack');
    updateBuffTargetDropdown();
}

function getDefaultBuffs() {
    const primaryColor = getDefaultBuffColor();
    const secondaryColor = getSecondaryBuffColor();
    return [
        { name: 'キャッツアイ', memo: '命中UP', showSimpleMemo: true, effect: '+1', targets: ['judge:命中(武器A)　SAMPLE'], turn: '3', originalTurn: 3, color: primaryColor, category: null, active: true },
        { name: 'オーバーパワー', memo: 'ダメージUP', showSimpleMemo: true, effect: '+3', targets: ['all-attack'], color: secondaryColor, category: null, active: true }
    ];
}


function getDefaultJudges() {
    return [
        { name: '命中(武器A)　SAMPLE', roll: '1d20' },
        { name: '回避　SAMPLE', roll: '1d20' }
    ];
}

function getDefaultAttacks() {
    return [
        { name: '武器A　SAMPLE', roll: '2d6' }
    ];
}

function saveData() {
    try {
        const json = store.exportData();

        // 5MB制限チェック
        if (json.length > 5 * 1024 * 1024) {
            showToast('データが大きすぎて保存できません', 'error');
            return false;
        }

        localStorage.setItem('trpgData', json);
        return true;
    } catch (e) {
        console.error('保存エラー:', e);
        if (e.name === 'QuotaExceededError') {
            showToast('ストレージ容量が不足しています', 'error');
        } else {
            showToast('データの保存に失敗しました', 'error');
        }
        return false;
    }
}

function resetAll() {
    if (!confirm('すべての設定を初期化しますか?この操作は取り消せません。')) {
        return;
    }

    try {
        localStorage.removeItem('trpgData');
        localStorage.removeItem('uiState');
        localStorage.removeItem('userDictionary');
        location.reload();
    } catch (e) {
        showToast('初期化に失敗しました', 'error');
    }
}

function exportData() {
    const json = store.exportData();

    navigator.clipboard.writeText(json).then(() => {
        showToast('JSONをクリップボードにコピーしました', 'success');
    }).catch(() => {
        showToast('コピーに失敗しました', 'error');
    });
}

function importData() {
    const text = document.getElementById('importText').value.trim();
    if (!text) {
        showToast('JSONを貼り付けてください', 'error');
        return;
    }

    try {
        const data = store.importData(text);
        if (Array.isArray(data.userDictionary)) {
            saveUserDictionary();
        }

        updateBuffCategorySelect();
        updateJudgeCategorySelect();
        updateAttackCategorySelect();
        renderBuffs();
        renderPackage('judge');
        renderPackage('attack');
        updateBuffTargetDropdown();
        renderMacroDictionary();
        saveData();

        document.getElementById('importText').value = '';

        showToast('データを読み込みました', 'success');
    } catch (e) {
        showToast('JSONの解析に失敗しました: ' + e.message, 'error');
    }
}

/**
 * ファイルドロップ機能の初期化
 */
function initFileDropZone() {
    const dropZones = [
        { elementId: 'importText', type: 'data' },
        { elementId: 'macroImportText', type: 'macro' }
    ];

    dropZones.forEach(({ elementId, type }) => {
        const dropZone = document.getElementById(elementId);
        if (!dropZone) return;

        // ドラッグオーバー時の処理
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('drop-zone--active');
        });

        // ドラッグが離れた時の処理
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('drop-zone--active');
        });

        // ドロップ時の処理
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // スタイルを元に戻す
            dropZone.classList.remove('drop-zone--active');

            // ファイルを取得
            const files = e.dataTransfer.files;

            if (files.length === 0) {
                showToast('ファイルが見つかりません', 'error');
                return;
            }

            const file = files[0];
            const fileName = file.name.toLowerCase();

            if (!fileName.endsWith('.txt') && !fileName.endsWith('.json')) {
                showToast('.txtまたは.jsonファイルのみ対応しています', 'error');
                return;
            }

            const reader = new FileReader();

            reader.onload = (event) => {
                const content = event.target.result;
                dropZone.value = content;
                showToast(`${file.name} を読み込みました`, 'success');
            };

            reader.onerror = () => {
                showToast('ファイルの読み込みに失敗しました', 'error');
            };

            reader.readAsText(file);
        });
    });
}

// ========================================
// カテゴリ管理
// ========================================

function addCategory(type, inputId) {
    const categories = getCategories(type);
    if (!categories) return;

    const input = document.getElementById(inputId);
    if (!input) return;

    const rawInput = input.value.trim();
    if (!rawInput) {
        showToast('カテゴリ名を入力してください', 'error');
        return;
    }

    // 複数の区切り文字で分割
    const names = rawInput
        .split(/[、,　\s]+/)
        .map(n => n.trim())
        .filter(n => n.length > 0);

    if (names.length === 0) {
        showToast('カテゴリ名を入力してください', 'error');
        return;
    }

    // 重複チェック＆登録
    let addedCount = 0;
    let skippedCount = 0;

    names.forEach(name => {
        if (categories.includes(name)) {
            skippedCount++;
        } else {
            categories.push(name);
            addedCount++;
        }
    });

    // トースト表示
    if (addedCount === 0) {
        showToast('すでに存在するカテゴリです', 'error');
    } else if (skippedCount === 0) {
        showToast(`${addedCount}件のカテゴリを追加しました`, 'success');
    } else {
        showToast(`${addedCount}件のカテゴリを追加しました`, 'success');
    }

    input.value = '';

    if (type === 'buff') {
        updateBuffCategorySelect();
        renderBuffs();
    } else if (type === 'judge') {
        updateJudgeCategorySelect();
        renderPackage('judge');
    } else if (type === 'attack') {
        updateAttackCategorySelect();
        renderPackage('attack');
    }

    updateBuffTargetDropdown();
    saveData();
}

function replaceCategoryOnItems(type, from, to) {
    const items = getCollection(type) || [];
    items.forEach(item => {
        if (item.category === from) {
            item.category = to;
        }
    });
}

function replaceBuffTargetsForCategory(type, from, to) {
    if (type !== 'judge' && type !== 'attack') return;

    const prefix = type === 'judge' ? 'judge-category:' : 'attack-category:';
    const fromKey = prefix + from;
    const toKey = to ? prefix + to : null;

    store.getState().buffs.forEach(buff => {
        buff.targets = buff.targets
            .map(target => target === fromKey ? toKey : target)
            .filter(Boolean);
    });

    if (Array.isArray(uiState.selectedBuffTargets)) {
        uiState.selectedBuffTargets = uiState.selectedBuffTargets
            .map(target => target === fromKey ? toKey : target)
            .filter(Boolean);
    }
}

function refreshCategoryViews(type) {
    if (type === 'buff') {
        renderBuffs();
        updateBuffCategorySelect();
    } else if (type === 'judge') {
        renderPackage('judge');
        updateJudgeCategorySelect();
    } else if (type === 'attack') {
        renderPackage('attack');
        updateAttackCategorySelect();
    }

    updateBuffTargetDropdown();
    updatePackageOutput('judge');
    updatePackageOutput('attack');
    saveData();
}

function editCategory(type, oldName) {
    const categories = getCategories(type);
    if (!categories || !categories.includes(oldName)) return;

    const newName = prompt('カテゴリ名を編集', oldName);
    if (newName === null) return;

    const trimmed = newName.trim();
    if (!trimmed) {
        showToast('カテゴリ名を入力してください', 'error');
        return;
    }

    if (categories.includes(trimmed)) {
        showToast('同名のカテゴリが既に存在します', 'error');
        return;
    }

    const idx = categories.indexOf(oldName);
    categories[idx] = trimmed;

    replaceCategoryOnItems(type, oldName, trimmed);
    replaceBuffTargetsForCategory(type, oldName, trimmed);
    refreshCategoryViews(type);
    showToast('カテゴリ名を変更しました', 'success');
}

function removeCategory(type, name) {
    const categories = getCategories(type);
    if (!categories || !categories.includes(name)) return;

    const confirmed = confirm(`カテゴリ「${name}」を削除しますか？`);
    if (!confirmed) return;

    categories.splice(categories.indexOf(name), 1);
    replaceCategoryOnItems(type, name, null);
    replaceBuffTargetsForCategory(type, name, null);
    refreshCategoryViews(type);
    showToast('カテゴリを削除しました', 'success');
}

function copyCategoryName(name) {
    if (!name) return;

    navigator.clipboard.writeText(name)
        .then(() => showToast('カテゴリ名をコピーしました', 'success'))
        .catch(() => showToast('コピーに失敗しました', 'error'));
}


function buildCategoryMap(type) {
    const map = { 'none': [] };
    const categories = getCategories(type) || [];
    categories.forEach(name => map[name] = []);

    const items = getCollection(type) || [];
    items.forEach((item, index) => {
        const key = item.category || 'none';
        if (!map[key]) {
            map[key] = [];
            categories.push(key);
        }
        map[key].push({ item, index });
    });

    return map;
}

const categoryIndexConfig = {
    buff: { selectId: 'buffItemIndex', listId: 'buffList' },
    judge: { selectId: 'judgeItemIndex', listId: 'judgeList' },
    attack: { selectId: 'attackItemIndex', listId: 'attackList' },
    macro: { selectId: 'macroItemIndex', listId: 'macroDictionaryList' }
};

function updateCategoryIndexDropdown(type) {
    const config = categoryIndexConfig[type];
    if (!config) return;

    const select = document.getElementById(config.selectId);
    if (!select) return;

    const categories = ['none', ...(getCategories(type) || [])];
    const uniqueCategories = [];
    categories.forEach(category => {
        const key = category || 'none';
        if (!uniqueCategories.includes(key)) {
            uniqueCategories.push(key);
        }
    });

    const options = ['<option disabled></option>'];
    uniqueCategories.forEach(category => {
        const label = category === 'none' ? '未分類' : category;
        options.push(`<option value="${escapeHtml(category)}">${escapeHtml(label)}</option>`);
    });

    select.innerHTML = options.join('');
    select.value = '';
}

function scrollToCategory(type, category) {
    const config = categoryIndexConfig[type];
    if (!config || !category) return;

    const list = document.getElementById(config.listId);
    if (!list) return;

    const blocks = Array.from(list.querySelectorAll('.list__category'));
    const targetBlock = blocks.find(block => (block.getAttribute('data-category') || 'none') === category);

    if (!targetBlock) return;

    if (targetBlock.tagName === 'DETAILS') {
        targetBlock.open = true;
    }

    const listRectTop = list.getBoundingClientRect().top;
    const blockRectTop = targetBlock.getBoundingClientRect().top;
    const offset = blockRectTop - listRectTop + list.scrollTop;

    list.scrollTo({ top: offset, behavior: 'smooth' });
}

function handleCategoryIndexChange(type, event) {
    const category = event.target.value;
    if (!category) return;

    scrollToCategory(type, category);
    event.target.value = '';
}

function getCategoryInsertIndex(type, categoryKey) {
    const arr = getCollection(type) || [];
    const normalizedKey = categoryKey || 'none';
    const indices = arr
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => (item.category || 'none') === normalizedKey)
        .map(({ idx }) => idx);

    if (indices.length === 0) return arr.length;
    return Math.max(...indices) + 1;
}

function renderBuffItems(entries = []) {
    if (!Array.isArray(entries) || entries.length === 0) return '';

    return entries.map(({ item, index }) => {
        const bgColor = validateColor(item.color);
        const textColor = getContrastColor(bgColor);
        const targetTexts = item.targets.map(t => {
            const text = getTargetText(t);
            return text === "none" ? "なし" : text;
        });
        const turnDisplay = item.turn ? `<span class="buff__turn-badge" style="outline:2px solid ${item.color};"><span>${item.turn}</span></span>` : '';
        const simpleMemo = getBuffSimpleMemo(item);
        const memoText = getBuffMemoText(item);
        const memoHtml = memoText ? escapeHtml(memoText).replace(/\n/g, '<br>') : '<span class="list__item-memo-empty">メモはありません</span>';
        const maxTurnText = item.originalTurn ?? item.turn;
        const maxTurnDisplay = (maxTurnText === undefined || maxTurnText === null || maxTurnText === '') ? 'なし' : maxTurnText;
        const targetsText = targetTexts.length ? targetTexts.join(', ') : 'なし';
        const effectText = item.effect ? item.effect : 'なし';

        return `
            <details class="list__item buff draggable ${item.active ? 'buff--active' : ''}"
                     style="background-color: ${bgColor}; color: ${textColor};"
                     data-index="${index}" data-type="buff" data-item-index="${index}" data-category="${escapeHtml(item.category || 'none')} "draggable="true">
                <summary class="buff__summary" draggable="false">
                    <span class="list__item-meta">
                        <span class="list__item-title">${escapeHtml(item.name)}</span>
                        ${simpleMemo ? `<span class="list__item-meta-text">${escapeHtml(simpleMemo)}</span>` : ''}
                    </span>
                    ${turnDisplay}
                    <span class="buff__actions" draggable="false">
                        <button class="toggle ${item.active ? 'toggle--active' : ''}" data-toggle="${index}" data-toggle-type="buff"></button>
                    </span>
                </summary>
                <div class="buff__details" draggable="false">
                    <div>
                        <p><strong>最大ターン：</strong>${escapeHtml(String(maxTurnDisplay))}</p>
                        <p><strong>効果先：</strong>${escapeHtml(targetsText)}</p>
                        <p><strong>コマンド：</strong>${escapeHtml(effectText)}</p>
                    </div>
                    <div class="list__item-detail buff__memo">
                        <p class="list__item-detail-label"><strong>メモ：</strong></p>
                        <p class="list__item-memo-text">${memoHtml}</p>
                    </div>
                </div>
            </details>
        `;
    }).join('');
}

function renderPackageItems(type, entries = []) {
    if (!Array.isArray(entries) || entries.length === 0) return '';

    return entries.map(({ item, index }) => `
        <div class="list__item list__item--clickable draggable" data-index="${index}" data-type="${type}" data-category="${escapeHtml(item.category || 'none')}" draggable="true">
            <span class="list__item-meta">
                <span class="list__item-title">${escapeHtml(item.name)}</span>
                <span class="list__item-detail">${escapeHtml(item.roll)}</span>
            </span>
        </div>
    `).join('');
}

const CATEGORY_SELECT_CONFIG = {
    buff: { selectId: 'buffCategorySelect', categories: 'buffCategories' },
    judge: { selectId: 'judgeCategorySelect', categories: 'judgeCategories' },
    attack: { selectId: 'attackCategorySelect', categories: 'attackCategories' }
};

function buildCategorySelectOptions(categories = []) {
    const options = ['<option value="none">なし</option>'];
    categories.forEach(name => {
        options.push(`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`);
    });
    return options.join('');
}

function updateCategorySelect(type) {
    const config = CATEGORY_SELECT_CONFIG[type];
    if (!config) return;

    const select = document.getElementById(config.selectId);
    if (!select) return;

    const data = store.getState();
    select.innerHTML = buildCategorySelectOptions(data[config.categories]);
}

function updateBuffCategorySelect() {
    updateCategorySelect('buff');
}

function updateJudgeCategorySelect() {
    updateCategorySelect('judge');
}

function updateAttackCategorySelect() {
    updateCategorySelect('attack');
}


// ========================================
// ユーザー辞書管理
// ========================================

/**
 * ユーザー辞書をロード
 */
function loadUserDictionary() {
    try {
        const saved = localStorage.getItem('userDictionary');
        if (saved) {
            store.setState({ userDictionary: JSON.parse(saved) });
        } else {
            store.setState({ userDictionary: [] });
        }
    } catch (e) {
        console.error('ユーザー辞書の読み込みに失敗:', e);
        store.setState({ userDictionary: [] });
    }
}

/**
 * ユーザー辞書をセーブ
 */
function saveUserDictionary() {
    try {
        const json = JSON.stringify(store.getState().userDictionary);
        if (json.length > 5 * 1024 * 1024) {
            showToast('辞書データが大きすぎて保存できません', 'error');
            return false;
        }
        localStorage.setItem('userDictionary', json);
        return true;
    } catch (e) {
        console.error('ユーザー辞書の保存に失敗:', e);
        showToast('辞書データの保存に失敗しました', 'error');
        return false;
    }
}

/**
 * ユーザー辞書に登録（追加または更新）
 */
function addOrUpdateMacro() {
    const textInput = document.getElementById('macroText');
    const categoryInput = document.getElementById('macroCategory');
    const text = textInput.value.trim();
    const category = categoryInput.value.trim();
    const dictionary = store.getState().userDictionary;

    if (!text) {
        showToast('文字列を入力してください', 'error');
        return;
    }

    if (!category) {
        showToast('カテゴリーを入力してください', 'error');
        return;
    }

    // 重複チェック（編集時以外）
    const isDuplicate = dictionary.some(item =>
        item.text === text && item.id !== uiState.macroEditingId
    );

    if (isDuplicate) {
        showToast('この文字列は既に登録されています', 'error');
        return;
    }

    if (uiState.macroEditingId) {
        const nextDictionary = dictionary.map(item => {
            if (item.id !== uiState.macroEditingId) return item;
            return { ...item, text, category };
        });
        store.setState({ userDictionary: nextDictionary });
        saveUserDictionary();
        showToast('辞書項目を更新しました', 'success');
        cancelMacroEdit();
    } else {
        // 追加モード：新規アイテムを作成
        const newItem = {
            id: generateUUID(),
            text: text,
            category: category,
            usage: 0
        };
        store.setState({ userDictionary: [...dictionary, newItem] });
        showToast('辞書に登録しました', 'success');
    }

    textInput.value = '';
    categoryInput.value = '';
    saveUserDictionary();
    renderMacroDictionary();
}

/**
 * ユーザー辞書の編集を開始
 */
function startMacroEdit(id) {
    const item = store.getState().userDictionary.find(m => m.id === id);
    if (!item) return;

    uiState.macroEditingId = id;
    document.getElementById('macroText').value = item.text;
    document.getElementById('macroCategory').value = item.category;

    // UIの更新
    const addBtn = document.getElementById('macroAddBtn');
    const cancelBtn = document.getElementById('macroCancelBtn');
    addBtn.textContent = '更新';
    cancelBtn.style.display = 'flex';

    document.getElementById('macroText').focus();
}

/**
 * ユーザー辞書の編集をキャンセル
 */
function cancelMacroEdit() {
    if (!uiState.macroEditingId) return;

    uiState.macroEditingId = null;
    document.getElementById('macroText').value = '';
    document.getElementById('macroCategory').value = '';

    const addBtn = document.getElementById('macroAddBtn');
    const cancelBtn = document.getElementById('macroCancelBtn');
    addBtn.textContent = '登録';
    cancelBtn.style.display = 'none';

    renderMacroDictionary();
}

/**
 * ユーザー辞書から削除
 */
function deleteMacro(id) {
    const dictionary = store.getState().userDictionary;
    const item = dictionary.find(m => m.id === id);
    if (!item) return;

    if (!confirm(`「${escapeHtml(item.text)}」を削除しますか？`)) {
        return;
    }

    store.setState({ userDictionary: dictionary.filter(m => m.id !== id) });
    saveUserDictionary();
    renderMacroDictionary();
    showToast('辞書項目を削除しました', 'success');
}

/**
 * ユーザー辞書を一覧表示
 */
function renderMacroItems(entries = []) {
    if (!Array.isArray(entries) || entries.length === 0) return '';

    return entries.map(({ item }) => `
        <div class="list__item list__item--clickable" data-type="macro" data-id="${escapeHtml(item.id)}">
            <span class="list__item-meta">
                <span class="list__item-title">${escapeHtml(item.text)}</span>
            </span>
        </div>
    `).join('');
}

function attachMacroEvents() {
    const listContainer = document.getElementById('macroDictionaryList');
    if (!listContainer) return;

    listContainer.querySelectorAll('[data-type="macro"]').forEach(el => {
        const id = el.getAttribute('data-id');
        if (!id) return;
        el.addEventListener('contextmenu', (e) => openItemContextMenu(e, 'macro', id));
    });
}

function renderMacroDictionary() {
    const listContainer = document.getElementById('macroDictionaryList');
    const dictionary = store.getState().userDictionary;

    if (dictionary.length === 0) {
        listContainer.innerHTML = '<div class="list__empty">辞書が登録されていません</div>';
        updateCategoryIndexDropdown('macro');
        return;
    }

    const categoryMap = buildCategoryMap('macro');
    const categories = getCategories('macro') || [];
    const sections = [];

    if (categoryMap['none'] && categoryMap['none'].length > 0) {
        sections.push(`
            <details class="list__category list__category--uncategorized" data-category="none" open>
                <summary class="list__category-header" data-category="none">
                    <span class="material-symbols-rounded" style="margin-right: 4px;">arrow_right</span>
                    <span style="word-break: break-all;">未分類</span>
                </summary>
                <div class="list__category-body" data-category="none">
                    ${renderMacroItems(categoryMap['none'])}
                </div>
            </details>
        `);
    }

    categories.forEach(name => {
        sections.push(`
            <details class="list__category" open data-category="${escapeHtml(name)}">
                <summary class="list__category-header" data-category="${escapeHtml(name)}">
                    <span class="material-symbols-rounded" style="margin-right: 4px;">arrow_right</span>
                    <span style="word-break: break-all;">${escapeHtml(name)}</span>
                </summary>
                <div class="list__category-body" data-category="${escapeHtml(name)}">
                    ${renderMacroItems(categoryMap[name])}
                </div>
            </details>
        `);
    });

    listContainer.innerHTML = sections.join('');
    updateCategoryIndexDropdown('macro');
    attachMacroEvents();
}

/**
 * ユーザー辞書をエクスポート
 */
function exportUserDictionary() {
    const json = JSON.stringify(store.getState().userDictionary, null, 2);
    navigator.clipboard.writeText(json).then(() => {
        showToast('ユーザー辞書をクリップボードにコピーしました', 'success');
    }).catch(() => {
        showToast('コピーに失敗しました', 'error');
    });
}

/**
 * ユーザー辞書をインポート
 */
function importUserDictionary() {
    const text = document.getElementById('macroImportText').value.trim();
    if (!text) {
        showToast('JSONを貼り付けてください', 'error');
        return;
    }

    try {
        const data = JSON.parse(text);
        if (!Array.isArray(data)) {
            throw new Error('配列形式ではありません');
        }

        // バリデーション
        data.forEach((item, index) => {
            if (!item.text || !item.category) {
                throw new Error(`行${index + 1}: textとcategoryは必須です`);
            }
            if (!item.id) {
                item.id = generateUUID();
            }
            if (item.usage === undefined) {
                item.usage = 0;
            }
        });

        store.setState({ userDictionary: data });
        saveUserDictionary();
        document.getElementById('macroImportText').value = '';
        renderMacroDictionary();
        showToast('ユーザー辞書をインポートしました', 'success');
    } catch (e) {
        showToast('JSONの解析に失敗しました: ' + e.message, 'error');
    }
}

/**
 * UUID生成（簡易版）
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * ユーザー辞書の初期化
 */

function resetDictionary() {
    if (!confirm('ユーザー辞書の設定を初期化しますか?この操作は取り消せません。')) {
        return;
    }

    try {
        store.setState({ userDictionary: [] });
        localStorage.removeItem('userDictionary');
        renderMacroDictionary();
        showToast('ユーザー辞書を初期化しました', 'success');
    } catch (e) {
        showToast('初期化に失敗しました', 'error');
    }
}

/**
 * ユーザー辞書モーダルのイベント初期化
 */
function setupUserDictionaryModal() {
    document.getElementById('macroAddBtn')?.addEventListener('click', addOrUpdateMacro);
    document.getElementById('macroCancelBtn')?.addEventListener('click', cancelMacroEdit);
    document.getElementById('macroExportBtn')?.addEventListener('click', exportUserDictionary);
    document.getElementById('macroImportBtn')?.addEventListener('click', importUserDictionary);
    document.getElementById('macroItemIndex')?.addEventListener('change', (e) => handleCategoryIndexChange('macro', e));

    // エンターキーで登録
    document.getElementById('macroText')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addOrUpdateMacro();
        }
    });

    // キャンセルボタンのEscキー対応
    document.getElementById('macroCategory')?.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && uiState.macroEditingId) {
            cancelMacroEdit();
        }
    });
}

// ========================================
// マルチセレクト
// ========================================

function initMultiSelect() {
    const select = document.getElementById('buffTargetSelect');
    if (!select) return;

    select.addEventListener('change', () => {
        uiState.selectedBuffTargets = Array.from(select.selectedOptions).map(opt => opt.value);
    });
}

function updateBuffTargetDropdown() {
    const select = document.getElementById('buffTargetSelect');
    if (!select) return;

    // プレースホルダー
    let html = '<option disabled>複数選択可</option>';

    // 状態に保持している選択値を使用
    const currentValues = Array.isArray(uiState.selectedBuffTargets)
        ? [...uiState.selectedBuffTargets]
        : [];

    // その他カテゴリ
    html += `<option value="none" ${currentValues.includes('none') ? 'selected' : ''}>なし</option>`;
    html += `<option value="all-judge" ${currentValues.includes('all-judge') ? 'selected' : ''}>すべての判定</option>`;
    html += `<option value="all-attack" ${currentValues.includes('all-attack') ? 'selected' : ''}>すべての攻撃</option>`;
    html += `</optgroup>`;

    // 判定カテゴリ
    const data = store.getState();
    if (data.judges.length > 0) {
        html += `<optgroup label="---判定---">`;
        if (data.judgeCategories.length > 0) {
            data.judgeCategories.forEach(name => {
                const value = `judge-category:${name}`;
                html += `<option value="${escapeHtml(value)}" ${currentValues.includes(value) ? 'selected' : ''}>&gt;&gt;${escapeHtml(name)}</option>`;
            });
        }

        data.judges.forEach(j => {
            const value = 'judge:' + j.name;
            html += `<option value="${escapeHtml(value)}" ${currentValues.includes(value) ? 'selected' : ''}>${escapeHtml(j.name)}</option>`;
        });

        html += `</optgroup>`;
    }

    // 攻撃カテゴリ
    if (data.attacks.length > 0) {
        html += `<optgroup label="---攻撃---">`;
        if (data.attackCategories.length > 0) {
            data.attackCategories.forEach(name => {
                const value = `attack-category:${name}`;
                html += `<option value="${escapeHtml(value)}" ${currentValues.includes(value) ? 'selected' : ''}>&gt;&gt;${escapeHtml(name)}</option>`;
            });
        }
        data.attacks.forEach(a => {
            const value = 'attack:' + a.name;
            html += `<option value="${escapeHtml(value)}" ${currentValues.includes(value) ? 'selected' : ''}>${escapeHtml(a.name)}</option>`;
        });

        html += `</optgroup>`;
    }

    select.innerHTML = html;
}

/**
 * 対象の表示名を取得
 */
function getTargetText(target) {
    if (target === 'all-judge') return 'すべての判定';
    if (target === 'all-attack') return 'すべての攻撃';
    if (target.startsWith('judge:')) return target.substring(6);
    if (target.startsWith('attack:')) return target.substring(7);
    if (target.startsWith('judge-category:')) return '>>' + target.substring(16);
    if (target.startsWith('attack-category:')) return '>>' + target.substring(17);
    return target;
}

// ========================================
// バフ管理
// ========================================

function getBuffMemoText(buff) {
    if (!buff) return '';
    if (typeof buff.memo === 'string') return buff.memo;
    if (typeof buff.description === 'string') return buff.description;
    return '';
}

function getBuffSimpleMemo(buff) {
    if (!buff || buff.showSimpleMemo === false) return '';
    const memoText = getBuffMemoText(buff);
    const firstLine = memoText.split(/\r?\n/)[0]?.trim() || '';
    return firstLine;
}

function openBuffModal(editIndex = null) {
    const modal = document.getElementById('buffaddmodal');
    const modalTitle = modal.querySelector('.modal__title');
    const addBtn = document.getElementById('addBuffBtn');
    const bulkAddSection = document.getElementById('bulkAddArea').parentElement;

    if (editIndex !== null) {
        // 編集モード
        uiState.editMode = { active: true, type: 'buff', index: editIndex };
        modalTitle.textContent = 'バフ編集';
        addBtn.textContent = '更新';
        bulkAddSection.style.display = 'none';

        const buff = store.getState().buffs[editIndex];
        updateBuffCategorySelect();
        document.getElementById('buffName').value = buff.name;
        document.getElementById('buffEffect').value = buff.effect || '';
        document.getElementById('buffTurn').value = buff.originalTurn || '';
        document.getElementById('buffColor').value = buff.color;
        document.getElementById('buffCategorySelect').value = buff.category || 'none';
        document.getElementById('buffMemo').value = getBuffMemoText(buff);
        document.getElementById('buffSimpleMemoToggle').checked = buff.showSimpleMemo ?? Boolean(buff.description);

        // 効果先の選択状態を復元
        uiState.selectedBuffTargets = [...buff.targets];
        updateBuffTargetDropdown();
    } else {
        // 追加モード
        uiState.editMode = { active: false, type: null, index: null };
        modalTitle.textContent = 'バフ追加';
        addBtn.textContent = '追加';
        bulkAddSection.style.display = 'block';
        resetBuffForm();
    }

    modal.showModal();
}

function resetBuffForm() {
    document.getElementById('buffName').value = '';
    document.getElementById('buffEffect').value = '';
    document.getElementById('buffTurn').value = '';
    document.getElementById('buffColor').value = getDefaultBuffColor();
    document.getElementById('buffCategorySelect').value = 'none';
    document.getElementById('buffMemo').value = '';
    document.getElementById('buffSimpleMemoToggle').checked = false;
    uiState.selectedBuffTargets = [];

    const buffTargetSelect = document.getElementById('buffTargetSelect');
    if (buffTargetSelect) {
        Array.from(buffTargetSelect.options).forEach(option => {
            option.selected = false;
        });
    }
    updateBuffTargetDropdown();
}

function insertText(text) {
    const textbox = document.getElementById('buffEffect');
    textbox.value = textbox.value + text;
}

function addBuff() {
    const name = document.getElementById('buffName').value.trim();
    const effect = document.getElementById('buffEffect').value.trim();
    const targets = [...uiState.selectedBuffTargets];
    const turn = document.getElementById('buffTurn').value.trim();
    const color = validateColor(document.getElementById('buffColor').value);
    const categorySelect = document.getElementById('buffCategorySelect');
    const category = categorySelect ? (categorySelect.value === 'none' ? null : categorySelect.value) : null;
    const memo = document.getElementById('buffMemo').value;
    const showSimpleMemo = document.getElementById('buffSimpleMemoToggle').checked;

    if (!name) {
        showToast('バフ名を入力してください', 'error');
        return;
    }

    if (targets.length === 0) {
        targets.push('none');
    }

    if (uiState.editMode.active && uiState.editMode.type === 'buff') {
        // 編集モード
        const index = uiState.editMode.index;
        const currentBuff = store.getState().buffs[index];
        const oldTurn = currentBuff.turn;
        const oldOriginalTurn = currentBuff.originalTurn;

        store.updateItem('buff', index, {
            name: name,
            effect: effect,
            targets: targets,
            turn: turn ? parseInt(turn) : oldTurn,
            originalTurn: turn ? parseInt(turn) : oldOriginalTurn,
            color: color,
            category: category,
            memo: memo,
            showSimpleMemo,
            active: currentBuff.active
        });

        showToast('バフを更新しました', 'success');
    } else {
        // 追加モード:
        store.addItem('buff', {
            name: name,
            effect: effect,
            targets: targets,
            turn: turn ? parseInt(turn) : null,
            originalTurn: turn ? parseInt(turn) : null,
            color: color,
            category: category,
            memo: memo,
            showSimpleMemo,
            active: true
        });
    }

    resetBuffForm();
    document.getElementById('buffaddmodal').close();

    renderBuffs();
    updatePackageOutput('judge');
    updatePackageOutput('attack');
    saveData();
}

/* 汎用一括追加関数（バフ、判定、攻撃に対応） */
function bulkAdd(type) {
    const typeConfig = {
        'buff': {
            textId: 'bulkAddText',
            areaId: 'bulkAddArea',
            messageKey: 'バフ',
            afterAdd: () => {
                updateBuffCategorySelect();
                renderBuffs();
                updatePackageOutput('judge');
                updatePackageOutput('attack');
            }
        },
        'judge': {
            textId: 'bulkAddJudgeText',
            areaId: 'bulkAddJudgeArea',
            messageKey: '判定ラベル',
            afterAdd: () => {
                renderPackage('judge');
                updateJudgeCategorySelect();
                updateBuffTargetDropdown();
            }
        },
        'attack': {
            textId: 'bulkAddAttackText',
            areaId: 'bulkAddAttackArea',
            messageKey: '攻撃ラベル',
            afterAdd: () => {
                renderPackage('attack');
                updateAttackCategorySelect();
                updateBuffTargetDropdown();
            }
        }
    };

    const config = typeConfig[type];
    if (!config) return;

    const text = document.getElementById(config.textId).value.trim();
    if (!text) {
        showToast(`追加する${config.messageKey}を入力してください`, 'error');
        return;
    }

    const result = store.bulkAdd(type, text);
    result.errors.forEach((error) => {
        showToast(`エラー: ${error}`, 'error');
    });

    if (result.added > 0) {
        const textArea = document.getElementById(config.textId);
        if (textArea) textArea.value = '';

        config.afterAdd();
        saveData();
        showToast(`${result.added}件の${config.messageKey}を追加しました`, 'success');
    }
}

function setupBulkAddControls({ toggleId, confirmId, cancelId, areaId, textId, type }) {
    const toggleButton = document.getElementById(toggleId);
    const confirmButton = document.getElementById(confirmId);
    const cancelButton = document.getElementById(cancelId);
    const area = document.getElementById(areaId);
    const text = document.getElementById(textId);

    if (toggleButton) {
        toggleButton.addEventListener('click', () => {
            if (area) {
                const isHidden = area.classList.contains('u-hidden') || area.style.display === 'none';
                if (isHidden) {
                    area.classList.remove('u-hidden');
                    area.style.display = 'block';
                    text?.focus();
                } else {
                    area.classList.add('u-hidden');
                    area.style.display = 'none';
                    if (text) text.value = '';
                }
            }
        });
    }

    if (confirmButton) {
        confirmButton.addEventListener('click', () => bulkAdd(type));
    }

    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            if (area) {
                area.classList.add('u-hidden');
                area.style.display = 'none';
            }
            if (text) text.value = '';
        });
    }
}

function toggleBuff(index) {
    const data = store.getState();
    if (index < 0 || index >= data.buffs.length) return;

    const buff = data.buffs[index];
    const nextActive = !buff.active;
    store.updateItem('buff', index, {
        active: nextActive,
        turn: nextActive && buff.turn === 0 ? buff.originalTurn : buff.turn
    });
    renderBuffs();
    updatePackageOutput('judge');
    updatePackageOutput('attack');
    saveData();
}

function removeBuff(index) {
    if (index < 0 || index >= store.getState().buffs.length) return;

    store.removeItem('buff', index);
    renderBuffs();
    updatePackageOutput('judge');
    updatePackageOutput('attack');
    saveData();
}

function resetBuffsToMaxTurns() {
    let changed = false;

    store.getState().buffs.forEach((buff, index) => {
        if (typeof buff.originalTurn === 'number') {
            store.updateItem('buff', index, {
                turn: buff.originalTurn,
                active: true
            });
            changed = true;
        }
    });

    if (changed) {
        renderBuffs();
        updatePackageOutput('judge');
        updatePackageOutput('attack');
        saveData();
        showToast('すべてのバフを最大ターンにリセットしました', 'success');
    } else {
        showToast('ターンが設定されたバフがありません', 'error');
    }
}

function progressTurn() {
    let changed = false;
    store.getState().buffs.forEach((buff, index) => {
        if (buff.active && buff.turn && buff.turn > 0) {
            const nextTurn = buff.turn - 1;
            const nextActive = nextTurn !== 0;
            store.updateItem('buff', index, {
                turn: nextTurn,
                active: nextActive
            });
            changed = true;
        }
    });

    if (changed) {
        renderBuffs();
        updatePackageOutput('judge');
        updatePackageOutput('attack');
        saveData();
        showToast('ターンを経過させました', 'success');
    } else {
        showToast('アクティブなバフにターンが設定されていません', 'error');
    }
}


function renderBuffs() {
    const list = document.getElementById('buffList');
    if (!list) return;

    const categoryMap = buildCategoryMap('buff');
    const data = store.getState();
    const hasContent = (data.buffs.length + data.buffCategories.length) > 0;

    if (!hasContent) {
        list.innerHTML = '<div class="list__empty">バフを追加してください</div>';
        updateCategoryIndexDropdown('buff');
        return;
    }

    const sections = [];

    sections.push(`
        <details class="list__category list__category--uncategorized" data-category="none" open>
            <summary class="list__category-header" data-category="none">
                <span class="material-symbols-rounded" style="margin-right: 4px;">arrow_right</span>
            </summary>
            <div class="list__category-body" data-category="none">
                ${renderBuffItems(categoryMap['none'])}
            </div>
        </details>
    `);

    data.buffCategories.forEach(name => {
        sections.push(`
            <details class="list__category" open data-category="${escapeHtml(name)}">
                <summary class="list__category-header" data-category="${escapeHtml(name)}" draggable="true">
                    <span class="material-symbols-rounded" style="margin-right: 4px;">arrow_right</span><span style="word-break: break-all;">${escapeHtml(name)}</span>
                </summary>
                <div class="list__category-body" data-category="${escapeHtml(name)}">
                    ${renderBuffItems(categoryMap[name])}
                </div>
            </details>
        `);
    });

    list.innerHTML = sections.join('');
    updateCategoryIndexDropdown('buff');
    attachBuffEvents();
}

function attachBuffEvents() {
    const buffList = document.getElementById('buffList');
    if (!buffList) return;

    buffList.querySelectorAll('[data-type="buff"]').forEach(el => {
        const i = parseInt(el.getAttribute('data-index'));
        if (isNaN(i)) return;

        el.addEventListener('dragstart', (e) => handleDragStart(e, i, 'buff'));
        el.addEventListener('dragover', handleDragOver);
        el.addEventListener('dragleave', handleDragLeave);
        el.addEventListener('drop', (e) => handleDrop(e, i, 'buff'));
        el.addEventListener('dragend', handleDragEnd);
        el.addEventListener('contextmenu', (e) => openItemContextMenu(e, 'buff', i));
    });

    buffList.querySelectorAll('.list__category-header').forEach(header => {
        header.addEventListener('dragstart', (e) => handleCategoryHeaderDragStart(e, 'buff'));
        header.addEventListener('dragover', (e) => handleCategoryDragOver(e, 'buff'));
        header.addEventListener('dragleave', handleCategoryDragLeave);
        header.addEventListener('drop', (e) => handleCategoryDrop(e, 'buff'));
        header.addEventListener('dragend', handleCategoryHeaderDragEnd);
        const categoryName = header.getAttribute('data-category');
        if (categoryName && categoryName !== 'none') {
            header.addEventListener('contextmenu', (e) => openCategoryContextMenu(e, 'buff', categoryName));
        }
    });

    buffList.querySelectorAll('[data-toggle-type="buff"]').forEach(btn => {
        const i = parseInt(btn.getAttribute('data-toggle'));
        if (isNaN(i)) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            toggleBuff(i);
        });
    });
}

// ========================================
// ドラッグ&ドロップ
// ========================================

function handleDragStart(e, index, type) {
    uiState.draggedIndex = index;
    uiState.draggedType = type;
    uiState.draggedCategory = null;

    if (type === 'buff') {
        const buff = store.getState().buffs[index];
        uiState.draggedCategory = buff ? (buff.category || 'none') : null;
    }

    e.target.classList.add('list__item--dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;

    e.currentTarget.classList.remove('list__item--drag-over-top', 'list__item--drag-over-bottom');

    if (e.clientY < midY) {
        e.currentTarget.classList.add('list__item--drag-over-top');
    } else {
        e.currentTarget.classList.add('list__item--drag-over-bottom');
    }
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('list__item--drag-over-top', 'list__item--drag-over-bottom');
}

function handleDrop(e, targetIndex, type) {
    e.preventDefault();
    e.currentTarget.classList.remove('list__item--drag-over-top', 'list__item--drag-over-bottom');

    if (uiState.draggedIndex === null || uiState.draggedType !== type || uiState.draggedIndex === targetIndex) {
        return;
    }

    const arr = getCollection(type);
    if (!arr) return;

    const draggedItem = arr[uiState.draggedIndex];
    if (!draggedItem) return;

    let targetCategory = null;
    if (['buff', 'judge', 'attack'].includes(type)) {
        const categoryAttr = e.currentTarget.getAttribute('data-category');
        if (categoryAttr !== null) {
            targetCategory = categoryAttr === 'none' ? null : categoryAttr;
        }
    }

    let insertIndex = targetIndex;
    if (targetIndex === null || targetIndex === undefined) {
        insertIndex = getCategoryInsertIndex(type, targetCategory);
    } else {
        const rect = e.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;

        if (e.clientY >= midY) {
            insertIndex = targetIndex + 1;
        }

        if (uiState.draggedIndex < insertIndex) {
            insertIndex--;
        }
    }

    const item = arr.splice(uiState.draggedIndex, 1)[0];
    if (targetCategory !== null || type === 'buff') {
        item.category = targetCategory;
    }
    arr.splice(insertIndex, 0, item);

    if (type === 'buff') renderBuffs();
    else if (type === 'judge') renderPackage('judge');
    else if (type === 'attack') renderPackage('attack');

    updatePackageOutput('judge');
    updatePackageOutput('attack');
    saveData();
}

function handleCategoryHeaderDragStart(e, type) {
    const categoryName = e.currentTarget.getAttribute('data-category');
    if (!categoryName || categoryName === 'none') return;

    uiState.draggedCategoryType = type;
    uiState.draggedCategoryName = categoryName;

    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('list__category-header--dragging');
}

function handleCategoryHeaderDragEnd(e) {
    document.querySelectorAll('.list__category-header--dragging')
        .forEach(header => header.classList.remove('list__category-header--dragging'));
    document.querySelectorAll('.list__category-header--drag-over')
        .forEach(header => header.classList.remove('list__category-header--drag-over'));
    uiState.draggedCategoryType = null;
    uiState.draggedCategoryName = null;
}

function handleCategoryDragOver(e, type) {
    const isItemDrag = uiState.draggedType === type;
    const isCategoryDrag = uiState.draggedCategoryType === type;
    if (!isItemDrag && !isCategoryDrag) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('list__category-header--drag-over');
}

function handleCategoryDragLeave(e) {
    e.currentTarget.classList.remove('list__category-header--drag-over');
}

function reorderCategory(type, targetCategory, dropAfter) {
    const categories = getCategories(type);
    if (!categories) return false;

    const from = categories.indexOf(uiState.draggedCategoryName);
    const to = categories.indexOf(targetCategory);

    if (from === -1 || to === -1 || from === to) return false;

    const name = categories.splice(from, 1)[0];
    let insertIndex = to;

    if (dropAfter) insertIndex += 1;
    if (from < insertIndex) insertIndex -= 1;

    categories.splice(insertIndex, 0, name);
    return true;
}

function handleCategoryDrop(e, type) {
    e.preventDefault();
    e.stopPropagation();

    const categoryKey = e.currentTarget.getAttribute('data-category') || 'none';

    const isCategoryDrag = uiState.draggedCategoryType === type && uiState.draggedCategoryName;
    if (isCategoryDrag) {
        if (categoryKey !== 'none') {
            const rect = e.currentTarget.getBoundingClientRect();
            const dropAfter = (e.clientY - rect.top) > rect.height / 2;
            const changed = reorderCategory(type, categoryKey, dropAfter);

            if (changed) {
                if (type === 'buff') renderBuffs();
                else renderPackage(type);
                saveData();
            }
        }

        handleCategoryHeaderDragEnd(e);
        return;
    }

    if (uiState.draggedType !== type || uiState.draggedIndex === null) {
        e.currentTarget.classList.remove('list__category-header--drag-over');
        return;
    }

    const targetCategory = categoryKey === 'none' ? null : categoryKey;

    const collection = getCollection(type);
    const item = collection ? collection[uiState.draggedIndex] : null;

    if (!collection || !item) {
        e.currentTarget.classList.remove('list__category-header--drag-over');
        return;
    }

    if ((item.category || null) !== targetCategory) {
        item.category = targetCategory;

        if (type === 'buff') renderBuffs();
        else renderPackage(type);

        updatePackageOutput('judge');
        updatePackageOutput('attack');
        saveData();
    }

    uiState.draggedIndex = null;
    uiState.draggedType = null;
    uiState.draggedCategory = null;
    uiState.draggedCategoryType = null;
    uiState.draggedCategoryName = null;
    e.currentTarget.classList.remove('list__category-header--drag-over');
}

function handleCategoryBodyDragOver(e, type) {
    if (uiState.draggedType !== type) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('list__category-body--drag-over');
}

function handleCategoryBodyDragLeave(e) {
    e.currentTarget.classList.remove('list__category-body--drag-over');
}

function handleCategoryBodyDrop(e, type) {
    if (uiState.draggedType !== type || uiState.draggedIndex === null) return;

    e.preventDefault();
    e.stopPropagation();

    const categoryKey = e.currentTarget.getAttribute('data-category') || 'none';
    const targetCategory = categoryKey === 'none' ? null : categoryKey;
    const collection = getCollection(type);

    if (!collection || uiState.draggedIndex < 0 || uiState.draggedIndex >= collection.length) {
        e.currentTarget.classList.remove('list__category-body--drag-over');
        return;
    }

    const item = collection.splice(uiState.draggedIndex, 1)[0];
    item.category = targetCategory;

    const insertIndex = getCategoryInsertIndex(type, targetCategory);
    collection.splice(insertIndex, 0, item);

    renderPackage(type);
    updatePackageOutput('judge');
    updatePackageOutput('attack');
    saveData();

    uiState.draggedIndex = null;
    uiState.draggedType = null;
    uiState.draggedCategory = null;
    e.currentTarget.classList.remove('list__category-body--drag-over');
}

function handleDragEnd(e) {
    e.target.classList.remove('list__item--dragging');
    document.querySelectorAll('.list__category-header--drag-over')
        .forEach(header => header.classList.remove('list__category-header--drag-over'));
    document.querySelectorAll('.list__category-body--drag-over')
        .forEach(body => body.classList.remove('list__category-body--drag-over'));
    document.querySelectorAll('.list__category-header--dragging')
        .forEach(header => header.classList.remove('list__category-header--dragging'));
    uiState.draggedIndex = null;
    uiState.draggedType = null;
    uiState.draggedCategory = null;
    uiState.draggedCategoryType = null;
    uiState.draggedCategoryName = null;
}

// ========================================
// 判定・攻撃ラベル管理
// ========================================

function openJudgeModal(editIndex = null) {
    const modal = document.getElementById('judgeaddmodal');
    const modalTitle = modal.querySelector('.modal__title');
    const addBtn = document.getElementById('addJudgeBtn');
    const bulkAddSection = document.getElementById('bulkAddJudgeArea').parentElement;

    updateJudgeCategorySelect();

    if (editIndex !== null) {
        // 編集モード
        uiState.editMode = { active: true, type: 'judge', index: editIndex };
        modalTitle.textContent = '判定ラベル編集';
        addBtn.textContent = '更新';
        bulkAddSection.style.display = 'none';

        const judge = store.getState().judges[editIndex];
        document.getElementById('judgeName').value = judge.name;
        document.getElementById('judgeRoll').value = judge.roll;

        const categorySelect = document.getElementById('judgeCategorySelect');
        if (categorySelect) {
            categorySelect.value = judge.category || 'none';
        }
    } else {
        // 追加モード
        uiState.editMode = { active: false, type: null, index: null };
        modalTitle.textContent = '判定ラベル追加';
        addBtn.textContent = '追加';
        bulkAddSection.style.display = 'block';
        resetJudgeForm();
    }

    modal.showModal();
}

function resetJudgeForm() {
    document.getElementById('judgeName').value = '';
    document.getElementById('judgeRoll').value = '';
    const categorySelect = document.getElementById('judgeCategorySelect');
    if (categorySelect) {
        categorySelect.value = 'none';
    }
}

function openAttackModal(editIndex = null) {
    const modal = document.getElementById('attackaddmodal');
    const modalTitle = modal.querySelector('.modal__title');
    const addBtn = document.getElementById('addAttackBtn');
    const bulkAddSection = document.getElementById('bulkAddAttackArea').parentElement;

    updateAttackCategorySelect();

    if (editIndex !== null) {
        // 編集モード
        uiState.editMode = { active: true, type: 'attack', index: editIndex };
        modalTitle.textContent = '攻撃ラベル編集';
        addBtn.textContent = '更新';
        bulkAddSection.style.display = 'none';

        const attack = store.getState().attacks[editIndex];
        document.getElementById('attackName').value = attack.name;
        document.getElementById('attackRoll').value = attack.roll;

        const categorySelect = document.getElementById('attackCategorySelect');
        if (categorySelect) {
            categorySelect.value = attack.category || 'none';
        }
    } else {
        // 追加モード
        uiState.editMode = { active: false, type: null, index: null };
        modalTitle.textContent = '攻撃ラベル追加';
        addBtn.textContent = '追加';
        bulkAddSection.style.display = 'block';
        resetAttackForm();
    }

    modal.showModal();
}

function resetAttackForm() {
    document.getElementById('attackName').value = '';
    document.getElementById('attackRoll').value = '';
    const categorySelect = document.getElementById('attackCategorySelect');
    if (categorySelect) {
        categorySelect.value = 'none';
    }
}

function addJudge() {
    const name = document.getElementById('judgeName').value.trim();
    const roll = document.getElementById('judgeRoll').value.trim();
    const categorySelect = document.getElementById('judgeCategorySelect');
    const category = categorySelect ? (categorySelect.value === 'none' ? null : categorySelect.value) : null;

    if (!name || !roll) {
        showToast('判定名と判定ロールを入力してください', 'error');
        return;
    }

    if (uiState.editMode.active && uiState.editMode.type === 'judge') {
        // 編集モード
        const index = uiState.editMode.index;
        store.updateItem('judge', index, { name: name, roll: roll, category });
        showToast('判定を更新しました', 'success');
    } else {
        // 追加モード
        store.addItem('judge', { name: name, roll: roll, category });
    }

    resetJudgeForm();
    document.getElementById('judgeaddmodal').close();

    renderPackage('judge');
    updateBuffTargetDropdown();
    saveData();
}

function removeJudge(index) {
    if (index < 0 || index >= store.getState().judges.length) return;

    store.removeItem('judge', index);
    renderPackage('judge');
    updateBuffTargetDropdown();
    updatePackageOutput('judge');
    saveData();
}

function addAttack() {
    const name = document.getElementById('attackName').value.trim();
    const roll = document.getElementById('attackRoll').value.trim();
    const categorySelect = document.getElementById('attackCategorySelect');
    const category = categorySelect ? (categorySelect.value === 'none' ? null : categorySelect.value) : null;

    if (!name || !roll) {
        showToast('攻撃名と攻撃ロールを入力してください', 'error');
        return;
    }

    if (uiState.editMode.active && uiState.editMode.type === 'attack') {
        // 編集モード
        const index = uiState.editMode.index;
        store.updateItem('attack', index, { name: name, roll: roll, category });
        showToast('攻撃を更新しました', 'success');
    } else {
        // 追加モード
        store.addItem('attack', { name: name, roll: roll, category });
    }

    resetAttackForm();
    document.getElementById('attackaddmodal').close();

    renderPackage('attack');
    updateBuffTargetDropdown();
    saveData();
}

function removeAttack(index) {
    if (index < 0 || index >= store.getState().attacks.length) return;

    store.removeItem('attack', index);
    renderPackage('attack');
    updateBuffTargetDropdown();
    updatePackageOutput('attack');
    saveData();
}

function selectPackage(index, type) {
    const array = getCollection(type);
    if (!array) return;
    if (index < 0 || index >= array.length) return;

    document.querySelectorAll(`[data-type="${type}"]`).forEach(el => el.classList.remove('list__item--selected'));
    const target = document.querySelector(`[data-type="${type}"][data-index="${index}"]`);
    if (target) target.classList.add('list__item--selected');
    updatePackageOutput(type, index);
}

function renderPackage(type) {
    const typeConfig = {
        'judge': {
            listId: 'judgeList',
            emptyMsg: '判定ラベルを追加してください'
        },
        'attack': {
            listId: 'attackList',
            emptyMsg: '攻撃ラベルを追加してください'
        }
    };

    const config = typeConfig[type];
    const array = getCollection(type);
    if (!config || !array) return;

    const list = document.getElementById(config.listId);
    if (!list) return;

    const categoryMap = buildCategoryMap(type);
    const categories = getCategories(type) || [];
    const hasContent = (array.length + categories.length) > 0;

    if (!hasContent) {
        list.innerHTML = `<div class="list__empty">${config.emptyMsg}</div>`;
        updateCategoryIndexDropdown(type);
        return;
    }

    const sections = [];

    sections.push(`
        <details class="list__category list__category--uncategorized" data-category="none" open>
            <summary class="list__category-header" data-category="none">
                <span class="material-symbols-rounded" style="margin-right: 4px;">arrow_right</span>
            </summary>
            <div class="list__category-body" data-category="none">
                ${renderPackageItems(type, categoryMap['none'])}
            </div>
        </details>
    `);

    categories.forEach(name => {
        sections.push(`
            <details class="list__category" open data-category="${escapeHtml(name)}">
                <summary class="list__category-header" data-category="${escapeHtml(name)}" draggable="true">
                    <span class="material-symbols-rounded" style="margin-right: 4px;">arrow_right</span><span style="word-break: break-all;">${escapeHtml(name)}</span>
                </summary>
                <div class="list__category-body" data-category="${escapeHtml(name)}">
                    ${renderPackageItems(type, categoryMap[name])}
                </div>
            </details>
        `);
    });

    list.innerHTML = sections.join('');

    updateCategoryIndexDropdown(type);
    attachItemEvents(type);
}

function attachItemEvents(type) {
    const typeConfig = {
        'judge': {
            listId: 'judgeList',
            onSelect: (i) => selectPackage(i, 'judge'),
            onEdit: (i) => openJudgeModal(i),
            onRemove: removeJudge
        },
        'attack': {
            listId: 'attackList',
            onSelect: (i) => selectPackage(i, 'attack'),
            onEdit: (i) => openAttackModal(i),
            onRemove: removeAttack
        }
    };

    const config = typeConfig[type];
    if (!config) return;

    const listElement = document.getElementById(config.listId);
    if (!listElement) return;

    listElement.querySelectorAll(`[data-type="${type}"]`).forEach(el => {
        const i = parseInt(el.getAttribute('data-index'));
        if (isNaN(i)) return;

        el.addEventListener('click', () => config.onSelect(i));
        el.addEventListener('dragstart', (e) => handleDragStart(e, i, type));
        el.addEventListener('dragover', handleDragOver);
        el.addEventListener('dragleave', handleDragLeave);
        el.addEventListener('drop', (e) => handleDrop(e, i, type));
        el.addEventListener('dragend', handleDragEnd);
        el.addEventListener('contextmenu', (e) => openItemContextMenu(e, type, i));
    });

    listElement.querySelectorAll('.list__category-header').forEach(header => {
        header.addEventListener('dragstart', (e) => handleCategoryHeaderDragStart(e, type));
        header.addEventListener('dragover', (e) => handleCategoryDragOver(e, type));
        header.addEventListener('dragleave', handleCategoryDragLeave);
        header.addEventListener('drop', (e) => handleCategoryDrop(e, type));
        header.addEventListener('dragend', handleCategoryHeaderDragEnd);
        const categoryName = header.getAttribute('data-category');
        if (categoryName && categoryName !== 'none') {
            header.addEventListener('contextmenu', (e) => openCategoryContextMenu(e, type, categoryName));
        }
    });

    listElement.querySelectorAll(`[data-edit-type="${type}"]`).forEach(btn => {
        const i = parseInt(btn.getAttribute('data-edit'));
        if (isNaN(i)) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            config.onEdit(i);
        });
    });

    listElement.querySelectorAll(`[data-copy-type="${type}"]`).forEach(btn => {
        const i = parseInt(btn.getAttribute('data-copy'));
        if (isNaN(i)) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            copyItemData(type, i, btn);
        });
    });

    listElement.querySelectorAll(`[data-remove-type="${type}"]`).forEach(btn => {
        const i = parseInt(btn.getAttribute('data-remove'));
        if (isNaN(i)) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            config.onRemove(i);
        });
    });

    listElement.querySelectorAll('.list__category-body').forEach(body => {
        body.addEventListener('dragover', (e) => handleCategoryBodyDragOver(e, type));
        body.addEventListener('dragleave', handleCategoryBodyDragLeave);
        body.addEventListener('drop', (e) => handleCategoryBodyDrop(e, type));
    });
}

function updatePackageOutput(type, selectedIndex = null) {
    const array = getCollection(type);
    const outputId = type === 'judge' ? 'judgeOutput' : 'attackOutput';
    const emptyMsg = type === 'judge' ? '判定ラベルを選択してください' : '攻撃ラベルを選択してください';

    if (!array) return;

    if (selectedIndex === null) {
        const selected = document.querySelector(`[data-type="${type}"].list__item--selected`);
        if (!selected) {
            document.getElementById(outputId).textContent = emptyMsg;
            return;
        }
        selectedIndex = parseInt(selected.getAttribute('data-index'));
    }

    if (selectedIndex < 0 || selectedIndex >= array.length) return;

    const options = {};
    if (type === 'judge') {
        options.targetType = document.querySelector('input[name="targetType"]:checked')?.value || 'none';
        options.targetValue = document.getElementById('targetValue').value.trim();
    }

    const result = store.generateCommands(type, selectedIndex, options);
    if (!result) return;

    const outputElement = document.getElementById(outputId);
    outputElement.innerHTML = result.html;
    outputElement.dataset.plainText = result.text;

}
// ========================================
// オートコンプリート機能
// ========================================

const autocompleteState = {
    currentInput: null,
    suggestions: [],
    selectedIndex: -1,
    dropdownElement: null,
    isOpen: false,
    tokenRange: null
};

/**
 * オートコンプリート対象フィールドの定義
 */
const autocompleteTargets = [
    'buffEffect',
    'judgeRoll',
    'attackRoll',
    'bulkAddText',
    'bulkAddJudgeText',
    'bulkAddAttackText'
];

/**
 * 辞書から検索候補を取得
 */
function getAutocompleteSuggestions(input) {
    if (!input || input.length === 0) return [];

    const lowerInput = input.toLowerCase();

    // 先頭一致と中間一致で分ける
    const exact = [];
    const partial = [];

    store.getState().userDictionary.forEach(item => {
        const lowerText = item.text.toLowerCase();
        if (lowerText.startsWith(lowerInput)) {
            exact.push(item);
        } else if (lowerText.includes(lowerInput)) {
            partial.push(item);
        }
    });

    // 先頭一致を優先し、最大5件まで
    return [...exact, ...partial].slice(0, 5);
}

/**
 * キャレット位置の単語断片を取得
 */
function getTokenAtCaret(value, caretPos) {
    const length = value.length;
    const safeCaret = Math.max(0, Math.min(caretPos ?? 0, length));
    const isSeparator = (char) => /[\s\u3000,.;:!?'"(){}\[\]<>|\\/+*-]/.test(char);

    let start = safeCaret;
    while (start > 0 && !isSeparator(value[start - 1])) {
        start -= 1;
    }

    let end = safeCaret;
    while (end < length && !isSeparator(value[end])) {
        end += 1;
    }

    return {
        token: value.slice(start, end),
        start,
        end
    };
}

/**
 * オートコンプリートドロップダウンを作成・取得
 */
function getAutocompleteDropdown() {
    if (autocompleteState.dropdownElement) {
        return autocompleteState.dropdownElement;
    }

    const dropdown = document.createElement('div');
    dropdown.id = 'autocomplete';
    dropdown.className = 'autocomplete u-hidden';
    document.body.appendChild(dropdown);
    autocompleteState.dropdownElement = dropdown;

    return dropdown;
}

/**
 * オートコンプリートドロップダウンを表示
 */
function showAutocompleteDropdown(inputElement, suggestions) {
    if (suggestions.length === 0) {
        hideAutocompleteDropdown();
        return;
    }

    // ドロップダウン要素を強制作成（入力欄の直後に追加）
    let dropdown = document.getElementById('autocomplete');
    if (!dropdown) {
        console.log('Creating dropdown element');
        dropdown = document.createElement('div');
        dropdown.id = 'autocomplete';
        dropdown.className = 'autocomplete';
        // 入力欄の親要素に追加
        inputElement.parentElement.appendChild(dropdown);
        autocompleteState.dropdownElement = dropdown;
    }

    const rect = inputElement.getBoundingClientRect();

    // ドロップダウンのHTMLを生成
    const itemsHtml = suggestions.map((item, index) => `
        <div class="autocomplete__item" data-index="${index}" data-text="${escapeHtml(item.text)}">
            <span class="autocomplete__text">${escapeHtml(item.text)}</span>
            <span class="autocomplete__category">${escapeHtml(item.category)}</span>
        </div>
    `).join('');

    dropdown.innerHTML = itemsHtml;
    dropdown.classList.remove('u-hidden');
    autocompleteState.isOpen = true;

    // アイテムのクリックイベントを設定
    dropdown.querySelectorAll('.autocomplete__item').forEach(item => {
        item.addEventListener('click', () => {
            selectAutocompleteItem(inputElement, item.getAttribute('data-text'));
        });

        item.addEventListener('mouseenter', () => {
            const index = parseInt(item.getAttribute('data-index'));
            setSelectedAutocompleteIndex(index);
        });
    });

    console.log('Dropdown shown, isOpen:', autocompleteState.isOpen, 'element:', dropdown);
}

/**
 * オートコンプリートドロップダウンを非表示
 */
function hideAutocompleteDropdown() {
    const dropdown = autocompleteState.dropdownElement;
    if (dropdown) {
        dropdown.classList.add('u-hidden');
    }
    autocompleteState.isOpen = false;
    autocompleteState.selectedIndex = -1;
    console.log('Dropdown hidden, isOpen:', autocompleteState.isOpen);
}

/**
 * オートコンプリート項目を選択
 */
function selectAutocompleteItem(inputElement, text) {
    const value = inputElement.value;
    const caretPos = inputElement.selectionStart ?? value.length;
    let { start, end } = getTokenAtCaret(value, caretPos);

    if (start === end && autocompleteState.tokenRange) {
        start = autocompleteState.tokenRange.start;
        end = autocompleteState.tokenRange.end;
    }

    inputElement.value = value.slice(0, start) + text + value.slice(end);
    hideAutocompleteDropdown();
    inputElement.focus();
    const caret = start + text.length;
    inputElement.selectionStart = caret;
    inputElement.selectionEnd = caret;

    // inputイベントを発火させて他の処理をトリガー
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * オートコンプリート選択インデックスを設定
 */
function setSelectedAutocompleteIndex(index) {
    const dropdown = autocompleteState.dropdownElement;
    if (!dropdown) return;

    // 前の選択項目のハイライトを削除
    if (autocompleteState.selectedIndex >= 0) {
        const prevItem = dropdown.querySelector(`[data-index="${autocompleteState.selectedIndex}"]`);
        if (prevItem) prevItem.classList.remove('autocomplete__item--selected');
    }

    // 新しい選択項目にハイライトを追加
    autocompleteState.selectedIndex = index;
    const item = dropdown.querySelector(`[data-index="${index}"]`);
    if (item) {
        item.classList.add('autocomplete__item--selected');
        item.scrollIntoView({ block: 'nearest' });
    }
}

/**
 * オートコンプリート対象フィールドを初期化
 */
function setupAutocompleteFields() {
    autocompleteTargets.forEach(targetId => {
        const element = document.getElementById(targetId);
        if (!element) {
            console.warn(`オートコンプリート対象が見つかりません: ${targetId}`);
            return;
        }

        element.addEventListener('input', (e) => {
            console.log(`Input event on ${targetId}, value: "${e.target.value}"`);

            if (store.getState().userDictionary.length === 0) {
                console.log('Dictionary is empty');
                hideAutocompleteDropdown();
                return;
            }

            const input = e.target.value;
            const caretPos = e.target.selectionStart ?? input.length;
            const { token, start, end } = getTokenAtCaret(input, caretPos);
            autocompleteState.tokenRange = { start, end };
            const suggestions = getAutocompleteSuggestions(token);
            console.log(`Suggestions found: ${suggestions.length}`);

            if (suggestions.length > 0) {
                autocompleteState.currentInput = e.target;
                autocompleteState.suggestions = suggestions;
                showAutocompleteDropdown(e.target, suggestions);
            } else {
                hideAutocompleteDropdown();
            }
        });

        // キーボード操作（IME対応）
        element.addEventListener('keydown', (e) => {
            console.log(`Keydown on ${targetId}, key: "${e.key}", isOpen: ${autocompleteState.isOpen}`);

            if (!autocompleteState.isOpen) return;

            const dropdown = autocompleteState.dropdownElement;
            const itemCount = dropdown.querySelectorAll('.autocomplete__item').length;

            // Enterキーとエスケープはここで処理
            if (e.key === 'Enter') {
                e.preventDefault();
                if (autocompleteState.selectedIndex >= 0) {
                    const item = dropdown.querySelector(`[data-index="${autocompleteState.selectedIndex}"]`);
                    if (item) {
                        selectAutocompleteItem(e.target, item.getAttribute('data-text'));
                        console.log('Enter pressed, item selected');
                    }
                } else {
                    hideAutocompleteDropdown();
                    console.log('Enter pressed, no selection');
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                hideAutocompleteDropdown();
                console.log('Escape pressed');
            }
        });

        // 矢印キーはkeyupで処理（IME干渉を回避）
        element.addEventListener('keyup', (e) => {
            console.log(`Keyup on ${targetId}, key: "${e.key}", isOpen: ${autocompleteState.isOpen}`);

            if (!autocompleteState.isOpen) return;

            const dropdown = autocompleteState.dropdownElement;
            const itemCount = dropdown.querySelectorAll('.autocomplete__item').length;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const nextIndex = autocompleteState.selectedIndex + 1;
                if (nextIndex < itemCount) {
                    setSelectedAutocompleteIndex(nextIndex);
                    console.log('Arrow down, selectedIndex:', autocompleteState.selectedIndex);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prevIndex = autocompleteState.selectedIndex - 1;
                if (prevIndex >= 0) {
                    setSelectedAutocompleteIndex(prevIndex);
                    console.log('Arrow up, selectedIndex:', autocompleteState.selectedIndex);
                }
            }
        });

        // フォーカス喪失時には処理しない（clickOutsideで処理）
        // element.addEventListener('blur', () => {
        //     setTimeout(() => hideAutocompleteDropdown(), 150);
        // });
    });
}

/**
 * ドキュメント全体のクリックでドロップダウンを閉じる
 */
function setupAutocompleteClickOutside() {
    document.addEventListener('click', (e) => {
        const dropdown = autocompleteState.dropdownElement;
        if (dropdown && !dropdown.contains(e.target) && !autocompleteTargets.includes(e.target.id)) {
            hideAutocompleteDropdown();
        }
    });
}

// ========================================
// コピー機能
// ========================================
function formatTargetsForBulk(targets) {
    if (!Array.isArray(targets) || targets.length === 0) return 'なし';

    const labels = targets.map(target => {
        if (target === 'none') return 'なし';
        if (target === 'all-judge') return 'すべての判定';
        if (target === 'all-attack') return 'すべての攻撃';
        if (target.startsWith('judge:')) return target.slice(6);
        if (target.startsWith('attack:')) return target.slice(7);
        if (target.startsWith('judge-category:')) return '>>' + target.slice(16);
        if (target.startsWith('attack-category:')) return '>>' + target.slice(17);
        return target;
    });

    return labels.join(',');
}

function formatBuffForBulk(buff) {
    const targetText = formatTargetsForBulk(buff.targets);
    const turnText = buff.originalTurn ?? buff.turn ?? '';
    const simpleMemo = getBuffSimpleMemo(buff);

    return [
        buff.name || '',
        targetText,
        simpleMemo,
        buff.effect || '',
        turnText,
        buff.color || getDefaultBuffColor()
    ].join('|');
}

function formatPackageForBulk(item) {
    return `${item.name}|${item.roll}`;
}

function copyItemData(type, index, button) {
    const array = getCollection(type);
    if (!array || index < 0 || index >= array.length) return;

    let text = '';
    const item = array[index];

    if (type === 'buff') {
        text = formatBuffForBulk(item);
    } else if (type === 'judge' || type === 'attack') {
        text = formatPackageForBulk(item);
    } else {
        return;
    }

    navigator.clipboard.writeText(text).then(() => {
        if (button) {
            const original = button.textContent;
            button.textContent = 'コピー済み!';
            button.classList.add('button--copied');
            setTimeout(() => {
                button.textContent = original;
                button.classList.remove('button--copied');
            }, 2000);
        }
        showToast('クリップボードにコピーしました', 'success');
    }).catch(() => {
        showToast('コピーに失敗しました', 'error');
    });
}

function copyToClipboard(elementId, button) {
    const element = document.getElementById(elementId);
    // HTMLではなくdata属性のプレーンテキストをコピー
    const text = element.dataset.plainText || element.textContent;

    if (!text || text.includes('選択') || text.includes('を選択')) {
        showToast('ラベルを選択してください', 'error');
        return;
    }

    navigator.clipboard.writeText(text).then(() => {
        button.textContent = 'コピー済み!';
        button.classList.add('button--copied');
        setTimeout(() => {
            button.textContent = 'コピー';
            button.classList.remove('button--copied');
        }, 2000);
    }).catch(() => {
        showToast('コピーに失敗しました', 'error');
    });
}

// ========================================
// 初期化
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateColorDatalist();
    const themeToggle = document.getElementById('themeToggle');
    themeToggle?.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dracula';
        const next = current === 'dracula' ? 'alucard' : 'dracula';
        applyTheme(next);
    });

    setupSettingsMenu();

    document.querySelectorAll('.section__header').forEach(header => {
        header.addEventListener('click', () => toggleSection(header));
    });

    document.getElementById('addBuffBtn')?.addEventListener('click', addBuff);
    document.getElementById('addBuffCategoryBtn')?.addEventListener('click', () => addCategory('buff', 'buffCategoryInput'));
    document.getElementById('turnProgressBtn')?.addEventListener('click', progressTurn);
    document.getElementById('turnResetBtn')?.addEventListener('click', resetBuffsToMaxTurns);
    document.getElementById('buffItemIndex')?.addEventListener('change', (e) => handleCategoryIndexChange('buff', e));

    const buffModal = document.getElementById('buffaddmodal');
    if (buffModal) {
        buffModal.addEventListener('close', () => {
            resetBuffForm();
            uiState.editMode = { active: false, type: null, index: null };
        });
    }

    setupBulkAddControls({
        toggleId: 'bulkAddBtn',
        confirmId: 'bulkAddConfirm',
        areaId: 'bulkAddArea',
        textId: 'bulkAddText',
        type: 'buff'
    });

    document.getElementById('addJudgeBtn')?.addEventListener('click', addJudge);
    document.getElementById('addJudgeCategoryBtn')?.addEventListener('click', () => addCategory('judge', 'judgeCategoryInput'));
    document.getElementById('judgeItemIndex')?.addEventListener('change', (e) => handleCategoryIndexChange('judge', e));
    document.querySelectorAll('input[name="targetType"]').forEach(radio => {
        radio.addEventListener('change', () => updatePackageOutput('judge'));
    });
    document.getElementById('targetValue')?.addEventListener('input', () => updatePackageOutput('judge'));

    const judgeModal = document.getElementById('judgeaddmodal');
    if (judgeModal) {
        judgeModal.addEventListener('close', () => {
            resetJudgeForm();
            uiState.editMode = { active: false, type: null, index: null };
        });
    }

    setupBulkAddControls({
        confirmId: 'bulkAddJudgeConfirm',
        areaId: 'bulkAddJudgeArea',
        textId: 'bulkAddJudgeText',
        type: 'judge'
    });

    document.getElementById('addAttackBtn')?.addEventListener('click', addAttack);
    document.getElementById('addAttackCategoryBtn')?.addEventListener('click', () => addCategory('attack', 'attackCategoryInput'));
    document.getElementById('attackItemIndex')?.addEventListener('change', (e) => handleCategoryIndexChange('attack', e));

    const attackModal = document.getElementById('attackaddmodal');
    if (attackModal) {
        attackModal.addEventListener('close', () => {
            resetAttackForm();
            uiState.editMode = { active: false, type: null, index: null };
        });
    }

    setupBulkAddControls({
        confirmId: 'bulkAddAttackConfirm',
        areaId: 'bulkAddAttackArea',
        textId: 'bulkAddAttackText',
        type: 'attack'
    });

    document.getElementById('exportToClipboard')?.addEventListener('click', exportData);
    document.getElementById('importConfirm')?.addEventListener('click', importData);
    document.getElementById('resetBtn')?.addEventListener('click', resetAll);
    document.getElementById('resetDictionaryBtn')?.addEventListener('click', resetDictionary);
    document.getElementById('userMacroClose')?.addEventListener('click', () => {
        document.getElementById('userMacroModal')?.close();
    });


    document.querySelectorAll('.button--copy').forEach(btn => {
        btn.addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');
            if (targetId) copyToClipboard(targetId, this);
        });
    });

    loadUserDictionary();           // 辞書を先にロード
    setupUserDictionaryModal();     // UI初期化
    renderMacroDictionary();        // 表示
    setupAutocompleteFields();      // 辞書ロード後にオートコンプリート初期化
    setupAutocompleteClickOutside();

    initMultiSelect();
    initFileDropZone();
    loadUIState();
    loadData();

});

// グローバルスコープに公開
window.openBuffModal = openBuffModal;
window.openJudgeModal = openJudgeModal;
window.openAttackModal = openAttackModal;
