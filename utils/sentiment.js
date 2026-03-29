// utils/sentiment.js

const emotionMap = {
  // Joy
  '😀': 'joy', '😁': 'joy', '😂': 'joy', '🤣': 'joy', '😃': 'joy', '😄': 'joy', '😅': 'joy', '😆': 'joy',
  '😊': 'joy', '😋': 'joy', '😎': 'joy', '😍': 'joy', '🥰': 'joy', '😘': 'joy', '🥳': 'joy',
  'happy': 'joy', 'great': 'joy', 'awesome': 'joy', 'good': 'joy', 'love': 'joy', 'fun': 'joy',
  '좋아': 'joy', '행복': 'joy', '최고': 'joy', '기뻐': 'joy', '신나': 'joy', '재미': 'joy',

  // Sadness
  '😢': 'sad', '😭': 'sad', '☹️': 'sad', '🙁': 'sad', '😟': 'sad', '😔': 'sad', '😞': 'sad',
  'sad': 'sad', 'bad': 'sad', 'cry': 'sad', 'lonely': 'sad', 'hurt': 'sad', 'pain': 'sad',
  '슬퍼': 'sad', '우울': 'sad', '힘들어': 'sad', '아파': 'sad', '괴로워': 'sad', '외로워': 'sad',

  // Anger
  '😠': 'anger', '😡': 'anger', '🤬': 'anger', '😤': 'anger', '💢': 'anger',
  'angry': 'anger', 'mad': 'anger', 'hate': 'anger', 'annoyed': 'anger',
  '화나': 'anger', '짜증': 'anger', '싫어': 'anger', '분해': 'anger',

  // Calm
  '😌': 'calm', '😴': 'calm', '🧘': 'calm', '🍃': 'calm', '✨': 'calm', '☁️': 'calm',
  'calm': 'calm', 'peace': 'calm', 'rest': 'calm', 'quiet': 'calm', 'soft': 'calm',
  '편안': 'calm', '조용': 'calm', '휴식': 'calm', '평온': 'calm', '차분': 'calm'
};

export function analyzeSentiment(text) {
  const scores = { joy: 0, sad: 0, anger: 0, calm: 0 };
  const words = text.toLowerCase().split(/\s+|(?=\p{Emoji})|(?<=\p{Emoji})/u);
  
  let matches = 0;
  words.forEach(word => {
    for (const [key, value] of Object.entries(emotionMap)) {
      if (word.includes(key)) {
        scores[value] += 1;
        matches++;
      }
    }
  });

  // If no matches, return neutral (balanced)
  if (matches === 0) {
    return { joy: 25, sad: 25, anger: 25, calm: 25 };
  }

  // Convert to percentages
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  return {
    joy: Math.round((scores.joy / total) * 100),
    sad: Math.round((scores.sad / total) * 100),
    anger: Math.round((scores.anger / total) * 100),
    calm: Math.round((scores.calm / total) * 100)
  };
}
