# **Social Emotion Diary - Project Blueprint**

## **Overview**
A minimalist, high-impact social diary application where users share 100-character daily reflections enhanced by media (photos, voice) and sentiment analysis. The app focuses on emotional connection through mutual followers ("맞팔") and community-driven curation ("Best 10").

## **Detailed Outline & Implemented Features**

### **1. Core User Experience**
- **Nickname Entry:** Persistent nickname-based entry stored in `localStorage`.
- **100-Character Diary:** Real-time character counter and validation.
- **Rich Media Support:** Placeholders and UI for photo and voice uploads.
- **Privacy Control:** Individual entries can be set to Public or Private.

### **2. Social Mechanics**
- **Like System:** Interactive "Heart" button with real-time count updates.
- **Best 10 Leaderboard:** Automatic sorting of public entries by like count.
- **Mutual Follow (맞팔):** Two-way follow system implemented in the UI.
- **Real-Time Feed:** Instant display of new public entries.

### **3. Intelligence & Aesthetics**
- **Emotion Index:** Rule-based analysis of 100+ keywords and emojis to generate a sentiment profile (Joy, Sadness, Anger, Calm).
- **Visual Design:**
    - **Premium Feel:** SVG noise texture, OKLCH color spaces, and deep multi-layered shadows.
    - **Responsive:** Fluid layout using modern CSS primitives.
    - **Web Components:** Encapsulated `<diary-card>` for consistent rendering.

## **Current Implementation Plan**
1.  **Firebase Setup:** Initialize Firestore, Storage, and Auth via CDN.
2.  **UI/UX:** Build the main layout and navigation.
3.  **Components:** Develop `diary-form`, `diary-card`, and `chat-room` web components.
4.  **Logic:** Implement emotion analysis, social graph, and media handling.

---
*Last Updated: March 29, 2026*
