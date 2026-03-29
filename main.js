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

// --- 뷰 라우터 ---
const appContainer = document.getElementById('app');

function navigate(view) {
  currentView = view;
  render();
}

function render() {
  appContainer.innerHTML = '';
  if (!state.user && currentView !== 'auth') {
    renderAuth();
    return;
  }
  switch (currentView) {
    case 'auth': renderAuth(); break;
    case 'home': renderHome(); break;
    case 'post': renderPost(); break;
    case 'chat': renderChat(); break;
    default: renderHome();
  }
  if (state.user) renderNav();
}

// --- 네비게이션 바 ---
function renderNav() {
  const nav = document.createElement('nav');
  nav.className = 'nav-bar';
  nav.innerHTML = `
    <a href="#" class="nav-item ${currentView === 'home' ? 'active' : ''}" data-view="home">홈 피드</a>
    <a href="#" class="nav-item ${currentView === 'post' ? 'active' : ''}" data-view="post">일기 쓰기</a>
    <a href="#" class="nav-item ${currentView === 'chat' ? 'active' : ''}" data-view="chat">채팅</a>
  `;
  nav.querySelectorAll('.nav-item').forEach(item => {
    item.onclick = (e) => {
      e.preventDefault();
      navigate(item.dataset.view);
    };
  });
  appContainer.appendChild(nav);
}

// --- 뷰: 인증(닉네임 입력) ---
function renderAuth() {
  const div = document.createElement('div');
  div.className = 'view-auth';
  div.innerHTML = `
    <div class="auth-card">
      <h1>감정 일기장</h1>
      <p>닉네임을 입력하고 오늘을 기록하세요.</p>
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

// --- 뉴스 카테고리 ---
const newsCategories = [
  { id: 'top', name: '주요 뉴스', url: 'https://news.sbs.co.kr/news/rss/news_top.xml' },
  { id: 'pol', name: '정치', url: 'https://news.kbs.co.kr/rss/news9.xml' },
  { id: 'eco', name: '경제', url: 'https://news.sbs.co.kr/news/rss/news_economy.xml' },
  { id: 'soc', name: '사회', url: 'https://news.sbs.co.kr/news/rss/news_society.xml' },
  { id: 'cul', name: '생활/문화', url: 'https://news.sbs.co.kr/news/rss/news_lifestyle.xml' },
  { id: 'sci', name: 'IT/과학', url: 'https://news.sbs.co.kr/news/rss/news_it_science.xml' }
];

let selectedCategory = 'top';

// --- 뉴스 가져오기 로직 ---
async function fetchLiveNews(catId = 'top') {
  const cat = newsCategories.find(c => c.id === catId) || newsCategories[0];
  const API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(cat.url)}&api_key=p5n5v8v2r1j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3&t=${Date.now()}`;
  
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Network error');
    const data = await response.json();
    if (data.status === 'ok' && data.items && data.items.length > 0) return data.items;
    throw new Error('No data');
  } catch (e) {
    console.warn("뉴스 로딩 실패, 샘플 데이터 사용:", e);
    return [
      { title: "[속보] 감정 일기장 서비스 정식 런칭!", link: "#", pubDate: new Date().toISOString(), description: "세상과 소통하는 새로운 방식의 일기장 서비스가 시작되었습니다.", author: "편집국" },
      { title: "오늘 하루, 당신의 기분은 어떠셨나요?", link: "#", pubDate: new Date().toISOString(), description: "100글자로 표현하는 오늘의 감정, 지금 바로 기록해보세요.", author: "생활부" }
    ];
  }
}

// --- 뷰: 홈 ---
async function renderHome() {
  const div = document.createElement('div');
  div.innerHTML = `
    <div class="newspaper-container">
      <div class="newspaper-header">
        <h1 class="newspaper-title">The Daily News</h1>
        <div class="newspaper-meta">
          <span>제 ${Math.floor(Date.now()/1000000)}호</span>
          <span>${new Date().toLocaleDateString('ko-KR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span>대한민국, 서울</span>
        </div>
      </div>
      
      <div class="news-categories">
        ${newsCategories.map(cat => `<span class="cat-tag ${selectedCategory === cat.id ? 'active' : ''}" data-id="${cat.id}">${cat.name}</span>`).join('')}
      </div>

      <div class="best-grid">
        <div class="best-column">
          <div id="newspaper-articles">
            <div class="loader-container"><div class="loader"></div></div>
          </div>
        </div>
        <div class="best-column" style="font-family: 'Inter', sans-serif;">
          <h2 class="section-title">🏆 베스트 일기</h2>
          <div id="best-diary-list"></div>
        </div>
      </div>
    </div>

    <div class="main-tabs" style="font-family: 'Inter', sans-serif;">
      <button class="main-tab-btn ${state.mainTab === 'diary' ? 'active' : ''}" data-tab="diary">나의 기록 & 피드</button>
      <button class="main-tab-btn ${state.mainTab === 'news' ? 'active' : ''}" data-tab="news">뉴스 공감/토론</button>
    </div>

    <div id="main-content"></div>
  `;
  appContainer.appendChild(div);

  div.querySelectorAll('.cat-tag').forEach(tag => {
    tag.onclick = () => { selectedCategory = tag.dataset.id; render(); };
  });

  const newsListCont = div.querySelector('#newspaper-articles');
  fetchLiveNews(selectedCategory).then(articles => {
    newsListCont.innerHTML = '';
    if (!articles || articles.length === 0) {
      newsListCont.innerHTML = `<div class="empty-state">뉴스를 불러오는 중입니다...</div>`;
      return;
    }
    const isTop = selectedCategory === 'top';
    const items = isTop ? articles.slice(0, 10) : articles.slice(0, 6);
    items.forEach(item => {
      const article = document.createElement('div');
      article.className = 'article-card';
      if (isTop) article.style.padding = '0.75rem 0';
      article.innerHTML = `
        <div class="headline-container" style="display:flex; flex-direction:column; gap:0.25rem;">
          <a href="${item.link}" target="_blank" class="article-headline" style="${isTop ? 'font-size: 1.15rem; border-left: 4px solid #1a1a1a; padding-left: 12px;' : ''}">
            ${item.title}
          </a>
          <span style="font-size: 0.7rem; color: #ff4b2b; font-weight: bold; margin-left: ${isTop ? '12px' : '0'};">기사 원문 읽기 →</span>
        </div>
        ${isTop ? '' : `<div class="article-content">${item.description.replace(/<[^>]*>?/gm, '').substring(0, 250)}...</div>`}
        <div class="article-footer">
          <div class="article-meta-info">
            <span>${new Date(item.pubDate).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
            <span>${item.author || '언론사'}</span>
          </div>
          <button class="share-to-disc-btn" data-url="${item.link}" data-title="${item.title}">💬 토론</button>
        </div>
      `;
      article.querySelector('.share-to-disc-btn').onclick = (e) => {
        e.preventDefault();
        const { url, title } = e.target.dataset;
        const comment = prompt(`"${title}"\n이 뉴스에 대해 어떻게 생각하시나요?`);
        if (comment !== null) {
          state.news.unshift({ id: Date.now().toString(), url, title, comment: comment || "뉴스 공감합니다!", user: state.user.nickname, timestamp: new Date().toISOString(), empathy: 0, nonEmpathy: 0 });
          state.mainTab = 'news';
          render();
          alert('뉴스 토론방에 공유되었습니다!');
        }
      };
      newsListCont.appendChild(article);
    });
  });

  const bestDiaryCont = div.querySelector('#best-diary-list');
  const bestDiary = [...state.entries].filter(e => e.isPublic).sort((a, b) => b.likes - a.likes).slice(0, 3);
  (bestDiary.length ? bestDiary : mockBest10().slice(0, 2)).forEach(item => {
    const card = document.createElement('diary-card');
    card.setAttribute('data', JSON.stringify(item));
    bestDiaryCont.appendChild(card);
  });

  div.querySelectorAll('.main-tab-btn').forEach(btn => {
    btn.onclick = () => { state.mainTab = btn.dataset.tab; render(); };
  });

  renderMainContent(div.querySelector('#main-content'));
}

function renderMainContent(container) {
  if (state.mainTab === 'diary') {
    container.innerHTML = `
      <section class="my-history">
        <h2 class="section-title">📅 나의 기록</h2>
        <div class="search-container">
          <input type="text" id="search-bar" class="search-input" placeholder="일기 내용 검색..." value="${state.searchQuery}">
        </div>
        <div id="calendar-container" class="calendar-wrapper"></div>
        <div id="my-list"></div>
      </section>
      <section class="recent-feed">
        <h2 class="section-title">🌊 공개 피드</h2>
        <div id="feed-list"></div>
      </section>
    `;
    renderCalendar(container.querySelector('#calendar-container'));
    const searchInput = container.querySelector('#search-bar');
    searchInput.oninput = (e) => { state.searchQuery = e.target.value.toLowerCase(); filterMyHistory(); };
    filterMyHistory();
    const publicFeed = state.entries.filter(e => e.isPublic && e.user !== state.user.nickname);
    renderList('feed-list', publicFeed.length ? publicFeed : mockFeed());
  } else {
    container.innerHTML = `
      <section class="news-feed">
        <h2 class="section-title">📰 뉴스 토론방</h2>
        <div id="news-list"></div>
      </section>
    `;
    const newsContainer = container.querySelector('#news-list');
    const newsItems = state.news.length ? state.news : mockNews();
    newsItems.forEach(item => {
      const card = document.createElement('news-card');
      card.setAttribute('data', JSON.stringify(item));
      newsContainer.appendChild(card);
    });
  }
}

function renderCalendar(container) {
  const scroll = document.createElement('div');
  scroll.className = 'calendar-scroll';
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toLocaleDateString();
    const item = document.createElement('div');
    item.className = `date-item ${state.selectedDate === dateStr ? 'active' : ''}`;
    item.innerHTML = `<span class="day">${date.toLocaleDateString('ko-KR', { weekday: 'short' })}</span><span class="date">${date.getDate()}</span>`;
    item.onclick = () => { state.selectedDate = (state.selectedDate === dateStr) ? null : dateStr; render(); };
    scroll.appendChild(item);
  }
  container.appendChild(scroll);
  setTimeout(() => scroll.scrollLeft = scroll.scrollWidth, 100);
}

function filterMyHistory() {
  const container = document.getElementById('my-list');
  if (!container) return;
  let filtered = state.entries.filter(e => e.user === state.user.nickname);
  if (state.selectedDate) filtered = filtered.filter(e => e.dateString === state.selectedDate);
  if (state.searchQuery) filtered = filtered.filter(e => e.text.toLowerCase().includes(state.searchQuery));
  filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  container.innerHTML = '';
  if (filtered.length === 0) container.innerHTML = `<div class="empty-state">검색 결과가 없습니다.</div>`;
  else filtered.forEach(item => { const card = document.createElement('diary-card'); card.setAttribute('data', JSON.stringify(item)); container.appendChild(card); });
}

function renderList(id, items) {
  const container = document.getElementById(id);
  if (!container || !items.length) return;
  items.forEach(item => { const card = document.createElement('diary-card'); card.setAttribute('data', JSON.stringify(item)); container.appendChild(card); });
}

function renderPost() {
  const div = document.createElement('div');
  div.innerHTML = `
    <div class="post-tabs" style="display:flex; gap:1rem; margin-bottom:1rem;">
      <button class="tab-btn active" data-tab="diary">일기 기록</button>
      <button class="tab-btn" data-tab="news">뉴스 공유</button>
    </div>
    <div id="tab-content"></div>
    <div id="sentiment-preview"></div>
  `;
  const tabs = div.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderTabContent(div.querySelector('#tab-content'), tab.dataset.tab);
    };
  });
  function renderTabContent(container, type) {
    container.innerHTML = '';
    if (type === 'diary') {
      container.innerHTML = `
        <h2 class="section-title">✍️ 오늘 기록하기</h2>
        <div class="auth-card">
          <textarea id="diary-text" maxlength="100" placeholder="오늘 하루는 어떠셨나요? (최대 100자)"></textarea>
          <div class="char-count">0/100</div>
          <div class="privacy-toggle"><label><input type="checkbox" id="is-public" checked> 모두에게 공개</label></div>
          <button id="post-btn">오늘의 기록 저장</button>
        </div>
      `;
      const textarea = container.querySelector('#diary-text');
      textarea.oninput = () => {
        container.querySelector('.char-count').textContent = `${textarea.value.length}/100`;
        renderSentiment(div.querySelector('#sentiment-preview'), analyzeSentiment(textarea.value));
      };
      container.querySelector('#post-btn').onclick = () => {
        if (!textarea.value) return;
        state.entries.unshift({ id: Date.now().toString(), text: textarea.value, user: state.user.nickname, likes: 0, timestamp: new Date().toISOString(), dateString: new Date().toLocaleDateString(), sentiment: analyzeSentiment(textarea.value), isPublic: container.querySelector('#is-public').checked });
        navigate('home');
      };
    } else {
      container.innerHTML = `
        <h2 class="section-title">📰 뉴스 공유하기</h2>
        <div class="auth-card">
          <input type="text" id="news-url" placeholder="뉴스 URL 주소 (https://...)">
          <textarea id="news-comment" placeholder="이 뉴스에 대한 의견을 적어주세요."></textarea>
          <button id="news-post-btn">공유 및 토론 시작</button>
        </div>
      `;
      container.querySelector('#news-post-btn').onclick = () => {
        const url = container.querySelector('#news-url').value;
        if (!url) return;
        state.news.unshift({ id: Date.now().toString(), url, comment: container.querySelector('#news-comment').value, user: state.user.nickname, timestamp: new Date().toISOString(), empathy: 0, nonEmpathy: 0 });
        navigate('home');
      };
    }
  }
  renderTabContent(div.querySelector('#tab-content'), 'diary');
  appContainer.appendChild(div);
}

function renderSentiment(container, scores) {
  container.innerHTML = `
    <div class="emotion-meter">
      <div class="emotion-bar joy" style="width: ${scores.joy}%">기쁨</div>
      <div class="emotion-bar sad" style="width: ${scores.sad}%">슬픔</div>
      <div class="emotion-bar anger" style="width: ${scores.anger}%">분노</div>
      <div class="emotion-bar calm" style="width: ${scores.calm}%">평온</div>
    </div>
  `;
}

function renderChat() {
  const div = document.createElement('div');
  div.innerHTML = `<h2 class="section-title">💬 맞팔 채팅</h2><div class="auth-card"><p>서로 팔로우하면 대화를 나눌 수 있습니다.</p><div id="chat-list"><div class="empty-state">아직 맞팔로우 중인 친구가 없습니다.</div></div></div>`;
  appContainer.appendChild(div);
}

function mockNews() { return [{ id: 'n1', url: 'https://news.example.com/1', comment: '흥미로운 뉴스네요! 🌏', user: '관리자', empathy: 10, nonEmpathy: 1, timestamp: new Date().toISOString() }]; }
function mockBest10() { return [{ id: 'b1', text: '정말 멋진 하루였어요! ✨', user: '사용자1', likes: 100, sentiment: { joy: 100, sad: 0, anger: 0, calm: 0 } }]; }
function mockFeed() { return [{ id: 'f1', text: '반가워요 모두들!', user: '사용자2', likes: 5, sentiment: { joy: 50, sad: 0, anger: 0, calm: 50 } }]; }

class DiaryCard extends HTMLElement {
  connectedCallback() {
    const data = JSON.parse(this.getAttribute('data'));
    this.innerHTML = `<div class="diary-card"><div class="card-header"><span class="card-user">@${data.user}</span></div><div class="card-content">${data.text}</div><div class="card-footer"><button class="like-btn">❤️ 공감 ${data.likes}</button></div></div>`;
  }
}
customElements.define('diary-card', DiaryCard);

class NewsCard extends HTMLElement {
  connectedCallback() {
    const data = JSON.parse(this.getAttribute('data'));
    let displayTitle = data.title || data.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    if (displayTitle.length > 50) displayTitle = displayTitle.substring(0, 50) + '...';
    this.innerHTML = `
      <div class="news-card ${data.isLive ? 'live' : ''}">
        <div class="news-card-header" style="${data.isLive ? 'background: linear-gradient(135deg, #ff4b2b, #ff416c);' : ''}">
          <a href="${data.url}" target="_blank" class="news-link-display">${data.isLive ? '<span class="live-badge">LIVE</span> ' : ''}${displayTitle}</a>
          <div class="card-date" style="color:rgba(255,255,255,0.7); font-size:0.8rem; margin-top:0.5rem;">${data.isLive ? '뉴스 속보' : `@${data.user} 공유`}</div>
        </div>
        <div class="news-card-body">
          <div class="news-comment-box" style="font-size: 0.85rem;">${data.comment || '의견 없음'}</div>
          <div class="empathy-container">
            <button class="emp-btn agree">👍 공감 ${data.empathy}</button>
            <button class="emp-btn disagree">👎 비공감 ${data.nonEmpathy}</button>
          </div>
        </div>
      </div>
    `;
    this.querySelector('.agree').onclick = () => { data.empathy++; this.renderButtons(this, data); };
    this.querySelector('.disagree').onclick = () => { data.nonEmpathy++; this.renderButtons(this, data); };
  }
  renderButtons(el, data) { el.querySelector('.agree').innerHTML = `👍 공감 ${data.empathy}`; el.querySelector('.disagree').innerHTML = `👎 비공감 ${data.nonEmpathy}`; }
}
customElements.define('news-card', NewsCard);

const savedUser = localStorage.getItem('diary_user');
if (savedUser) { state.user = JSON.parse(savedUser); navigate('home'); } else { render(); }
