// --- 상태 관리 ---
let currentView = 'auth';
const state = {
  user: null,
  diaries: [],
  travelNews: [],
  localEvents: []
};

// --- 여행 및 축제 RSS 소스 ---
const travelNewsSources = [
  'https://news.sbs.co.kr/news/rss/news_life.xml', // 생활/문화 (여행 포함)
  'https://www.khan.co.kr/rss/rssdata/culture.xml', // 경향 문화
  'https://rss.donga.com/life.xml' // 동아 라이프
];

const eventSources = [
  'https://www.culture.go.kr/rss/culturePotalNewC01.do', // 문화포털 교육/전시
  'https://www.culture.go.kr/rss/culturePotalNewC02.do'  // 문화포털 공연/축제
];

async function fetchRSS(urls) {
  const API_KEY = 'p5n5v8v2r1j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3';
  const promises = urls.map(url => 
    fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&api_key=${API_KEY}&t=${Date.now()}`)
      .then(res => res.json())
      .then(data => data.status === 'ok' ? data.items : [])
      .catch(() => [])
  );
  const results = await Promise.all(promises);
  return results.flat().sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
}

// --- 공통 유틸 ---
const appContainer = document.getElementById('app');
function navigate(view) { currentView = view; render(); }

function timeAgo(date) {
  const diff = Math.floor((new Date() - new Date(date)) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff/60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff/3600)}시간 전`;
  return new Date(date).toLocaleDateString();
}

// --- 뷰 렌더링 ---
function render() {
  appContainer.innerHTML = '';
  if (!state.user && currentView !== 'auth') { renderAuth(); return; }
  switch (currentView) {
    case 'auth': renderAuth(); break;
    case 'home': renderHome(); break;
    default: renderHome();
  }
}

function renderAuth() {
  const div = document.createElement('div');
  div.className = 'view-auth';
  div.innerHTML = `
    <div class="auth-card">
      <div class="auth-hero">🏔️</div>
      <h1>Wanderlust Korea</h1>
      <p>대한민국 구석구석, 당신의 여행을 계획하세요.</p>
      <input type="text" id="nickname" placeholder="여행자 닉네임" maxlength="10">
      <button id="start-btn">여행 시작하기</button>
    </div>
  `;
  div.querySelector('#start-btn').onclick = () => {
    const nick = div.querySelector('#nickname').value.trim();
    if (!nick) return alert('닉네임을 입력해 주세요!');
    state.user = { nickname: nick };
    navigate('home');
  };
  appContainer.appendChild(div);
}

async function renderHome() {
  const div = document.createElement('div');
  div.className = 'travel-dashboard fade-in';
  div.innerHTML = `
    <header class="travel-header">
      <div class="header-inner">
        <h1 class="logo">Wanderlust Korea</h1>
        <div class="header-right">
          <span class="user-info">📍 <strong>${state.user.nickname}</strong> 님</span>
        </div>
      </div>
    </header>

    <main class="dashboard-grid">
      <!-- 상단 2단 레이아웃 -->
      <section class="top-row">
        <!-- 1. 좌측 상단: 국내 여행 뉴스 -->
        <div class="panel news-panel">
          <div class="panel-header">
            <h3>📰 실시간 여행 트렌드</h3>
            <span class="live-tag">LIVE</span>
          </div>
          <div id="travel-news-list" class="scroll-list">
            <div class="loader-container"><div class="loader"></div></div>
          </div>
        </div>

        <!-- 2. 우측 상단: 지역 축제 및 행사 -->
        <div class="panel event-panel">
          <div class="panel-header">
            <h3>🎨 이달의 축제 & 전시</h3>
            <button id="refresh-events" class="btn-refresh">↻ 업데이트</button>
          </div>
          <div id="event-list" class="scroll-list">
            <div class="loader-container"><div class="loader"></div></div>
          </div>
        </div>
      </section>

      <!-- 하단: 여행 기록 (소셜 다이어리) -->
      <section class="bottom-row">
        <div class="panel diary-panel">
          <div class="panel-header">
            <h3>✍️ 오늘의 여행 일기</h3>
            <button id="add-diary-btn" class="btn-action">+ 일기 쓰기</button>
          </div>
          <div class="diary-container">
            <div id="my-diary-list" class="diary-grid"></div>
          </div>
        </div>
      </section>
    </main>
  `;
  appContainer.appendChild(div);

  // 데이터 로딩 로직
  const updateData = async () => {
    const newsCont = div.querySelector('#travel-news-list');
    const eventCont = div.querySelector('#event-list');

    // 여행 뉴스 업데이트
    const news = await fetchRSS(travelNewsSources);
    newsCont.innerHTML = news.slice(0, 8).map(n => `
      <div class="news-item">
        <div class="news-meta">${new Date(n.pubDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        <a href="${n.link}" target="_blank" class="news-link">${n.title}</a>
      </div>
    `).join('') || '<p class="empty">최신 뉴스가 없습니다.</p>';

    // 행사/축제 업데이트
    const events = await fetchRSS(eventSources);
    eventCont.innerHTML = events.slice(0, 8).map(e => `
      <div class="event-card">
        <div class="event-category">${e.categories?.[0] || '문화/예술'}</div>
        <a href="${e.link}" target="_blank" class="event-title">${e.title}</a>
        <div class="event-date">📅 ${new Date(e.pubDate).toLocaleDateString()}</div>
      </div>
    `).join('') || '<p class="empty">준비된 행사가 없습니다.</p>';
  };

  updateData();
  div.querySelector('#refresh-events').onclick = updateData;

  // 일기 쓰기 기능
  div.querySelector('#add-diary-btn').onclick = () => {
    const text = prompt('오늘의 여행 소감이나 가고 싶은 곳을 적어주세요 (100자):');
    if (text) {
      state.diaries.unshift({ id: Date.now(), text, timestamp: new Date(), user: state.user.nickname });
      renderDiaries();
    }
  };

  const renderDiaries = () => {
    const cont = div.querySelector('#my-diary-list');
    cont.innerHTML = state.diaries.map(d => `
      <div class="diary-card">
        <div class="diary-user">@${d.user}</div>
        <div class="diary-text">${d.text}</div>
        <div class="diary-time">${timeAgo(d.timestamp)}</div>
      </div>
    `).join('') || '<div class="empty-state">첫 여행 일기를 작성해 보세요! 🌲</div>';
  };
  renderDiaries();
}

render();
