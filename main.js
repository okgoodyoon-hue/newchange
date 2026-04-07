import { analyzeSentiment } from './utils/sentiment.js';

// --- 상태 관리 ---
let currentView = 'auth';
const state = {
  user: null,
  entries: [],
  news: [],
  selectedDate: null,
  searchQuery: ''
};

// --- 통합 실시간 뉴스 소스 ---
const latestNewsSources = [
  'https://news.sbs.co.kr/news/rss/news_top.xml',
  'https://news.kbs.co.kr/rss/news9.xml',
  'https://imnews.imbc.com/rss/news/news_00.xml',
  'https://www.yonhapnewstv.co.kr/browse/feed/',
  'https://fs.jtbc.co.kr/RSS/newsflash.xml',
  'https://www.chosun.com/arc/outboundfeeds/rss/category/national/?outputType=xml',
  'https://rss.donga.com/total.xml',
  'https://www.hani.co.kr/rss/',
  'https://www.khan.co.kr/rss/rssdata/total_news.xml'
];

async function fetchLatestHeadlines() {
  const API_KEY = 'p5n5v8v2r1j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3';
  try {
    const fetchPromises = latestNewsSources.map(url => 
      fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&api_key=${API_KEY}&t=${Date.now()}`)
        .then(res => res.json())
        .then(data => data.status === 'ok' ? data.items : [])
        .catch(() => [])
    );
    const results = await Promise.all(fetchPromises);
    const allItems = results.flat()
      .filter(item => item.title && item.link)
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    return allItems;
  } catch (e) {
    console.warn("뉴스 로딩 실패:", e);
    return [];
  }
}

function extractSource(url) {
  if (!url) return '언론사';
  if (url.includes('sbs.co.kr')) return 'SBS';
  if (url.includes('kbs.co.kr')) return 'KBS';
  if (url.includes('imbc.com')) return 'MBC';
  if (url.includes('yonhap')) return '연합뉴스';
  if (url.includes('jtbc')) return 'JTBC';
  if (url.includes('chosun')) return '조선일보';
  if (url.includes('donga')) return '동아일보';
  if (url.includes('hani')) return '한겨레';
  if (url.includes('khan')) return '경향신문';
  return '언론사';
}

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return '방금 전';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return new Date(date).toLocaleDateString();
}

// --- 뷰 라우터 ---
const appContainer = document.getElementById('app');
function navigate(view) { currentView = view; render(); }

function render() {
  appContainer.innerHTML = '';
  if (!state.user && currentView !== 'auth') { renderAuth(); return; }
  switch (currentView) {
    case 'auth': renderAuth(); break;
    case 'home': renderHome(); break;
    case 'post': renderPost(); break;
    default: renderHome();
  }
}

function renderAuth() {
  const div = document.createElement('div');
  div.className = 'view-auth';
  div.innerHTML = `
    <div class="auth-card">
      <h1>Daily Hot Issue</h1>
      <p>오늘의 핫이슈를 확인하고 의견을 공유하세요.</p>
      <input type="text" id="nickname" placeholder="사용할 닉네임" maxlength="15">
      <button id="start-btn">뉴스 보기</button>
    </div>
  `;
  div.querySelector('#start-btn').onclick = () => {
    const nickname = div.querySelector('#nickname').value.trim();
    if (!nickname) return alert('닉네임을 입력해주세요.');
    state.user = { nickname };
    navigate('home');
  };
  appContainer.appendChild(div);
}

async function renderHome() {
  const div = document.createElement('div');
  div.className = 'home-layout fade-in';
  div.innerHTML = `
    <header class="main-header">
      <div class="header-inner">
        <h1 class="brand" onclick="location.reload()">Daily Hot Issue</h1>
        <div class="header-right">
          <span class="user-info"><strong>${state.user.nickname}</strong>님</span>
          <button id="post-nav-btn" class="btn-primary">📝 의견 쓰기</button>
        </div>
      </div>
    </header>

    <div class="news-ticker">
      <div class="ticker-label">BREAKING</div>
      <div id="ticker-content" class="ticker-text">실시간 속보를 불러오는 중...</div>
    </div>

    <main class="dashboard-grid">
      <!-- 뉴스 메인 섹션 -->
      <section class="news-main-section">
        <div class="section-header">
          <h2 class="newspaper-title">The Daily News</h2>
          <div class="meta-info">
            <span>${new Date().toLocaleDateString('ko-KR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span class="live-indicator" id="refresh-news">LIVE ↻</span>
          </div>
        </div>
        <div id="hot-issue-container" class="hot-issue-layout">
          <div class="loader"></div>
        </div>
      </section>

      <!-- 사이드바 (토론 & 기록) -->
      <aside class="side-section">
        <div class="card-section">
          <h3 class="card-title">💬 실시간 반응</h3>
          <div id="discussion-list" class="disc-list"></div>
        </div>
        <div class="card-section">
          <h3 class="card-title">📅 나의 생각 기록</h3>
          <div id="my-records" class="record-list"></div>
        </div>
      </aside>
    </main>
  `;
  appContainer.appendChild(div);

  div.querySelector('#post-nav-btn').onclick = () => navigate('post');

  const updateNews = async () => {
    const container = div.querySelector('#hot-issue-container');
    const ticker = div.querySelector('#ticker-content');
    const articles = await fetchLatestHeadlines();
    
    if (articles.length > 0) {
      ticker.textContent = articles.map(a => `[${extractSource(a.link)}] ${a.title}`).join(' 　 | 　 ');
      container.innerHTML = '';

      // 1. 톱 기사
      const top = articles[0];
      const topEl = document.createElement('div');
      topEl.className = 'top-story-card';
      topEl.innerHTML = `
        <div class="top-story-badge">TOP ISSUE</div>
        <a href="${top.link}" target="_blank" class="top-title">${top.title}</a>
        <p class="top-desc">${top.description || '지금 전국에서 가장 화제가 되고 있는 기사입니다.'}</p>
        <div class="top-meta">
          <span class="source">${extractSource(top.link)}</span>
          <span class="time">${timeAgo(top.pubDate)}</span>
          <button class="share-btn" data-url="${top.link}" data-title="${top.title}">의견 공유</button>
        </div>
      `;
      container.appendChild(topEl);

      // 2. 헤드라인 리스트
      const grid = document.createElement('div');
      grid.className = 'headlines-grid';
      articles.slice(1, 10).forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'headline-item';
        itemEl.innerHTML = `
          <div class="item-meta">
            <span class="source">${extractSource(item.link)}</span>
            <span class="time">${new Date(item.pubDate).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <a href="${item.link}" target="_blank" class="item-title">${item.title}</a>
          <button class="item-share-btn" data-url="${item.link}" data-title="${item.title}">💬</button>
        `;
        grid.appendChild(itemEl);
      });
      container.appendChild(grid);

      // 공유 버튼 이벤트
      div.querySelectorAll('.share-btn, .item-share-btn').forEach(btn => {
        btn.onclick = (e) => {
          const { url, title } = e.currentTarget.dataset;
          const comment = prompt(`"${title}"\n의견을 남겨주세요:`);
          if (comment) {
            state.news.unshift({ id: Date.now(), url, title, comment, user: state.user.nickname, timestamp: new Date().toISOString() });
            render();
          }
        };
      });
    }
  };

  updateNews();
  div.querySelector('#refresh-news').onclick = updateNews;

  // 토론 및 기록 렌더링
  const discCont = div.querySelector('#discussion-list');
  state.news.slice(0, 5).forEach(n => {
    const el = document.createElement('div');
    el.className = 'disc-card';
    el.innerHTML = `<strong>${n.user}</strong>: "${n.comment}"<br><small>${n.title}</small>`;
    discCont.appendChild(el);
  });

  const recordCont = div.querySelector('#my-records');
  state.entries.filter(e => e.user === state.user.nickname).slice(0, 5).forEach(e => {
    const el = document.createElement('div');
    el.className = 'record-card';
    el.innerHTML = `<div class="record-text">${e.text}</div><div class="record-date">${timeAgo(e.timestamp)}</div>`;
    recordCont.appendChild(el);
  });
}

function renderPost() {
  const div = document.createElement('div');
  div.className = 'post-view fade-in';
  div.innerHTML = `
    <header class="main-header"><div class="header-inner"><h1 class="brand" onclick="navigate('home')">← 뒤로가기</h1></div></header>
    <main class="post-container">
      <div class="auth-card">
        <h2>📝 오늘의 짧은 생각</h2>
        <textarea id="post-text" placeholder="오늘 뉴스에 대한 생각이나 일상을 100자 이내로 적어주세요." maxlength="100"></textarea>
        <div class="char-count">0/100</div>
        <button id="save-post" class="btn-primary">저장하기</button>
      </div>
    </main>
  `;
  appContainer.appendChild(div);

  const txt = div.querySelector('#post-text');
  txt.oninput = () => div.querySelector('.char-count').textContent = `${txt.value.length}/100`;
  div.querySelector('#save-post').onclick = () => {
    if (!txt.value.trim()) return;
    state.entries.unshift({ id: Date.now(), text: txt.value, user: state.user.nickname, timestamp: new Date().toISOString() });
    navigate('home');
  };
}

render();
