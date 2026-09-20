(() => {
  'use strict';
  const content = window.siteContent || {};
  const qs = (s) => document.querySelector(s);
  const safeUrl = (url, hosts) => { try { const u = new URL(url); return u.protocol === 'https:' && (!hosts || hosts.includes(u.hostname)) ? u.href : ''; } catch { return ''; } };
  const menu = qs('.menu-toggle');
  menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); qs('#main-nav').classList.toggle('is-open', open); });
  qs('#main-nav').addEventListener('click', (event) => { if (event.target.closest('a')) { menu.setAttribute('aria-expanded', 'false'); qs('#main-nav').classList.remove('is-open'); } });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { menu.setAttribute('aria-expanded', 'false'); qs('#main-nav').classList.remove('is-open'); } });
  for (const dialog of document.querySelectorAll('dialog')) {
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  }
  async function copy(text, status) { try { await navigator.clipboard.writeText(text); status.textContent = 'Скопировано'; } catch { status.textContent = 'Не удалось скопировать автоматически. Выделите и скопируйте текст выше.'; } }
  const tgUrl = safeUrl(content.telegramUrl, ['t.me', 'telegram.me']) || 'https://t.me/+79054563713';
  qs('#telegram-contact').href = tgUrl;
  qs('#max-contact').addEventListener('click', () => { const url = safeUrl(content.maxUrl, ['max.ru']); if (url) window.open(url, '_blank', 'noopener,noreferrer'); else qs('#max-dialog').showModal(); });
  qs('#copy-phone').addEventListener('click', () => copy('+79054563713', qs('#phone-copy-status')));
  const phone = qs('#phone');
  phone.addEventListener('input', () => { phone.setCustomValidity(''); phone.removeAttribute('aria-invalid'); qs('#phone-error').hidden = true; });
  let message = '';
  qs('#request-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const digits = phone.value.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) { phone.setCustomValidity('Введите телефон: от 10 до 15 цифр.'); phone.setAttribute('aria-invalid', 'true'); qs('#phone-error').hidden = false; phone.reportValidity(); return; }
    const data = new FormData(event.currentTarget);
    message = ['Здравствуйте, Роман! Хочу обсудить недвижимость.', data.get('name').trim() && `Имя: ${data.get('name').trim()}`, `Телефон: ${data.get('phone').trim()}`, `Задача: ${data.get('intent')}`, data.get('property') && `Недвижимость: ${data.get('property')}`, data.get('comment').trim() && `Комментарий: ${data.get('comment').trim()}`].filter(Boolean).join('\n');
    qs('#request-preview').textContent = message;
    qs('#send-wa').href = `https://wa.me/79054563713?text=${encodeURIComponent(message)}`;
    const tg = new URL(tgUrl); tg.searchParams.set('text', message); qs('#send-tg').href = tg.href;
    qs('#copy-status').textContent = '';
    qs('#request-dialog').showModal();
  });
  qs('#copy-request').addEventListener('click', () => copy(message, qs('#copy-status')));
  const reviews = Array.isArray(content.reviews) ? content.reviews.filter(r => r && typeof r.text === 'string' && r.text.trim() && r.name) : [];
  const wall = qs('#review-wall');
  if (reviews.length) {
    qs('#reviews-empty').hidden = true; wall.hidden = false;
    reviews.forEach((review, index) => {
      const card = document.createElement('button'); card.type = 'button'; card.className = 'review-card'; card.style.setProperty('--tilt', `${[-4, 3, -2, 4, -3, 2][index % 6]}deg`); card.style.setProperty('--delay', `${-(index % 5)}s`);
      const quote = document.createElement('span'); quote.className = 'quote-mark'; quote.textContent = '“'; quote.setAttribute('aria-hidden', 'true');
      const text = document.createElement('p'); text.className = 'review-excerpt'; text.textContent = review.text;
      const author = document.createElement('strong'); author.textContent = review.name;
      const meta = document.createElement('span'); meta.className = 'review-meta'; meta.textContent = [review.task, review.date].filter(Boolean).join(' · ');
      card.append(quote, text, author, meta); card.setAttribute('aria-label', `Читать отзыв: ${review.name}`);
      card.addEventListener('click', () => { qs('#review-title').textContent = review.name; qs('#review-full-text').textContent = review.text; const source = safeUrl(review.sourceUrl); qs('#review-source').hidden = !source; if (source) qs('#review-source').href = source; qs('#review-dialog').showModal(); });
      wall.append(card);
    });
    const toggle = qs('#reviews-toggle'); toggle.hidden = false;
    toggle.addEventListener('click', () => { const list = wall.classList.toggle('as-list'); toggle.textContent = list ? 'Вернуть объемный вид ↗' : 'Все отзывы списком ↗'; });
  }
  const cases = Array.isArray(content.cases) ? content.cases.filter(c => c && c.title && c.result) : [];
  if (cases.length) {
    qs('#cases').hidden = false;
    cases.forEach(item => { const article = document.createElement('article'); article.className = 'case-card'; if (item.image && /^(assets\/|https:\/\/)/.test(item.image)) { const img = document.createElement('img'); img.src = item.image; img.alt = item.imageAlt || item.title; img.loading = 'lazy'; article.append(img); } const title = document.createElement('h3'); title.textContent = item.title; article.append(title); for (const [key, label] of [['task','Задача'],['actions','Моя работа'],['result','Результат']]) { if (!item[key]) continue; const p = document.createElement('p'); const strong = document.createElement('strong'); strong.textContent = `${label}: `; p.append(strong, document.createTextNode(item[key])); article.append(p); } qs('#case-list').append(article); });
  }
  if (content.heroVideo && /^(assets\/|https:\/\/)/.test(content.heroVideo)) {
    const video = qs('#hero-video'); const control = qs('#video-control'); const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    video.src = content.heroVideo; video.muted = true; video.autoplay = !reduced;
    video.addEventListener('loadeddata', () => { video.hidden = false; control.hidden = false; control.textContent = video.paused ? 'Включить видео' : 'Приостановить видео'; });
    video.addEventListener('error', () => { video.hidden = true; control.hidden = true; });
    video.addEventListener('play', () => { control.textContent = 'Приостановить видео'; });
    video.addEventListener('pause', () => { control.textContent = 'Включить видео'; });
    control.addEventListener('click', () => { if (video.paused) video.play().catch(() => {}); else video.pause(); });
    if (!reduced) video.play().catch(() => {});
  }
})();
