const paletteInput = document.getElementById('paletteInput');
const paletteFile = document.getElementById('paletteFile');
const jsonOutput = document.getElementById('jsonOutput');
const convertBtn = document.getElementById('convertBtn');
const copyBtn = document.getElementById('copyBtn');
const clearBtn = document.getElementById('clearBtn');
const statusMessage = document.getElementById('statusMessage');

const setStatus = (message) => {
  statusMessage.textContent = message;
  if (message) {
    window.clearTimeout(setStatus._timer);
    setStatus._timer = window.setTimeout(() => {
      statusMessage.textContent = '';
    }, 3000);
  }
};

const convert = () => {
  const input = paletteInput.value.trim();
  if (!input) {
    jsonOutput.value = '';
    setStatus('チャットパレットを貼り付けてください');
    return;
  }

  try {
    const data = JetPaletteCore.convertYstToJetPalette(paletteInput.value);
    jsonOutput.value = JSON.stringify(data, null, 2);
    setStatus('変換が完了しました');
  } catch (error) {
    jsonOutput.value = '';
    const message = error instanceof Error ? error.message : '不明なエラー';
    setStatus(`変換に失敗しました: ${message}`);
  }
};

convertBtn.addEventListener('click', convert);

paletteInput.addEventListener('input', () => {
  if (!paletteInput.value.trim()) {
    jsonOutput.value = '';
  }
});

paletteFile.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    paletteInput.value = String(reader.result ?? '');
    setStatus('ファイルを読み込みました');
  };
  reader.readAsText(file, 'utf-8');
});

copyBtn.addEventListener('click', () => {
  if (!jsonOutput.value) {
    setStatus('コピーする内容がありません');
    return;
  }
  navigator.clipboard
    .writeText(jsonOutput.value)
    .then(() => setStatus('クリップボードにコピーしました'))
    .catch(() => setStatus('コピーに失敗しました'));
});

clearBtn.addEventListener('click', () => {
  paletteInput.value = '';
  jsonOutput.value = '';
  paletteFile.value = '';
  setStatus('入力をクリアしました');
});
