import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, orderBy, limit, getDocs, updateDoc, doc, onSnapshot, increment } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { analyzeSentiment } from './utils/sentiment.js';

// --- Firebase 설정 ---
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// --- 상태 관리 ---
let currentView = 'auth';

const state = {
  user: null,
  entries: [],
  best10: [],
  news: [],
  selectedDate: null,
  searchQuery: '',
  mainTab: 'diary'
};

// --- 뉴스 카테고리 (언론사 다중화) ---
const newsSources = {
  top: [
    'https://news.sbs.co.kr/news/rss/news_top.xml',
    'https://news.kbs.co.kr/rss/news9.xml',
    'https://imnews.imbc.com/rss/news/news_00.xml',
    'https://www.yonhapnewstv.co.kr/browse/feed/'
  ],
  pol: [
    'https://news.sbs.co.kr/news/rss/news_politics.xml',
    'https://news.kbs.co.kr/rss/news_politics.xml',
    'https://imnews.imbc.com/rss/news/news_01.xml'
  ],
  eco: [
    'https://news.sbs.co.kr/news/rss/news_economy.xml',
    'https://news.kbs.co.kr/rss/news_economy.xml',
    'https://imnews.imbc.com/rss/news/news_02.xml'
  ],
  soc: [
    'https://news.sbs.co.kr/news/rss/news_society.xml',
    'https://news.kbs.co.kr/rss/news_society.xml',
    'https://imnews.imbc.com/rss/news/news_03.xml'
  ],
  cul: [
    'https://news.sbs.co.kr/news/rss/news_lifestyle.xml',
    'https://news.kbs.co.kr/rss/news_culture.xml',
    'https://imnews.imbc.com/rss/news/news_07.xml'
  ],
  sci: [
    'https://news.sbs.co.kr/news/rss/news_it_science.xml',
    'https://news.kbs.co.kr/rss/news_digital.xml',
    'https://imnews.imbc.com/rss/news/news_08.xml'
  ]
};

const newsCategories = [
  { id: 'top', name: '주요 뉴스' },
  { id: 'pol', name: '정치' },
  { id: 'eco', name: '경제' },
  { id: 'soc', name: '사회' },
  { id: 'cul', name: '생활/문화' },
  { id: 'sci', name: 'IT/과학' }
];

let selectedCategory = 'top';

// --- 뉴스 가져오기 로직 ---
async function fetchLiveNews(catId = 'top') {
  const urls = newsSources[catId] || newsSources.top;
  const API_KEY = 'p5n5v8v2r1j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3';
  try {
    const fetchPromises = urls.map(url => 
      fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&api_key=${API_KEY}&t=${Date.now()}`)
        .then(res => res.json())
        .then(data => data.status === 'ok' ? data.items : [])
        .catch(() => [])
    );
    const results = await Promise.all(fetchPromises);
    const allItems = results.flat().sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    if (allItems.length === 0) throw new Error('No news');
    return groupSimilarNews(allItems);
  } catch (e) {
    console.warn("뉴스 로딩 실패, 샘플 데이터 사용:", e);
    return [{ title: "[공지] 뉴스 시스템 점검 중입니다.", link: "#", pubDate: new Date().toISOString(), description: "잠시 후 시도해주세요.", author: "운영팀", related: [] }];
  }
}

function groupSimilarNews(items) {
  const grouped = [];
  const visited = new Set();
  for (let i = 0; i < items.length; i++) {
    if (visited.has(i)) continue;
    const current = items[i];
    const group = { ...current, related: [] };
    visited.add(i);
    for (let j = i + 1; j < items.length; j++) {
      if (visited.has(j)) continue;
      if (isSimilar(current.title, items[j].title)) {
        group.related.push(items[j]);
        visited.add(j);
      }
    }
    grouped.push(group);
  }
  return grouped;
}

function isSimilar(t1, t2) {
  const s1 = t1.replace(/[^가-힣a-zA-Z0-9\s]/g, '');
  const s2 = t2.replace(/[^가-힣a-zA-Z0-9\s]/g, '');
  const w1 = s1.split(/\s+/).filter(w => w.length > 1);
  const w2 = s2.split(/\s+/).filter(w => w.length > 1);
  const common = w1.filter(w => w2.includes(w));
  return common.length >= 2 || (common.length / Math.min(w1.length, w2.length)) > 0.3;
}

function extractSource(url) {
  if (!url) return '언론사';
  if (url.includes('sbs.co.kr')) return 'SBS';
  if (url.includes('kbs.co.kr')) return 'KBS';
  if (url.includes('imbc.com')) return 'MBC';
  if (url.includes('yonhap')) return '연합뉴스';
  return '언론사';
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
    case 'chat': renderChat(); break;
    default: renderHome();
  }
  if (state.user) renderNav();
}

function renderNav() {
  const nav = document.createElement('nav');
  nav.className = 'nav-bar';
  nav.innerHTML = `
    <a href="#" class="nav-item ${currentView === 'home' ? 'active' : ''}" data-view="home">홈 피드</a>
    <a href="#" class="nav-item ${currentView === 'post' ? 'active' : ''}" data-view="post">기록하기</a>
    <a href="#" class="nav-item ${currentView === 'chat' ? 'active' : ''}" data-view="chat">채팅</a>
  `;
  nav.querySelectorAll('.nav-item').forEach(item => {
    item.onclick = (e) => { e.preventDefault(); navigate(item.dataset.view); };
  });
  appContainer.appendChild(nav);
}

function renderAuth() {
  const div = document.createElement('div');
  div.className = 'view-auth';
  div.innerHTML = `
    <div class="auth-card">
      <h1>감정 일기장</h1>
      <p>닉네임을 입력하고 오늘을 시작하세요.</p>
      <input type="text" id="nickname" placeholder="닉네임 입력" maxlength="15">
      <button id="start-btn">일기 시작하기</button>
    </div>
  `;
  div.querySelector('#start-btn').onclick = async () => {
    const nickname = div.querySelector('#nickname').value.trim();
    if (!nickname) return alert('닉네임을 입력해주세요.');
    state.user = { nickname, id: Date.now().toString(), likedEntries: [], following: [] };
    localStorage.setItem('diary_user', JSON.stringify(state.user));
    navigate('home');
  };
  appContainer.appendChild(div);
}

// --- View: Home (Split Layout) ---
async function renderHome() {
  const div = document.createElement('div');
  div.className = 'dashboard-container';
  div.innerHTML = `
    <aside class="diary-column">
      <h2 class="section-title">📅 나의 기록실</h2>
      <div class="search-container">
        <input type="text" id="search-bar" class="search-input" placeholder="기억을 검색하세요..." value="${state.searchQuery}">
      </div>
      <div id="calendar-container" class="calendar-wrapper"></div>
      <div id="my-list"></div>
      
      <div class="best-diary-section">
        <h2 class="section-title" style="margin-top: 2rem;">🏆 인기 일기</h2>
        <div id="best-diary-list"></div>
      </div>

      <div class="public-feed-section">
        <h2 class="section-title" style="margin-top: 2rem;">🌊 공개 피드</h2>
        <div id="feed-list"></div>
      </div>
    </aside>

    <main class="news-column">
      <div class="newspaper-container">
        <div class="newspaper-header">
          <h1 class="newspaper-title">The Daily News</h1>
          <div class="newspaper-meta">
            <span>제 ${Math.floor(Date.now()/1000000)}호</span>
            <span>${new Date().toLocaleDateString('ko-KR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>통합 뉴스룸</span>
          </div>
        </div>
        <div class="news-categories">
          ${newsCategories.map(cat => `<span class="cat-tag ${selectedCategory === cat.id ? 'active' : ''}" data-id="${cat.id}">${cat.name}</span>`).join('')}
        </div>
        <div id="newspaper-articles"><div class="loader-container"><div class="loader"></div></div></div>
      </div>
      
      <div class="main-tabs" style="margin-top: 2rem;">
        <button class="main-tab-btn active">뉴스 토론방</button>
      </div>
      <div id="news-list"></div>
    </main>
  `;
  appContainer.appendChild(div);

  // Diary Logic (Left)
  renderCalendar(div.querySelector('#calendar-container'));
  const searchInput = div.querySelector('#search-bar');
  searchInput.oninput = (e) => { state.searchQuery = e.target.value.toLowerCase(); filterMyHistory(); };
  filterMyHistory();

  const bestDiaryCont = div.querySelector('#best-diary-list');
  const bestDiary = [...state.entries].filter(e => e.isPublic).sort((a, b) => b.likes - a.likes).slice(0, 3);
  renderListInside(bestDiaryCont, bestDiary.length ? bestDiary : mockBest10().slice(0, 2));

  const publicFeedCont = div.querySelector('#feed-list');
  const publicFeed = state.entries.filter(e => e.isPublic && e.user !== state.user.nickname).slice(0, 5);
  renderListInside(publicFeedCont, publicFeed.length ? publicFeed : mockFeed());

  // News Logic (Right)
  div.querySelectorAll('.cat-tag').forEach(tag => {
    tag.onclick = () => { selectedCategory = tag.dataset.id; render(); };
  });

  const newsListCont = div.querySelector('#newspaper-articles');
  fetchLiveNews(selectedCategory).then(articles => {
    newsListCont.innerHTML = '';
    const isTop = selectedCategory === 'top';
    articles.slice(0, 15).forEach(item => {
      const article = document.createElement('div');
      article.className = 'article-card';
      if (isTop) article.style.padding = '0.75rem 0';
      const source = extractSource(item.link);
      const uniqueRelated = [...new Set(item.related.map(r => extractSource(r.link)))].filter(s => s !== source);
      article.innerHTML = `
        <div class="headline-container" style="display:flex; flex-direction:column; gap:0.25rem;">
          <a href="${item.link}" target="_blank" class="article-headline" style="${isTop ? 'font-size:1.1rem; border-left:4px solid #1a1a1a; padding-left:12px;' : ''}">${item.title}</a>
          <div class="related-info" style="font-size:0.7rem; margin-left:${isTop ? '12px' : '0'}; color:#666;">
            <span style="color:#ff4b2b; font-weight:bold;">${source}</span>
            ${uniqueRelated.length > 0 ? ` 외 <span style="font-weight:bold; color:#1a1a1a;">${uniqueRelated.join(', ')}</span> 보도` : ''}
          </div>
        </div>
        ${isTop ? '' : `<div class="article-content" style="column-count:1;">${item.description.replace(/<[^>]*>?/gm, '').substring(0, 150)}...</div>`}
        <div class="article-footer">
          <div class="article-meta-info"><span>${new Date(item.pubDate).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span></div>
          <button class="share-to-disc-btn" data-url="${item.link}" data-title="${item.title}">💬 토론</button>
        </div>
      `;
      article.querySelector('.share-to-disc-btn').onclick = (e) => {
        e.preventDefault();
        const { url, title } = e.target.dataset;
        const comment = prompt(`"${title}"\n의견을 남겨주세요:`);
        if (comment !== null) {
          state.news.unshift({ id: Date.now().toString(), url, title, comment: comment || "공감합니다!", user: state.user.nickname, timestamp: new Date().toISOString(), empathy: 0, nonEmpathy: 0 });
          render();
        }
      };
      newsListCont.appendChild(article);
    });
  });

  const newsDiscCont = div.querySelector('#news-list');
  const newsItems = state.news.length ? state.news : mockNews();
  newsItems.forEach(item => {
    const card = document.createElement('news-card'); card.setAttribute('data', JSON.stringify(item)); newsDiscCont.appendChild(card);
  });
}

function renderListInside(container, items) {
  container.innerHTML = '';
  items.forEach(item => {
    const card = document.createElement('diary-card'); card.setAttribute('data', JSON.stringify(item)); container.appendChild(card);
  });
}

function renderCalendar(container) {
  const scroll = document.createElement('div'); scroll.className = 'calendar-scroll';
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const date = new Date(today); date.setDate(today.getDate() - i); const dateStr = date.toLocaleDateString();
    const item = document.createElement('div'); item.className = `date-item ${state.selectedDate === dateStr ? 'active' : ''}`;
    item.innerHTML = `<span class="day">${date.toLocaleDateString('ko-KR', { weekday: 'short' })}</span><span class="date">${date.getDate()}</span>`;
    item.onclick = () => { state.selectedDate = (state.selectedDate === dateStr) ? null : dateStr; render(); };
    scroll.appendChild(item);
  }
  container.appendChild(scroll);
  setTimeout(() => scroll.scrollLeft = scroll.scrollWidth, 100);
}

function filterMyHistory() {
  const container = document.getElementById('my-list'); if (!container) return;
  let filtered = state.entries.filter(e => e.user === state.user.nickname);
  if (state.selectedDate) filtered = filtered.filter(e => e.dateString === state.selectedDate);
  if (state.searchQuery) filtered = filtered.filter(e => e.text.toLowerCase().includes(state.searchQuery));
  filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  container.innerHTML = '';
  if (filtered.length === 0) container.innerHTML = `<div class="empty-state">결과 없음</div>`;
  else filtered.forEach(item => { const card = document.createElement('diary-card'); card.setAttribute('data', JSON.stringify(item)); container.appendChild(card); });
}

function renderPost() {
  const div = document.createElement('div');
  div.innerHTML = `<div class="post-tabs" style="display:flex; gap:1rem; margin-bottom:1rem;"><button class="tab-btn active" data-tab="diary">일기</button><button class="tab-btn" data-tab="news">뉴스</button></div><div id="tab-content"></div><div id="sentiment-preview"></div>`;
  const tabs = div.querySelectorAll('.tab-btn');
  tabs.forEach(tab => { tab.onclick = () => { tabs.forEach(t => t.classList.remove('active')); tab.classList.add('active'); renderTabContent(div.querySelector('#tab-content'), tab.dataset.tab); }; });
  function renderTabContent(container, type) {
    container.innerHTML = '';
    if (type === 'diary') {
      container.innerHTML = `<h2 class="section-title">✍️ 일기 쓰기</h2><div class="auth-card"><textarea id="diary-text" maxlength="100" placeholder="오늘 하루는?"></textarea><div class="char-count">0/100</div><div class="privacy-toggle"><label><input type="checkbox" id="is-public" checked> 공개</label></div><button id="post-btn">저장</button></div>`;
      const textarea = container.querySelector('#diary-text');
      textarea.oninput = () => { container.querySelector('.char-count').textContent = `${textarea.value.length}/100`; renderSentiment(div.querySelector('#sentiment-preview'), analyzeSentiment(textarea.value)); };
      container.querySelector('#post-btn').onclick = () => { if (!textarea.value) return; state.entries.unshift({ id: Date.now().toString(), text: textarea.value, user: state.user.nickname, likes: 0, timestamp: new Date().toISOString(), dateString: new Date().toLocaleDateString(), sentiment: analyzeSentiment(textarea.value), isPublic: container.querySelector('#is-public').checked }); navigate('home'); };
    } else {
      container.innerHTML = `<h2 class="section-title">📰 뉴스 공유</h2><div class="auth-card"><input type="text" id="news-url" placeholder="URL 주소"><textarea id="news-comment" placeholder="의견"></textarea><button id="news-post-btn">공유</button></div>`;
      container.querySelector('#news-post-btn').onclick = () => { const url = container.querySelector('#news-url').value; if (!url) return; state.news.unshift({ id: Date.now().toString(), url, comment: container.querySelector('#news-comment').value, user: state.user.nickname, timestamp: new Date().toISOString(), empathy: 0, nonEmpathy: 0 }); navigate('home'); };
    }
  }
  renderTabContent(div.querySelector('#tab-content'), 'diary'); appContainer.appendChild(div);
}

function renderSentiment(container, scores) {
  container.innerHTML = `<div class="emotion-meter"><div class="emotion-bar joy" style="width:${scores.joy}%">기쁨</div><div class="emotion-bar sad" style="width:${scores.sad}%">슬픔</div><div class="emotion-bar anger" style="width:${scores.anger}%">분노</div><div class="emotion-bar calm" style="width:${scores.calm}%">평온</div></div>`;
}

function renderChat() { appContainer.innerHTML = `<h2 class="section-title">💬 채팅</h2><div class="auth-card">준비 중입니다.</div>`; }
function mockNews() { return [{ id:'n1', url:'https://news.example.com/1', comment:'좋은 뉴스!', user:'관리자', empathy:10, nonEmpathy:1, timestamp:new Date().toISOString() }]; }
function mockBest10() { return [{ id:'b1', text:'최고의 날! ✨', user:'사용자1', likes:100, sentiment:{joy:100,sad:0,anger:0,calm:0} }]; }
function mockFeed() { return [{ id:'f1', text:'안녕하세요!', user:'사용자2', likes:5, sentiment:{joy:50,sad:0,anger:0,calm:50} }]; }

class DiaryCard extends HTMLElement {
  connectedCallback() { const data = JSON.parse(this.getAttribute('data')); this.innerHTML = `<div class="diary-card"><div class="card-header"><span class="card-user">@${data.user}</span></div><div class="card-content">${data.text}</div><div class="card-footer"><button class="like-btn">❤️ ${data.likes}</button></div></div>`; }
}
customElements.define('diary-card', DiaryCard);

class NewsCard extends HTMLElement {
  connectedCallback() {
    const data = JSON.parse(this.getAttribute('data'));
    let displayTitle = data.title || data.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    if (displayTitle.length > 50) displayTitle = displayTitle.substring(0, 50) + '...';
    this.innerHTML = `<div class="news-card"><div class="news-card-header"><a href="${data.url}" target="_blank" class="news-link-display">${displayTitle}</a></div><div class="news-card-body"><div class="news-comment-box">${data.comment || '의견 없음'}</div><div class="empathy-container"><button class="emp-btn agree">👍 ${data.empathy}</button><button class="emp-btn disagree">👎 ${data.nonEmpathy}</button></div></div></div>`;
    this.querySelector('.agree').onclick = () => { data.empathy++; this.renderButtons(this, data); };
    this.querySelector('.disagree').onclick = () => { data.nonEmpathy++; this.renderButtons(this, data); };
  }
  renderButtons(el, data) { el.querySelector('.agree').innerHTML = `👍 ${data.empathy}`; el.querySelector('.disagree').innerHTML = `👎 ${data.nonEmpathy}`; }
}
customElements.define('news-card', NewsCard);

const savedUser = localStorage.getItem('diary_user');
if (savedUser) { state.user = JSON.parse(savedUser); navigate('home'); } else { render(); }
