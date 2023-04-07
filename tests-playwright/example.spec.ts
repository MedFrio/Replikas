import { expect, test } from '@playwright/test';

test('Search bar sets value to article URLParameter', async ({ page }) => {
	await page.goto('/?article=Dark%20Vador');
	// create a locator
	const locator = page.locator('input[type="text"]');
	// get the value of the locator
	const value = await locator.inputValue();
	// assert the value
	expect(value).toBe('Dark Vador');
});

test('Connection utilisateur', async ({ page }) => {
	await page.goto('/');
	await page.click('id=login');
	await expect(page).toHaveURL('/login');
	await page.fill('input[name=email]', 'gaspard@replikas.com');
	await page.fill('input[name=password]', 'password');
	await page.click('input[type=submit]');
	await page.waitForSelector("a[href='/settings']");
});
