// 카드 = { en: 영어 카드, ko: 한국어 카드(짝이 되는 정답) }
// 영어 카드 1장 + 한국어 카드 1장이 한 쌍이다. 카드를 고치려면 이 파일만 수정하면 된다.
// 새 레벨을 추가하려면 LEVELS 배열에 같은 모양으로 한 덩어리를 더하면 된다.
const LEVELS = [
  {
    id: 1,
    title: 'wear Level.1',
    subtitle: 'Things you wear and carry',
    cards: [
      { en: 'bag', ko: '가방' },
      { en: 'hat', ko: '모자' },
      { en: 'shoes', ko: '신발' },
      { en: 'clothes', ko: '옷' },
      { en: 'makeup', ko: '화장' },
    ],
  },
  {
    id: 2,
    title: 'wear Level.2',
    subtitle: 'Verbs: put on, take off, carry',
    cards: [
      { en: 'to carry a bag on the shoulder/back', ko: '가방을 메요' },
      { en: 'to carry a bag in the hand', ko: '가방을 들어요' },
      { en: 'to put on a hat', ko: '모자를 써요' },
      { en: 'to take off a hat', ko: '모자를 벗어요' },
      { en: 'to put on shoes', ko: '신발을 신어요' },
      { en: 'to take off shoes', ko: '신발을 벗어요' },
      { en: 'to put on clothes', ko: '옷을 입어요' },
      { en: 'to take off clothes', ko: '옷을 벗어요' },
      { en: 'to put on makeup', ko: '화장을 해요' },
      { en: 'to remove makeup', ko: '화장을 지워요' },
    ],
  },
  {
    id: 3,
    title: 'wear Level.3',
    subtitle: 'Useful shopping phrases',
    cards: [
      { en: 'Can I try this on? (clothes)', ko: '이거 입어봐도 돼요?' },
      { en: 'Can I try these on? (shoes)', ko: '이거 신어봐도 돼요?' },
      { en: 'Do you have this in size 245?', ko: '이거 245 사이즈 있어요?' },
      { en: 'Do you have one size bigger?', ko: '이거 한 사이즈 큰 거 있어요?' },
      { en: 'Do you have one size smaller?', ko: '이거 한 사이즈 작은 거 있어요?' },
      { en: 'Do you have this in another color?', ko: '이거 다른 색 있어요?' },
      { en: 'How much is this?', ko: '이거 얼마예요?' },
    ],
  },
]
