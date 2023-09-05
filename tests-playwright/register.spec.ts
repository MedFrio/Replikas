import { expect, test } from '@playwright/test';

test('Bouton register marche', async ({ page }) => {
	await page.goto('/');
	await page.click('id=signup');
	await expect(page).toHaveURL('/register');
});

test("Création d'un compte", async ({ page }) => {
	await page.goto('/register');
	await page.fill('input[name=last_name]', 'Musk');
	await page.fill('input[name=first_name]', 'Elon');
	await page.fill('input[name=email]', 'dooverwrite@testmail.com');
	await page.fill('input[name=password]', 'P@ssw0rd');
	await page.fill('input[name=password_confirm]', 'P@ssw0rd');
	await page.click('input[type=checkbox]');
	await page.click('input[type=submit]');
	await expect(page).toHaveURL(/info=account_created/);
});

test("Création d'un compte avec un email déjà utilisé", async ({ page }) => {
	await page.goto('/register');
	await page.fill('input[name=last_name]', 'Musk');
	await page.fill('input[name=first_name]', 'Elon');
	await page.fill('input[name=email]', 'gaspard@replikas.com');
	await page.fill('input[name=password]', 'P@ssw0rd');
	await page.fill('input[name=password_confirm]', 'P@ssw0rd');
	await page.click('input[type=checkbox]');
	await page.click('input[type=submit]');
	await expect(page).toHaveURL(/error=already_exists/);
});

test("Création d'un compte avec un mot de passe différent", async ({
	page,
}) => {
	await page.goto('/register');
	await page.fill('input[name=last_name]', 'Musk');
	await page.fill('input[name=first_name]', 'Elon');
	await page.fill('input[name=email]', 'dooverwrite@testmail.com');
	await page.fill('input[name=password]', 'P@ssw0rd');
	await page.fill('input[name=password_confirm]', 'P@ssw0rd2');
	await page.click('input[type=checkbox]');
	await page.click('input[type=submit]');
	await expect(page).toHaveURL(/error=password_mismatch/);
});

test("Création d'un compte avec un mail invalide", async ({ page }) => {
	await page.goto('/register');
	await page.fill('input[name=last_name]', 'Musk');
	await page.fill('input[name=first_name]', 'Elon');
	await page.fill('input[name=email]', 'edooverwrite@testmail');
	await page.fill('input[name=password]', 'P@ssw0rd');
	await page.fill('input[name=password_confirm]', 'P@ssw0rd');
	await page.click('input[type=checkbox]');
	await page.click('input[type=submit]');
	await expect(page).toHaveURL(/error=invalid_email/);
});

test("Création d'un compte avec un mot de passe faible", async ({ page }) => {
	await page.goto('/register');
	await page.fill('input[name=last_name]', 'Musk');
	await page.fill('input[name=first_name]', 'Elon');
	await page.fill('input[name=email]', 'dooverwrite@testmail.com');
	await page.fill('input[name=password]', 'password');
	await page.fill('input[name=password_confirm]', 'password');
	await page.click('input[type=checkbox]');
	await page.click('input[type=submit]');
	await expect(page).toHaveURL(/error=weak_password/);
});
