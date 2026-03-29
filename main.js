import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, orderBy, limit, getDocs, updateDoc, doc, onSnapshot, increment } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { analyzeSentiment } from './utils/sentiment.js';

// --- Firebase Configuration ---
// Replace with your actual config
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
  best10: []
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
    case 'auth':
      renderAuth();
      break;
    case 'home':
      renderHome();
      break;
    case 'post':
      renderPost();
      break;
    case 'chat':
      renderChat();
      break;
    default:
      renderHome();
  }

  if (state.user) {
    renderNav();
  }
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
    
    try {
      // For demo: Anonymous sign in + store nickname in local state
      // Real app would store in Firestore 'users' collection
      state.user = { nickname, id: Date.now().toString() };
      localStorage.setItem('diary_user', JSON.stringify(state.user));
      navigate('home');
    } catch (e) {
      console.error(e);
    }
  };
  
  appContainer.appendChild(div);
}

// --- View: Home ---
async function renderHome() {
  const div = document.createElement('div');
  div.innerHTML = `
    <section class="best-10">
      <h2 class="section-title">✨ Best 10</h2>
      <div id="best-10-list"></div>
    </section>
    <section class="recent-feed">
      <h2 class="section-title">🌊 Public Diaries</h2>
      <div id="feed-list"></div>
    </section>
  `;
  
  appContainer.appendChild(div);
  
  const best10 = [...state.entries]
    .filter(e => e.isPublic)
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 10);

  const publicFeed = state.entries.filter(e => e.isPublic);

  renderList('best-10-list', best10.length ? best10 : mockBest10());
  renderList('feed-list', publicFeed.length ? publicFeed : mockFeed());
}

function renderList(id, items) {
  const container = document.getElementById(id);
  if (!container) return;
  
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
    <h2 class="section-title">✍️ New Entry</h2>
    <div class="auth-card">
      <textarea id="diary-text" maxlength="100" placeholder="How was your day? (Max 100 chars)"></textarea>
      <div class="char-count">0/100</div>
      
      <div class="media-inputs">
        <label>Photo: <input type="file" id="photo-input" accept="image/*"></label>
        <button id="record-btn">🎤 Record Voice</button>
      </div>

      <div class="privacy-toggle">
        <label><input type="checkbox" id="is-public" checked> Public Entry</label>
      </div>

      <button id="post-btn">Save Entry</button>
    </div>
    <div id="sentiment-preview"></div>
  `;

  const textarea = div.querySelector('#diary-text');
  textarea.oninput = () => {
    div.querySelector('.char-count').textContent = `${textarea.value.length}/100`;
    const sentiment = analyzeSentiment(textarea.value);
    renderSentiment(div.querySelector('#sentiment-preview'), sentiment);
  };

  div.querySelector('#post-btn').onclick = () => {
    const text = textarea.value;
    if (!text) return;
    
    const entry = {
      id: Date.now().toString(),
      text,
      user: state.user.nickname,
      likes: 0,
      timestamp: new Date().toISOString(),
      sentiment: analyzeSentiment(text),
      isPublic: div.querySelector('#is-public').checked
    };
    
    state.entries.unshift(entry);
    navigate('home');
  };

  appContainer.appendChild(div);
}

function renderSentiment(container, scores) {
  container.innerHTML = `
    <div class="emotion-meter">
      <div class="emotion-bar joy" style="width: ${scores.joy}%">Joy ${scores.joy}%</div>
      <div class="emotion-bar sad" style="width: ${scores.sad}%">Sad ${scores.sad}%</div>
      <div class="emotion-bar anger" style="width: ${scores.anger}%">Anger ${scores.anger}%</div>
      <div class="emotion-bar calm" style="width: ${scores.calm}%">Calm ${scores.calm}%</div>
    </div>
  `;
}

// --- View: Chat ---
function renderChat() {
  const div = document.createElement('div');
  div.innerHTML = `
    <h2 class="section-title">💬 Mutual Connections</h2>
    <div class="auth-card">
      <p>Connect with others to unlock chat!</p>
      <div id="chat-list">
        <div class="empty-state">No mutual followers yet.</div>
      </div>
    </div>
  `;
  appContainer.appendChild(div);
}

// --- Mock Data ---
function mockBest10() {
  return Array(3).fill(null).map((_, i) => ({
    id: `best-${i}`,
    text: "This is a great day! I'm feeling awesome! 😊✨",
    user: `User${i+1}`,
    likes: 120 - i * 10,
    sentiment: { joy: 80, calm: 20, sad: 0, anger: 0 }
  }));
}

function mockFeed() {
  return [
    {
      id: 'f1',
      text: "Today was a bit tough but I'm resting now. 😴🍃",
      user: "CalmDreamer",
      likes: 5,
      sentiment: { joy: 0, calm: 90, sad: 10, anger: 0 }
    }
  ];
}

// --- Init ---
const savedUser = localStorage.getItem('diary_user');
if (savedUser) {
  state.user = JSON.parse(savedUser);
  navigate('home');
} else {
  render();
}

// --- Web Component: Diary Card ---
class DiaryCard extends HTMLElement {
  connectedCallback() {
    const data = JSON.parse(this.getAttribute('data'));
    const isLiked = state.user?.likedEntries?.includes(data.id);
    const isFollowing = state.user?.following?.includes(data.user);

    this.innerHTML = `
      <div class="diary-card">
        <div class="card-header">
          <span class="card-user">@${data.user} ${data.user === state.user?.nickname ? '(You)' : ''}</span>
          <div class="card-actions">
            ${data.user !== state.user?.nickname ? `<button class="follow-btn ${isFollowing ? 'following' : ''}">${isFollowing ? 'Following' : 'Follow'}</button>` : ''}
            <span class="card-date">${new Date().toLocaleDateString()}</span>
          </div>
        </div>
        <div class="card-content">${data.text}</div>
        ${data.photoUrl ? `<img src="${data.photoUrl}" class="card-photo">` : ''}
        ${data.voiceUrl ? `<audio controls src="${data.voiceUrl}" class="card-audio"></audio>` : ''}
        <div class="card-footer">
          <div class="emotion-preview">
            ${Object.entries(data.sentiment).map(([k, v]) => v > 0 ? `<span class="emo-tag ${k}">${k} ${v}%</span>` : '').join('')}
          </div>
          <button class="like-btn ${isLiked ? 'liked' : ''}">❤️ ${data.likes}</button>
        </div>
      </div>
    `;
    
    this.querySelector('.like-btn').onclick = () => {
      if (!state.user.likedEntries) state.user.likedEntries = [];
      if (state.user.likedEntries.includes(data.id)) {
        data.likes--;
        state.user.likedEntries = state.user.likedEntries.filter(id => id !== data.id);
      } else {
        data.likes++;
        state.user.likedEntries.push(data.id);
      }
      this.querySelector('.like-btn').innerHTML = `❤️ ${data.likes}`;
      this.querySelector('.like-btn').classList.toggle('liked');
    };

    const followBtn = this.querySelector('.follow-btn');
    if (followBtn) {
      followBtn.onclick = () => {
        if (!state.user.following) state.user.following = [];
        if (state.user.following.includes(data.user)) {
          state.user.following = state.user.following.filter(u => u !== data.user);
          followBtn.innerText = 'Follow';
          followBtn.classList.remove('following');
        } else {
          state.user.following.push(data.user);
          followBtn.innerText = 'Following';
          followBtn.classList.add('following');
          alert(`You followed ${data.user}! If they follow you back, you can chat.`);
        }
      };
    }
  }
}
customElements.define('diary-card', DiaryCard);
