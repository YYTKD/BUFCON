const markdownInput = document.getElementById('markdownInput');
const markdownFile = document.getElementById('markdownFile');
const jsOutput = document.getElementById('jsOutput');
const convertBtn = document.getElementById('convertBtn');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
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

const buildContentJs = (markdown) => {
  const normalized = markdown.replace(/\r\n?/g, '\n');
  const withTrailing = normalized.endsWith('\n') ? normalized : `${normalized}\n`;
  const escaped = withTrailing
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
  return `window.manualContent = "${escaped}";`;
};

const convert = () => {
  const markdown = markdownInput.value.trim();
  if (!markdown) {
    jsOutput.value = '';
    setStatus('入力が空です。');
    return;
  }
  jsOutput.value = buildContentJs(markdownInput.value);
  setStatus('content.js 形式に変換しました。');
};

convertBtn.addEventListener('click', convert);

markdownInput.addEventListener('input', () => {
  if (!markdownInput.value.trim()) {
    jsOutput.value = '';
  }
});

markdownFile.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    markdownInput.value = String(reader.result ?? '');
    setStatus('ファイルを読み込みました。');
  };
  reader.readAsText(file, 'utf-8');
});

copyBtn.addEventListener('click', () => {
  if (!jsOutput.value) {
    setStatus('コピーする内容がありません。');
    return;
  }
  navigator.clipboard
    .writeText(jsOutput.value)
    .then(() => setStatus('クリップボードにコピーしました。'))
    .catch(() => setStatus('コピーに失敗しました。'));
});

downloadBtn.addEventListener('click', () => {
  if (!jsOutput.value) {
    setStatus('保存する内容がありません。');
    return;
  }
  const blob = new Blob([jsOutput.value + '\n'], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'content.js';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  setStatus('content.js を保存しました。');
});

clearBtn.addEventListener('click', () => {
  markdownInput.value = '';
  jsOutput.value = '';
  markdownFile.value = '';
  setStatus('入力をクリアしました。');
});