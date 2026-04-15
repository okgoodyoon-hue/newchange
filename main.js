// --- 상태 관리 ---
let currentView = 'auth';
const state = {
  user: null,
  diaries: [],
  travelNews: [],
  localEvents: [],
  currentMonth: new Date().getMonth(), // 0-11
  currentYear: new Date().getFullYear()
};

// --- 전국 주요 축제 데이터 (연간 일정) ---
const festivalData = {
  0: [ // 1월
    { day: 1, title: "정동진 해맞이 축제", location: "강릉", desc: "새해 첫 해돋이 명소" },
    { day: 15, title: "화천 산천어 축제", location: "화천", desc: "대한민국 대표 겨울 축제" }
  ],
  1: [ // 2월
    { day: 5, title: "제주 들불 축제", location: "제주", desc: "새별오름 불 놓기 행사" }
  ],
  2: [ // 3월
    { day: 22, title: "진해 군항제", location: "창원", desc: "국내 최대 벚꽃 축제" },
    { day: 28, title: "구례 산수유 꽃 축제", location: "구례", desc: "노란 산수유 꽃의 향연" }
  ],
  3: [ // 4월
    { day: 5, title: "여의도 봄꽃 축제", location: "서울", desc: "한강변 벚꽃 나들이" },
    { day: 15, title: "경주 벚꽃 축제", location: "경주", desc: "천년고도에서의 벚꽃 구경" },
    { day: 25, title: "고양 국제 꽃 박람회", location: "고양", desc: "전 세계 꽃들의 축제" }
  ],
  4: [ // 5월
    { day: 5, title: "보성 다향 대축제", location: "보성", desc: "초록빛 차 밭에서의 휴식" },
    { day: 15, title: "담양 대나무 축제", location: "담양", desc: "시원한 대숲 산책" }
  ],
  5: [ // 6월
    { day: 10, title: "강릉 단오제", location: "강릉", desc: "유네스코 인류무형문화유산" }
  ],
  6: [ // 7월
    { day: 19, title: "보령 머드 축제", location: "보령", desc: "전 세계인이 즐기는 진흙 축제" }
  ],
  7: [ // 8월
    { day: 1, title: "부산 바다 축제", location: "부산", desc: "해운대, 광안리 해변 축제" }
  ],
  8: [ // 9월
    { day: 20, title: "안동 국제 탈춤 축제", location: "안동", desc: "한국 전통 탈춤의 정수" }
  ],
  9: [ // 10월
    { day: 1, title: "진주 남강 유등 축제", location: "진주", desc: "밤하늘을 수놓는 화려한 유등" },
    { day: 15, title: "부산 불꽃 축제", location: "부산", desc: "광안대교 배경의 대규모 불꽃쇼" }
  ],
  10: [ // 11월
    { day: 5, title: "서울 빛 초롱 축제", location: "서울", desc: "청계천 등불 전시" }
  ],
  11: [ // 12월
    { day: 31, title: "간절곶 소망 우체통", location: "울산", desc: "한반도에서 해가 가장 먼저 뜨는 곳" }
  ]
};

// --- 확장된 국내 언론사 뉴스 API 소스 (여행/문화 특화) ---
const travelNewsSources = [
  'https://www.chosun.com/arc/outboundfeeds/rss/category/culture-life/travel/?outputType=xml', // 조선일보 여행
  'https://rss.donga.com/life.xml', // 동아 생활/여행
  'https://www.khan.co.kr/rss/rssdata/culture.xml', // 경향 문화/여행
  'https://www.hani.co.kr/rss/culture/', // 한겨레 문화
  'https://news.sbs.co.kr/news/rss/news_life.xml', // SBS 생활/문화
  'https://www.yonhapnewstv.co.kr/category/news/culture/feed/', // 연합뉴스 문화
  'https://news.kbs.co.kr/rss/news_05.xml' // KBS 문화/생활
];

const festivalSources = [
  'https://www.culture.go.kr/rss/culturePotalNewC01.do', // 문화포털 교육/전시
  'https://www.culture.go.kr/rss/culturePotalNewC02.do', // 문화포털 축제/행사
  'https://rss.blog.naver.com/kto90.xml' // 한국관광공사 네이버 공식 블로그
];

// 고품질 큐레이션 뉴스 (백업 데이터)
const fallbackNews = [
  { title: "[단독] 2026 한국인이 가장 가고 싶은 여행지 1위 '제주'", link: "https://www.google.com/search?q=한국+여행+트렌드", pubDate: new Date(), author: "트래블타임즈", category: "트렌드" },
  { title: "K-컬처 랜드마크 100선 발표... 외국인 관광객 유치 박차", link: "https://www.google.com/search?q=K-컬처+랜드마크+100선", pubDate: new Date(), author: "관광공사", category: "관광" },
  { title: "봄맞이 전국 기차여행 패키지 출시... '매진 행렬'", link: "https://www.google.com/search?q=기차여행+패키지", pubDate: new Date(), author: "여행신문", category: "특가" }
];

const youtubeSource = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCvX6HhL_wZt_f4M68v5D_hQ';

async function fetchAllData() {
  // RSS2JSON API Key (공용 키 사용 시 트래픽 초과 가능성 대비 백업 로직 포함)
  const API_KEY = 'p5n5v8v2r1j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3';
  
  const fetchRSS = (urls) => urls.map(url => 
    fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&api_key=${API_KEY}&t=${Date.now()}&count=20`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') {
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
    
    // --- 엄격한 여행 뉴스 필터링 ---
    const travelKeywords = ['여행', '관광', '축제', '투어', '명소', '나들이', '항공', '숙박', '호텔', '캠핑', '벚꽃', '트레킹', '지역', '패키지'];
    let filteredNews = allNews.filter(n => 
      travelKeywords.some(k => n.title.includes(k) || n.description?.includes(k))
    );
    
    // 중복 제거 (제목 기준)
    filteredNews = Array.from(new Set(filteredNews.map(a => a.title)))
      .map(title => filteredNews.find(a => a.title === title));

    // 최신순 정렬
    filteredNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

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

// --- 캘린더 관련 함수 ---
function getDaysInMonth(month, year) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(month, year) {
  return new Date(year, month, 1).getDay();
}

function updateCalendarUI(container) {
  const { currentMonth, currentYear } = state;
  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
  
  const festivals = festivalData[currentMonth] || [];

  container.innerHTML = `
    <div class="calendar-header">
      <button id="prev-month" class="btn-cal-nav">◀</button>
      <span class="calendar-title">${currentYear}년 ${monthNames[currentMonth]}</span>
      <button id="next-month" class="btn-cal-nav">▶</button>
    </div>
    <div class="calendar-grid">
      <div class="day-name">일</div><div class="day-name">월</div><div class="day-name">화</div>
      <div class="day-name">수</div><div class="day-name">목</div><div class="day-name">금</div><div class="day-name">토</div>
      ${Array(firstDay).fill('<div class="empty-day"></div>').join('')}
      ${Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const festival = festivals.find(f => f.day === day);
        return `
          <div class="calendar-day ${festival ? 'has-event' : ''}" data-day="${day}">
            <span class="day-num">${day}</span>
            ${festival ? `<span class="event-dot" title="${festival.title}"></span>` : ''}
          </div>
        `;
      }).join('')}
    </div>
    <div id="event-detail" class="event-detail">
      <p class="detail-placeholder">날짜를 클릭하여 축제 정보를 확인하세요.</p>
    </div>
  `;

  container.querySelector('#prev-month').onclick = () => {
    state.currentMonth--;
    if (state.currentMonth < 0) { state.currentMonth = 11; state.currentYear--; }
    updateCalendarUI(container);
  };
  container.querySelector('#next-month').onclick = () => {
    state.currentMonth++;
    if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; }
    updateCalendarUI(container);
  };

  container.querySelectorAll('.calendar-day').forEach(el => {
    el.onclick = () => {
      const day = parseInt(el.dataset.day);
      const festival = festivals.find(f => f.day === day);
      const detailCont = container.querySelector('#event-detail');
      if (festival) {
        detailCont.innerHTML = `
          <div class="festival-info">
            <h4>${festival.title}</h4>
            <p>📍 <strong>${festival.location}</strong></p>
            <p>${festival.desc}</p>
          </div>
        `;
      } else {
        detailCont.innerHTML = `<p class="detail-placeholder">${day}일에는 등록된 주요 축제가 없습니다.</p>`;
      }
    };
  });
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

        <div class="panel calendar-panel">
          <div class="panel-header">
            <h3>🗓️ 지역 축제 달력</h3>
          </div>
          <div id="calendar-container" class="calendar-container">
            <!-- 캘린더가 여기에 렌더링됩니다 -->
          </div>
        </div>
      </section>

      <section class="bottom-row">
        <div class="panel diary-panel">
          <div class="panel-header">
            <h3>🌟 여행자 추천 공간</h3>
            <button id="add-recommend-btn" class="btn-action">+ 추천 명소 공유</button>
          </div>
          <div id="recommendation-list" class="diary-grid"></div>
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

  updateNews();
  updateCalendarUI(div.querySelector('#calendar-container'));
  
  div.querySelector('#refresh-news').onclick = updateNews;

  const renderRecommendations = () => {
    const cont = div.querySelector('#recommendation-list');
    cont.innerHTML = state.diaries.map(d => `
      <div class="diary-card recommend-card">
        <div class="recommend-header">
          <span class="recommend-loc">📍 ${d.location || '전국'}</span>
          <span class="diary-user">@${d.user}</span>
        </div>
        <div class="diary-text">${d.text}</div>
        <div class="diary-time">${timeAgo(d.timestamp)}</div>
      </div>
    `).join('') || '<div class="empty-state">당신이 알고 있는 최고의 여행지를 추천해 주세요! ✨</div>';
  };

  div.querySelector('#add-recommend-btn').onclick = () => {
    const location = prompt('추천하고 싶은 지역이나 장소를 입력해 주세요 (예: 제주도, 가로수길):');
    if (!location) return;
    const text = prompt('이 장소를 추천하는 이유나 팁을 남겨주세요:');
    if (text) {
      state.diaries.unshift({ 
        id: Date.now(), 
        location,
        text, 
        timestamp: new Date(), 
        user: state.user.nickname 
      });
      renderRecommendations();
    }
  };
  renderRecommendations();
}

render();
