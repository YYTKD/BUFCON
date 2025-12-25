// ========================================
// アプリケーション状態
// ========================================
const state = {
    stats: [],
    buffs: [],
    judges: [],
    attacks: [],
    buffCategories: [],
    judgeCategories: [],
    attackCategories: [],
    draggedIndex: null,
    draggedType: null,
    draggedCategory: null,
    selectedBuffTargets: [],
    editMode: {
        active: false,
        type: null,
        index: null
    }
};

function getCollection(type) {
    if (type === 'stat') return state.stats;
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

function getCategories(type) {
    if (type === 'buff') return state.buffCategories;
    if (type === 'judge') return state.judgeCategories;
    if (type === 'attack') return state.attackCategories;
    return null;
}

const itemIndexConfig = {
    buff: { selectId: 'buffItemIndex', listId: 'buffList' },
    judge: { selectId: 'judgeItemIndex', listId: 'judgeList' },
    attack: { selectId: 'attackItemIndex', listId: 'attackList' }
};

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
    const top = activeModal ? '40px' : '80px';

    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: ${top};
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'error' ? '#ff6b6b' : type === 'success' ? '#51cf66' : '#4dabf7'};
        color: white;
        border-radius: 6px;
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

function loadData() {
    try {
        const saved = localStorage.getItem('trpgData');
        if (saved) {
            const data = JSON.parse(saved);
            state.stats = Array.isArray(data.stats) ? data.stats : [];
            state.buffs = Array.isArray(data.buffs) ? data.buffs : [];
            state.buffCategories = Array.isArray(data.buffCategories) ? data.buffCategories : [];
            state.judges = Array.isArray(data.judges) ? data.judges : getDefaultJudges();
            state.judgeCategories = Array.isArray(data.judgeCategories) ? data.judgeCategories : [];
            state.attacks = Array.isArray(data.attacks) ? data.attacks : getDefaultAttacks();
            state.attackCategories = Array.isArray(data.attackCategories) ? data.attackCategories : [];
        } else {
            state.judges = getDefaultJudges();
            state.attacks = getDefaultAttacks();
        }
    } catch (e) {
        console.error('データの読み込みに失敗:', e);
        showToast('データの読み込みに失敗しました', 'error');
        state.judges = getDefaultJudges();
        state.attacks = getDefaultAttacks();
    }

    updateBuffCategorySelect();
    updateJudgeCategorySelect();
    updateAttackCategorySelect();
    renderStats();
    renderBuffs();
    renderPackage('judge');
    renderPackage('attack');
    updateStatSelects();
    updateBuffTargetDropdown();
}

function getDefaultJudges() {
    return [
        { name: '命中(武器A)　SAMPLE', roll: '1d20', stat: '' },
        { name: '回避　SAMPLE', roll: '1d20', stat: '' }
    ];
}

function getDefaultAttacks() {
    return [
        { name: '武器A　SAMPLE', roll: '2d6', stat: '' }
    ];
}

function saveData() {
    const data = {
        stats: state.stats,
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
        location.reload();
    } catch (e) {
        showToast('初期化に失敗しました', 'error');
    }
}

function exportData() {
    const data = {
        stats: state.stats,
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
        
        if (!data.stats || !data.buffs || !data.judges || !data.attacks) {
            throw new Error('無効なデータ形式です');
        }

        state.stats = data.stats || [];
        state.buffs = data.buffs || [];
        state.buffCategories = data.buffCategories || [];
        state.judges = data.judges || [];
        state.judgeCategories = data.judgeCategories || [];
        state.attacks = data.attacks || [];
        state.attackCategories = data.attackCategories || [];

        updateBuffCategorySelect();
        updateJudgeCategorySelect();
        updateAttackCategorySelect();
        renderStats();
        renderBuffs();
        renderPackage('judge');
        renderPackage('attack');
        updateStatSelects();
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
// ステータス管理
// ========================================

function addStat() {
    const input = document.getElementById('statName').value.trim();
    
    if (!input) {
        showToast('ステータス名を入力してください', 'error');
        return;
    }
    
    // カンマ区切りで分割して複数追加
    const names = input.split(',').map(n => n.trim()).filter(n => n);
    
    if (names.length === 0) {
        showToast('ステータス名を入力してください', 'error');
        return;
    }
    
    // 重複チェック
    const existingNames = state.stats.map(s => s.name);
    const duplicates = names.filter(n => existingNames.includes(n));
    
    if (duplicates.length > 0) {
        showToast(`既に存在するステータス: ${duplicates.join(', ')}`, 'error');
        return;
    }
    
    // 追加
    names.forEach(name => {
        state.stats.push({ name: name });
    });
    
    document.getElementById('statName').value = '';
    
    renderStats();
    updateStatSelects();
    updateBuffTargetDropdown();
    saveData();
    
    if (names.length > 1) {
        showToast(`${names.length}個のステータスを追加しました`, 'success');
    }
}

function removeStat(index) {
    state.stats.splice(index, 1);
    renderStats();
    updateStatSelects();
    saveData();
}

function renderStats() {
    const list = document.getElementById('statList');
    
    if (state.stats.length === 0) {
        list.innerHTML = '<div class="empty-message">ステータスを追加してください</div>';
        return;
    }
    
    list.innerHTML = state.stats.map((stat, i) => `
        <div class="stat-tag">
            ${escapeHtml(stat.name)}
            <button onclick="removeStat(${i})">×</button>
        </div>
    `).join('');
}

function updateStatSelects() {
    const judgeSelect = document.getElementById('judgeStat');
    const attackSelect = document.getElementById('attackStat');
    
    const options = '<option value="none">なし</option>' + 
        state.stats.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join('');
    
    judgeSelect.innerHTML = options;
    attackSelect.innerHTML = options;
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
        const tooltipText = '効果先: ' + targetTexts.join(', ');
        const turnDisplay = item.turn ? `<span class="turn-badge" style="outline:2px solid ${item.color};"><span>${item.turn}</span></span>` : '';

        return `
            <div class="item buff-item draggable ${item.active ? 'active' : ''}"
                 style="background-color: ${bgColor}; color: ${textColor}; anchor-name: --no${index};"
                 draggable="true"
                 data-index="${index}" data-type="buff" data-item-index="${index}" data-category="${escapeHtml(item.category || 'none')}">
                <div class="tooltip" style="--target: --no${index};">${escapeHtml(tooltipText)}</div>
                <span class="material-symbols-rounded" style="position: relative; left: -8px; width: var(--spacing-m); opacity:0.6;">drag_indicator</span>
                <span class="item-param">
                    <span class="item-name">${escapeHtml(item.name)}</span>
                    ${item.description ? `<span class="item-description">${escapeHtml(item.description)}</span>` : ''}
                    ${item.effect ? `<span class="item-effect">${escapeHtml(item.effect)}</span>` : ''}
                    ${turnDisplay}
                </span>
                <span class="buff-btn">
                    <button class="toggle-btn ${item.active ? 'active' : ''}" data-toggle="${index}" data-toggle-type="buff"></button>
                </span>
            </div>
        `;
    }).join('');
}

function renderPackageItems(type, entries = []) {
    if (!Array.isArray(entries) || entries.length === 0) return '';

    return entries.map(({ item, index }) => `
        <div class="item clickable draggable" data-index="${index}" data-type="${type}" data-category="${escapeHtml(item.category || 'none')}" draggable="true">
            <span class="material-symbols-rounded" style="position: relative; left: -8px; width: var(--spacing-m); opacity: 0.6;">drag_indicator</span>
            <span class="item-param">
                <span class="item-name">${escapeHtml(item.name)}</span>
                <span class="item-detail">${escapeHtml(item.roll)}</span>
                <span class="item-detail">+${item.stat ? escapeHtml(item.stat) : 'なし'}</span>
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

function getItemIndexSelector(categoryKey) {
    const escaped = (typeof CSS !== 'undefined' && CSS.escape)
        ? CSS.escape(categoryKey)
        : categoryKey.replace(/"/g, '\\"');
    return `[data-category="${escaped}"]`;
}

function updateItemIndexOptions(type) {
    const config = itemIndexConfig[type];
    if (!config) return;

    const select = document.getElementById(config.selectId);
    if (!select) return;

    const prev = select.value;
    const categories = Array.isArray(getCategories(type)) ? [...getCategories(type)] : [];
    const categoryMap = buildCategoryMap(type);

    Object.keys(categoryMap).forEach(key => {
        if (key !== 'none' && !categories.includes(key)) {
            categories.push(key);
        }
    });

    const options = ['<option value="">カテゴリを選択</option>'];

    if (categoryMap['none']) {
        options.push('<option value="none">未分類</option>');
    }

    categories.forEach(name => {
function updateJudgeCategorySelect() {
    const select = document.getElementById('judgeCategorySelect');
    if (!select) return;

    const options = ['<option value="none">なし</option>'];
    state.judgeCategories.forEach(name => {
        options.push(`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`);
    });

    select.innerHTML = options.join('');
    if ([...select.options].some(opt => opt.value === prev)) {
        select.value = prev;
    }
}

function jumpToCategory(type, categoryKey) {
    if (!categoryKey) return;

    const config = itemIndexConfig[type];
    if (!config) return;

    const list = document.getElementById(config.listId);
    if (!list) return;

    const selector = getItemIndexSelector(categoryKey);
    const target = list.querySelector(selector);

    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function initItemIndex(type) {
    const config = itemIndexConfig[type];
    if (!config) return;

    const select = document.getElementById(config.selectId);
    if (!select) return;

    select.addEventListener('change', (event) => {
        jumpToCategory(type, event.target.value);
    });

    updateItemIndexOptions(type);
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
        document.getElementById('buffDescription').value = buff.description || '';
        document.getElementById('buffEffect').value = buff.effect || '';
        document.getElementById('buffTurn').value = buff.originalTurn || '';
        document.getElementById('buffColor').value = buff.color;
        document.getElementById('buffCategorySelect').value = buff.category || 'none';
        
        // 効果先の選択状態を復元
        state.selectedBuffTargets = [...buff.targets];
        updateBuffTargetDropdown();
    } else {
        // 追加モード
        state.editMode = { active: false, type: null, index: null };
        modalTitle.textContent = 'バフ追加';
        addBtn.textContent = '✚';
        bulkAddSection.style.display = 'block';
        resetBuffForm();
    }
    
    modal.showModal();
}

function resetBuffForm() {
    document.getElementById('buffName').value = '';
    document.getElementById('buffDescription').value = '';
    document.getElementById('buffEffect').value = '';
    document.getElementById('buffTurn').value = '';
    document.getElementById('buffColor').value = '#0079FF';
    document.getElementById('buffCategorySelect').value = 'none';
    state.selectedBuffTargets = [];
    updateBuffTargetDropdown();
}

function addBuff() {
    const name = document.getElementById('buffName').value.trim();
    const description = document.getElementById('buffDescription').value.trim();
    const effect = document.getElementById('buffEffect').value.trim();
    const targets = [...state.selectedBuffTargets];
    const turn = document.getElementById('buffTurn').value.trim();
    const color = validateColor(document.getElementById('buffColor').value);
    const categorySelect = document.getElementById('buffCategorySelect');
    const category = categorySelect ? (categorySelect.value === 'none' ? null : categorySelect.value) : null;
    
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
            description: description,
            effect: effect,
            targets: targets,
            turn: turn ? parseInt(turn) : oldTurn,
            originalTurn: turn ? parseInt(turn) : oldOriginalTurn,
            color: color,
            category: category,
            active: state.buffs[index].active
        };
        
        showToast('バフを更新しました', 'success');
    } else {
        // 追加モード:
        state.buffs.push({
            name: name,
            description: description,
            effect: effect,
            targets: targets,
            turn: turn ? parseInt(turn) : null,
            originalTurn: turn ? parseInt(turn) : null,
            color: color,
            category: category,
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
                const description = parts[2] || '';
                const effect = parts[3] || '';
                const turn = parts[4] ? parseInt(parts[4]) : null;
                const color = validateColor(parts[5] || '#0079FF');
                
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
                    name, description, effect, targets, turn, originalTurn: turn,
                    color, active: true, category
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
                const stat = parts[2] ? parts[2].split(',').map(s => s.trim()).join('+') : '';
                if (!name || !roll) throw `行${index + 1}: 必須項目が不足しています`;
                return { name, roll, stat, category };
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
                const stat = parts[2] ? parts[2].split(',').map(s => s.trim()).join('+') : '';
                if (!name || !roll) throw `行${index + 1}: 必須項目が不足しています`;
                return { name, roll, stat, category };
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

function progressTurn() {
    let changed = false;
    state.buffs.forEach(buff => {
        if (buff.turn && buff.turn > 0) {
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
        showToast('ターンが設定されたバフがありません', 'error');
    }
}


function renderBuffs() {
    const list = document.getElementById('buffList');
    if (!list) return;

    const categoryMap = buildCategoryMap('buff');
    const hasContent = (state.buffs.length + state.buffCategories.length) > 0;

    if (!hasContent) {
        list.innerHTML = '<div class="empty-message">バフを追加してください</div>';
        return;
    }

    const sections = [];

    sections.push(`
        <div class="category-block uncategorized" data-category="none">
            <div class="category-header" data-category="none">ー</div>
            <div class="category-body" data-category="none">
                ${renderBuffItems(categoryMap['none'])}
            </div>
        </div>
    `);

    state.buffCategories.forEach(name => {
        sections.push(`
            <details class="category-block" open data-category="${escapeHtml(name)}">
                <summary class="category-header" data-category="${escapeHtml(name)}" draggable="true">
                    <span class="material-symbols-rounded" style="margin-right: 4px;">menu</span>${escapeHtml(name)}
                </summary>
                <div class="category-body" data-category="${escapeHtml(name)}">
                    ${renderBuffItems(categoryMap[name])}
                </div>
            </details>
        `);
    });

    list.innerHTML = sections.join('');
    attachBuffEvents();
    updateItemIndexOptions('buff');
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
        header.addEventListener('dragover', handleCategoryDragOver);
        header.addEventListener('dragleave', handleCategoryDragLeave);
        header.addEventListener('drop', handleCategoryDrop);
    });
    
    buffList.querySelectorAll('[data-toggle-type="buff"]').forEach(btn => {
        const i = parseInt(btn.getAttribute('data-toggle'));
        if (isNaN(i)) return;
        
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
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

function handleCategoryDragOver(e) {
    if (!['buff', 'judge', 'attack'].includes(state.draggedType)) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('category-drag-over');
}

function handleCategoryDragLeave(e) {
    e.currentTarget.classList.remove('category-drag-over');
}

function handleCategoryDrop(e) {
    if (!['buff', 'judge', 'attack'].includes(state.draggedType) || state.draggedIndex === null) return;

    e.preventDefault();
    e.stopPropagation();

    const categoryKey = e.currentTarget.getAttribute('data-category') || 'none';
    const targetCategory = categoryKey === 'none' ? null : categoryKey;

    const collection = getCollection(state.draggedType);
    const item = collection ? collection[state.draggedIndex] : null;

    if (!collection || !item) {
        e.currentTarget.classList.remove('category-drag-over');
        return;
    }

    if ((item.category || null) !== targetCategory) {
        item.category = targetCategory;

        if (state.draggedType === 'buff') renderBuffs();
        else renderPackage(state.draggedType);

        updatePackageOutput('judge');
        updatePackageOutput('attack');
        saveData();
    }

    state.draggedIndex = null;
    state.draggedType = null;
    state.draggedCategory = null;
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
    state.draggedIndex = null;
    state.draggedType = null;
    state.draggedCategory = null;
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
        
        // ステータスの選択状態を復元
        const statSelect = document.getElementById('judgeStat');
        const stats = judge.stat ? judge.stat.split('+') : [];
        Array.from(statSelect.options).forEach(opt => {
            opt.selected = stats.includes(opt.value);
        });

        const categorySelect = document.getElementById('judgeCategorySelect');
        if (categorySelect) {
            categorySelect.value = judge.category || 'none';
        }
    } else {
        // 追加モード
        state.editMode = { active: false, type: null, index: null };
        modalTitle.textContent = '判定パッケージ追加';
        addBtn.textContent = '✚';
        bulkAddSection.style.display = 'block';
        resetJudgeForm();
    }
    
    modal.showModal();
}

function resetJudgeForm() {
    document.getElementById('judgeName').value = '';
    document.getElementById('judgeRoll').value = '';
    document.getElementById('judgeStat').selectedIndex = -1;
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
        
        // ステータスの選択状態を復元
        const statSelect = document.getElementById('attackStat');
        const stats = attack.stat ? attack.stat.split('+') : [];
        Array.from(statSelect.options).forEach(opt => {
            opt.selected = stats.includes(opt.value);
        });

        const categorySelect = document.getElementById('attackCategorySelect');
        if (categorySelect) {
            categorySelect.value = attack.category || 'none';
        }
    } else {
        // 追加モード
        state.editMode = { active: false, type: null, index: null };
        modalTitle.textContent = '攻撃パッケージ追加';
        addBtn.textContent = '✚';
        bulkAddSection.style.display = 'block';
        resetAttackForm();
    }
    
    modal.showModal();
}

function resetAttackForm() {
    document.getElementById('attackName').value = '';
    document.getElementById('attackRoll').value = '';
    document.getElementById('attackStat').selectedIndex = -1;
    const categorySelect = document.getElementById('attackCategorySelect');
    if (categorySelect) {
        categorySelect.value = 'none';
    }
}

function addJudge() {
    const name = document.getElementById('judgeName').value.trim();
    const roll = document.getElementById('judgeRoll').value.trim();
    const selectedStats = Array.from(document.getElementById('judgeStat').selectedOptions).map(opt => opt.value).filter(v => v !== 'none');
    const stat = selectedStats.length > 0 ? selectedStats.join('+') : '';
    const categorySelect = document.getElementById('judgeCategorySelect');
    const category = categorySelect ? (categorySelect.value === 'none' ? null : categorySelect.value) : null;

    if (!name || !roll) {
        showToast('判定名と判定ロールを入力してください', 'error');
        return;
    }
    
    if (state.editMode.active && state.editMode.type === 'judge') {
        // 編集モード: 既存の判定を更新
        const index = state.editMode.index;
        state.judges[index] = { name: name, roll: roll, stat: stat, category };
        showToast('判定を更新しました', 'success');
    } else {
        // 追加モード: 新規判定を追加
        state.judges.push({ name: name, roll: roll, stat: stat, category });
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
    const selectedStats = Array.from(document.getElementById('attackStat').selectedOptions).map(opt => opt.value).filter(v => v !== 'none');
    const stat = selectedStats.length > 0 ? selectedStats.join('+') : '';
    const categorySelect = document.getElementById('attackCategorySelect');
    const category = categorySelect ? (categorySelect.value === 'none' ? null : categorySelect.value) : null;

    if (!name || !roll) {
        showToast('攻撃名と攻撃ロールを入力してください', 'error');
        return;
    }
    
    if (state.editMode.active && state.editMode.type === 'attack') {
        // 編集モード: 既存の攻撃を更新
        const index = state.editMode.index;
        state.attacks[index] = { name: name, roll: roll, stat: stat, category };
        showToast('攻撃を更新しました', 'success');
    } else {
        // 追加モード: 新規攻撃を追加
        state.attacks.push({ name: name, roll: roll, stat: stat, category });
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
        return;
    }

    const sections = [];

    sections.push(`
        <div class="category-block uncategorized" data-category="none">
            <div class="category-header" data-category="none">ー</div>
            <div class="category-body" data-category="none">
                ${renderPackageItems(type, categoryMap['none'])}
            </div>
        </div>
    `);

    categories.forEach(name => {
        sections.push(`
            <details class="category-block" open data-category="${escapeHtml(name)}">
                <summary class="category-header" data-category="${escapeHtml(name)}" draggable="true">
                    <span class="material-symbols-rounded" style="margin-right: 4px;">menu</span>${escapeHtml(name)}
                </summary>
                <div class="category-body" data-category="${escapeHtml(name)}">
                    ${renderPackageItems(type, categoryMap[name])}
                </div>
            </details>
        `);
    });

    list.innerHTML = sections.join('');

    attachItemEvents(type);
    updateItemIndexOptions(type);
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
        header.addEventListener('dragover', handleCategoryDragOver);
        header.addEventListener('dragleave', handleCategoryDragLeave);
        header.addEventListener('drop', handleCategoryDrop);
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

    if (item.stat) {
        const stats = item.stat.split('+');
        command += '+{' + stats.join('}+{') + '}';
    }

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
            const slotMatch = effect.match(/\{\{([^}]+)\}\}=(.+)/);
            
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
    
    command = command.replace(/\{\{([^}]+)\}\}/g, (match, slotName) => {
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

    return [
        buff.name || '',
        targetText,
        buff.description || '',
        buff.effect || '',
        turnText,
        buff.color || '#0079FF'
    ].join('|');
}

function formatPackageForBulk(item) {
    const statText = item.stat ? item.stat.split('+').join(',') : '';
    return `${item.name}|${item.roll}|${statText}`;
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
    document.querySelectorAll('.section-header').forEach(header => {
        header.addEventListener('click', () => toggleSection(header));
    });
    
    document.getElementById('addStatBtn')?.addEventListener('click', addStat);
    document.getElementById('statName')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addStat();
    });
    
    document.getElementById('addBuffBtn')?.addEventListener('click', addBuff);
    document.getElementById('addBuffCategoryBtn')?.addEventListener('click', () => addCategory('buff', 'buffCategoryInput'));
    document.getElementById('turnProgressBtn')?.addEventListener('click', progressTurn);

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
    
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            if (targetId) copyToClipboard(targetId, this);
        });
    });

    initItemIndex('buff');
    initItemIndex('judge');
    initItemIndex('attack');
    initMultiSelect();
    initFileDropZone();
    loadUIState();
    loadData();
});

// グローバルスコープに公開
window.removeStat = removeStat;
window.openBuffModal = openBuffModal;
window.openJudgeModal = openJudgeModal;
window.openAttackModal = openAttackModal;