import { atom, read, update } from 'claude-code'
import type { CoreEngineInterface, Register } from 'claude-code'

import type { Game, Guess, Puzzle } from '../types'

const SITE = 'https://semantle-ko.newsjel.ly'
const PANE = 'kkomantle'
const TITLE = '꼬맨틀'
const game = atom({ plugin: 'kkomantle', key: 'game' } as const, { guesses: [] } as Game, {
  shape: 'game-1',
})

type Today = { answer_id: number; '1st_score': number; '10th_score': number; '1000th_score': number }
type GuessResponse = { guess: string; sim: number; rank: string | number }

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'kkom',
      description: '꼬맨틀: 단어를 추측하거나, 단어 없이 패널을 연다',
      argumentHint: '[단어]',
      immediate: true,
    })

    return next(e)
  })

  on('command.run', { command: 'kkom' }, async ($, e) => {
    if (!e.args.trim()) {
      await loadToday($)
      await $.ui.open({ id: PANE, title: TITLE, focus: true })
      return { text: '꼬맨틀 패널을 열었습니다.' }
    }

    try {
      return { text: await guess($, e.args) }
    } catch (error) {
      return { text: String(error) }
    }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const elements = $.ui.resolve(e)
    const { Box, Text } = elements
    // 입력창이 없는 화면(모바일)에서는 /kkom <단어> 로만 추측한다.
    const Input = 'Input' in elements ? elements.Input : undefined
    const { puzzle, guesses, lastWord, error } = await read($, game)
    const sorted = [...guesses].sort((a, b) => b.score - a.score)
    const last = guesses.find(one => one.word === lastWord)
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 9)

    function row(cells: string[], style: { dimColor?: boolean; bold?: boolean; color?: string }) {
      return (
        <Box flexDirection="row">
          {cells.map((cell, index) => (
            <Box width={[5, 14, 8, 12][index]}>
              <Text {...style}>{cell}</Text>
            </Box>
          ))}
        </Box>
      )
    }

    function submitGuess(value: string) {
      void guess($, value).catch(failure =>
        update($, game, current => ({ ...current, error: String(failure) })),
      )
    }

    return (
      <Box flexDirection="column">
        {puzzle ? (
          <Text dimColor>
            #{puzzle.id} · 1위 {puzzle.top1.toFixed(2)} · 10위 {puzzle.top10.toFixed(2)} · 1000위{' '}
            {puzzle.top1000.toFixed(2)}
          </Text>
        ) : (
          <Text dimColor>단어를 입력하면 오늘의 퍼즐을 받아옵니다.</Text>
        )}
        {Input && (
          <Input key="guess" placeholder="추측할 단어" value="" submitLabel="추측" autoFocus onSubmit={submitGuess} />
        )}
        {error && <Text color="red">{error}</Text>}
        {last && (
          <Text>
            방금 <Text bold>{last.word}</Text> {describe(last)}
          </Text>
        )}
        {sorted.length > 0 && row(['#', '단어', '유사도', '순위'], { dimColor: true })}
        {sorted.slice(0, room).map(one =>
          row(
            [String(one.nth), one.word, one.score.toFixed(2), one.rank],
            one.word === lastWord ? { bold: true, color: 'cyan' } : {},
          ),
        )}
        {sorted.length > room && <Text dimColor>… 외 {sorted.length - room}개</Text>}
      </Box>
    )
  })
}

// 퍼즐 번호는 자정에 바뀌므로 추측할 때마다 다시 받는다. 번호가 바뀌면 그 번호의 기록을 store 에서 불러온다.
async function loadToday($: CoreEngineInterface): Promise<Puzzle> {
  const response = await $.http.fetch(`${SITE}/today`)
  if (!response.ok) throw new Error(`오늘의 퍼즐을 못 받았습니다 (${response.status})`)
  const today = JSON.parse(response.text) as Today
  const puzzle: Puzzle = {
    id: today.answer_id,
    top1: today['1st_score'] * 100,
    top10: today['10th_score'] * 100,
    top1000: today['1000th_score'] * 100,
  }
  const current = await read($, game)
  if (current.puzzle?.id !== puzzle.id) {
    const saved = (await $.store.get(`guesses-${puzzle.id}`)) as Guess[] | undefined
    await update($, game, () => ({ puzzle, guesses: saved ?? [] }))
  }

  return puzzle
}

async function guess($: CoreEngineInterface, input: string): Promise<string> {
  const word = input.trim()
  if (!word) return '단어를 입력해 주세요.'

  const puzzle = await loadToday($)
  const found = (await read($, game)).guesses.find(one => one.word === word)
  if (found) {
    await update($, game, value => ({ ...value, lastWord: word, error: undefined }))
    return `${word}: 이미 추측한 단어입니다 (${describe(found)})`
  }

  const response = await $.http.fetch(`${SITE}/guess/${puzzle.id}/${encodeURIComponent(word)}`)
  if (!response.ok) {
    const error = response.status === 404 ? `${word}은(는) 알 수 없는 단어입니다.` : `추측 실패 (${response.status})`
    await update($, game, value => ({ ...value, error }))
    return error
  }

  const result = JSON.parse(response.text) as GuessResponse
  let added: Guess | undefined
  const next = await update($, game, value => {
    added = { word, score: result.sim * 100, rank: String(result.rank), nth: value.guesses.length + 1 }
    return { ...value, guesses: [...value.guesses, added], lastWord: word, error: undefined }
  })
  await $.store.set(`guesses-${puzzle.id}`, next.guesses)

  return `${word}: ${describe(added!)}`
}

function describe(one: Guess): string {
  return `유사도 ${one.score.toFixed(2)} · ${one.rank === '정답!' || one.rank.includes('이상') ? one.rank : `${one.rank}위`}`
}
