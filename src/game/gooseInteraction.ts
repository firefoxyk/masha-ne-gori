import type { GameState } from './state.ts'

export const GOOSE_CHOICES = {
  talk: { label: 'Поговорить — +3 кукухи', result: 'Гусь внимательно выслушал Машу и ответил обстоятельным «га».', cost: 0, field: 'sanity', amount: 3 },
  treat: { label: 'Предложить угощение — 5 монет, +3 мотивации', result: 'Гусь забрал угощение и кивнул. Кажется, сделка заключена.', cost: 5, field: 'motivation', amount: 3 },
  search: { label: 'Спросить о пропавшей вещи — +2 мотивации', result: 'Гусь указал крылом на носок под столом. Возможно, он просто потянулся.', cost: 0, field: 'motivation', amount: 2 },
} as const
export type GooseChoice = keyof typeof GOOSE_CHOICES
export type GooseSession = { usedDay: number; pending: null | { choice: GooseChoice | null; changes: null | { sanity: number; motivation: number; money: number } } }

export function openGoose(game: GameState, session?: GooseSession): GooseSession | undefined {
  if (game.dayStatus !== 'active' || session?.pending || session?.usedDay === game.day) return session
  return { usedDay: game.day, pending: { choice: null, changes: null } }
}
export function chooseGoose(game: GameState, session: GooseSession, id: GooseChoice): { game: GameState; session: GooseSession } {
  if (!session.pending || session.pending.choice !== null || game.dayStatus !== 'active' || !Object.hasOwn(GOOSE_CHOICES, id)) return { game, session }
  const choice = GOOSE_CHOICES[id]
  if (game.money < choice.cost) return { game, session }
  const value = Math.min(100, game[choice.field] + choice.amount)
  const changes = { sanity: choice.field === 'sanity' ? value - game.sanity : 0, motivation: choice.field === 'motivation' ? value - game.motivation : 0, money: choice.cost ? -choice.cost : 0 }
  return { game: { ...game, [choice.field]: value, money: game.money - choice.cost }, session: { ...session, pending: { choice: id, changes } } }
}
export function isValidGooseSession(value: unknown, game: GameState): value is GooseSession {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const s = value as GooseSession
  if (!Number.isSafeInteger(s.usedDay) || s.usedDay < 1 || s.usedDay > game.day) return false
  if (s.pending === null) return true
  if (!s.pending || typeof s.pending !== 'object' || game.dayStatus !== 'active' || s.usedDay !== game.day) return false
  if (s.pending.choice === null) return s.pending.changes === null
  if (!Object.hasOwn(GOOSE_CHOICES, s.pending.choice) || !s.pending.changes || typeof s.pending.changes !== 'object') return false
  const c = s.pending.changes, def = GOOSE_CHOICES[s.pending.choice]
  return Number.isInteger(c.sanity) && c.sanity >= 0 && c.sanity <= (def.field === 'sanity' ? def.amount : 0) && Number.isInteger(c.motivation) && c.motivation >= 0 && c.motivation <= (def.field === 'motivation' ? def.amount : 0) && c.money === -def.cost
}
