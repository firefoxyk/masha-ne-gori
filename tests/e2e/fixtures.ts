import { test as base, expect } from '@playwright/test'

// Остальные браузерные сценарии проверяют игру без случайного события.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => { Math.random = () => 0.99 })
    await use(page)
  },
})
export { expect }
