// ========================================
// アプリケーション状態
// ========================================
const state = {
    buffs: [],
    judges: [],
    attacks: [],
    macros: [],
    colorVariables: [],
    buffCategories: [],
    judgeCategories: [],
    attackCategories: [],
    draggedIndex: null,
    draggedType: null,
    draggedCategory: null,
    draggedCategoryType: null,
    draggedCategoryName: null,
    selectedBuffTargets: [],
    macroEditIndex: null,
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

function resolveColorValue(value) {
    if (typeof value !== 'string') return '#ff6b6b';
    const trimmed = value.trim();
    const colorVariable = state.colorVariables.find(v => v.name === trimmed);

    if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
        return trimmed;
    }

    if (colorVariable) {
        return colorVariable.code;
    }

    if (trimmed) {
        showToast('カラーコードが不正です。#RRGGBBまたは登録済みカラー変数名を指定してください', 'error');
    }
    return '#ff6b6b';
}

function resolveColorValueOrThrow(value, contextLabel = 'カラーコード') {
    if (typeof value !== 'string') {
        throw `${contextLabel}が空です`;
    }

    const trimmed = value.trim();
    const colorVariable = state.colorVariables.find(v => v.name === trimmed);

    if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
        return trimmed;
    }

    if (colorVariable) {
        return colorVariable.code;
    }

    throw `${contextLabel}が不正です。#RRGGBB または登録済みのカラー変数名を指定してください`;
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

function normalizeMacros(macros = []) {
    if (!Array.isArray(macros)) return [];
    return macros
        .map(m => {
            if (typeof m === 'string') {
                return { value: m, lastUsedAt: 0 };
            }
            const value = typeof m.value === 'string' ? m.value : (typeof m.key === 'string' ? m.key : '');
            const lastUsedAt = typeof m.lastUsedAt === 'number' ? m.lastUsedAt : 0;
            return { value, lastUsedAt };
        })
        .filter(m => m.value);
}

function normalizeColorVariables(vars = []) {
    if (!Array.isArray(vars)) return [];
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    return vars
        .map(v => ({
            name: typeof v.name === 'string' ? v.name.trim() : '',
            code: typeof v.code === 'string' && hexPattern.test(v.code.trim()) ? v.code.trim() : ''
        }))
        .filter(v => v.name && v.code);
}

function normalizeColorVariables(variables = []) {
    if (!Array.isArray(variables)) return [];
    return variables
        .map(v => ({
            name: typeof v.name === 'string' ? v.name : '',
            code: typeof v.code === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v.code) ? v.code.toUpperCase() : ''
        }))
        .filter(v => v.name && v.code);
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
            state.macros = normalizeMacros(Array.isArray(data.macros) ? data.macros : []);
            state.colorVariables = normalizeColorVariables(Array.isArray(data.colorVariables) ? data.colorVariables : []);
        } else {
            state.buffs = normalizeBuffs(getDefaultBuffs());
            state.judges = getDefaultJudges();
            state.attacks = getDefaultAttacks();
            state.macros = getDefaultMacros();
            state.colorVariables = getDefaultColorVariables();
        }
    } catch (e) {
        console.error('データの読み込みに失敗:', e);
        showToast('データの読み込みに失敗しました', 'error');
        state.buffs = normalizeBuffs(getDefaultBuffs());
        state.judges = getDefaultJudges();
        state.attacks = getDefaultAttacks();
        state.macros = getDefaultMacros();
        state.colorVariables = getDefaultColorVariables();
    }

    migrateLegacyMacroReferences();

    updateBuffCategorySelect();
    updateJudgeCategorySelect();
    updateAttackCategorySelect();
    renderBuffs();
    renderPackage('judge');
    renderPackage('attack');
    updateBuffTargetDropdown();
    renderMacroList();
    renderColorVariableList();
    updateColorVariableSelect();
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

function getDefaultMacros() {
    return normalizeMacros(['//=']);
}

function getDefaultColorVariables() {
    return [];
}

function saveData() {
    const data = {
        buffs: state.buffs,
        buffCategories: state.buffCategories,
        judges: state.judges,
        judgeCategories: state.judgeCategories,
        attacks: state.attacks,
        attackCategories: state.attackCategories,
        macros: state.macros,
        colorVariables: state.colorVariables
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
        attackCategories: state.attackCategories,
        macros: state.macros,
        colorVariables: state.colorVariables
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
        state.macros = normalizeMacros(data.macros || []);
        state.colorVariables = normalizeColorVariables(data.colorVariables || []);

        updateBuffCategorySelect();
        updateJudgeCategorySelect();
        updateAttackCategorySelect();
        renderBuffs();
        renderPackage('judge');
        renderPackage('attack');
        updateBuffTargetDropdown();
        renderMacroList();
        renderColorVariableList();
        updateColorVariableSelectors();
        saveData();
        
        document.getElementById('importText').value = '';
        
        showToast('データを読み込みました', 'success');
    } catch (e) {
        showToast('JSONの解析に失敗しました: ' + e.message, 'error');
    }
}

// ========================================
// マクロ管理
// ========================================

function renderMacroList() {
    const list = document.getElementById('macroList');
    if (!list) return;

    if (!state.macros.length) {
        list.innerHTML = '<div class="empty-message">マクロが登録されていません</div>';
        return;
    }

    list.innerHTML = state.macros.map((macroValue, index) => {
        const isColor = /^#[0-9A-Fa-f]{6}$/.test(macroValue.trim());
        const colorBadge = isColor ? `<span style="background:${escapeHtml(macroValue)}; border:1px solid var(--secondary-color-2); width:18px; height:18px; border-radius:4px; display:inline-block;"></span>` : '';
        return `
            <div class="item" data-macro-index="${index}" style="display:flex; align-items:center; gap:12px; justify-content:space-between;">
                <div class="item-param" data-edit-macro="${index}" style="cursor: pointer;">
                    <div class="item-name">${escapeHtml(macro.value)}</div>
                </div>
                <div class="row-controls" style="gap: 6px; align-items:center;">
                    ${colorBadge}
                    <button class="material-symbols-rounded add-btn btn--danger" data-remove-macro="${index}" title="削除">delete</button>
                </div>
            </div>
        `;
    }).join('');

    list.querySelectorAll('[data-remove-macro]').forEach(btn => {
        const idx = parseInt(btn.dataset.removeMacro);
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeMacro(idx);
        });
    });

    list.querySelectorAll('[data-edit-macro]').forEach(area => {
        const idx = parseInt(area.dataset.editMacro);
        area.addEventListener('click', () => {
            const macro = state.macros[idx];
            if (!macro) return;
            const valueInput = document.getElementById('macroValue');
            if (!valueInput) return;
            valueInput.value = macro.value;
            valueInput.dataset.editingIndex = idx;
        });
    });
}

function addMacro() {
    const valueInput = document.getElementById('macroValue');
    if (!valueInput) return;

    const value = valueInput.value.trim();

    if (!value) {
        showToast('オートコンプリート用文字列を入力してください', 'error');
        return;
    }

    const editingIndex = parseInt(valueInput.dataset.editingIndex ?? '-1');
    if (!isNaN(editingIndex) && editingIndex >= 0 && state.macros[editingIndex]) {
        state.macros[editingIndex] = { ...state.macros[editingIndex], value };
        showToast('マクロを更新しました', 'success');
    } else {
        const duplicateIndex = state.macros.findIndex(m => m.value === value);
        if (duplicateIndex >= 0) {
            state.macros[duplicateIndex] = { ...state.macros[duplicateIndex], value };
            showToast('既存のマクロを更新しました', 'success');
        } else {
            state.macros.push({ value, lastUsedAt: 0 });
            showToast('マクロを追加しました', 'success');
        }
    }

    resetMacroInputs();
    renderMacroList();
    saveData();
}

function removeMacro(index) {
    if (index < 0 || index >= state.macros.length) return;
    const removed = state.macros[index];
    state.macros.splice(index, 1);
    resetMacroInputs();
    renderMacroList();
    saveData();
}

function resetMacroInputs() {
    const input = document.getElementById('macroValue');
    if (!input) return;
    input.value = '';
    delete input.dataset.editingIndex;
}

// ========================================
// カラー変数
// ========================================

function renderColorVariableList() {
    const list = document.getElementById('colorVariableList');
    if (!list) return;

    if (!state.colorVariables.length) {
        list.innerHTML = '<div class="empty-message">カラー変数が登録されていません</div>';
        return;
    }

    list.innerHTML = state.colorVariables.map((variable, index) => `
        <div class="item" data-color-index="${index}" style="display:flex; align-items:center; gap:12px; justify-content:space-between;">
            <div class="item-param" data-edit-color="${index}" style="cursor:pointer; display:flex; gap:8px; align-items:center;">
                <span style="background:${escapeHtml(variable.code)}; border:1px solid var(--secondary-color-2); width:18px; height:18px; border-radius:4px; display:inline-block;"></span>
                <div>
                    <div class="item-name">${escapeHtml(variable.name)}</div>
                    <div class="item-detail">${escapeHtml(variable.code)}</div>
                </div>
            </div>
            <button class="material-symbols-rounded add-btn btn--danger" data-remove-color="${index}" title="削除">delete</button>
        </div>
    `).join('');

    list.querySelectorAll('[data-edit-color]').forEach(area => {
        const idx = parseInt(area.dataset.editColor);
        area.addEventListener('click', () => {
            const variable = state.colorVariables[idx];
            if (!variable) return;
            const nameInput = document.getElementById('colorVariableName');
            const codeInput = document.getElementById('colorVariableCode');
            if (!nameInput || !codeInput) return;
            nameInput.value = variable.name;
            nameInput.dataset.editingIndex = idx;
            codeInput.value = variable.code;
        });
    });

    list.querySelectorAll('[data-remove-color]').forEach(btn => {
        const idx = parseInt(btn.dataset.removeColor);
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeColorVariable(idx);
        });
    });
}

function addColorVariable() {
    const nameInput = document.getElementById('colorVariableName');
    const codeInput = document.getElementById('colorVariableCode');
    if (!nameInput || !codeInput) return;

    const name = nameInput.value.trim();
    const code = codeInput.value.trim();
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;

    if (!name || !code) {
        showToast('カラー変数名とカラーコードを入力してください', 'error');
        return;
    }

    if (!hexPattern.test(code)) {
        showToast('#RRGGBB形式でカラーコードを入力してください', 'error');
        return;
    }

    const editingIndex = parseInt(nameInput.dataset.editingIndex ?? '-1');
    if (!isNaN(editingIndex) && editingIndex >= 0 && state.colorVariables[editingIndex]) {
        state.colorVariables[editingIndex] = { name, code };
        showToast('カラー変数を更新しました', 'success');
    } else {
        const duplicateIndex = state.colorVariables.findIndex(v => v.name === name);
        if (duplicateIndex >= 0) {
            state.colorVariables[duplicateIndex] = { name, code };
            showToast('同名のカラー変数を更新しました', 'success');
        } else {
            state.colorVariables.push({ name, code });
            showToast('カラー変数を追加しました', 'success');
        }
    }

    updateColorVariableSelect();
    renderColorVariableList();
    resetColorVariableInputs();
    saveData();
}

function removeColorVariable(index) {
    if (index < 0 || index >= state.colorVariables.length) return;
    state.colorVariables.splice(index, 1);
    resetColorVariableInputs();
    updateColorVariableSelect();
    renderColorVariableList();
    saveData();
}

function resetColorVariableInputs() {
    const nameInput = document.getElementById('colorVariableName');
    const codeInput = document.getElementById('colorVariableCode');
    if (nameInput) {
        nameInput.value = '';
        delete nameInput.dataset.editingIndex;
    }
    if (codeInput) {
        codeInput.value = '';
    }
}

function updateColorVariableSelect() {
    const select = document.getElementById('buffColorVariableSelect');
    if (!select) return;

    const options = ['<option value="">未選択</option>'];
    state.colorVariables.forEach(variable => {
        options.push(`<option value="${escapeHtml(variable.name)}">${escapeHtml(variable.name)}</option>`);
    });
    select.innerHTML = options.join('');
}

function applyColorVariableSelection(event) {
    const name = event.target.value;
    if (!name) return;
    const variable = state.colorVariables.find(v => v.name === name);
    if (!variable) return;
    const colorInput = document.getElementById('buffColor');
    if (colorInput) {
        colorInput.value = variable.code;
    }
}

// ========================================
// カラー変数管理
// ========================================

function renderColorVariableList() {
    const list = document.getElementById('colorVariableList');
    if (!list) return;

    if (!state.colorVariables.length) {
        list.innerHTML = '<div class="empty-message">カラー変数が登録されていません</div>';
        return;
    }

    list.innerHTML = state.colorVariables.map((variable, index) => `
        <div class="item" data-color-variable-index="${index}" style="display:flex; align-items:center; gap:12px; justify-content:space-between;">
            <div class="item-param" data-edit-color-variable="${index}" style="cursor: pointer;">
                <div class="item-name">${escapeHtml(variable.name)}</div>
                <div class="item-detail" style="display:flex; align-items:center; gap:8px;">
                    <span style="background:${escapeHtml(variable.code)}; border:1px solid var(--secondary-color-2); width:18px; height:18px; border-radius:4px; display:inline-block;"></span>
                    <span>${escapeHtml(variable.code)}</span>
                </div>
            </div>
            <div class="item-controls">
                <button class="material-symbols-rounded add-btn btn--danger" data-remove-color-variable="${index}" title="削除">delete</button>
            </div>
        </div>
    `).join('');

    list.querySelectorAll('[data-remove-color-variable]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.removeColorVariable);
            removeColorVariable(idx);
        });
    });

    list.querySelectorAll('[data-edit-color-variable]').forEach(area => {
        area.addEventListener('click', () => {
            const idx = parseInt(area.dataset.editColorVariable);
            const variable = state.colorVariables[idx];
            if (!variable) return;
            document.getElementById('colorVariableName').value = variable.name;
            document.getElementById('colorVariableCode').value = variable.code;
        });
    });
}

function addColorVariable() {
    const name = document.getElementById('colorVariableName').value.trim();
    const codeInput = document.getElementById('colorVariableCode').value.trim();

    if (!name || !codeInput) {
        showToast('カラー変数名とカラーコードを入力してください', 'error');
        return;
    }

    if (!/^#[0-9A-Fa-f]{6}$/.test(codeInput)) {
        showToast('カラーコードは#RRGGBB形式で入力してください', 'error');
        return;
    }

    const existingIndex = state.colorVariables.findIndex(v => v.name === name);
    const variable = { name, code: codeInput.toUpperCase() };

    if (existingIndex >= 0) {
        state.colorVariables[existingIndex] = variable;
        showToast('カラー変数を更新しました', 'success');
    } else {
        state.colorVariables.push(variable);
        showToast('カラー変数を追加しました', 'success');
    }

    resetColorVariableInputs();
    renderColorVariableList();
    updateColorVariableSelectors();
    saveData();
}

function removeColorVariable(index) {
    if (index < 0 || index >= state.colorVariables.length) return;
    state.colorVariables.splice(index, 1);
    renderColorVariableList();
    updateColorVariableSelectors();
    saveData();
}

function resetColorVariableInputs() {
    document.getElementById('colorVariableName').value = '';
    document.getElementById('colorVariableCode').value = '';
}

function updateColorVariableSelectors() {
    const options = ['<option value="">カラー変数を選択</option>', ...state.colorVariables.map(v => `<option value="${escapeHtml(v.name)}">${escapeHtml(v.name)} (${escapeHtml(v.code)})</option>`)];
    document.querySelectorAll('[data-color-variable-select]').forEach(select => {
        const current = select.value;
        select.innerHTML = options.join('');
        if (state.colorVariables.some(v => v.name === current)) {
            select.value = current;
        } else {
            select.value = '';
        }
    });
}

function attachColorVariableSelector(selectId, inputId) {
    const select = document.getElementById(selectId);
    const input = document.getElementById(inputId);
    if (!select || !input) return;
    select.dataset.colorVariableSelect = 'true';
    select.addEventListener('change', () => {
        const selectedName = select.value;
        const variable = state.colorVariables.find(v => v.name === selectedName);
        if (variable) {
            input.value = variable.code;
        }
    });
}

// ========================================
// マクロ補完UI
// ========================================

const macroSuggestionState = { target: null, activeIndex: 0, items: [] };
let macroSuggestionBox = null;

function getMacroSuggestionBox() {
    if (macroSuggestionBox) return macroSuggestionBox;
    macroSuggestionBox = document.createElement('div');
    macroSuggestionBox.id = 'macroSuggestions';
    macroSuggestionBox.className = 'macro-suggestions hidden';
    document.body.appendChild(macroSuggestionBox);
    return macroSuggestionBox;
}

function hideMacroSuggestions() {
    if (!macroSuggestionBox) return;
    macroSuggestionBox.classList.add('hidden');
    macroSuggestionState.target = null;
    macroSuggestionState.items = [];
}

function moveMacroSelection(delta) {
    if (!macroSuggestionBox || macroSuggestionBox.classList.contains('hidden')) return;
    const items = macroSuggestionBox.querySelectorAll('.macro-suggestion-item');
    if (!items.length) return;

    macroSuggestionState.activeIndex = (macroSuggestionState.activeIndex + delta + items.length) % items.length;
    items.forEach((el, idx) => {
        el.classList.toggle('active', idx === macroSuggestionState.activeIndex);
    });
}

function highlightMatch(text, query) {
    if (!query) return escapeHtml(text);
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) return escapeHtml(text);

    const before = escapeHtml(text.slice(0, index));
    const match = escapeHtml(text.slice(index, index + query.length));
    const after = escapeHtml(text.slice(index + query.length));
    return `${before}<strong>${match}</strong>${after}`;
}

function getRecentMacros(limit = 3) {
    const sorted = [...state.macros]
        .sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
        .filter(m => m.lastUsedAt);
    if (sorted.length) return sorted.slice(0, limit);
    return [...state.macros].slice(0, limit);
}

function getMatchingMacros(query) {
    const lower = query.toLowerCase();
    return state.macros
        .filter(m => m.value.toLowerCase().includes(lower))
        .sort((a, b) => {
            const aIndex = a.value.toLowerCase().indexOf(lower);
            const bIndex = b.value.toLowerCase().indexOf(lower);
            if (aIndex !== bIndex) return aIndex - bIndex;
            return (b.lastUsedAt || 0) - (a.lastUsedAt || 0);
        });
}

function applyMacroSuggestion(index) {
    const target = macroSuggestionState.target;
    if (!target) return;
    const macro = macroSuggestionState.items[index];
    if (!macro) return;

    target.value = macro.value;
    const pos = macro.value.length;
    target.setSelectionRange(pos, pos);

    const stateMacro = state.macros.find(m => m.value === macro.value);
    if (stateMacro) {
        stateMacro.lastUsedAt = Date.now();
        saveData();
    }

    hideMacroSuggestions();
}

function showMacroSuggestions(target, query = '') {
    const box = getMacroSuggestionBox();
    box.innerHTML = '';

    if (!state.macros.length) {
        hideMacroSuggestions();
        return;
    }

    const trimmed = query.trim();
    const items = trimmed ? getMatchingMacros(trimmed) : getRecentMacros();

    if (!items.length) {
        hideMacroSuggestions();
        return;
    }

    macroSuggestionState.items = items;
    box.innerHTML = items.map((macro, index) => `
        <button class="macro-suggestion-item ${index === 0 ? 'active' : ''}" data-macro-index="${index}" type="button">
            <span>${highlightMatch(macro.value, trimmed)}</span>
        </button>
    `).join('');

    box.querySelectorAll('[data-macro-index]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            applyMacroSuggestion(parseInt(btn.dataset.macroIndex));
        });
    });

    macroSuggestionState.target = target;
    macroSuggestionState.activeIndex = 0;
    const rect = target.getBoundingClientRect();
    box.style.left = `${rect.left + window.scrollX}px`;
    box.style.top = `${rect.bottom + window.scrollY + 4}px`;
    box.classList.remove('hidden');
}

function handleMacroKeydown(event) {
    if (!macroSuggestionBox || macroSuggestionBox.classList.contains('hidden')) return;

    if (['ArrowDown', 'Tab'].includes(event.key)) {
        event.preventDefault();
        moveMacroSelection(1);
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveMacroSelection(-1);
    } else if (event.key === 'Enter') {
        event.preventDefault();
        applyMacroSuggestion(macroSuggestionState.activeIndex);
    } else if (event.key === 'Escape') {
        hideMacroSuggestions();
    }
}

function handleMacroInput(event) {
    const target = event.target;
    showMacroSuggestions(target, target.value);
}

function handleMacroFocus(event) {
    const target = event.target;
    showMacroSuggestions(target, target.value);
}

function attachMacroSuggestions(input) {
    if (!input) return;
    input.addEventListener('focus', handleMacroFocus);
    input.addEventListener('input', handleMacroInput);
    input.addEventListener('keydown', handleMacroKeydown);
    input.addEventListener('blur', () => setTimeout(hideMacroSuggestions, 150));
}

function setupMacroSuggestions() {
    attachMacroSuggestions(document.getElementById('buffEffect'));
    attachMacroSuggestions(document.getElementById('judgeRoll'));
    attachMacroSuggestions(document.getElementById('attackRoll'));
    attachMacroSuggestions(document.getElementById('macroValue'));

    document.addEventListener('click', (e) => {
        if (macroSuggestionBox && !macroSuggestionBox.contains(e.target)) {
            hideMacroSuggestions();
        }
    });
}

/**
 * ファイルドロップ機能の初期化
 */
function initFileDropZone() {
    const dropZone = document.getElementById('importText');
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
        
        // 最初のファイルのみ処理
        const file = files[0];
        
        // ファイル拡張子チェック
        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.txt') && !fileName.endsWith('.json')) {
            showToast('.txtまたは.jsonファイルのみ対応しています', 'error');
            return;
        }
        
        // FileReader APIでファイルを読み込む
        const reader = new FileReader();
        
        // 読み込み完了時の処理
        reader.onload = (event) => {
            const content = event.target.result;
            dropZone.value = content;
            showToast(`${file.name} を読み込みました`, 'success');
        };
        
        // 読み込みエラー時の処理
        reader.onerror = () => {
            showToast('ファイルの読み込みに失敗しました', 'error');
        };
        
        // テキストとして読み込み開始
        reader.readAsText(file);
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

    const name = input.value.trim();
    if (!name) {
        showToast('カテゴリ名を入力してください', 'error');
        return;
    }

    if (categories.includes(name)) {
        showToast('同名のカテゴリが既に存在します', 'error');
        return;
    }

    categories.push(name);
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
    attack: { selectId: 'attackItemIndex', listId: 'attackList' }
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
        const colorSelect = document.getElementById('buffColorVariableSelect');
        if (colorSelect) {
            const matchedVariable = state.colorVariables.find(v => v.code === buff.color);
            colorSelect.value = matchedVariable ? matchedVariable.name : '';
        }
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
    document.getElementById('buffColor').value = '#0079FF';
    const colorSelect = document.getElementById('buffColorVariableSelect');
    if (colorSelect) colorSelect.value = '';
    document.getElementById('buffCategorySelect').value = 'none';
    document.getElementById('buffMemo').value = '';
    document.getElementById('buffSimpleMemoToggle').checked = false;
    state.selectedBuffTargets = [];
    updateBuffTargetDropdown();
}

function addBuff() {
    const name = document.getElementById('buffName').value.trim();
    const effect = document.getElementById('buffEffect').value.trim();
    const targets = [...state.selectedBuffTargets];
    const turn = document.getElementById('buffTurn').value.trim();
    const color = validateColor(resolveColorValue(document.getElementById('buffColor').value));
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
                const isColorToken = (token) => colorPattern.test(token) || state.colorVariables.some(v => v.name === token);
                const colorIndex = parts.findIndex((part, idx) => idx >= 2 && isColorToken(part));
                const colorToken = colorIndex >= 0 ? (parts[colorIndex] || '#0079FF') : (parts[4] || '#0079FF');
                const memoAfterColor = (colorIndex >= 0 && colorIndex + 1 < parts.length) ? (parts[colorIndex + 1] || '') : '';
                const color = validateColor(resolveColorValueOrThrow(colorToken, `行${index + 1}のカラーコード`));

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
    setupMacroSuggestions();
    attachColorVariableSelector('buffColorVariableSelect', 'buffColor');

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
    document.getElementById('userMacroClose')?.addEventListener('click', () => {
        document.getElementById('userMacroModal')?.close();
    });
    document.getElementById('addMacroBtn')?.addEventListener('click', addMacro);
    document.getElementById('clearMacroInputs')?.addEventListener('click', resetMacroInputs);
    document.getElementById('addColorVariableBtn')?.addEventListener('click', addColorVariable);
    document.getElementById('clearColorVariableInputs')?.addEventListener('click', resetColorVariableInputs);
    document.getElementById('buffColorVariableSelect')?.addEventListener('change', applyColorVariableSelection);

    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            if (targetId) copyToClipboard(targetId, this);
        });
    });
    
    initMultiSelect();
    initFileDropZone();
    loadUIState();
    loadData();
});

// グローバルスコープに公開
window.openBuffModal = openBuffModal;
window.openJudgeModal = openJudgeModal;
window.openAttackModal = openAttackModal;
