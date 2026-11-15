import { describe, expect, it, vi } from 'vitest'
import { GOOSE_CHANCE, GOOSE_VISIT_MS, shouldShowGoose } from './gooseAppearance'

describe('случайное появление гуся', () => {
  it('использует заданную вероятность и не бросает случайность второй раз в тот же день', () => {
    expect(shouldShowGoose(1, null, () => 0)).toBe(true)
    expect(shouldShowGoose(1, null, () => GOOSE_CHANCE)).toBe(false)
    const random = vi.fn(() => 0)
    expect(shouldShowGoose(1, 1, random)).toBe(false)
    expect(random).not.toHaveBeenCalled()
    expect(shouldShowGoose(2, 1, random)).toBe(true)
    expect(shouldShowGoose(2, null, () => NaN)).toBe(false)
    expect(GOOSE_VISIT_MS).toBe(20000)
  })
})
