import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
    await page.goto('/html')
})

test('html list', async ({ page }) => {
    await expect(page.locator('#links')).toBeVisible()
    const links = ['..', 'main', 'feature-branch']
    for (const link of links) {
        await expect(page.locator(`#links a[href="${link}"]`)).toHaveText(link)
    }

    await expect(page).toHaveScreenshot()
})
