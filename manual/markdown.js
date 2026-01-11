(() => {
  const slugify = (text) => {
    const normalized = text
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/\s+/g, '-')
      .replace(/[^\w\u00A0-\uFFFF-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return normalized || 'section';
  };

  const createHeadingIdGenerator = () => {
    const usedIds = new Set();
    return (title) => {
      const base = slugify(title);
      let candidate = base;
      let counter = 2;
      while (usedIds.has(candidate)) {
        candidate = `${base}-${counter}`;
        counter += 1;
      }
      usedIds.add(candidate);
      return candidate;
    };
  };

  window.markdownUtils = {
    createHeadingIdGenerator
  };
})();
