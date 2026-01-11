const markdownInput = document.getElementById('markdownInput');
const preview = document.getElementById('preview');
const saveButton = document.getElementById('saveButton');
const saveStatus = document.getElementById('saveStatus');

let fileHandle = null;

const escapeHtml = (text) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const parseInline = (text) => {
  const parts = text.split(/(`[^`]*`)/g);
  return parts
    .map((part) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
      }
      let escaped = escapeHtml(part);
      escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
      escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      return escaped;
    })
    .join('');
};

const parseMarkdown = (markdown) => {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const ensureId = window.markdownUtils?.createHeadingIdGenerator?.() ?? ((title) => title);
  const listStack = [];
  let html = '';
  let paragraph = [];
  let inCode = false;
  let codeFence = '';
  let codeLines = [];

  const closeLists = (targetDepth = 0) => {
    while (listStack.length > targetDepth) {
      const current = listStack.pop();
      if (current.openLi) {
        html += '</li>';
      }
      html += `</${current.type}>`;
    }
  };

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const parts = paragraph.map((line) => {
      if (line.endsWith('  ')) {
        return `${parseInline(line.trimEnd())}<br />`;
      }
      return parseInline(line);
    });
    html += `<p>${parts.join(' ')}</p>`;
    paragraph = [];
  };

  const openList = (type) => {
    html += `<${type}>`;
    listStack.push({ type, openLi: false });
  };

  const closeAllBlocks = () => {
    flushParagraph();
    closeLists();
  };

  lines.forEach((line) => {
    if (inCode) {
      if (line.startsWith(codeFence)) {
        const code = escapeHtml(codeLines.join('\n'));
        html += `<pre><code>${code}</code></pre>`;
        inCode = false;
        codeFence = '';
        codeLines = [];
        return;
      }
      codeLines.push(line);
      return;
    }

    const fenceMatch = line.match(/^```/);
    if (fenceMatch) {
      closeAllBlocks();
      inCode = true;
      codeFence = fenceMatch[0];
      codeLines = [];
      return;
    }

    if (line.trim() === '') {
      flushParagraph();
      closeLists();
      return;
    }

    const trimmed = line.trim();
    if (trimmed.startsWith('<')) {
      closeAllBlocks();
      html += `${line}\n`;
      return;
    }

    const hrMatch = trimmed.match(/^(-{3,}|\*{3,}|_{3,})$/);
    if (hrMatch) {
      closeAllBlocks();
      html += '<hr />';
      return;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      closeAllBlocks();
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      const id = ensureId(title);
      const safeTitle = parseInline(title);
      html += `<h${level} id="${id}">${safeTitle}</h${level}>`;
      return;
    }

    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      flushParagraph();
      const indent = Math.floor(listMatch[1].length / 2);
      const marker = listMatch[2];
      const content = listMatch[3];
      const type = marker.endsWith('.') ? 'ol' : 'ul';

      if (listStack.length < indent + 1) {
        while (listStack.length < indent + 1) {
          openList(type);
        }
      } else if (listStack.length > indent + 1) {
        closeLists(indent + 1);
      }

      const current = listStack[listStack.length - 1];
      if (!current || current.type !== type) {
        closeLists(listStack.length - 1);
        openList(type);
      } else if (current.openLi) {
        html += '</li>';
        current.openLi = false;
      }

      html += `<li>${parseInline(content)}`;
      listStack[listStack.length - 1].openLi = true;
      return;
    }

    paragraph.push(line);
  });

  if (inCode) {
    const code = escapeHtml(codeLines.join('\n'));
    html += `<pre><code>${code}</code></pre>`;
  }

  flushParagraph();
  closeLists();

  return html;
};

const renderPreview = () => {
  preview.innerHTML = parseMarkdown(markdownInput.value);
};

const updateStatus = (message) => {
  if (saveStatus) {
    saveStatus.textContent = message;
  }
};

const loadInitialContent = async () => {
  try {
    const response = await fetch('content.md');
    if (!response.ok) {
      throw new Error('content.md not found');
    }
    const markdown = await response.text();
    markdownInput.value = markdown;
    renderPreview();
    updateStatus('content.md を読み込みました。');
  } catch (error) {
    console.error(error);
    markdownInput.value = '# 読み込みに失敗しました\nmanual/content.md が見つかりません。';
    renderPreview();
    updateStatus('content.md の読み込みに失敗しました。');
  }
};

const saveWithFileSystemAccess = async (content) => {
  if (!fileHandle) {
    fileHandle = await window.showSaveFilePicker({
      suggestedName: 'content.md',
      types: [
        {
          description: 'Markdown',
          accept: { 'text/markdown': ['.md'] }
        }
      ]
    });
  }
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
};

const saveWithDownload = (content) => {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'content.md';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const handleSave = async () => {
  const content = markdownInput.value;
  updateStatus('保存中...');

  try {
    if ('showSaveFilePicker' in window) {
      await saveWithFileSystemAccess(content);
      updateStatus('上書き保存しました。');
    } else {
      saveWithDownload(content);
      updateStatus('ダウンロードで保存しました。');
    }
  } catch (error) {
    console.error(error);
    updateStatus('保存に失敗しました。');
  }
};

markdownInput.addEventListener('input', () => {
  renderPreview();
  updateStatus('編集中...');
});

saveButton.addEventListener('click', () => {
  handleSave();
});

loadInitialContent();
