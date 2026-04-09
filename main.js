// --- 상태 관리 ---
let currentView = 'auth';
const state = {
  user: null,
  diaries: [],
  travelNews: [],
  localEvents: []
};

// --- 강화된 데이터 소스 (뉴스, 블로그, 축제) ---
const travelNewsSources = [
  'https://www.khan.co.kr/rss/rssdata/culture.xml', // 경향 문화/여행
  'https://rss.donga.com/life.xml', // 동아 생활/여행
  'https://news.sbs.co.kr/news/rss/news_life.xml' // SBS 생활/문화
];

const festivalSources = [
  'https://www.culture.go.kr/rss/culturePotalNewC01.do', // 문화포털 교육/전시
  'https://www.culture.go.kr/rss/culturePotalNewC02.do', // 문화포털 축제/행사
  'https://rss.blog.naver.com/kto90.xml' // 한국관광공사 네이버 공식 블로그
];

// 2026-04-09 고품질 큐레이션 뉴스 (AI 검색 결과 반영)
const fallbackNews = [
  {
    title: "서울, 글로벌 벚꽃 여행지 예약 1위 등극... 군산·진주·청주 '핫플' 부상",
    link: "https://www.google.com/search?q=서울+벚꽃+여행지+1위+트립닷컴",
    pubDate: "2026-04-09 10:00:00",
    author: "트렌드",
    category: "트렌드"
  },
  {
    title: "벚꽃 엔딩? 경주 암곡 '벚꽃 터널' 오늘부터 절정... 12일까지 축제",
    link: "https://www.google.com/search?q=경주+암곡+벚꽃+축제+2026",
    pubDate: "2026-04-09 11:30:00",
    author: "현장추천",
    category: "축제"
  },
  {
    title: "MZ세대 공략하는 '경험형 웰니스'... 온천 스파트립·도시형 러닝 투어 인기",
    link: "https://www.google.com/search?q=경험형+여행+웰니스+스파트립",
    pubDate: "2026-04-09 09:15:00",
    author: "라이프스타일",
    category: "웰니스"
  },
  {
    title: "청산도 슬로걷기 축제 개최... 노란 유채꽃과 푸른 바다의 조화",
    link: "https://www.google.com/search?q=청산도+슬로걷기+축제+2026",
    pubDate: "2026-04-08 14:00:00",
    author: "섬여행",
    category: "축제"
  },
  {
    title: "부산, 글로벌 크루즈 허브 도약... 프랑스 럭셔리 크루즈 12일 입항",
    link: "https://www.google.com/search?q=부산+크루즈+관광+활성화",
    pubDate: "2026-04-09 08:30:00",
    author: "지역관광",
    category: "교통"
  },
  {
    title: "[날씨] 제주 기상 악화로 항공·여객선 결항 유의... 주말 영남권 꽃구경 최적",
    link: "https://www.google.com/search?q=제주+기상+악화+결항+정보",
    pubDate: "2026-04-09 07:00:00",
    author: "실시간날씨",
    category: "정보"
  }
];

// 유튜브 채널 RSS (대한민국 구석구석 공식 채널)
const youtubeSource = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCvX6HhL_wZt_f4M68v5D_hQ';

async function fetchAllData() {
  const API_KEY = 'p5n5v8v2r1j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3';
  
  const fetchRSS = (urls) => urls.map(url => 
    fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&api_key=${API_KEY}&t=${Date.now()}`)
      .then(res => res.json())
      .then(data => data.status === 'ok' ? data.items : [])
      .catch(() => [])
  );

  try {
    const [newsResults, eventResults, ytResults] = await Promise.all([
      Promise.all(fetchRSS(travelNewsSources)),
      Promise.all(fetchRSS(festivalSources)),
      fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(youtubeSource)}&api_key=${API_KEY}`)
        .then(res => res.json())
        .then(data => data.status === 'ok' ? data.items : [])
        .catch(() => [])
    ]);

    let news = newsResults.flat().sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    // 뉴스 데이터가 없으면 fallback 사용
    if (news.length === 0) {
      news = fallbackNews;
    }

    return {
      news: news,
      events: eventResults.flat().sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)),
      youtube: ytResults
    };
  } catch (err) {
    console.error('Data fetch error:', err);
    return { news: fallbackNews, events: [], youtube: [] };
  }
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
      <div class="auth-hero">✈️</div>
      <h1>Wanderlust Korea</h1>
      <p>여행 뉴스, 축제, 영상을 한곳에서 확인하세요.</p>
      <input type="text" id="nickname" placeholder="여행자 닉네임" maxlength="10">
      <button id="start-btn">로그인</button>
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
      <section class="top-row">
        <!-- 1. 좌측 상단: 최신 여행 뉴스 -->
        <div class="panel news-panel">
          <div class="panel-header">
            <h3>📰 실시간 여행 뉴스</h3>
            <button id="refresh-news" class="btn-refresh">↻ 최신화</button>
          </div>
          <div id="travel-news-list" class="scroll-list">
            <div class="loader-container"><div class="loader"></div></div>
          </div>
        </div>

        <!-- 2. 우측 상단: 축제, 블로그, 유튜브 통합 피드 -->
        <div class="panel event-panel">
          <div class="panel-header">
            <h3>🎨 축제 & 인기 콘텐츠</h3>
            <button id="refresh-events" class="btn-refresh">↻ 최신화</button>
          </div>
          <div id="event-feed-list" class="scroll-list">
            <div class="loader-container"><div class="loader"></div></div>
          </div>
        </div>
      </section>

      <section class="bottom-row">
        <div class="panel diary-panel">
          <div class="panel-header">
            <h3>✍️ 오늘의 여행 일기</h3>
            <button id="add-diary-btn" class="btn-action">+ 일기 작성</button>
          </div>
          <div id="my-diary-list" class="diary-grid"></div>
        </div>
      </section>
    </main>
  `;
  appContainer.appendChild(div);

  const updateNews = async () => {
    const newsCont = div.querySelector('#travel-news-list');
    newsCont.innerHTML = '<div class="loader-container"><div class="loader"></div></div>';
    const data = await fetchAllData();
    newsCont.innerHTML = data.news.slice(0, 10).map(n => `
      <div class="news-item">
        <div class="news-meta">
          ${timeAgo(n.pubDate)} • ${n.author || '뉴스'}
          ${!n.guid ? `<span class="tag-curation">${n.category || '큐레이션'}</span>` : '<span class="tag-news">실시간</span>'}
        </div>
        <a href="${n.link}" target="_blank" class="news-link">${n.title}</a>
      </div>
    `).join('') || '<p class="empty">최신 여행 뉴스를 불러올 수 없습니다.</p>';
  };

  const updateEvents = async () => {
    const feedCont = div.querySelector('#event-feed-list');
    feedCont.innerHTML = '<div class="loader-container"><div class="loader"></div></div>';
    const data = await fetchAllData();
    const combinedFeed = [
      ...data.youtube.map(v => ({ ...v, type: '유튜브', icon: '📽️' })),
      ...data.events.map(e => ({ ...e, type: e.link.includes('blog.naver') ? '블로그' : '행사', icon: e.link.includes('blog.naver') ? '✍️' : '🎡' }))
    ].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    feedCont.innerHTML = combinedFeed.slice(0, 15).map(item => `
      <div class="event-card type-${item.type === '유튜브' ? 'yt' : 'blog'}">
        <div class="item-badge">${item.icon} ${item.type}</div>
        <a href="${item.link}" target="_blank" class="event-title">${item.title}</a>
        <div class="event-meta">
          <span>📅 ${new Date(item.pubDate).toLocaleDateString()}</span>
          <span class="source">${item.author || '추천'}</span>
        </div>
      </div>
    `).join('') || '<p class="empty">콘텐츠를 불러오는 중입니다...</p>';
  };

  updateNews();
  updateEvents();
  
  div.querySelector('#refresh-news').onclick = updateNews;
  div.querySelector('#refresh-events').onclick = updateEvents;

  // 일기 관리
  const renderDiaries = () => {
    const cont = div.querySelector('#my-diary-list');
    cont.innerHTML = state.diaries.map(d => `
      <div class="diary-card">
        <div class="diary-user">@${d.user}</div>
        <div class="diary-text">${d.text}</div>
        <div class="diary-time">${timeAgo(d.timestamp)}</div>
      </div>
    `).join('') || '<div class="empty-state">당신의 첫 번째 여행 기록을 남겨주세요! 🌊</div>';
  };

  div.querySelector('#add-diary-btn').onclick = () => {
    const text = prompt('여행에 대한 짧은 생각을 남겨주세요:');
    if (text) {
      state.diaries.unshift({ id: Date.now(), text, timestamp: new Date(), user: state.user.nickname });
      renderDiaries();
    }
  };
  renderDiaries();
}

render();
