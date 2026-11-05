// 모든 카드는 처음부터 앞면(글씨가 보이는 상태)이다.
// 영어 카드 하나와 한국어 카드 하나를 차례로 눌러 짝을 맞춘다.
// deck 의 각 카드 = { pair: 쌍 번호, lang: 'en' | 'ko', text, open, matched, wrong }
//   open = 지금 골라 둔(선택된) 카드, matched = 짝을 맞힌 카드
const state = {
  levelIndex: 0,
  deck: [],
  open: [], // 지금 고른 카드의 deck 인덱스 (최대 2개)
  found: 0,
  moves: 0,
  locked: false, // 두 장을 비교하는 동안에는 추가 클릭을 무시한다
  done: false,
  startedAt: 0,
  elapsed: 0,
  timerId: null,
  gameId: 0, // 새 게임이 시작되면 예전 setTimeout 이 아무 일도 못 하게 한다
  sound: true,
}

const WRONG_DELAY = 1000 // 틀렸을 때 선택이 풀리기까지 (ms)
const COMPLETE_DELAY = 1200 // 마지막 쌍을 맞힌 뒤 완료 화면이 뜨기까지 (ms)

const $ = (id) => document.getElementById(id)
const els = {
  app: $('app'),
  tabs: $('tabs'),
  levelSub: $('levelSub'),
  moves: $('moves'),
  time: $('time'),
  pairs: $('pairs'),
  grid: $('grid'),
  restart: $('restart'),
  sound: $('sound'),
  announce: $('announce'),
  overlay: $('overlay'),
  doneSub: $('doneSub'),
  doneMoves: $('doneMoves'),
  doneTime: $('doneTime'),
  playAgain: $('playAgain'),
  nextLevel: $('nextLevel'),
  cards: [], // 카드 <button> 목록 (deck 과 같은 순서)
  tabButtons: [],
}

// ---------- 음성 (한국어만 읽는다) ----------
const canSpeak = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'

function speakKorean(text) {
  if (!canSpeak || !state.sound) return
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ko-KR'
    u.rate = 0.85
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('ko'))
    if (voice) u.voice = voice
    window.speechSynthesis.speak(u)
  } catch (e) {
    // 음성이 안 되는 기기에서도 게임은 계속된다
  }
}
function stopSpeaking() {
  if (!canSpeak) return
  try {
    window.speechSynthesis.cancel()
  } catch (e) {}
}

// ---------- 유틸 ----------
const level = () => LEVELS[state.levelIndex]

function shuffled(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function announce(msg) {
  els.announce.textContent = msg
}

// ---------- 타이머 ----------
function startTimer() {
  state.startedAt = Date.now()
  state.timerId = setInterval(() => {
    state.elapsed = Date.now() - state.startedAt
    els.time.textContent = formatTime(state.elapsed)
  }, 250)
}
function stopTimer() {
  if (state.timerId) clearInterval(state.timerId)
  state.timerId = null
  if (state.startedAt) state.elapsed = Date.now() - state.startedAt
  els.time.textContent = formatTime(state.elapsed)
}

// ---------- 글자 크기 자동 맞춤 ----------
// 글자가 카드 안에 다 들어갈 때까지 font-size 를 한 단계씩 줄인다.
function fitText(btn) {
  const wrap = btn.querySelector('.text-wrap')
  if (!wrap) return
  const t = wrap.firstElementChild
  let size = window.innerWidth >= 700 ? 28 : 22
  t.style.fontSize = size + 'px'
  while (size > 10 && (t.offsetHeight > wrap.clientHeight || t.scrollWidth > t.clientWidth)) {
    size -= 1
    t.style.fontSize = size + 'px'
  }
}
let fitQueued = false
function fitAll() {
  if (fitQueued) return
  fitQueued = true
  requestAnimationFrame(() => {
    fitQueued = false
    els.cards.forEach((b) => fitText(b))
  })
}

// ---------- 카드 그리기 ----------
// 격자는 게임마다 한 번만 만들고, 이후에는 카드 하나씩 갱신한다(키보드 포커스를 유지하려고).
function updateCard(i) {
  const c = state.deck[i]
  const b = els.cards[i]
  const status = c.matched ? 'matched' : c.open ? 'open' : 'idle'
  const langName = c.lang === 'en' ? 'English' : 'Korean'

  b.className = `card ${status} ${c.lang}${c.wrong ? ' wrong' : ''}`
  b.setAttribute('aria-disabled', String(status === 'matched'))
  b.textContent = ''

  const side = document.createElement('span')
  side.className = 'side'
  side.textContent = status === 'matched' ? `${langName} ✓` : langName

  const wrap = document.createElement('span')
  wrap.className = 'text-wrap'
  const text = document.createElement('span')
  text.className = 'text'
  text.lang = c.lang
  text.textContent = c.text
  wrap.appendChild(text)

  b.append(side, wrap)
  const note = status === 'matched' ? 'Matched.' : status === 'open' ? 'Selected.' : 'Tap to select.'
  b.setAttribute('aria-label', `${langName} card: ${c.text}. ${note}`)
  fitText(b)
}

function renderStats() {
  els.moves.textContent = String(state.moves)
  els.time.textContent = formatTime(state.elapsed)
  els.pairs.textContent = `${state.found} / ${level().cards.length}`
}

function renderTabs() {
  els.tabs.textContent = ''
  els.tabButtons = LEVELS.map((lv, i) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'tab'
    b.append(`Level ${lv.id}`)
    const small = document.createElement('small')
    small.textContent = `${lv.cards.length} pairs`
    b.appendChild(small)
    b.addEventListener('click', () => newGame(i))
    els.tabs.appendChild(b)
    return b
  })
}
function updateTabs() {
  els.tabButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === state.levelIndex)))
}

// ---------- 게임 흐름 ----------
function newGame(levelIndex) {
  state.gameId += 1
  stopTimer()
  stopSpeaking()
  hideComplete()

  state.levelIndex = levelIndex
  state.open = []
  state.found = 0
  state.moves = 0
  state.locked = false
  state.done = false
  state.startedAt = 0
  state.elapsed = 0

  const pairs = level().cards
  const deck = []
  pairs.forEach((p, idx) => {
    deck.push({ pair: idx, lang: 'en', text: p.en, open: false, matched: false, wrong: false })
    deck.push({ pair: idx, lang: 'ko', text: p.ko, open: false, matched: false, wrong: false })
  })
  state.deck = shuffled(deck)

  els.grid.textContent = ''
  els.cards = state.deck.map((_, i) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.addEventListener('click', () => onCardClick(i))
    els.grid.appendChild(b)
    return b
  })
  state.deck.forEach((_, i) => updateCard(i))

  els.levelSub.textContent = `${level().title} · ${level().subtitle}`
  updateTabs()
  renderStats()
  announce(`${level().title} started. Match ${pairs.length} pairs.`)
}

function onCardClick(i) {
  if (state.locked || state.done) return // 비교 중이거나 끝났으면 무시
  const c = state.deck[i]
  if (c.matched) return // 이미 맞힌 카드
  if (c.open) return // 같은 카드를 두 번 눌러도 짝이 되지 않는다

  if (!state.startedAt) startTimer()

  c.open = true
  state.open.push(i)
  updateCard(i)
  if (state.open.length < 2) return

  // 두 장이 골라졌다: 시도 1회
  state.moves += 1
  const [ia, ib] = state.open
  const a = state.deck[ia]
  const b = state.deck[ib]

  if (a.pair === b.pair && a.lang !== b.lang) {
    // 정답: 초록으로 남기고 한국어를 읽어 준다 (클릭 핸들러 안에서 바로 시작)
    a.open = b.open = false
    a.matched = b.matched = true
    state.open = []
    state.found += 1
    updateCard(ia)
    updateCard(ib)
    renderStats()
    speakKorean(level().cards[a.pair].ko)
    if (state.found === level().cards.length) {
      state.done = true
      stopTimer()
      announce('Match! All pairs found.')
      const id = state.gameId
      setTimeout(() => {
        if (id === state.gameId) showComplete()
      }, COMPLETE_DELAY)
    } else {
      announce(`Match! ${state.found} of ${level().cards.length} pairs found.`)
    }
  } else {
    // 오답(영어끼리·한국어끼리·다른 쌍): 잠시 표시한 뒤 선택을 푼다
    state.locked = true
    a.wrong = b.wrong = true
    updateCard(ia)
    updateCard(ib)
    renderStats()
    announce('Not a match. Try again.')
    const id = state.gameId
    setTimeout(() => {
      if (id !== state.gameId) return
      a.open = b.open = false
      a.wrong = b.wrong = false
      state.open = []
      state.locked = false
      updateCard(ia)
      updateCard(ib)
    }, WRONG_DELAY)
  }
}

// ---------- 완료 화면 ----------
function showComplete() {
  const isLast = state.levelIndex === LEVELS.length - 1
  els.doneSub.textContent = isLast
    ? `You finished ${level().title} — the last level!`
    : `You finished ${level().title}.`
  els.doneMoves.textContent = String(state.moves)
  els.doneTime.textContent = formatTime(state.elapsed)
  els.nextLevel.hidden = isLast
  els.overlay.hidden = false
  els.app.inert = true // 뒤쪽 화면은 키보드·스크린리더 대상에서 뺀다
  els.playAgain.focus()
}
function hideComplete() {
  if (els.overlay.hidden) return
  els.overlay.hidden = true
  els.app.inert = false
}

// ---------- 이벤트 ----------
els.restart.addEventListener('click', () => newGame(state.levelIndex))
els.playAgain.addEventListener('click', () => newGame(state.levelIndex))
els.nextLevel.addEventListener('click', () => newGame(Math.min(state.levelIndex + 1, LEVELS.length - 1)))

els.sound.addEventListener('click', () => {
  state.sound = !state.sound
  if (!state.sound) stopSpeaking()
  els.sound.setAttribute('aria-pressed', String(state.sound))
  els.sound.textContent = state.sound ? '🔊 Sound on' : '🔇 Sound off'
})
if (!canSpeak) els.sound.hidden = true

window.addEventListener('keydown', (e) => {
  // Esc 로 완료 화면을 닫고 완성된 판을 볼 수 있다
  if (e.key === 'Escape' && !els.overlay.hidden) {
    hideComplete()
    els.restart.focus()
    fitAll()
  }
})
window.addEventListener('resize', fitAll)

// 일부 브라우저는 음성 목록을 늦게 불러온다
if (canSpeak) {
  try {
    window.speechSynthesis.getVoices()
    window.speechSynthesis.onvoiceschanged = () => {}
  } catch (e) {}
}

renderTabs()
newGame(0)
// 글꼴이 늦게 로드되어 줄 바꿈이 달라질 수 있으니 한 번 더 맞춘다
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll)
