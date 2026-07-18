(function () {
  const STORAGE_KEY = 'kmnz_songcover_items_v1';

  function proxyBase() {
    return (window.KMNZ_CONFIG && window.KMNZ_CONFIG.songcoverProxy) || window.SONGCOVER_PROXY || '';
  }

  function buildProxyUrl(target) {
    const proxy = proxyBase();
    if (proxy) return proxy + encodeURIComponent(target);
    return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(target);
  }

  function normalizeCoverUrl(url) {
    if (!url) return null;
    const value = String(url).trim();
    if (value.indexOf('//') === 0) return 'https:' + value;
    if (value.indexOf('http://') === 0) return 'https://' + value.slice(7);
    return value;
  }

  function loadSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function save(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items || []));
    } catch (e) {}
  }

  function setStatus(message) {
    const status = document.getElementById('sc-status');
    if (status) status.textContent = message || '';
  }

  function removeItem(link) {
    const next = loadSaved().filter((item) => item.link !== link);
    save(next);
    render(next);
    setStatus('已删除');
    setTimeout(() => setStatus(''), 1600);
  }

  function render(items) {
    const grid = document.getElementById('sc-grid');
    if (!grid) return;
    grid.innerHTML = '';

    items.forEach((item) => {
      const link = document.createElement('a');
      link.href = item.link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'songcover-item';

      const media = document.createElement('span');
      media.className = 'songcover-media';

      const image = document.createElement('img');
      image.src = item.cover || 'assets/images/default4.png';
      image.alt = item.title ? `${item.title} 封面` : '视频封面';
      media.appendChild(image);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'songcover-remove';
      remove.title = '删除此条目';
      remove.textContent = 'x';
      remove.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        removeItem(item.link);
      });
      media.appendChild(remove);

      const title = document.createElement('span');
      title.className = 'songcover-title';
      title.textContent = item.title ? `${item.title}${item.author ? ` - ${item.author}` : ''}` : '视频';

      link.append(media, title);
      grid.appendChild(link);
    });
  }

  function extractLinks(text) {
    return (text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  }

  async function fetchBiliDataByBvid(bvid) {
    try {
      const api = 'https://api.bilibili.com/x/web-interface/view?bvid=' + encodeURIComponent(bvid);
      const response = await fetch(buildProxyUrl(api));
      if (!response.ok) throw new Error('api fetch failed');
      const json = await response.json();
      if (json && json.code === 0 && json.data) {
        return {
          cover: normalizeCoverUrl(json.data.pic),
          title: json.data.title || '',
          author: (json.data.owner && json.data.owner.name) || ''
        };
      }
    } catch (e) {}
    return { cover: null, title: '', author: '' };
  }

  async function fetchCoverFromPage(url) {
    try {
      const response = await fetch(buildProxyUrl(url));
      if (!response.ok) throw new Error('fetch failed');
      const html = await response.text();

      const bvidMatch = url.match(/\/(BV[0-9A-Za-z]+)/i)
        || html.match(/"bvid"\s*:\s*"(BV[0-9A-Za-z]+)"/i)
        || html.match(/"bvid"\s*:\s*'(BV[0-9A-Za-z]+)'/i);
      const bvid = bvidMatch && bvidMatch[1] ? bvidMatch[1] : null;
      if (bvid) {
        const data = await fetchBiliDataByBvid(bvid);
        if (data.cover || data.title) return data;
      }

      const imageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i)
        || html.match(/<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i)
        || html.match(/<link[^>]+rel=["']image_src["'][^>]*href=["']([^"']+)["'][^>]*>/i);
      const titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i)
        || html.match(/<meta[^>]+name=["']twitter:title["'][^>]*content=["']([^"']+)["'][^>]*>/i)
        || html.match(/<title[^>]*>([^<]+)<\/title>/i);

      let cover = imageMatch ? normalizeCoverUrl(imageMatch[1]) : null;
      if (!cover) {
        const picMatch = html.match(/"pic"\s*[:=]\s*"(https?:\\\/\\\/[^"\\]+)"/i)
          || html.match(/"cover"\s*[:=]\s*"(https?:\\\/\\\/[^"\\]+)"/i)
          || html.match(/"pic_url"\s*[:=]\s*"(https?:\\\/\\\/[^"\\]+)"/i);
        if (picMatch && picMatch[1]) cover = normalizeCoverUrl(picMatch[1].replace(/\\\//g, '/'));
      }

      return {
        cover,
        title: titleMatch ? titleMatch[1] : '',
        author: ''
      };
    } catch (e) {
      return { cover: null, title: '', author: '' };
    }
  }

  async function importLinks(links) {
    setStatus('导入中...');
    const items = loadSaved();

    for (const link of links) {
      if (items.some((item) => item.link === link)) continue;

      let result = { cover: null, title: '', author: '' };
      if (/bilibili\.com|b23\.tv/i.test(link)) {
        const bvidMatch = link.match(/\/(BV[0-9A-Za-z]+)/i);
        result = bvidMatch && bvidMatch[1] ? await fetchBiliDataByBvid(bvidMatch[1]) : await fetchCoverFromPage(link);
      } else {
        result = await fetchCoverFromPage(link);
      }

      items.push({
        link,
        cover: result.cover || 'assets/images/default4.png',
        title: result.title || '',
        author: result.author || ''
      });
    }

    save(items);
    render(items);
    setStatus('导入完成');
    setTimeout(() => setStatus(''), 2500);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('sc-input');
    const importButton = document.getElementById('sc-import');
    const clearButton = document.getElementById('sc-clear');

    render(loadSaved());

    if (importButton && input) {
      importButton.addEventListener('click', async () => {
        const links = extractLinks(input.value);
        if (!links.length) {
          setStatus('请粘贴至少一个链接。');
          return;
        }
        await importLinks(links);
        input.value = '';
      });
    }

    if (clearButton) {
      clearButton.addEventListener('click', () => {
        if (!confirm('确定要清除所有导入的歌回项吗？')) return;
        save([]);
        render([]);
        setStatus('已清除');
        setTimeout(() => setStatus(''), 1600);
      });
    }
  });
})();
