export type Guess = { word: string; score: number; rank: string; nth: number }

export type Puzzle = { id: number; top1: number; top10: number; top1000: number }

export type Game = {
  puzzle?: Puzzle
  guesses: Guess[]
  lastWord?: string
  error?: string
}

declare module 'claude-code' {
  interface PluginState {
    kkomantle: { game: Shaped<Game> }
  }
}
