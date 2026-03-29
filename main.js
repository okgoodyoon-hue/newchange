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

// --- 통합 실시간 뉴스 소스 ---
const latestNewsSources = [
  'https://news.sbs.co.kr/news/rss/news_top.xml',
  'https://news.kbs.co.kr/rss/news9.xml',
  'https://imnews.imbc.com/rss/news/news_00.xml',
  'https://www.yonhapnewstv.co.kr/browse/feed/'
];

// --- 뉴스 가져오기 로직 (최신 속보 통합) ---
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
    
    if (allItems.length === 0) throw new Error('No news');
    // 최신 뉴스 10개만 추출 (그룹화 포함)
    return groupSimilarNews(allItems).slice(0, 10);
  } catch (e) {
    console.warn("뉴스 로딩 실패, 샘플 사용:", e);
    return [{ title: "[속보] 실시간 뉴스 시스템이 업데이트 되었습니다.", link: "https://news.naver.com", pubDate: new Date().toISOString(), related: [] }];
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
  div.innerHTML = `<div class="auth-card"><h1>감정 일기장</h1><p>닉네임을 입력하고 시작하세요.</p><input type="text" id="nickname" placeholder="닉네임" maxlength="15"><button id="start-btn">시작하기</button></div>`;
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
      <div class="search-container"><input type="text" id="search-bar" class="search-input" placeholder="검색..." value="${state.searchQuery}"></div>
      <div id="calendar-container" class="calendar-wrapper"></div>
      <div id="my-list"></div>
      <div class="best-diary-section"><h2 class="section-title" style="margin-top:2rem;">🏆 인기 일기</h2><div id="best-diary-list"></div></div>
      <div class="public-feed-section"><h2 class="section-title" style="margin-top:2rem;">🌊 공개 피드</h2><div id="feed-list"></div></div>
    </aside>

    <main class="news-column">
      <div class="newspaper-container">
        <div class="newspaper-header">
          <h1 class="newspaper-title">The Daily News</h1>
          <div class="newspaper-meta"><span>REAL-TIME HEADLINES</span><span>${new Date().toLocaleDateString('ko-KR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span><span>LIVE</span></div>
        </div>
        <div id="newspaper-articles"><div class="loader-container"><div class="loader"></div></div></div>
      </div>
      <div class="newspaper-section-header"><h2 class="newspaper-section-title">News Discussion</h2></div>
      <div id="news-list"></div>
    </main>
  `;
  appContainer.appendChild(div);

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

  const newsListCont = div.querySelector('#newspaper-articles');
  fetchLatestHeadlines().then(articles => {
    newsListCont.innerHTML = '';
    
    // 정확히 10개만 노출
    const top10 = articles.slice(0, 10);

    top10.forEach(item => {
      const article = document.createElement('div');
      article.className = 'article-card';
      article.style.padding = '0.8rem 0';
      article.style.position = 'relative';
      
      const source = extractSource(item.link);
      const uniqueRelated = [...new Set(item.related.map(r => extractSource(r.link)))].filter(s => s !== source);
      
      article.innerHTML = `
        <div class="headline-container" style="display:flex; flex-direction:column; gap:0.25rem;">
          <a href="${item.link}" target="_blank" class="article-headline" rel="noopener noreferrer" style="font-size:1.15rem; border-left:4px solid #1a1a1a; padding-left:12px; line-height:1.3; cursor:pointer; display:block;">
            ${item.title}
          </a>
          <div class="related-info" style="font-size:0.7rem; margin-left:12px; color:#666; display:flex; align-items:center; gap:0.5rem;">
            <span style="color:#ff4b2b; font-weight:bold;">${source}</span>
            ${uniqueRelated.length > 0 ? ` 외 ${uniqueRelated.join(', ')}` : ''}
            <span style="margin-left:auto;">${new Date(item.pubDate).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
            <button class="share-to-disc-btn" data-url="${item.link}" data-title="${item.title}" style="border:none; background:none; color:var(--primary); cursor:pointer; font-weight:bold;">💬 토론</button>
          </div>
        </div>
      `;
      
      article.querySelector('.share-to-disc-btn').onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const { url, title } = e.target.dataset;
        const comment = prompt(`"${title}"\n의견을 남겨주세요:`);
        if (comment !== null) {
          state.news.unshift({ id: Date.now().toString(), url, title, comment: comment || "공감!", user: state.user.nickname, timestamp: new Date().toISOString(), empathy: 0, nonEmpathy: 0 });
          render();
        }
      };
      newsListCont.appendChild(article);
    });
  });

  const newsDiscCont = div.querySelector('#news-list');
  (state.news.length ? state.news : mockNews()).forEach(item => {
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
  const quickEmotions = [{ emoji: '😊', label: '행복' }, { emoji: '🥰', label: '사랑' }, { emoji: '🥳', label: '신나' }, { emoji: '😌', label: '편안' }, { emoji: '😴', label: '졸려' }, { emoji: '😢', label: '슬픔' }, { emoji: '😭', label: '눈물' }, { emoji: '😡', label: '화남' }, { emoji: '🤔', label: '고민' }];
  const div = document.createElement('div');
  div.innerHTML = `<div class="post-tabs" style="display:flex; gap:1rem; margin-bottom:1rem;"><button class="tab-btn active" data-tab="diary">일기</button><button class="tab-btn" data-tab="news">뉴스</button></div><div id="tab-content"></div><div id="sentiment-preview"></div>`;
  const tabs = div.querySelectorAll('.tab-btn');
  tabs.forEach(tab => { tab.onclick = () => { tabs.forEach(t => t.classList.remove('active')); tab.classList.add('active'); renderTabContent(div.querySelector('#tab-content'), tab.dataset.tab); }; });
  function renderTabContent(container, type) {
    container.innerHTML = '';
    if (type === 'diary') {
      container.innerHTML = `<h2 class="section-title">✍️ 일기 쓰기</h2><div class="auth-card"><textarea id="diary-text" maxlength="100" placeholder="오늘 하루는?"></textarea><div class="char-count">0/100</div><div class="quick-emotion-section"><div class="quick-emotion-list">${quickEmotions.map(e => `<button class="emotion-tag-btn" data-val="${e.emoji} ${e.label}">${e.emoji} ${e.label}</button>`).join('')}</div></div><div class="privacy-toggle" style="margin-top:1.5rem;"><label><input type="checkbox" id="is-public" checked> 공개</label></div><button id="post-btn">저장</button></div>`;
      const textarea = container.querySelector('#diary-text');
      const updateS = () => { container.querySelector('.char-count').textContent = `${textarea.value.length}/100`; renderSentiment(div.querySelector('#sentiment-preview'), analyzeSentiment(textarea.value)); };
      textarea.oninput = updateS;
      container.querySelectorAll('.emotion-tag-btn').forEach(btn => { btn.onclick = () => { if (textarea.value.length + btn.dataset.val.length + 1 <= 100) { textarea.value += (textarea.value ? ' ' : '') + btn.dataset.val; updateS(); } }; });
      container.querySelector('#post-btn').onclick = () => { if (!textarea.value) return; state.entries.unshift({ id: Date.now().toString(), text: textarea.value, user: state.user.nickname, likes: 0, timestamp: new Date().toISOString(), dateString: new Date().toLocaleDateString(), sentiment: analyzeSentiment(textarea.value), isPublic: container.querySelector('#is-public').checked }); navigate('home'); };
    } else {
      container.innerHTML = `<h2 class="section-title">📰 뉴스 공유</h2><div class="auth-card"><input type="text" id="news-url" placeholder="URL"><textarea id="news-comment" placeholder="의견"></textarea><button id="news-post-btn">공유</button></div>`;
      container.querySelector('#news-post-btn').onclick = () => { const url = container.querySelector('#news-url').value; if (!url) return; state.news.unshift({ id: Date.now().toString(), url, comment: container.querySelector('#news-comment').value, user: state.user.nickname, timestamp: new Date().toISOString(), empathy: 0, nonEmpathy: 0 }); navigate('home'); };
    }
  }
  renderTabContent(div.querySelector('#tab-content'), 'diary'); appContainer.appendChild(div);
}

function renderSentiment(container, scores) {
  container.innerHTML = `<div class="emotion-meter"><div class="emotion-bar joy" style="width:${scores.joy}%">기쁨</div><div class="emotion-bar sad" style="width:${scores.sad}%">슬픔</div><div class="emotion-bar anger" style="width:${scores.anger}%">분노</div><div class="emotion-bar calm" style="width:${scores.calm}%">평온</div></div>`;
}

function renderChat() { appContainer.innerHTML = `<h2 class="section-title">💬 채팅</h2><div class="auth-card">준비 중입니다.</div>`; }
function mockNews() { return [{ id:'n1', url:'https://news.example.com/1', title:'환영합니다!', comment:'좋은 뉴스네요.', user:'관리자', empathy:10, nonEmpathy:1, timestamp:new Date().toISOString() }]; }
function mockBest10() { return [{ id:'b1', text:'정말 멋진 날! ✨', user:'사용자1', likes:100, sentiment:{joy:100,sad:0,anger:0,calm:0} }]; }
function mockFeed() { return [{ id:'f1', text:'반가워요!', user:'사용자2', likes:5, sentiment:{joy:50,sad:0,anger:0,calm:50} }]; }

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
