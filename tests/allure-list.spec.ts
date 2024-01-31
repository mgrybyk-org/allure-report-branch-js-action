import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
    await page.goto('/allure')
})

test('allure list', async ({ page }) => {
    await expect(page.locator('#allureTable thead tr')).toBeVisible()
    await expect(page.locator('#allureTable tbody tr')).toHaveCount(4)
    await expect(page.locator('#allureTable tbody tr:nth-child(1)')).toHaveClass('test-unknown')
    await expect(page.locator('#allureTable tbody tr:nth-child(2)')).toHaveClass('test-fail')
    await expect(page.locator('#allureTable tbody tr:nth-child(3)')).toHaveClass('test-pass')

    await expect(page).toHaveScreenshot()
})
