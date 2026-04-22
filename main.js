// --- 상태 관리 ---
let currentView = 'home';
const state = {
  user: null,
  diaries: [],
  travelNews: [],
  localEvents: [],
  currentMonth: new Date().getMonth(), // 0-11
  currentYear: new Date().getFullYear()
};

// --- 전국 주요 축제 데이터 (연간 일정 - 2026년 기준 강화) ---
const festivalData = {
  0: [ // 1월
    { day: 1, title: "정동진 해맞이 축제", location: "강릉", desc: "새해 첫 해돋이 명소" },
    { day: 15, title: "화천 산천어 축제", location: "화천", desc: "대한민국 대표 겨울 축제" },
    { day: 20, title: "인제 빙어 축제", location: "인제", desc: "은빛 빙어와 함께하는 겨울 추억" }
  ],
  1: [ // 2월
    { day: 5, title: "제주 들불 축제", location: "제주", desc: "새별오름 불 놓기 행사" },
    { day: 12, title: "청도 프로방스 빛축제", location: "청도", desc: "화려한 조명과 야경" }
  ],
  2: [ // 3월
    { day: 15, title: "광양 매화 축제", location: "광양", desc: "봄의 전령사 매화의 향연" },
    { day: 22, title: "진해 군항제", location: "창원", desc: "국내 최대 벚꽃 축제" },
    { day: 28, title: "구례 산수유 꽃 축제", location: "구례", desc: "노란 산수유 꽃의 향연" }
  ],
  3: [ // 4월
    { day: 5, title: "여의도 봄꽃 축제", location: "서울", desc: "한강변 벚꽃 나들이" },
    { day: 10, title: "신안 튤립 축제", location: "신안", desc: "섬 전체를 수놓는 튤립" },
    { day: 15, title: "경주 벚꽃 축제", location: "경주", desc: "천년고도에서의 벚꽃 구경" },
    { day: 25, title: "고양 국제 꽃 박람회", location: "고양", desc: "전 세계 꽃들의 축제" }
  ],
  4: [ // 5월
    { day: 1, title: "함평 나비 대축제", location: "함평", desc: "꽃과 나비의 화려한 만남" },
    { day: 5, title: "보성 다향 대축제", location: "보성", desc: "초록빛 차 밭에서의 휴식" },
    { day: 15, title: "담양 대나무 축제", location: "담양", desc: "시원한 대숲 산책" },
    { day: 20, title: "춘천 마임 축제", location: "춘천", desc: "글로벌 공연 예술 축제" }
  ],
  5: [ // 6월
    { day: 5, title: "무주 반딧불 축제", location: "무주", desc: "자연의 빛, 반딧불이 체험" },
    { day: 10, title: "강릉 단오제", location: "강릉", desc: "유네스코 인류무형문화유산" },
    { day: 25, title: "제주 수국 축제", location: "제주", desc: "수국길에서의 인생샷" }
  ],
  6: [ // 7월
    { day: 5, title: "대구 치맥 페스티벌", location: "대구", desc: "여름밤의 시원한 치맥 파티" },
    { day: 19, title: "보령 머드 축제", location: "보령", desc: "전 세계인이 즐기는 진흙 축제" },
    { day: 25, title: "부여 서동 연꽃 축제", location: "부여", desc: "천만송이 연꽃의 향연" }
  ],
  7: [ // 8월
    { day: 1, title: "부산 바다 축제", location: "부산", desc: "해운대, 광안리 해변 축제" },
    { day: 10, title: "통영 한산대첩 축제", location: "통영", desc: "이순신 장군의 승전 기록" },
    { day: 15, title: "정남진 장흥 물축제", location: "장흥", desc: "물과 함께하는 시원한 여름" }
  ],
  8: [ // 9월
    { day: 5, title: "금산 인삼 축제", location: "금산", desc: "건강과 활력의 대명사" },
    { day: 15, title: "평창 효석 문화제", location: "평창", desc: "메밀꽃 필 무렵의 감동" },
    { day: 20, title: "안동 국제 탈춤 축제", location: "안동", desc: "한국 전통 탈춤의 정수" }
  ],
  9: [ // 10월
    { day: 1, title: "진주 남강 유등 축제", location: "진주", desc: "밤하늘을 수놓는 화려한 유등" },
    { day: 10, title: "자라섬 재즈 페스티벌", location: "가평", desc: "가을밤의 감미로운 재즈 선율" },
    { day: 15, title: "부산 불꽃 축제", location: "부산", desc: "광안대교 배경의 대규모 불꽃쇼" },
    { day: 25, title: "순천만 갈대 축제", location: "순천", desc: "황금빛 갈대밭의 가을 정취" }
  ],
  10: [ // 11월
    { day: 5, title: "서울 빛 초롱 축제", location: "서울", desc: "청계천 등불 전시" },
    { day: 12, title: "제주 감귤 축제", location: "제주", desc: "새콤달콤 감귤 체험" }
  ],
  11: [ // 12월
    { day: 1, title: "해운대 빛 축제", location: "부산", desc: "겨울 바다와 화려한 조명" },
    { day: 24, title: "보성 차밭 빛 축제", location: "보성", desc: "빛의 은하수 속 산책" },
    { day: 31, title: "간절곶 소망 우체통", location: "울산", desc: "한반도에서 해가 가장 먼저 뜨는 곳" }
  ]
};

// ... (travelNewsSources, festivalSources, youtubeChannels, fallbackYoutube unchanged) ...

async function fetchAllData() {
  const API_KEY = 'p5n5v8v2r1j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3';
  
  const fetchRSS = (urls) => urls.map(url => 
    fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&api_key=${API_KEY}&t=${Date.now()}&count=20`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') {
          const sourceName = data.feed.title.split(' - ')[0] || '정보';
          return data.items.map(item => ({ ...item, author: sourceName }));
        }
        return [];
      })
      .catch(() => [])
  );

  const fetchYoutubeRSS = (channels) => channels.map(ch => 
    fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent('https://www.youtube.com/feeds/videos.xml?channel_id=' + ch.id)}&api_key=${API_KEY}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') {
          return data.items.map(item => {
            const videoId = item.link.split('v=')[1]?.split('&')[0];
            return {
              ...item,
              author: ch.name,
              thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : item.thumbnail
            };
          });
        }
        return [];
      })
      .catch(() => [])
  );

  try {
    const [newsResults, eventResults, ytResults] = await Promise.all([
      Promise.all(fetchRSS(travelNewsSources)),
      Promise.all(fetchRSS(festivalSources)),
      Promise.all(fetchYoutubeRSS(youtubeChannels))
    ]);

    let allNews = newsResults.flat();
    const travelKeywords = ['여행', '관광', '축제', '투어', '명소', '나들이', '항공', '숙박', '호텔', '캠핑', '벚꽃', '트레킹', '지역', '패키지'];
    let filteredNews = allNews.filter(n => travelKeywords.some(k => n.title.includes(k)));
    filteredNews = Array.from(new Set(filteredNews.map(a => a.title))).map(title => filteredNews.find(a => a.title === title));
    filteredNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    let allYoutube = ytResults.flat().sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    // 이벤트 데이터 가공
    let fetchedEvents = eventResults.flat();
    state.localEvents = fetchedEvents.map(e => {
      // 제목에서 날짜 추출 시도 (예: 4/15, 04.15, 4월 15일)
      const dateMatch = e.title.match(/(\d{1,2})[\/\.\s월\s]*(\d{1,2})/);
      let day = null;
      let month = null;
      if (dateMatch) {
        month = parseInt(dateMatch[1]) - 1;
        day = parseInt(dateMatch[2]);
      } else {
        // 날짜 정보가 없으면 게시일 기준
        const pubDate = new Date(e.pubDate);
        month = pubDate.getMonth();
        day = pubDate.getDate();
      }
      return { ...e, month, day, location: e.author || '지역' };
    });

    return {
      news: filteredNews.length > 0 ? filteredNews : [],
      events: state.localEvents,
      youtube: allYoutube.length > 0 ? allYoutube : fallbackYoutube
    };
  } catch (err) {
    return { news: [], events: [], youtube: fallbackYoutube };
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
  const { currentMonth, currentYear, localEvents } = state;
  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
  
  // 정적 데이터와 동적 데이터 병합
  const staticFestivals = festivalData[currentMonth] || [];
  const dynamicFestivals = localEvents.filter(e => e.month === currentMonth).map(e => ({
    day: e.day,
    title: e.title,
    location: e.location,
    desc: e.description || e.title,
    isDynamic: true
  }));

  const allFestivals = [...staticFestivals, ...dynamicFestivals];

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
        const festivalsOnDay = allFestivals.filter(f => f.day === day);
        return `<div class="calendar-day ${festivalsOnDay.length > 0 ? 'has-event' : ''}" data-day="${day}">
          <span class="day-num">${day}</span>
          ${festivalsOnDay.length > 0 ? `<span class="event-dot ${festivalsOnDay.some(f => f.isDynamic) ? 'dynamic-dot' : ''}" title="${festivalsOnDay[0].title}"></span>` : ''}
        </div>`;
      }).join('')}
    </div>
    <div id="event-detail" class="event-detail"><p class="detail-placeholder">날짜를 클릭하세요.</p></div>
  `;

  container.querySelector('#prev-month').onclick = () => {
    state.currentMonth--; if (state.currentMonth < 0) { state.currentMonth = 11; state.currentYear--; }
    updateCalendarUI(container);
  };
  container.querySelector('#next-month').onclick = () => {
    state.currentMonth++; if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; }
    updateCalendarUI(container);
  };

  container.querySelectorAll('.calendar-day').forEach(el => {
    el.onclick = () => {
      const day = parseInt(el.dataset.day);
      const festivalsOnDay = allFestivals.filter(f => f.day === day);
      const detailCont = container.querySelector('#event-detail');
      
      if (festivalsOnDay.length > 0) {
        detailCont.innerHTML = festivalsOnDay.map(f => `
          <div class="festival-info">
            <h4>${f.isDynamic ? '🆕 ' : '🚩 '}${f.title}</h4>
            <p>📍 <strong>${f.location}</strong></p>
            <p>${f.desc}</p>
          </div>
        `).join('<hr class="event-divider">');
      } else {
        detailCont.innerHTML = `<p class="detail-placeholder">${day}일에는 등록된 축제가 없습니다.</p>`;
      }
    };
  });
}

// --- 뷰 렌더링 ---
function render() {
  appContainer.innerHTML = '';
  switch (currentView) {
    case 'home': renderHome(); break;
    default: renderHome();
  }
}

async function renderHome() {
  const div = document.createElement('div');
  div.className = 'travel-dashboard fade-in';

  const headerContent = state.user 
    ? `<span class="user-info">📍 <strong>${state.user.nickname}</strong> 님</span>
       <button id="logout-btn" class="btn-logout">로그아웃</button>`
    : `<div class="header-login-form">
         <input type="text" id="header-nickname" placeholder="닉네임 입력" maxlength="10">
         <button id="header-login-btn" class="btn-login-sm">로그인</button>
       </div>`;

  div.innerHTML = `
    <header class="travel-header">
      <div class="header-inner">
        <h1 class="logo">Wanderlust Korea</h1>
        <div class="header-right">${headerContent}</div>
      </div>
    </header>

    <main class="dashboard-grid">
      <section class="top-row">
        <div class="panel news-panel">
          <div class="panel-header"><h3>📰 실시간 주요 여행 뉴스</h3><button id="refresh-news" class="btn-refresh">↻</button></div>
          <div id="travel-news-list" class="scroll-list"></div>
        </div>
        <div class="panel calendar-panel">
          <div class="panel-header"><h3>🗓️ 지역 축제 달력</h3><button id="refresh-calendar" class="btn-refresh">↻</button></div>
          <div id="calendar-container" class="calendar-container"></div>
        </div>
      </section>

      <section class="bottom-row">
        <div class="panel recommend-panel">
          <div class="panel-header"><h3>🌟 여행자 추천 공간</h3><button id="add-recommend-btn" class="btn-action">+ 추천 공유</button></div>
          <div id="recommendation-list" class="scroll-list"></div>
        </div>
        <div class="panel youtube-panel">
          <div class="panel-header"><h3>📽️ 인기 여행 유튜브</h3></div>
          <div id="youtube-feed-list" class="scroll-list"></div>
        </div>
      </section>
    </main>
  `;
  appContainer.appendChild(div);

  // 이벤트 바인딩 (로그인/로그아웃)
  if (state.user) {
    div.querySelector('#logout-btn').onclick = () => {
      state.user = null;
      render();
    };
  } else {
    const loginBtn = div.querySelector('#header-login-btn');
    const nickInput = div.querySelector('#header-nickname');
    
    loginBtn.onclick = () => {
      const nick = nickInput.value.trim();
      if (!nick) return alert('닉네임을 입력해 주세요!');
      state.user = { nickname: nick };
      render();
    };
    nickInput.onkeypress = (e) => {
      if (e.key === 'Enter') loginBtn.click();
    };
  }

  const updateAllContent = async () => {
    const data = await fetchAllData();
    
    // 뉴스 업데이트
    const newsList = div.querySelector('#travel-news-list');
    if (newsList) {
      newsList.innerHTML = data.news.slice(0, 15).map(n => `
        <div class="news-item">
          <div class="news-meta">${timeAgo(n.pubDate)} • <strong>${n.author}</strong></div>
          <a href="${n.link}" target="_blank" class="news-link">${n.title}</a>
        </div>
      `).join('') || '<p class="empty">뉴스가 없습니다.</p>';
    }

    // 유튜브 업데이트
    const ytList = div.querySelector('#youtube-feed-list');
    if (ytList) {
      ytList.innerHTML = data.youtube.slice(0, 12).map(v => `
        <div class="yt-item">
          <a href="${v.link}" target="_blank" class="yt-link">
            <div class="yt-thumb-wrap">
              <img src="${v.thumbnail}" class="yt-thumb" loading="lazy">
              <span class="yt-play-btn">▶</span>
            </div>
            <div class="yt-info">
              <div class="yt-title">${v.title}</div>
              <div class="yt-meta">${v.author}</div>
            </div>
          </a>
        </div>
      `).join('') || '<p class="empty">영상이 없습니다.</p>';
    }

    // 캘린더 실시간 반영
    updateCalendarUI(div.querySelector('#calendar-container'));
  };

  const renderRecommendations = () => {
    const cont = div.querySelector('#recommendation-list');
    if (cont) {
      cont.innerHTML = state.diaries.map(d => `
        <div class="recommend-item">
          <div class="recommend-header">
            <span class="recommend-loc">📍 ${d.location}</span>
            <span class="diary-user">@${d.user}</span>
          </div>
          <div class="diary-text">${d.text}</div>
          <div class="diary-time">${timeAgo(d.timestamp)}</div>
        </div>
      `).join('') || '<div class="empty-state">첫 추천을 남겨주세요! ✨</div>';
    }
  };

  updateAllContent();
  updateCalendarUI(div.querySelector('#calendar-container'));
  div.querySelector('#refresh-news').onclick = updateAllContent;
  div.querySelector('#refresh-calendar').onclick = updateAllContent;

  div.querySelector('#add-recommend-btn').onclick = () => {
    if (!state.user) return alert('추천을 공유하려면 로그인이 필요합니다!');
    const location = prompt('추천 장소:'); if (!location) return;
    const text = prompt('추천 이유:'); if (text) {
      state.diaries.unshift({ id: Date.now(), location, text, timestamp: new Date(), user: state.user.nickname });
      renderRecommendations();
    }
  };
  renderRecommendations();
}

render();
