# **Social Emotion Diary - Project Blueprint**

## **개요**
사용자들이 100글자 내외의 짧은 일기를 작성하고, 멀티미디어(사진, 음성)와 감정 분석을 통해 일상을 기록하는 미니멀리즘 소셜 일기장 앱입니다. 실시간 뉴스 공유 및 토론 기능을 통해 세상과 소통하고 공감대를 형성하는 데 중점을 둡니다.

## **상세 기능 및 구현 현황**

### **1. 핵심 사용자 경험**
- **닉네임 로그인:** 별도의 가입 없이 닉네임만으로 세션 유지 (`localStorage` 활용).
- **100자 일기:** 실시간 글자 수 확인 및 감정 분석 기능 제공.
- **일별 아카이브:** 날짜별 일기 저장, 가로형 캘린더 탐색 및 키워드 검색.
- **프라이버시 설정:** 일기별 공개/비공개 선택 가능.

### **2. 소셜 및 토론 기능**
- **공감 시스템:** 하트 버튼을 통한 실시간 공감 표시.
- **베스트 랭킹:** 메인 화면 우측에 가장 인기 있는 일기 노출.
- **뉴스 토론방:** 흥미로운 뉴스를 공유하고 '공감/비공감' 투표 및 의견 교환.
- **실시간 뉴스:** 메인 화면 좌측에 신문 스타일의 카테고리별 실시간 뉴스 제공.

### **3. 지능형 서비스 및 미학적 디자인**
- **감정 지수:** 100개 이상의 키워드와 이모티콘을 분석하여 기쁨, 슬픔, 분노, 평온 지수 시각화.
- **디자인 컨셉:** 
    - **신문 스타일:** 고전적인 신문 레이아웃과 Serif 폰트를 활용한 뉴스 대시보드.
    - **모던 UI:** OKLCH 컬러, 노이즈 텍스처, 다층 레이어 그림자를 활용한 프리미엄 디자인.
    - **한글화:** 모든 UI/UX 요소의 완전한 한글화 및 Pretendard 폰트 적용.

## **Current Implementation Plan**
1.  **Firebase Setup:** Initialize Firestore, Storage, and Auth via CDN.
2.  **UI/UX:** Build the main layout and navigation.
3.  **Components:** Develop `diary-form`, `diary-card`, and `chat-room` web components.
4.  **Logic:** Implement emotion analysis, social graph, and media handling.

---
*Last Updated: March 29, 2026*
