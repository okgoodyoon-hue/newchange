// --- 상태 관리 ---
let currentView = 'auth';
const state = {
  user: null,
  diaries: [],
  travelNews: [],
  localEvents: []
};

// --- 확장된 국내 언론사 뉴스 API 소스 ---
const travelNewsSources = [
  'https://www.yonhapnewstv.co.kr/category/news/culture/feed/', // 연합뉴스 문화
  'https://news.kbs.co.kr/rss/news99.xml', // KBS 뉴스
  'https://www.khan.co.kr/rss/rssdata/culture.xml', // 경향 문화/여행
  'https://rss.donga.com/life.xml', // 동아 생활/여행
  'https://www.chosun.com/arc/outboundfeeds/rss/category/culture-life/travel/?outputType=xml', // 조선일보 여행
  'https://rss.joins.com/joins_life_list.xml', // 중앙일보 생활
  'https://www.hani.co.kr/rss/culture/', // 한겨레 문화
  'https://news.sbs.co.kr/news/rss/news_life.xml' // SBS 생활/문화
];

const festivalSources = [
  'https://www.culture.go.kr/rss/culturePotalNewC01.do', // 문화포털 교육/전시
  'https://www.culture.go.kr/rss/culturePotalNewC02.do', // 문화포털 축제/행사
  'https://rss.blog.naver.com/kto90.xml' // 한국관광공사 네이버 공식 블로그
];

// 고품질 큐레이션 뉴스 (백업 데이터)
const fallbackNews = [
  { title: "서울, 글로벌 벚꽃 여행지 예약 1위 등극", link: "https://www.google.com/search?q=서울+벚꽃+여행지+1위", pubDate: new Date(), author: "연합뉴스", category: "트렌드" },
  { title: "경주 암곡 '벚꽃 터널' 오늘부터 절정", link: "https://www.google.com/search?q=경주+암곡+벚꽃+절정", pubDate: new Date(), author: "지역뉴스", category: "축제" },
  { title: "청산도 슬로걷기 축제 개최... 유채꽃 만발", link: "https://www.google.com/search?q=청산도+슬로걷기+축제", pubDate: new Date(), author: "섬여행", category: "축제" }
];

const youtubeSource = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCvX6HhL_wZt_f4M68v5D_hQ';

async function fetchAllData() {
  const API_KEY = 'p5n5v8v2r1j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3';
  
  const fetchRSS = (urls) => urls.map(url => 
    fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&api_key=${API_KEY}&t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') {
          // 언론사 이름을 feed title에서 추출하거나 URL 기반으로 매칭
          const sourceName = data.feed.title.split(' - ')[0] || '언론사';
          return data.items.map(item => ({ ...item, author: sourceName }));
        }
        return [];
      })
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

    let allNews = newsResults.flat();
    
    // "좋은 기사" 필터링 (여행, 축제, 추천, 국내 등 키워드 포함 기사 우선)
    const keywords = ['여행', '관광', '추천', '축제', '명소', '국내', '가볼만한', '나들이'];
    let filteredNews = allNews.filter(n => keywords.some(k => n.title.includes(k)));
    
    // 필터링된 기사가 적으면 최신순으로 보충
    if (filteredNews.length < 5) {
      filteredNews = allNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    } else {
      filteredNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    }

    if (filteredNews.length === 0) filteredNews = fallbackNews;

    return {
      news: filteredNews,
      events: eventResults.flat().sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)),
      youtube: ytResults
    };
  } catch (err) {
    return { news: fallbackNews, events: [], youtube: [] };
  }
}

// --- 공통 유틸 ---
const appContainer = document.getElementById('app');
function navigate(view) { currentView = view; render(); }

function timeAgo(date) {
  const diff = Math.floor((new Date() - new Date(date)) / 1000);
  if (isNaN(diff)) return '알 수 없음';
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
      <p>전국 언론사의 실시간 여행 뉴스를 확인하세요.</p>
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
        <div class="panel news-panel">
          <div class="panel-header">
            <h3>📰 실시간 주요 여행 뉴스</h3>
            <button id="refresh-news" class="btn-refresh">↻ 최신화</button>
          </div>
          <div id="travel-news-list" class="scroll-list">
            <div class="loader-container"><div class="loader"></div></div>
          </div>
        </div>

        <div class="panel event-panel">
          <div class="panel-header">
            <h3>🎨 지역 축제 & 문화 정보</h3>
            <button id="refresh-events" class="btn-refresh">↻ 최신화</button>
          </div>
          <div id="event-feed-list" class="scroll-list">
            <div class="loader-container"><div class="loader)</div></div>
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
    newsCont.innerHTML = data.news.slice(0, 15).map(n => `
      <div class="news-item">
        <div class="news-meta">
          ${timeAgo(n.pubDate)} • <strong>${n.author}</strong>
          ${n.title.includes('추천') || n.title.includes('명소') ? '<span class="tag-curation">TOP</span>' : '<span class="tag-news">Live</span>'}
        </div>
        <a href="${n.link}" target="_blank" class="news-link">${n.title}</a>
      </div>
    `).join('') || '<p class="empty">최신 뉴스를 불러오는 중입니다...</p>';
  };

  const updateEvents = async () => {
    const feedCont = div.querySelector('#event-feed-list');
    feedCont.innerHTML = '<div class="loader-container"><div class="loader"></div></div>';
    const data = await fetchAllData();
    const combinedFeed = [
      ...data.youtube.map(v => ({ ...v, type: '유튜브', icon: '📽️', author: '대한민국구석구석' })),
      ...data.events.map(e => ({ ...e, type: e.link.includes('blog.naver') ? '블로그' : '행사', icon: e.link.includes('blog.naver') ? '✍️' : '🎡', author: e.link.includes('blog.naver') ? '공식블로그' : '문화포털' }))
    ].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    feedCont.innerHTML = combinedFeed.slice(0, 15).map(item => `
      <div class="event-card type-${item.type === '유튜브' ? 'yt' : 'blog'}">
        <div class="item-badge">${item.icon} ${item.type}</div>
        <a href="${item.link}" target="_blank" class="event-title">${item.title}</a>
        <div class="event-meta">
          <span>📅 ${new Date(item.pubDate).toLocaleDateString()}</span>
          <span class="source">${item.author}</span>
        </div>
      </div>
    `).join('') || '<p class="empty">콘텐츠를 불러오는 중입니다...</p>';
  };

  updateNews();
  updateEvents();
  
  div.querySelector('#refresh-news').onclick = updateNews;
  div.querySelector('#refresh-events').onclick = updateEvents;

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
