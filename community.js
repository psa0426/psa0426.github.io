(() => {
  'use strict';
  const repo = 'psa0426/psa0426.github.io';
  const api = `https://api.github.com/repos/${repo}/issues`;
  function originalUrl(value) {
    try {
      const u = new URL(value);
      return u.origin === 'https://github.com' && u.pathname.startsWith(`/${repo}/issues/`) && !u.username && !u.password ? u.href : null;
    } catch { return null; }
  }
  function textElement(tag, text, className) {
    const el = document.createElement(tag);
    el.textContent = text;
    if (className) el.className = className;
    return el;
  }
  function card(item, questions) {
    const url = originalUrl(item.html_url);
    if (!url) return null;
    const box = document.createElement('article');
    box.className = 'conversation-card';
    const author = item.user && typeof item.user.login === 'string' ? item.user.login : '작성자';
    const d = new Date(item.created_at);
    const date = Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('ko-KR', {timeZone: 'Asia/Seoul'});
    box.append(textElement('p', `${author} · ${date}`, 'conversation-meta'));
    if (questions) {
      const h = textElement('h3', typeof item.title === 'string' ? item.title : '질문');
      box.append(h, textElement('span', item.state === 'closed' ? '닫힌 질문' : '진행 중인 질문', 'conversation-state'));
    }
    const body = typeof item.body === 'string' ? item.body : '';
    box.append(textElement('p', body.length > 3000 ? body.slice(0, 3000) + '\n… 전체 내용은 원문에서 확인하세요.' : body || '(본문 없음)', 'conversation-body'));
    const link = textElement('a', questions ? '질문 읽고 답글 보기 ↗' : '원문·답글 보기 ↗');
    link.href = url;
    box.append(link);
    return box;
  }
  for (const panel of document.querySelectorAll('[data-community]')) {
    const button = panel.querySelector('[data-load]');
    const status = panel.querySelector('[role="status"]');
    const list = panel.querySelector('[data-list]');
    const questions = panel.dataset.community === 'questions';
    const issue = panel.dataset.issue;
    if (!button || !status || !list || (!questions && !/^[1-9]\d*$/.test(issue || ''))) continue;
    button.addEventListener('click', async () => {
      button.disabled = true;
      panel.setAttribute('aria-busy', 'true');
      status.textContent = questions ? '질문을 불러오는 중입니다…' : '댓글을 불러오는 중입니다…';
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      try {
        const endpoint = questions ? `${api}?labels=blog-question&state=all&sort=created&direction=desc&per_page=20` : `${api}/${issue}/comments?per_page=20`;
        const response = await fetch(endpoint, {credentials: 'omit', referrerPolicy: 'no-referrer', headers: {'Accept': 'application/vnd.github+json'}, signal: controller.signal});
        if (!response.ok) throw new Error([403,429].includes(response.status) ? 'rate' : 'network');
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('format');
        const fragment = document.createDocumentFragment();
        let count = 0;
        for (const item of data) {
          if (!item || typeof item !== 'object' || item.pull_request) continue;
          if (questions && (!Array.isArray(item.labels) || !item.labels.some(l => l && (typeof l === 'string' ? l : l.name) === 'blog-question'))) continue;
          const node = card(item, questions);
          if (node) {fragment.append(node); count++;}
        }
        list.replaceChildren(fragment);
        status.textContent = count ? `${questions ? '최근 질문' : '댓글'} ${count}개를 불러왔습니다. 최대 20개까지 표시하며 전체 내용은 원본 게시판에서 볼 수 있습니다.` : questions ? '아직 등록된 질문이 없습니다. 첫 질문을 남겨 주세요.' : '아직 댓글이 없습니다. 첫 의견을 남겨 주세요.';
      } catch (error) {
        status.textContent = error.message === 'rate' ? '잠시 요청이 많아 불러오지 못했습니다. 원본 게시판 링크에서 바로 확인할 수 있습니다.' : '불러오지 못했습니다. 다시 시도하거나 원본 게시판 링크를 이용해 주세요.';
      } finally {
        clearTimeout(timer);
        button.disabled = false;
        button.textContent = questions ? '질문 다시 불러오기' : '댓글 다시 불러오기';
        panel.removeAttribute('aria-busy');
      }
    });
  }
})();
