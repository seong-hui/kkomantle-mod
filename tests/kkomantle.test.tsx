import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  plugin: 'kkomantle',
  component: 'Pane',
  requestId: 'kkomantle',
  props: {
    title: '꼬맨틀',
    isFocused: true,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

const TODAY = { answer_id: 7, '1st_score': 0.5, '10th_score': 0.45, '1000th_score': 0.3, previous: {} }
const SCORES: Record<string, { sim: number; rank: string | number }> = {
  사과: { sim: 0.15, rank: '1000위 이상' },
  바나나: { sim: 0.4, rank: 52 },
}

function answerFetch(_: unknown, e: { url: string }) {
  const url = new URL(e.url)
  if (url.pathname === '/today') return { value: { status: 200, ok: true, headers: {}, text: JSON.stringify(TODAY) } }
  const word = decodeURIComponent(url.pathname.split('/')[3] ?? '')
  const score = SCORES[word]
  if (!score) return { value: { status: 404, ok: false, headers: {}, text: '{"detail":{"type":"InvalidGuess"}}' } }
  return { value: { status: 200, ok: true, headers: {}, text: JSON.stringify({ guess: word, ...score }) } }
}

test('/kkom 으로 추측하면 점수가 나오고 패널에 유사도 순으로 쌓인다', async ($, on) => {
  mock.store(on)
  on('http.fetch', answerFetch)

  expect((await $.command.run({ command: 'kkom', args: '사과' })).text).toBe('사과: 유사도 15.00 · 1000위 이상')
  expect((await $.command.run({ command: 'kkom', args: '바나나' })).text).toBe('바나나: 유사도 40.00 · 52위')
  expect((await $.command.run({ command: 'kkom', args: '사과' })).text).toContain('이미 추측한 단어')
  expect((await $.command.run({ command: 'kkom', args: 'ㅁㄴㅇ' })).text).toBe('ㅁㄴㅇ은(는) 알 수 없는 단어입니다.')

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const words = (await ui.findAll({ type: 'Text' })).map(one => one.text)
  expect(words.lastIndexOf('바나나')).toBeLessThan(words.lastIndexOf('사과'))
  expect(words).toContain('#7 · 1위 50.00 · 10위 45.00 · 1000위 30.00')
  await ui.unmount()
})

test('패널 입력창에서 Enter 로 추측한다', async ($, on) => {
  mock.store(on)
  on('http.fetch', answerFetch)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.input({ key: 'guess', text: '바나나' })
  expect((await ui.find({ type: 'Text', text: /^52$/ }))?.text).toBe('52')
  await ui.unmount()
})
