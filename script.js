// ========================================
// グローバル変数
// ========================================
let stats = [];
let buffs = [];
let judges = [];
let attacks = [];
let draggedIndex = null;
let draggedType = null;
let selectedBuffTargets = [];

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
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
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
    
    document.body.appendChild(toast);
    
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
            stats = Array.isArray(data.stats) ? data.stats : [];
            buffs = Array.isArray(data.buffs) ? data.buffs : [];
            judges = Array.isArray(data.judges) ? data.judges : getDefaultJudges();
            attacks = Array.isArray(data.attacks) ? data.attacks : getDefaultAttacks();
        } else {
            judges = getDefaultJudges();
            attacks = getDefaultAttacks();
        }
    } catch (e) {
        console.error('データの読み込みに失敗:', e);
        showToast('データの読み込みに失敗しました', 'error');
        judges = getDefaultJudges();
        attacks = getDefaultAttacks();
    }
    
    renderStats();
    renderBuffs();
    renderPackage('judge');
    renderPackage('attack');
    updateStatSelects();
    updateBuffTargetDropdown();
}

function getDefaultJudges() {
    return [
        { name: '命中(武器A)', roll: '1d20', stat: '' },
        { name: '回避', roll: '1d20', stat: '' }
    ];
}

function getDefaultAttacks() {
    return [
        { name: '武器A', roll: '2d6', stat: '' }
    ];
}

function saveData() {
    const data = {
        stats: stats,
        buffs: buffs,
        judges: judges,
        attacks: attacks
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
        stats: stats,
        buffs: buffs,
        judges: judges,
        attacks: attacks
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
        
        stats = data.stats || [];
        buffs = data.buffs || [];
        judges = data.judges || [];
        attacks = data.attacks || [];
        
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
    const existingNames = stats.map(s => s.name);
    const duplicates = names.filter(n => existingNames.includes(n));
    
    if (duplicates.length > 0) {
        showToast(`既に存在するステータス: ${duplicates.join(', ')}`, 'error');
        return;
    }
    
    // 追加
    names.forEach(name => {
        stats.push({ name: name });
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
    stats.splice(index, 1);
    renderStats();
    updateStatSelects();
    saveData();
}

function renderStats() {
    const list = document.getElementById('statList');
    
    if (stats.length === 0) {
        list.innerHTML = '<div class="empty-message">ステータスを追加してください</div>';
        return;
    }
    
    list.innerHTML = stats.map((stat, i) => `
        <div class="stat-tag">
            ${escapeHtml(stat.name)}
            <button onclick="removeStat(${i})">×</button>
        </div>
    `).join('');
}

function updateStatSelects() {
    const judgeSelect = document.getElementById('judgeStat');
    const attackSelect = document.getElementById('attackStat');
    
    const options = '<option value="">なし</option>' + 
        stats.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join('');
    
    judgeSelect.innerHTML = options;
    attackSelect.innerHTML = options;
}

// ========================================
// マルチセレクト
// ========================================

function initMultiSelect() {
    const select = document.getElementById('buffTargetSelect');
    if (!select) return;
    
    select.addEventListener('change', () => {
        selectedBuffTargets = Array.from(select.selectedOptions).map(opt => opt.value);
    });
}

function updateBuffTargetDropdown() {
    const select = document.getElementById('buffTargetSelect');
    if (!select) return;
    
    // 現在の選択値を保持
    const currentValues = Array.from(select.selectedOptions).map(opt => opt.value);
    
    // プレースホルダー
    let html = '<option disabled>効果先</option>';
    
    // その他カテゴリ
    html += `<option>なし</option>`;
    html += `<option value="all-judge" ${currentValues.includes('all-judge') ? 'selected' : ''}>すべての判定</option>`;
    html += `<option value="all-attack" ${currentValues.includes('all-attack') ? 'selected' : ''}>すべての攻撃</option>`;
    html += `</optgroup>`;
    
    // 判定カテゴリ
    if (judges.length > 0) {
        html += `<optgroup label="---判定---">`;
        judges.forEach(j => {
            const value = 'judge:' + j.name;
            html += `<option value="${escapeHtml(value)}" ${currentValues.includes(value) ? 'selected' : ''}>${escapeHtml(j.name)}</option>`;
        });
        html += `</optgroup>`;
    }
    
    // 攻撃カテゴリ
    if (attacks.length > 0) {
        html += `<optgroup label="---攻撃---">`;
        attacks.forEach(a => {
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
    return target;
}

// ========================================
// バフ管理
// ========================================

function addBuff() {
    const name = document.getElementById('buffName').value.trim();
    const description = document.getElementById('buffDescription').value.trim();
    const effect = document.getElementById('buffEffect').value.trim();
    const targets = [...selectedBuffTargets];
    const turn = document.getElementById('buffTurn').value.trim();
    const color = validateColor(document.getElementById('buffColor').value);
    
    if (!name) {
        showToast('バフ名を入力してください', 'error');
        return;
    }
    
    if (targets.length === 0) {
        showToast('効果先を選択してください', 'error');
        return;
    }
    
    buffs.push({
        name: name,
        description: description,
        effect: effect,
        targets: targets,
        turn: turn ? parseInt(turn) : null,
        originalTurn: turn ? parseInt(turn) : null,
        color: color,
        active: true
    });
    
    document.getElementById('buffName').value = '';
    document.getElementById('buffDescription').value = '';
    document.getElementById('buffEffect').value = '';
    document.getElementById('buffTurn').value = '';
    
    selectedBuffTargets = [];
    updateBuffTargetDropdown();
    
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
            array: buffs,
            minParts: 4,
            messageKey: 'バフ',
            parser: (parts, index) => {
                const name = parts[0];
                const targetStr = parts[1];
                const description = parts[2];
                const effect = parts[3];
                const turn = parts[4] ? parseInt(parts[4]) : null;
                const color = validateColor(parts[5] || '#0079FF');
                
                if (!name) throw `行${index + 1}: バフ名が空です`;
                
                const targetNames = targetStr.split(',').map(t => t.trim());
                const targets = [];
                
                targetNames.forEach(tName => {
                    if (tName === 'すべての判定') targets.push('all-judge');
                    else if (tName === 'すべての攻撃') targets.push('all-attack');
                    else {
                        const judge = judges.find(j => j.name === tName);
                        if (judge) targets.push('judge:' + tName);
                        else {
                            const attack = attacks.find(a => a.name === tName);
                            if (attack) targets.push('attack:' + tName);
                            else throw `行${index + 1}: 効果先「${tName}」が見つかりません`;
                        }
                    }
                });
                
                if (targets.length === 0) throw `行${index + 1}: 有効な効果先がありません`;
                
                return {
                    name, description, effect, targets, turn, originalTurn: turn,
                    color, active: true
                };
            },
            afterAdd: () => {
                renderBuffs();
                updatePackageOutput('judge');
                updatePackageOutput('attack');
            }
        },
        'judge': {
            textId: 'bulkAddJudgeText',
            areaId: 'bulkAddJudgeArea',
            array: judges,
            minParts: 2,
            messageKey: '判定パッケージ',
            parser: (parts, index) => {
                const name = parts[0];
                const roll = parts[1];
                const stat = parts[2] || '';
                if (!name || !roll) throw `行${index + 1}: 必須項目が不足しています`;
                return { name, roll, stat };
            },
            afterAdd: () => {
                renderPackage('judge');
                updateBuffTargetDropdown();
            }
        },
        'attack': {
            textId: 'bulkAddAttackText',
            areaId: 'bulkAddAttackArea',
            array: attacks,
            minParts: 2,
            messageKey: '攻撃パッケージ',
            parser: (parts, index) => {
                const name = parts[0];
                const roll = parts[1];
                const stat = parts[2] || '';
                if (!name || !roll) throw `行${index + 1}: 必須項目が不足しています`;
                return { name, roll, stat };
            },
            afterAdd: () => {
                renderPackage('attack');
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
    
    const lines = text.split('\n').filter(line => line.trim());
    let added = 0;
    
    lines.forEach((line, index) => {
        try {
            const parts = line.split('|').map(p => p.trim());
            if (parts.length < config.minParts) return;
            
            const item = config.parser(parts, index);
            config.array.push(item);
            added++;
        } catch (error) {
            showToast(`エラー: ${error}`, 'error');
        }
    });
    
    if (added > 0) {
        const area = document.getElementById(config.areaId);
        const textArea = document.getElementById(config.textId);

        if (textArea) textArea.value = '';
        if (area) {
            area.classList.add('hidden');
            area.style.display = 'none';
        }

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
    if (index < 0 || index >= buffs.length) return;
    
    buffs[index].active = !buffs[index].active;
    if (buffs[index].active && buffs[index].turn === 0) {
        buffs[index].turn = buffs[index].originalTurn;
    }
    renderBuffs();
    updatePackageOutput('judge');
    updatePackageOutput('attack');
    saveData();
}

function removeBuff(index) {
    if (index < 0 || index >= buffs.length) return;
    
    buffs.splice(index, 1);
    renderBuffs();
    updatePackageOutput('judge');
    updatePackageOutput('attack');
    saveData();
}

function progressTurn() {
    let changed = false;
    buffs.forEach(buff => {
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
    
    if (buffs.length === 0) {
        list.innerHTML = '<div class="empty-message">バフを追加してください</div>';
        return;
    }
    
    list.innerHTML = buffs.map((buff, i) => {
        const bgColor = validateColor(buff.color);
        const textColor = getContrastColor(bgColor);
        const targetTexts = buff.targets.map(t => getTargetText(t));
        const tooltipText = '効果先: ' + targetTexts.join(', ');
        const turnDisplay = buff.turn ? `<span class="turn-badge" style="outline:2px solid ${buff.color};"><span class="turn-count">${buff.turn}</span></span>` : '';
        
        return `
            <div class="item buff-item draggable ${buff.active ? 'active' : ''}" 
                 style="background-color: ${bgColor}; color: ${textColor};"
                 draggable="true"
                 data-index="${i}" data-type="buff">
                <div class="tooltip">${escapeHtml(tooltipText)}</div>
                <span class="material-symbols-rounded">\ue945</span>
                <span class="item-name">${escapeHtml(buff.name)}</span>
                ${buff.description ? `<span class="item-description">${escapeHtml(buff.description)}</span>` : ''}
                ${buff.effect ? `<span class="item-effect">${escapeHtml(buff.effect)}</span>` : ''}
                ${turnDisplay}
               <button class="toggle-btn ${buff.active ? 'active' : ''}" data-toggle="${i}" data-toggle-type="buff"></button>
                <button class="remove-btn" data-remove="${i}" data-remove-type="buff">×</button>
            </div>
        `;
    }).join('');
    
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
    });
    
    buffList.querySelectorAll('[data-toggle-type="buff"]').forEach(btn => {
        const i = parseInt(btn.getAttribute('data-toggle'));
        if (isNaN(i)) return;
        
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleBuff(i);
        });
    });
    
    buffList.querySelectorAll('[data-remove-type="buff"]').forEach(btn => {
        const i = parseInt(btn.getAttribute('data-remove'));
        if (isNaN(i)) return;
        
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeBuff(i);
        });
    });
}

// ========================================
// ドラッグ&ドロップ
// ========================================

function handleDragStart(e, index, type) {
    draggedIndex = index;
    draggedType = type;
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
    
    if (draggedIndex === null || draggedType !== type || draggedIndex === targetIndex) {
        return;
    }
    
    let arr;
    if (type === 'buff') arr = buffs;
    else if (type === 'judge') arr = judges;
    else if (type === 'attack') arr = attacks;
    else return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    let insertIndex = targetIndex;
    
    if (e.clientY >= midY) {
        insertIndex = targetIndex + 1;
    }
    
    if (draggedIndex < insertIndex) {
        insertIndex--;
    }
    
    const item = arr.splice(draggedIndex, 1)[0];
    arr.splice(insertIndex, 0, item);
    
    if (type === 'buff') renderBuffs();
    else if (type === 'judge') renderPackage('judge');
    else if (type === 'attack') renderPackage('attack');
    
    updatePackageOutput('judge');
    updatePackageOutput('attack');
    saveData();
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedIndex = null;
    draggedType = null;
}

// ========================================
// 判定・攻撃パッケージ管理
// ========================================

function addJudge() {
    const name = document.getElementById('judgeName').value.trim();
    const roll = document.getElementById('judgeRoll').value.trim();
    const stat = document.getElementById('judgeStat').value;
    
    if (!name || !roll) {
        showToast('判定名と判定ロールを入力してください', 'error');
        return;
    }
    
    judges.push({ name: name, roll: roll, stat: stat });
    document.getElementById('judgeName').value = '';
    document.getElementById('judgeRoll').value = '';
    
    renderPackage('judge');
    updateBuffTargetDropdown();
    saveData();
}

function removeJudge(index) {
    if (index < 0 || index >= judges.length) return;
    
    judges.splice(index, 1);
    renderPackage('judge');
    updateBuffTargetDropdown();
    updatePackageOutput('judge');
    saveData();
}

function addAttack() {
    const name = document.getElementById('attackName').value.trim();
    const roll = document.getElementById('attackRoll').value.trim();
    const stat = document.getElementById('attackStat').value;
    
    if (!name || !roll) {
        showToast('攻撃名と攻撃ロールを入力してください', 'error');
        return;
    }
    
    attacks.push({ name: name, roll: roll, stat: stat });
    document.getElementById('attackName').value = '';
    document.getElementById('attackRoll').value = '';
    
    renderPackage('attack');
    updateBuffTargetDropdown();
    saveData();
}

function removeAttack(index) {
    if (index < 0 || index >= attacks.length) return;
    
    attacks.splice(index, 1);
    renderPackage('attack');
    updateBuffTargetDropdown();
    updatePackageOutput('attack');
    saveData();
}


/**
 * 汎用選択関数（判定・攻撃パッケージ）
 */
function selectPackage(index, type) {
    const array = type === 'judge' ? judges : attacks;
    
    if (index < 0 || index >= array.length) return;
    
    document.querySelectorAll(`[data-type="${type}"]`).forEach(el => el.classList.remove('selected'));
    const target = document.querySelector(`[data-type="${type}"][data-index="${index}"]`);
    if (target) target.classList.add('selected');
    updatePackageOutput(type, index);
}

/**
 * 汎用レンダリング関数（判定・攻撃パッケージ）
 */
function renderPackage(type) {
    const typeConfig = {
        'judge': {
            array: judges,
            listId: 'judgeList',
            emptyMsg: '判定パッケージを追加してください'
        },
        'attack': {
            array: attacks,
            listId: 'attackList',
            emptyMsg: '攻撃パッケージを追加してください'
        }
    };
    
    const config = typeConfig[type];
    if (!config) return;
    
    const list = document.getElementById(config.listId);
    if (!list) return;
    
    if (config.array.length === 0) {
        list.innerHTML = `<div class="empty-message">${config.emptyMsg}</div>`;
        return;
    }
    
    list.innerHTML = config.array.map((item, i) => `
        <div class="item clickable draggable" data-index="${i}" data-type="${type}" draggable="true">
            <span class="material-symbols-rounded">drag_indicator</span>
            <span class="item-name">${escapeHtml(item.name)}</span>
            <span class="item-detail">${escapeHtml(item.roll)}</span>
            <span class="item-detail">${item.stat ? escapeHtml(item.stat) : 'なし'}</span>
            <button class="remove-btn" data-remove="${i}" data-remove-type="${type}">×</button>
        </div>
    `).join('');
    
    attachItemEvents(type);
}

/**
 * 汎用アイテムイベントアタッチ関数
 */
function attachItemEvents(type) {
    const typeConfig = {
        'judge': {
            listId: 'judgeList',
            onSelect: (i) => selectPackage(i, 'judge'),
            onRemove: removeJudge
        },
        'attack': {
            listId: 'attackList',
            onSelect: (i) => selectPackage(i, 'attack'),
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
    });
    
    listElement.querySelectorAll(`[data-remove-type="${type}"]`).forEach(btn => {
        const i = parseInt(btn.getAttribute('data-remove'));
        if (isNaN(i)) return;
        
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            config.onRemove(i);
        });
    });
}

/* 汎用出力関数（判定・攻撃パッケージ）*/
function updatePackageOutput(type, selectedIndex = null) {
    const array = type === 'judge' ? judges : attacks;
    const outputId = type === 'judge' ? 'judgeOutput' : 'attackOutput';
    const emptyMsg = type === 'judge' ? '判定パッケージを選択してください' : '攻撃パッケージを選択してください';
    
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
        command += '+{' + item.stat + '}';
    }
    
    const filterKey = type === 'judge' ? 'judge:' : 'attack:';
    const activeBuffs = buffs.filter(b => 
        b.active && 
        b.effect &&
        (b.targets.includes(type === 'judge' ? 'all-judge' : 'all-attack') || 
         b.targets.includes(filterKey + item.name))
    );
    
    activeBuffs.forEach(buff => {
        command += buff.effect;
    });
    
    if (type === 'judge') {
        const targetType = document.querySelector('input[name="targetType"]:checked')?.value || 'none';
        const targetValue = document.getElementById('targetValue').value.trim();
        
        if (targetType === 'gte' && targetValue) {
            command += `>=${targetValue}`;
        } else if (targetType === 'lte' && targetValue) {
            command += `=<${targetValue}`;
        }
    } else if (type === 'attack') {
        command += ` ${item.name}`;
    }
    
    document.getElementById(outputId).textContent = command;
}

// ========================================
// コピー機能
// ========================================

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
    // セクションヘッダーのトグル
    document.querySelectorAll('.section-header').forEach(header => {
        header.addEventListener('click', () => toggleSection(header));
    });
    
    // ステータス
    document.getElementById('addStatBtn')?.addEventListener('click', addStat);
    document.getElementById('statName')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addStat();
    });
    
    // バフ
    document.getElementById('addBuffBtn')?.addEventListener('click', addBuff);
    document.getElementById('turnProgressBtn')?.addEventListener('click', progressTurn);

    setupBulkAddControls({
        toggleId: 'bulkAddBtn',
        confirmId: 'bulkAddConfirm',
        cancelId: 'bulkAddCancel',
        areaId: 'bulkAddArea',
        textId: 'bulkAddText',
        type: 'buff'
    });
    
    // 判定パッケージ
    document.getElementById('addJudgeBtn')?.addEventListener('click', addJudge);
    document.querySelectorAll('input[name="targetType"]').forEach(radio => {
        radio.addEventListener('change', () => updatePackageOutput('judge'));
    });
    document.getElementById('targetValue')?.addEventListener('input', () => updatePackageOutput('judge'));
    
    setupBulkAddControls({
        toggleId: 'bulkAddJudgeBtn',
        confirmId: 'bulkAddJudgeConfirm',
        cancelId: 'bulkAddJudgeCancel',
        areaId: 'bulkAddJudgeArea',
        textId: 'bulkAddJudgeText',
        type: 'judge'
    });
    
    // 攻撃パッケージ
    document.getElementById('addAttackBtn')?.addEventListener('click', addAttack);
    
    setupBulkAddControls({
        toggleId: 'bulkAddAttackBtn',
        confirmId: 'bulkAddAttackConfirm',
        cancelId: 'bulkAddAttackCancel',
        areaId: 'bulkAddAttackArea',
        textId: 'bulkAddAttackText',
        type: 'attack'
    });
    
    // データ管理
    document.getElementById('exportToClipboard')?.addEventListener('click', exportData);
    document.getElementById('importConfirm')?.addEventListener('click', importData);
    document.getElementById('resetBtn')?.addEventListener('click', resetAll);
    
    // コピーボタン
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            if (targetId) copyToClipboard(targetId, this);
        });
    });
    
    // 初期化
    initMultiSelect();
    loadUIState();
    loadData();
});

// グローバルスコープに公開(HTMLから呼び出すため)
window.removeStat = removeStat;
