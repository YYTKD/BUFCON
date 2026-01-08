// ========================================
// アプリケーション状態
// ========================================
const state = {
    buffs: [],
    judges: [],
    attacks: [],
    buffCategories: [],
    judgeCategories: [],
    attackCategories: [],
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
    }
};

function getCollection(type) {
    if (type === 'buff') return state.buffs;
    if (type === 'judge') return state.judges;
    if (type === 'attack') return state.attacks;
    if (type === 'macro') return macroState.dictionary;
    return null;
}

// ========================================
// コンテキストメニュー
// ========================================
let contextMenuElement = null;

function getContextMenu() {
    if (contextMenuElement) return contextMenuElement;

    contextMenuElement = document.createElement('div');
    contextMenuElement.id = 'item-context-menu';
    contextMenuElement.className = 'context-menu hidden';
    document.body.appendChild(contextMenuElement);

    document.addEventListener('click', hideContextMenu);
    window.addEventListener('resize', hideContextMenu);
    window.addEventListener('scroll', hideContextMenu, true);

    return contextMenuElement;
}

function hideContextMenu() {
    if (contextMenuElement) {
        contextMenuElement.classList.add('hidden');
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
            separator.className = 'context-menu-separator';
            menu.appendChild(separator);
        }

        const button = document.createElement('button');
        button.className = 'context-menu-item';
        button.textContent = action.label;
        button.addEventListener('click', () => {
            action.onClick();
            hideContextMenu();
        });
        menu.appendChild(button);
    });

    menu.classList.remove('hidden');
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

function openItemContextMenu(event, type, index) {
    event.preventDefault();
    const actions = [];

    if (type === 'buff') {
        actions.push({ label: '編集', onClick: () => openBuffModal(index) });
        actions.push({ label: 'テキストをコピー', onClick: () => copyItemData('buff', index) });
        actions.push({ label: '削除', onClick: () => removeBuff(index) });
    } else if (type === 'judge') {
        actions.push({ label: '編集', onClick: () => openJudgeModal(index) });
        actions.push({ label: 'テキストをコピー', onClick: () => copyItemData('judge', index) });
        actions.push({ label: '削除', onClick: () => removeJudge(index) });
    } else if (type === 'attack') {
        actions.push({ label: '編集', onClick: () => openAttackModal(index) });
        actions.push({ label: 'テキストをコピー', onClick: () => copyItemData('attack', index) });
        actions.push({ label: '削除', onClick: () => removeAttack(index) });
    } else if (type === 'macro') {
        actions.push({ label: '編集', onClick: () => startMacroEdit(index) });
        actions.push({ label: '削除', onClick: () => deleteMacro(index) });
    }

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
        dropdown.classList.add('hidden');
        toggle.setAttribute('aria-expanded', 'false');
    };

    const showDropdown = () => {
        dropdown.classList.remove('hidden');
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
        const item = event.target.closest('.settings-dropdown-item');
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
    if (type === 'buff') return state.buffCategories;
    if (type === 'judge') return state.judgeCategories;
    if (type === 'attack') return state.attackCategories;
    if (type === 'macro') {
        const categories = [];
        macroState.dictionary.forEach(item => {
            const name = item.category ? item.category.trim() : '';
            if (name && !categories.includes(name)) {
                categories.push(name);
            }
        });
        return categories;
    }
    return null;
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
    return luminance > 0.5 ? '#000000' : '#ffffff';
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
    return hexPattern.test(color) ? color : '#ff6b6b';
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
    toast.style.cssText = `
        position: fixed;
        top: ${top};
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'error' ? '#d9376e' : type === 'success' ? '#48c229' : '#5c59ff'};
        color: white;
        border-radius: 6px;
        border: 2px solid var(--primary-color-1);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        font-size: 14px;
        max-width: 300px;
    `;
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
        document.querySelectorAll('.section-header').forEach((header, i) => {
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
            document.querySelectorAll('.section-header').forEach((header, i) => {
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

function normalizeBuff(buff) {
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
}

function normalizeBuffs(buffs = []) {
    if (!Array.isArray(buffs)) return [];
    return buffs.map(normalizeBuff);
}

function loadData() {
    try {
        const saved = localStorage.getItem('trpgData');
        if (saved) {
            const data = JSON.parse(saved);
            state.buffs = normalizeBuffs(Array.isArray(data.buffs) ? data.buffs : getDefaultBuffs());
            state.buffCategories = Array.isArray(data.buffCategories) ? data.buffCategories : [];
            state.judges = Array.isArray(data.judges) ? data.judges : getDefaultJudges();
            state.judgeCategories = Array.isArray(data.judgeCategories) ? data.judgeCategories : [];
            state.attacks = Array.isArray(data.attacks) ? data.attacks : getDefaultAttacks();
            state.attackCategories = Array.isArray(data.attackCategories) ? data.attackCategories : [];
        } else {
            state.buffs = normalizeBuffs(getDefaultBuffs());
            state.judges = getDefaultJudges();
            state.attacks = getDefaultAttacks();
        }
    } catch (e) {
        console.error('データの読み込みに失敗:', e);
        showToast('データの読み込みに失敗しました', 'error');
        state.buffs = normalizeBuffs(getDefaultBuffs());
        state.judges = getDefaultJudges();
        state.attacks = getDefaultAttacks();
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
    return [
        { name: 'キャッツアイ', memo: '命中UP', showSimpleMemo: true, effect: '+1', targets: ['judge:命中(武器A)　SAMPLE'], turn: '3', originalTurn: 3, color: '#F8F9FA', category: null, active: true },
        { name: 'オーバーパワー', memo: 'ダメージUP', showSimpleMemo: true, effect: '+3', targets: ['attack:all-attack'], color: '#F7821B', category: null, active: true }
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
    const data = {
        buffs: state.buffs,
        buffCategories: state.buffCategories,
        judges: state.judges,
        judgeCategories: state.judgeCategories,
        attacks: state.attacks,
        attackCategories: state.attackCategories
    };
    
    try {
        const json = JSON.stringify(data);
        
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
    const data = {
        buffs: state.buffs,
        buffCategories: state.buffCategories,
        judges: state.judges,
        judgeCategories: state.judgeCategories,
        attacks: state.attacks,
        attackCategories: state.attackCategories
    };
    const json = JSON.stringify(data, null, 2);
    
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
        const data = JSON.parse(text);

        if (!data.buffs || !data.judges || !data.attacks) {
            throw new Error('無効なデータ形式です');
        }

        state.buffs = normalizeBuffs(data.buffs || []);
        state.buffCategories = data.buffCategories || [];
        state.judges = data.judges || [];
        state.judgeCategories = data.judgeCategories || [];
        state.attacks = data.attacks || [];
        state.attackCategories = data.attackCategories || [];

        updateBuffCategorySelect();
        updateJudgeCategorySelect();
        updateAttackCategorySelect();
        renderBuffs();
        renderPackage('judge');
        renderPackage('attack');
        updateBuffTargetDropdown();
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
            dropZone.style.borderColor = '#4769b3';
            dropZone.style.borderStyle = 'dashed';
            dropZone.style.borderWidth = '3px';
            dropZone.style.background = '#e7f3ff';
        });
        
        // ドラッグが離れた時の処理
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.style.borderColor = '';
            dropZone.style.borderStyle = '';
            dropZone.style.borderWidth = '';
            dropZone.style.background = '';
        });
        
        // ドロップ時の処理
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // スタイルを元に戻す
            dropZone.style.borderColor = '';
            dropZone.style.borderStyle = '';
            dropZone.style.borderWidth = '';
            dropZone.style.background = '';
            
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

    state.buffs.forEach(buff => {
        buff.targets = buff.targets
            .map(target => target === fromKey ? toKey : target)
            .filter(Boolean);
    });

    if (Array.isArray(state.selectedBuffTargets)) {
        state.selectedBuffTargets = state.selectedBuffTargets
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

    const blocks = Array.from(list.querySelectorAll('.category-block'));
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
        const turnDisplay = item.turn ? `<span class="turn-badge" style="outline:2px solid ${item.color};"><span>${item.turn}</span></span>` : '';
        const simpleMemo = getBuffSimpleMemo(item);
        const memoText = getBuffMemoText(item);
        const memoHtml = memoText ? escapeHtml(memoText).replace(/\n/g, '<br>') : '<span class="memo-empty">メモはありません</span>';
        const maxTurnText = item.originalTurn ?? item.turn;
        const maxTurnDisplay = (maxTurnText === undefined || maxTurnText === null || maxTurnText === '') ? 'なし' : maxTurnText;
        const targetsText = targetTexts.length ? targetTexts.join(', ') : 'なし';
        const effectText = item.effect ? item.effect : 'なし';

        return `
            <details class="item buff-item draggable ${item.active ? 'active' : ''}"
                     style="background-color: ${bgColor}; color: ${textColor};"
                     data-index="${index}" data-type="buff" data-item-index="${index}" data-category="${escapeHtml(item.category || 'none')}">
                <summary class="buff-summary" draggable="true">
                    <span class="item-param">
                        <span class="item-name">${escapeHtml(item.name)}</span>
                        ${simpleMemo ? `<span class="item-description">${escapeHtml(simpleMemo)}</span>` : ''}
                    </span>
                    ${turnDisplay}
                    <span class="buff-btn">
                        <button class="toggle-btn ${item.active ? 'active' : ''}" data-toggle="${index}" data-toggle-type="buff"></button>
                    </span>
                </summary>
                <div class="buff-detail-body">
                    <div>
                        <p><strong>最大ターン：</strong>${escapeHtml(String(maxTurnDisplay))}</p>
                        <p><strong>効果先：</strong>${escapeHtml(targetsText)}</p>
                        <p><strong>コマンド：</strong>${escapeHtml(effectText)}</p>
                    </div>
                    <div class="item-detail buff-memo">
                        <p class="item-detail-label"><strong>メモ：</strong></p>
                        <p class="item-memo-text">${memoHtml}</p>
                    </div>
                </div>
            </details>
        `;
    }).join('');
}

function renderPackageItems(type, entries = []) {
    if (!Array.isArray(entries) || entries.length === 0) return '';

    return entries.map(({ item, index }) => `
        <div class="item clickable draggable" data-index="${index}" data-type="${type}" data-category="${escapeHtml(item.category || 'none')}" draggable="true">
            <span class="item-param">
                <span class="item-name">${escapeHtml(item.name)}</span>
                <span class="item-detail">${escapeHtml(item.roll)}</span>
        </div>
    `).join('');
}

function updateBuffCategorySelect() {
    const select = document.getElementById('buffCategorySelect');
    if (!select) return;

    const options = ['<option value="none">なし</option>'];
    state.buffCategories.forEach(name => {
        options.push(`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`);
    });

    select.innerHTML = options.join('');
}

function updateJudgeCategorySelect() {
    const select = document.getElementById('judgeCategorySelect');
    if (!select) return;

    const options = ['<option value="none">なし</option>'];
    state.judgeCategories.forEach(name => {
        options.push(`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`);
    });

    select.innerHTML = options.join('');
}

function updateAttackCategorySelect() {
    const select = document.getElementById('attackCategorySelect');
    if (!select) return;

    const options = ['<option value="none">なし</option>'];
    state.attackCategories.forEach(name => {
        options.push(`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`);
    });

    select.innerHTML = options.join('');
}


// ========================================
// ユーザー辞書管理
// ========================================

const macroState = {
    dictionary: [],
    editingId: null
};

/**
 * ユーザー辞書をロード
 */
function loadUserDictionary() {
    try {
        const saved = localStorage.getItem('userDictionary');
        if (saved) {
            macroState.dictionary = JSON.parse(saved);
        } else {
            macroState.dictionary = [];
        }
    } catch (e) {
        console.error('ユーザー辞書の読み込みに失敗:', e);
        macroState.dictionary = [];
    }
}

/**
 * ユーザー辞書をセーブ
 */
function saveUserDictionary() {
    try {
        const json = JSON.stringify(macroState.dictionary);
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

    if (!text) {
        showToast('文字列を入力してください', 'error');
        return;
    }

    if (!category) {
        showToast('カテゴリーを入力してください', 'error');
        return;
    }

    // 重複チェック（編集時以外）
    const isDuplicate = macroState.dictionary.some(item => 
        item.text === text && item.id !== macroState.editingId
    );

    if (isDuplicate) {
        showToast('この文字列は既に登録されています', 'error');
        return;
    }

if (macroState.editingId) {
    // 編集モード：`localStorage`から最新データを読み込み直してから更新
    loadUserDictionary();
    const index = macroState.dictionary.findIndex(item => item.id === macroState.editingId);
    if (index !== -1) {
        macroState.dictionary[index].text = text;
        macroState.dictionary[index].category = category;
        saveUserDictionary();
        showToast('辞書項目を更新しました', 'success');
    }
    cancelMacroEdit();
    } else {
        // 追加モード：新規アイテムを作成
        const newItem = {
            id: generateUUID(),
            text: text,
            category: category,
            usage: 0
        };
        macroState.dictionary.push(newItem);
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
    const item = macroState.dictionary.find(m => m.id === id);
    if (!item) return;

    macroState.editingId = id;
    document.getElementById('macroText').value = item.text;
    document.getElementById('macroCategory').value = item.category;

    // UIの更新
    const addBtn = document.getElementById('macroAddBtn');
    const cancelBtn = document.getElementById('macroCancelBtn');
    addBtn.textContent = '更新';
    cancelBtn.style.display = 'flex';

    // 一時削除
    macroState.dictionary = macroState.dictionary.filter(m => m.id !== id);
    renderMacroDictionary();

    document.getElementById('macroText').focus();
}

/**
 * ユーザー辞書の編集をキャンセル
 */
function cancelMacroEdit() {
    if (!macroState.editingId) return;

    // 削除されたアイテムを復帰させるため、localStorageから再ロード
    const saved = localStorage.getItem('userDictionary');
    if (saved) {
        try {
            macroState.dictionary = JSON.parse(saved);
        } catch (e) {
            console.error('辞書の復帰に失敗:', e);
        }
    }

    macroState.editingId = null;
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
    const item = macroState.dictionary.find(m => m.id === id);
    if (!item) return;

    if (!confirm(`「${escapeHtml(item.text)}」を削除しますか？`)) {
        return;
    }

    macroState.dictionary = macroState.dictionary.filter(m => m.id !== id);
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
        <div class="item clickable" data-type="macro" data-id="${escapeHtml(item.id)}">
            <span class="item-param">
                <span class="item-name">${escapeHtml(item.text)}</span>
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

    if (macroState.dictionary.length === 0) {
        listContainer.innerHTML = '<div class="empty-message">辞書が登録されていません</div>';
        updateCategoryIndexDropdown('macro');
        return;
    }

    const categoryMap = buildCategoryMap('macro');
    const categories = getCategories('macro') || [];
    const sections = [];

    if (categoryMap['none'] && categoryMap['none'].length > 0) {
        sections.push(`
            <details class="category-block uncategorized" data-category="none" open>
                <summary class="category-header" data-category="none">
                    <span class="material-symbols-rounded" style="margin-right: 4px;">arrow_right</span>
                    <span style="word-break: break-all;">未分類</span>
                </summary>
                <div class="category-body" data-category="none">
                    ${renderMacroItems(categoryMap['none'])}
                </div>
            </details>
        `);
    }

    categories.forEach(name => {
        sections.push(`
            <details class="category-block" open data-category="${escapeHtml(name)}">
                <summary class="category-header" data-category="${escapeHtml(name)}">
                    <span class="material-symbols-rounded" style="margin-right: 4px;">arrow_right</span>
                    <span style="word-break: break-all;">${escapeHtml(name)}</span>
                </summary>
                <div class="category-body" data-category="${escapeHtml(name)}">
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
    const json = JSON.stringify(macroState.dictionary, null, 2);
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

        macroState.dictionary = data;
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
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
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
        localStorage.removeItem('userDictionary');
        location.reload();
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
        if (e.key === 'Escape' && macroState.editingId) {
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
        state.selectedBuffTargets = Array.from(select.selectedOptions).map(opt => opt.value);
    });
}

function updateBuffTargetDropdown() {
    const select = document.getElementById('buffTargetSelect');
    if (!select) return;

    // プレースホルダー
    let html = '<option disabled>複数選択可</option>';
    
    // 状態に保持している選択値を使用
    const currentValues = Array.isArray(state.selectedBuffTargets)
        ? [...state.selectedBuffTargets]
        : [];

    // その他カテゴリ
    html += `<option value="none" ${currentValues.includes('none') ? 'selected' : ''}>なし</option>`;
    html += `<option value="all-judge" ${currentValues.includes('all-judge') ? 'selected' : ''}>すべての判定</option>`;
    html += `<option value="all-attack" ${currentValues.includes('all-attack') ? 'selected' : ''}>すべての攻撃</option>`;
    html += `</optgroup>`;
    
    // 判定カテゴリ
    if (state.judges.length > 0) {
        html += `<optgroup label="---判定---">`;
                if (state.judgeCategories.length > 0) {
            state.judgeCategories.forEach(name => {
                const value = `judge-category:${name}`;
                html += `<option value="${escapeHtml(value)}" ${currentValues.includes(value) ? 'selected' : ''}>&gt;&gt;${escapeHtml(name)}</option>`;
            });
        }
        
        state.judges.forEach(j => {
            const value = 'judge:' + j.name;
            html += `<option value="${escapeHtml(value)}" ${currentValues.includes(value) ? 'selected' : ''}>${escapeHtml(j.name)}</option>`;
        });

        html += `</optgroup>`;
    }

    // 攻撃カテゴリ
    if (state.attacks.length > 0) {
        html += `<optgroup label="---攻撃---">`;
                if (state.attackCategories.length > 0) {
            state.attackCategories.forEach(name => {
                const value = `attack-category:${name}`;
                html += `<option value="${escapeHtml(value)}" ${currentValues.includes(value) ? 'selected' : ''}>&gt;&gt;${escapeHtml(name)}</option>`;
            });
        }
        state.attacks.forEach(a => {
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
    const modalTitle = modal.querySelector('.section-header-title');
    const addBtn = document.getElementById('addBuffBtn');
    const bulkAddSection = document.getElementById('bulkAddArea').parentElement;
    
    if (editIndex !== null) {
        // 編集モード
        state.editMode = { active: true, type: 'buff', index: editIndex };
        modalTitle.textContent = 'バフ編集';
        addBtn.textContent = '更新';
        bulkAddSection.style.display = 'none';

        const buff = state.buffs[editIndex];
        updateBuffCategorySelect();
        document.getElementById('buffName').value = buff.name;
        document.getElementById('buffEffect').value = buff.effect || '';
        document.getElementById('buffTurn').value = buff.originalTurn || '';
        document.getElementById('buffColor').value = buff.color;
        document.getElementById('buffCategorySelect').value = buff.category || 'none';
        document.getElementById('buffMemo').value = getBuffMemoText(buff);
        document.getElementById('buffSimpleMemoToggle').checked = buff.showSimpleMemo ?? Boolean(buff.description);

        // 効果先の選択状態を復元
        state.selectedBuffTargets = [...buff.targets];
        updateBuffTargetDropdown();
    } else {
        // 追加モード
        state.editMode = { active: false, type: null, index: null };
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
    document.getElementById('buffColor').value = '#F8F9FA';
    document.getElementById('buffCategorySelect').value = 'none';
    document.getElementById('buffMemo').value = '';
    document.getElementById('buffSimpleMemoToggle').checked = false;
    state.selectedBuffTargets = [];
    updateBuffTargetDropdown();
}

function insertText(text) {
    const textbox = document.getElementById('buffEffect');
            textbox.value = textbox.value + text;
}

function addBuff() {
    const name = document.getElementById('buffName').value.trim();
    const effect = document.getElementById('buffEffect').value.trim();
    const targets = [...state.selectedBuffTargets];
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
    
    if (state.editMode.active && state.editMode.type === 'buff') {
        // 編集モード
        const index = state.editMode.index;
        const oldTurn = state.buffs[index].turn;
        const oldOriginalTurn = state.buffs[index].originalTurn;

        state.buffs[index] = {
            name: name,
            effect: effect,
            targets: targets,
            turn: turn ? parseInt(turn) : oldTurn,
            originalTurn: turn ? parseInt(turn) : oldOriginalTurn,
            color: color,
            category: category,
            memo: memo,
            showSimpleMemo,
            active: state.buffs[index].active
        };

        showToast('バフを更新しました', 'success');
    } else {
        // 追加モード:
        state.buffs.push({
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
            minParts: 1,
            messageKey: 'バフ',
            parser: (parts, index, category) => {
                const name = parts[0];
                const targetStr = parts[1] || '';
                                const colorPattern = /^#[0-9A-Fa-f]{6}$/;
                const colorIndex = parts.findIndex((part, idx) => idx >= 2 && colorPattern.test(part));
                const memoAfterColor = (colorIndex >= 0 && colorIndex + 1 < parts.length) ? (parts[colorIndex + 1] || '') : '';
                const color = validateColor(colorIndex >= 0 ? (parts[colorIndex] || '#0079FF') : (parts[4] || '#0079FF'));

                const payloadEnd = colorIndex >= 0 ? colorIndex : parts.length;
                const payload = parts.slice(2, payloadEnd);
                const hasSimpleMemoField = payload.length >= 3;

                const simpleMemo = hasSimpleMemoField ? (payload[0] || '') : '';
                const effect = hasSimpleMemoField ? (payload[1] || '') : (payload[0] || '');
                const turn = hasSimpleMemoField ? (payload[2] ? parseInt(payload[2]) : null) : (payload[1] ? parseInt(payload[1]) : null);
                const memo = simpleMemo ? `${simpleMemo}${memoAfterColor ? `\n${memoAfterColor}` : ''}` : memoAfterColor;
                if (!name) throw `行${index + 1}: バフ名が空です`;

                const targetNames = targetStr.split(',').map(t => t.trim());
                const targets = [];

                targetNames.forEach(tName => {
                    if (tName.startsWith('>>')) {
                        const catName = tName.replace(/^>>\s*/, '');
                        let matched = false;
                        if (state.judgeCategories.includes(catName)) {
                            targets.push('judge-category:' + catName);
                            matched = true;
                        }
                        if (state.attackCategories.includes(catName)) {
                            targets.push('attack-category:' + catName);
                            matched = true;
                        }
                        if (!matched) throw `行${index + 1}: カテゴリ「${catName}」が見つかりません`;
                        return;
                    }
                    if (tName === 'なし') targets.push('none');
                    else if (tName === '') targets.push('none');
                    else if (tName === 'すべての判定') targets.push('all-judge');
                    else if (tName === 'すべての攻撃') targets.push('all-attack');
                    else {
                        const judge = state.judges.find(j => j.name === tName);
                        if (judge) targets.push('judge:' + tName);
                        else {
                            const attack = state.attacks.find(a => a.name === tName);
                            if (attack) targets.push('attack:' + tName);
                            else throw `行${index + 1}: 効果先「${tName}」が見つかりません`;
                        }
                    }
                });
                
                if (targets.length === 0) throw `行${index + 1}: 有効な効果先がありません`;

                return {
                    name,
                    memo,
                    showSimpleMemo: Boolean(memo),
                    effect,
                    targets,
                    turn,
                    originalTurn: turn,
                    color,
                    active: true,
                    category
                };
            },
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
            minParts: 2,
            messageKey: '判定パッケージ',
            parser: (parts, index, category) => {
                const name = parts[0];
                const roll = parts[1];
                if (!name || !roll) throw `行${index + 1}: 必須項目が不足しています`;
                return { name, roll, category };
            },
            afterAdd: () => {
                renderPackage('judge');
                updateJudgeCategorySelect();
                updateBuffTargetDropdown();
            }
        },
        'attack': {
            textId: 'bulkAddAttackText',
            areaId: 'bulkAddAttackArea',
            minParts: 2,
            messageKey: '攻撃パッケージ',
            parser: (parts, index, category) => {
                const name = parts[0];
                const roll = parts[1];
                if (!name || !roll) throw `行${index + 1}: 必須項目が不足しています`;
                return { name, roll, category };
            },
            afterAdd: () => {
                renderPackage('attack');
                updateAttackCategorySelect();
                updateBuffTargetDropdown();
            }
        }
    };
    
    const config = typeConfig[type];
    const targetArray = getCollection(type);
    if (!config || !targetArray) return;
    
    const text = document.getElementById(config.textId).value.trim();
    if (!text) {
        showToast(`追加する${config.messageKey}を入力してください`, 'error');
        return;
    }
    
    const lines = text.split('\n').filter(line => line.trim());
    let added = 0;
    let currentCategory = null;

    lines.forEach((line, index) => {
        const openMatch = line.match(/^<([^\/][^>]*)>$/);
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
            targetArray.push(item);
            added++;
        } catch (error) {
            showToast(`エラー: ${error}`, 'error');
        }
    });
    
    if (added > 0) {
        const textArea = document.getElementById(config.textId);
        if (textArea) textArea.value = '';

        config.afterAdd();
        saveData();
        showToast(`${added}件の${config.messageKey}を追加しました`, 'success');
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
                const isHidden = area.classList.contains('hidden') || area.style.display === 'none';
                if (isHidden) {
                    area.classList.remove('hidden');
                    area.style.display = 'block';
                    text?.focus();
                } else {
                    area.classList.add('hidden');
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
                area.classList.add('hidden');
                area.style.display = 'none';
            }
            if (text) text.value = '';
        });
    }
}

function toggleBuff(index) {
    if (index < 0 || index >= state.buffs.length) return;
    
    state.buffs[index].active = !state.buffs[index].active;
    if (state.buffs[index].active && state.buffs[index].turn === 0) {
        state.buffs[index].turn = state.buffs[index].originalTurn;
    }
    renderBuffs();
    updatePackageOutput('judge');
    updatePackageOutput('attack');
    saveData();
}

function removeBuff(index) {
    if (index < 0 || index >= state.buffs.length) return;
    
    state.buffs.splice(index, 1);
    renderBuffs();
    updatePackageOutput('judge');
    updatePackageOutput('attack');
    saveData();
}

function resetBuffsToMaxTurns() {
    let changed = false;

    state.buffs.forEach(buff => {
        if (typeof buff.originalTurn === 'number') {
            buff.turn = buff.originalTurn;
            buff.active = true;
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
    state.buffs.forEach(buff => {
        if (buff.active && buff.turn && buff.turn > 0) {
            buff.turn--;
            changed = true;
            if (buff.turn === 0) {
                buff.active = false;
            }
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
    const hasContent = (state.buffs.length + state.buffCategories.length) > 0;

    if (!hasContent) {
        list.innerHTML = '<div class="empty-message">バフを追加してください</div>';
        updateCategoryIndexDropdown('buff');
        return;
    }

    const sections = [];

    sections.push(`
        <details class="category-block uncategorized" data-category="none" open>
            <summary class="category-header" data-category="none">
                <span class="material-symbols-rounded" style="margin-right: 4px;">arrow_right</span>
            </summary>
            <div class="category-body" data-category="none">
                ${renderBuffItems(categoryMap['none'])}
            </div>
        </details>
    `);

    state.buffCategories.forEach(name => {
        sections.push(`
            <details class="category-block" open data-category="${escapeHtml(name)}">
                <summary class="category-header" data-category="${escapeHtml(name)}" draggable="true">
                    <span class="material-symbols-rounded" style="margin-right: 4px;">arrow_right</span><span style="word-break: break-all;">${escapeHtml(name)}</span>
                </summary>
                <div class="category-body" data-category="${escapeHtml(name)}">
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

    buffList.querySelectorAll('.category-header').forEach(header => {
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
    state.draggedIndex = index;
    state.draggedType = type;
    state.draggedCategory = null;

    if (type === 'buff') {
        const buff = state.buffs[index];
        state.draggedCategory = buff ? (buff.category || 'none') : null;
    }

    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    
    e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom');
    
    if (e.clientY < midY) {
        e.currentTarget.classList.add('drag-over-top');
    } else {
        e.currentTarget.classList.add('drag-over-bottom');
    }
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom');
}

function handleDrop(e, targetIndex, type) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom');

    if (state.draggedIndex === null || state.draggedType !== type || state.draggedIndex === targetIndex) {
        return;
    }

    const arr = getCollection(type);
    if (!arr) return;

    const draggedItem = arr[state.draggedIndex];
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

        if (state.draggedIndex < insertIndex) {
            insertIndex--;
        }
    }

    const item = arr.splice(state.draggedIndex, 1)[0];
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

    state.draggedCategoryType = type;
    state.draggedCategoryName = categoryName;

    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
}

function handleCategoryHeaderDragEnd(e) {
    document.querySelectorAll('.category-header.dragging')
        .forEach(header => header.classList.remove('dragging'));
    document.querySelectorAll('.category-header.category-drag-over')
        .forEach(header => header.classList.remove('category-drag-over'));
    state.draggedCategoryType = null;
    state.draggedCategoryName = null;
}

function handleCategoryDragOver(e, type) {
    const isItemDrag = state.draggedType === type;
    const isCategoryDrag = state.draggedCategoryType === type;
    if (!isItemDrag && !isCategoryDrag) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('category-drag-over');
}

function handleCategoryDragLeave(e) {
    e.currentTarget.classList.remove('category-drag-over');
}

function reorderCategory(type, targetCategory, dropAfter) {
    const categories = getCategories(type);
    if (!categories) return false;

    const from = categories.indexOf(state.draggedCategoryName);
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

    const isCategoryDrag = state.draggedCategoryType === type && state.draggedCategoryName;
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

    if (state.draggedType !== type || state.draggedIndex === null) {
        e.currentTarget.classList.remove('category-drag-over');
        return;
    }

    const targetCategory = categoryKey === 'none' ? null : categoryKey;

    const collection = getCollection(type);
    const item = collection ? collection[state.draggedIndex] : null;

    if (!collection || !item) {
        e.currentTarget.classList.remove('category-drag-over');
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

    state.draggedIndex = null;
    state.draggedType = null;
    state.draggedCategory = null;
    state.draggedCategoryType = null;
    state.draggedCategoryName = null;
    e.currentTarget.classList.remove('category-drag-over');
}

function handleCategoryBodyDragOver(e, type) {
    if (state.draggedType !== type) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('category-drag-over');
}

function handleCategoryBodyDragLeave(e) {
    e.currentTarget.classList.remove('category-drag-over');
}

function handleCategoryBodyDrop(e, type) {
    if (state.draggedType !== type || state.draggedIndex === null) return;

    e.preventDefault();
    e.stopPropagation();

    const categoryKey = e.currentTarget.getAttribute('data-category') || 'none';
    const targetCategory = categoryKey === 'none' ? null : categoryKey;
    const collection = getCollection(type);

    if (!collection || state.draggedIndex < 0 || state.draggedIndex >= collection.length) {
        e.currentTarget.classList.remove('category-drag-over');
        return;
    }

    const item = collection.splice(state.draggedIndex, 1)[0];
    item.category = targetCategory;

    const insertIndex = getCategoryInsertIndex(type, targetCategory);
    collection.splice(insertIndex, 0, item);

    renderPackage(type);
    updatePackageOutput('judge');
    updatePackageOutput('attack');
    saveData();

    state.draggedIndex = null;
    state.draggedType = null;
    state.draggedCategory = null;
    e.currentTarget.classList.remove('category-drag-over');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.category-header.category-drag-over')
        .forEach(header => header.classList.remove('category-drag-over'));
    document.querySelectorAll('.category-header.dragging')
        .forEach(header => header.classList.remove('dragging'));
    state.draggedIndex = null;
    state.draggedType = null;
    state.draggedCategory = null;
    state.draggedCategoryType = null;
    state.draggedCategoryName = null;
}

// ========================================
// 判定・攻撃パッケージ管理
// ========================================

function openJudgeModal(editIndex = null) {
    const modal = document.getElementById('judgeaddmodal');
    const modalTitle = modal.querySelector('.section-header-title');
    const addBtn = document.getElementById('addJudgeBtn');
    const bulkAddSection = document.getElementById('bulkAddJudgeArea').parentElement;

    updateJudgeCategorySelect();

    if (editIndex !== null) {
        // 編集モード
        state.editMode = { active: true, type: 'judge', index: editIndex };
        modalTitle.textContent = '判定パッケージ編集';
        addBtn.textContent = '更新';
        bulkAddSection.style.display = 'none';
        
        const judge = state.judges[editIndex];
        document.getElementById('judgeName').value = judge.name;
        document.getElementById('judgeRoll').value = judge.roll;

        const categorySelect = document.getElementById('judgeCategorySelect');
        if (categorySelect) {
            categorySelect.value = judge.category || 'none';
        }
    } else {
        // 追加モード
        state.editMode = { active: false, type: null, index: null };
        modalTitle.textContent = '判定パッケージ追加';
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
    const modalTitle = modal.querySelector('.section-header-title');
    const addBtn = document.getElementById('addAttackBtn');
    const bulkAddSection = document.getElementById('bulkAddAttackArea').parentElement;

    updateAttackCategorySelect();

    if (editIndex !== null) {
        // 編集モード
        state.editMode = { active: true, type: 'attack', index: editIndex };
        modalTitle.textContent = '攻撃パッケージ編集';
        addBtn.textContent = '更新';
        bulkAddSection.style.display = 'none';
        
        const attack = state.attacks[editIndex];
        document.getElementById('attackName').value = attack.name;
        document.getElementById('attackRoll').value = attack.roll;

        const categorySelect = document.getElementById('attackCategorySelect');
        if (categorySelect) {
            categorySelect.value = attack.category || 'none';
        }
    } else {
        // 追加モード
        state.editMode = { active: false, type: null, index: null };
        modalTitle.textContent = '攻撃パッケージ追加';
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
    
    if (state.editMode.active && state.editMode.type === 'judge') {
        // 編集モード
        const index = state.editMode.index;
        state.judges[index] = { name: name, roll: roll, category };
        showToast('判定を更新しました', 'success');
    } else {
        // 追加モード
        state.judges.push({ name: name, roll: roll, category });
    }
    
    resetJudgeForm();
    document.getElementById('judgeaddmodal').close();
    
    renderPackage('judge');
    updateBuffTargetDropdown();
    saveData();
}

function removeJudge(index) {
    if (index < 0 || index >= state.judges.length) return;
    
    state.judges.splice(index, 1);
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
    
    if (state.editMode.active && state.editMode.type === 'attack') {
        // 編集モード
        const index = state.editMode.index;
        state.attacks[index] = { name: name, roll: roll, category };
        showToast('攻撃を更新しました', 'success');
    } else {
        // 追加モード
        state.attacks.push({ name: name, roll: roll, category });
    }
    
    resetAttackForm();
    document.getElementById('attackaddmodal').close();
    
    renderPackage('attack');
    updateBuffTargetDropdown();
    saveData();
}

function removeAttack(index) {
    if (index < 0 || index >= state.attacks.length) return;
    
    state.attacks.splice(index, 1);
    renderPackage('attack');
    updateBuffTargetDropdown();
    updatePackageOutput('attack');
    saveData();
}

function selectPackage(index, type) {
    const array = getCollection(type);
    if (!array) return;
    if (index < 0 || index >= array.length) return;
    
    document.querySelectorAll(`[data-type="${type}"]`).forEach(el => el.classList.remove('selected'));
    const target = document.querySelector(`[data-type="${type}"][data-index="${index}"]`);
    if (target) target.classList.add('selected');
    updatePackageOutput(type, index);
}

function renderPackage(type) {
    const typeConfig = {
        'judge': {
            listId: 'judgeList',
            emptyMsg: '判定パッケージを追加してください'
        },
        'attack': {
            listId: 'attackList',
            emptyMsg: '攻撃パッケージを追加してください'
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
        list.innerHTML = `<div class="empty-message">${config.emptyMsg}</div>`;
        updateCategoryIndexDropdown(type);
        return;
    }

    const sections = [];

    sections.push(`
        <details class="category-block uncategorized" data-category="none" open>
            <summary class="category-header" data-category="none">
                <span class="material-symbols-rounded" style="margin-right: 4px;">arrow_right</span>
            </summary>
            <div class="category-body" data-category="none">
                ${renderPackageItems(type, categoryMap['none'])}
            </div>
        </details>
    `);

    categories.forEach(name => {
        sections.push(`
            <details class="category-block" open data-category="${escapeHtml(name)}">
                <summary class="category-header" data-category="${escapeHtml(name)}" draggable="true">
                    <span class="material-symbols-rounded" style="margin-right: 4px;">arrow_right</span><span style="word-break: break-all;">${escapeHtml(name)}</span>
                </summary>
                <div class="category-body" data-category="${escapeHtml(name)}">
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

    listElement.querySelectorAll('.category-header').forEach(header => {
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

    listElement.querySelectorAll('.category-body').forEach(body => {
        body.addEventListener('dragover', (e) => handleCategoryBodyDragOver(e, type));
        body.addEventListener('dragleave', handleCategoryBodyDragLeave);
        body.addEventListener('drop', (e) => handleCategoryBodyDrop(e, type));
    });
}

function updatePackageOutput(type, selectedIndex = null) {
    const array = getCollection(type);
    const outputId = type === 'judge' ? 'judgeOutput' : 'attackOutput';
    const emptyMsg = type === 'judge' ? '判定パッケージを選択してください' : '攻撃パッケージを選択してください';

    if (!array) return;

    if (selectedIndex === null) {
        const selected = document.querySelector(`[data-type="${type}"].selected`);
        if (!selected) {
            document.getElementById(outputId).textContent = emptyMsg;
            return;
        }
        selectedIndex = parseInt(selected.getAttribute('data-index'));
    }
    
    if (selectedIndex < 0 || selectedIndex >= array.length) return;

    const item = array[selectedIndex];
    let command = item.roll;

    const filterKey = type === 'judge' ? 'judge:' : 'attack:';
    const categoryKey = type === 'judge' ? 'judge-category:' : 'attack-category:';
    const itemCategory = item.category || null;
    const activeBuffs = state.buffs.filter(b =>
        b.active &&
        b.effect &&
        (b.targets.includes(type === 'judge' ? 'all-judge' : 'all-attack') ||
         b.targets.includes(filterKey + item.name) ||
         (itemCategory && b.targets.includes(categoryKey + itemCategory)))
    );
    
    const slotMap = {};
    const normalEffects = [];
    
    activeBuffs.forEach(buff => {
        const effects = buff.effect.split(',').map(e => e.trim());
        
        effects.forEach(effect => {
            const slotMatch = effect.match(/\/\/([^/]+)=(.+)/);
            
            if (slotMatch) {
                const slotName = slotMatch[1];
                const slotValue = slotMatch[2];
                
                if (!slotMap[slotName]) {
                    slotMap[slotName] = [];
                }
                slotMap[slotName].push(slotValue);
            } else if (effect) {
                normalEffects.push(effect);
            }
        });
    });
    
    command = command.replace(/\/\/([^/]+)\/\//g, (match, slotName) => {
        if (slotMap[slotName] && slotMap[slotName].length > 0) {
            return slotMap[slotName].join('');
        }
        return '';
    });
    
    normalEffects.forEach(effect => {
        command += effect;
    });
    
    if (type === 'judge') {
        const targetType = document.querySelector('input[name="targetType"]:checked')?.value || 'none';
        const targetValue = document.getElementById('targetValue').value.trim();
        
        if (targetType === 'gte' && targetValue) {
            command += `>=${targetValue}`;
        } else if (targetType === 'lte' && targetValue) {
            command += `=<${targetValue}`;
        }
    }
    command += ` ${item.name}`
    
    document.getElementById(outputId).textContent = command;
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

    macroState.dictionary.forEach(item => {
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
    dropdown.id = 'autocomplete-dropdown';
    dropdown.className = 'autocomplete-dropdown hidden';
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
    let dropdown = document.getElementById('autocomplete-dropdown');
    if (!dropdown) {
        console.log('Creating dropdown element');
        dropdown = document.createElement('div');
        dropdown.id = 'autocomplete-dropdown';
        dropdown.className = 'autocomplete-dropdown';
        // 入力欄の親要素に追加
        inputElement.parentElement.appendChild(dropdown);
        autocompleteState.dropdownElement = dropdown;
    }

    const rect = inputElement.getBoundingClientRect();

    // ドロップダウンのHTMLを生成
    const itemsHtml = suggestions.map((item, index) => `
        <div class="autocomplete-item" data-index="${index}" data-text="${escapeHtml(item.text)}">
            <span class="autocomplete-text">${escapeHtml(item.text)}</span>
            <span class="autocomplete-category">${escapeHtml(item.category)}</span>
        </div>
    `).join('');

    dropdown.innerHTML = itemsHtml;
    dropdown.classList.remove('hidden');
    autocompleteState.isOpen = true;

    // アイテムのクリックイベントを設定
    dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
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
        dropdown.classList.add('hidden');
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
        if (prevItem) prevItem.classList.remove('selected');
    }

    // 新しい選択項目にハイライトを追加
    autocompleteState.selectedIndex = index;
    const item = dropdown.querySelector(`[data-index="${index}"]`);
    if (item) {
        item.classList.add('selected');
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
            
            if (macroState.dictionary.length === 0) {
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
            const itemCount = dropdown.querySelectorAll('.autocomplete-item').length;

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
            const itemCount = dropdown.querySelectorAll('.autocomplete-item').length;

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
        buff.color || '#0079FF'
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
            button.classList.add('copied');
            setTimeout(() => {
                button.textContent = original;
                button.classList.remove('copied');
            }, 2000);
        }
        showToast('クリップボードにコピーしました', 'success');
    }).catch(() => {
        showToast('コピーに失敗しました', 'error');
    });
}

function copyToClipboard(elementId, button) {
    const text = document.getElementById(elementId)?.textContent;
    
    if (!text || text === '判定パッケージを選択してください' || text === '攻撃パッケージを選択してください') {
        showToast('パッケージを選択してください', 'error');
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        button.textContent = 'コピー済み!';
        button.classList.add('copied');
        setTimeout(() => {
            button.textContent = 'コピー';
            button.classList.remove('copied');
        }, 2000);
    }).catch(() => {
        showToast('コピーに失敗しました', 'error');
    });
}

// ========================================
// 初期化
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    setupSettingsMenu();

    document.querySelectorAll('.section-header').forEach(header => {
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
            state.editMode = { active: false, type: null, index: null };
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
            state.editMode = { active: false, type: null, index: null };
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
            state.editMode = { active: false, type: null, index: null };
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
    
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
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
