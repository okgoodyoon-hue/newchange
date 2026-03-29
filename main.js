import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, orderBy, limit, getDocs, updateDoc, doc, onSnapshot, increment } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { analyzeSentiment } from './utils/sentiment.js';

// --- Firebase Configuration ---
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

// --- State Management ---
let currentUser = null;
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

// --- View Router ---
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

// --- Component: Nav ---
function renderNav() {
  const nav = document.createElement('nav');
  nav.className = 'nav-bar';
  nav.innerHTML = `
    <a href="#" class="nav-item ${currentView === 'home' ? 'active' : ''}" data-view="home">Feed</a>
    <a href="#" class="nav-item ${currentView === 'post' ? 'active' : ''}" data-view="post">Post</a>
    <a href="#" class="nav-item ${currentView === 'chat' ? 'active' : ''}" data-view="chat">Chat</a>
  `;
  nav.querySelectorAll('.nav-item').forEach(item => {
    item.onclick = (e) => {
      e.preventDefault();
      navigate(item.dataset.view);
    };
  });
  appContainer.appendChild(nav);
}

// --- View: Auth ---
function renderAuth() {
  const div = document.createElement('div');
  div.className = 'view-auth';
  div.innerHTML = `
    <div class="auth-card">
      <h1>Daily Diary</h1>
      <p>Enter a nickname to start your day.</p>
      <input type="text" id="nickname" placeholder="Your Nickname" maxlength="15">
      <button id="start-btn">Start Diary</button>
    </div>
  `;
  div.querySelector('#start-btn').onclick = async () => {
    const nickname = div.querySelector('#nickname').value.trim();
    if (!nickname) return alert('Please enter a nickname');
    state.user = { nickname, id: Date.now().toString(), likedEntries: [], following: [] };
    localStorage.setItem('diary_user', JSON.stringify(state.user));
    navigate('home');
  };
  appContainer.appendChild(div);
}

// --- News Fetching Logic ---
async function fetchLiveNews() {
  const RSS_URL = 'https://www.yonhapnewstv.co.kr/browse/feed/';
  const API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`;
  
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    if (data.status === 'ok') {
      return data.items.map(item => ({
        id: item.guid,
        url: item.link,
        title: item.title,
        comment: item.description.substring(0, 100) + '...',
        user: 'LIVE NEWS',
        timestamp: item.pubDate,
        empathy: Math.floor(Math.random() * 50),
        nonEmpathy: Math.floor(Math.random() * 5),
        isLive: true
      }));
    }
  } catch (e) {
    console.error("Failed to fetch live news:", e);
    return [];
  }
}

// --- View: Home ---
async function renderHome() {
  const div = document.createElement('div');
  div.innerHTML = `
    <div class="best-grid">
      <div class="best-column">
        <h2 class="section-title">📡 Live Breaking News</h2>
        <div id="live-news-list">
          <div class="loader-container"><div class="loader"></div></div>
        </div>
      </div>
      <div class="best-column">
        <h2 class="section-title">🏆 Best Diary</h2>
        <div id="best-diary-list"></div>
      </div>
    </div>

    <div class="main-tabs">
      <button class="main-tab-btn ${state.mainTab === 'diary' ? 'active' : ''}" data-tab="diary">My History & Feed</button>
      <button class="main-tab-btn ${state.mainTab === 'news' ? 'active' : ''}" data-tab="news">Discussion</button>
    </div>

    <div id="main-content"></div>
  `;
  appContainer.appendChild(div);

  // Fetch and Render Live News
  const liveNewsCont = div.querySelector('#live-news-list');
  fetchLiveNews().then(newsItems => {
    liveNewsCont.innerHTML = '';
    const itemsToShow = newsItems.length ? newsItems.slice(0, 5) : mockNews();
    itemsToShow.forEach(item => {
      const card = document.createElement('news-card');
      card.setAttribute('data', JSON.stringify(item));
      liveNewsCont.appendChild(card);
    });
  });

  // Render Best Diary (Static top section)
  const bestDiary = [...state.entries].filter(e => e.isPublic).sort((a, b) => b.likes - a.likes).slice(0, 3);
  const bestDiaryCont = div.querySelector('#best-diary-list');
  (bestDiary.length ? bestDiary : mockBest10().slice(0, 2)).forEach(item => {
    const card = document.createElement('diary-card');
    card.setAttribute('data', JSON.stringify(item));
    bestDiaryCont.appendChild(card);
  });

  div.querySelectorAll('.main-tab-btn').forEach(btn => {
    btn.onclick = () => {
      state.mainTab = btn.dataset.tab;
      render();
    };
  });

  renderMainContent(div.querySelector('#main-content'));
}

function renderMainContent(container) {
  if (state.mainTab === 'diary') {
    container.innerHTML = `
      <section class="my-history">
        <h2 class="section-title">📅 My History</h2>
        <div class="search-container">
          <input type="text" id="search-bar" class="search-input" placeholder="Search keywords..." value="${state.searchQuery}">
        </div>
        <div id="calendar-container" class="calendar-wrapper"></div>
        <div id="my-list"></div>
      </section>

      <section class="recent-feed">
        <h2 class="section-title">🌊 Public Feed</h2>
        <div id="feed-list"></div>
      </section>
    `;

    renderCalendar(container.querySelector('#calendar-container'));
    const searchInput = container.querySelector('#search-bar');
    searchInput.oninput = (e) => {
      state.searchQuery = e.target.value.toLowerCase();
      filterMyHistory();
    };
    filterMyHistory();

    const publicFeed = state.entries.filter(e => e.isPublic && e.user !== state.user.nickname);
    renderList('feed-list', publicFeed.length ? publicFeed : mockFeed());

  } else {
    container.innerHTML = `
      <section class="news-feed">
        <h2 class="section-title">📰 Latest Discussion</h2>
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
    item.innerHTML = `<span class="day">${date.toLocaleDateString('en-US', { weekday: 'short' })}</span><span class="date">${date.getDate()}</span>`;
    item.onclick = () => {
      state.selectedDate = (state.selectedDate === dateStr) ? null : dateStr;
      render();
    };
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
  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state">No matching entries found.</div>`;
  } else {
    filtered.forEach(item => {
      const card = document.createElement('diary-card');
      card.setAttribute('data', JSON.stringify(item));
      container.appendChild(card);
    });
  }
}

function renderList(id, items) {
  const container = document.getElementById(id);
  if (!container || !items.length) return;
  items.forEach(item => {
    const card = document.createElement('diary-card');
    card.setAttribute('data', JSON.stringify(item));
    container.appendChild(card);
  });
}

// --- View: Post ---
function renderPost() {
  const div = document.createElement('div');
  div.innerHTML = `
    <div class="post-tabs" style="display:flex; gap:1rem; margin-bottom:1rem;">
      <button class="tab-btn active" data-tab="diary">Diary</button>
      <button class="tab-btn" data-tab="news">News Share</button>
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
        <h2 class="section-title">✍️ New Entry</h2>
        <div class="auth-card">
          <textarea id="diary-text" maxlength="100" placeholder="How was your day?"></textarea>
          <div class="char-count">0/100</div>
          <div class="privacy-toggle"><label><input type="checkbox" id="is-public" checked> Public</label></div>
          <button id="post-btn">Save for Today</button>
        </div>
      `;
      const textarea = container.querySelector('#diary-text');
      textarea.oninput = () => {
        container.querySelector('.char-count').textContent = `${textarea.value.length}/100`;
        renderSentiment(div.querySelector('#sentiment-preview'), analyzeSentiment(textarea.value));
      };
      container.querySelector('#post-btn').onclick = () => {
        if (!textarea.value) return;
        state.entries.unshift({
          id: Date.now().toString(),
          text: textarea.value,
          user: state.user.nickname,
          likes: 0,
          timestamp: new Date().toISOString(),
          dateString: new Date().toLocaleDateString(),
          sentiment: analyzeSentiment(textarea.value),
          isPublic: container.querySelector('#is-public').checked
        });
        navigate('home');
      };
    } else {
      container.innerHTML = `
        <h2 class="section-title">📰 Share News</h2>
        <div class="auth-card">
          <input type="text" id="news-url" placeholder="News URL (https://...)">
          <textarea id="news-comment" placeholder="Your thoughts..."></textarea>
          <button id="news-post-btn">Share & Discuss</button>
        </div>
      `;
      container.querySelector('#news-post-btn').onclick = () => {
        const url = container.querySelector('#news-url').value;
        if (!url) return;
        state.news.unshift({
          id: Date.now().toString(),
          url,
          comment: container.querySelector('#news-comment').value,
          user: state.user.nickname,
          timestamp: new Date().toISOString(),
          empathy: 0,
          nonEmpathy: 0
        });
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
      <div class="emotion-bar joy" style="width: ${scores.joy}%">Joy</div>
      <div class="emotion-bar sad" style="width: ${scores.sad}%">Sad</div>
      <div class="emotion-bar anger" style="width: ${scores.anger}%">Anger</div>
      <div class="emotion-bar calm" style="width: ${scores.calm}%">Calm</div>
    </div>
  `;
}

function renderChat() { /* logic here */ }

function mockNews() {
  return [{ id: 'n1', url: 'https://news.example.com/1', comment: 'Interesting news! 🌏', user: 'Admin', empathy: 10, nonEmpathy: 1, timestamp: new Date().toISOString() }];
}

function mockBest10() {
  return [{ id: 'b1', text: 'Amazing day! ✨', user: 'User1', likes: 100, sentiment: { joy: 100, sad: 0, anger: 0, calm: 0 } }];
}

function mockFeed() {
  return [{ id: 'f1', text: 'Hello world!', user: 'User2', likes: 5, sentiment: { joy: 50, sad: 0, anger: 0, calm: 50 } }];
}

// --- Web Components ---
class DiaryCard extends HTMLElement {
  connectedCallback() {
    const data = JSON.parse(this.getAttribute('data'));
    this.innerHTML = `
      <div class="diary-card">
        <div class="card-header"><span class="card-user">@${data.user}</span></div>
        <div class="card-content">${data.text}</div>
        <div class="card-footer"><button class="like-btn">❤️ ${data.likes}</button></div>
      </div>
    `;
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
          <a href="${data.url}" target="_blank" class="news-link-display">
            ${data.isLive ? '<span class="live-badge">LIVE</span> ' : ''}${displayTitle}
          </a>
          <div class="card-date" style="color:rgba(255,255,255,0.7); font-size:0.8rem; margin-top:0.5rem;">
            ${data.isLive ? 'Breaking News' : `Shared by @${data.user}`}
          </div>
        </div>
        <div class="news-card-body">
          <div class="news-comment-box" style="font-size: 0.85rem;">${data.comment || 'No comments'}</div>
          <div class="empathy-container">
            <button class="emp-btn agree">👍 Empathy ${data.empathy}</button>
            <button class="emp-btn disagree">👎 Non-Empathy ${data.nonEmpathy}</button>
          </div>
        </div>
      </div>
    `;
    this.querySelector('.agree').onclick = () => { data.empathy++; this.renderButtons(this, data); };
    this.querySelector('.disagree').onclick = () => { data.nonEmpathy++; this.renderButtons(this, data); };
  }
  renderButtons(el, data) {
    el.querySelector('.agree').innerHTML = `👍 Empathy ${data.empathy}`;
    el.querySelector('.disagree').innerHTML = `👎 Non-Empathy ${data.nonEmpathy}`;
  }
}
customElements.define('news-card', NewsCard);

// Init
const savedUser = localStorage.getItem('diary_user');
if (savedUser) { state.user = JSON.parse(savedUser); navigate('home'); } else { render(); }
