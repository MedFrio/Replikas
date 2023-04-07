import { expect, test } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

test("Création d'article et test API", async ({ page }) => {
	// Connection compte entreprise
	await page.goto('/login');
	await page.fill('input[name=email]', 'gaspard@jaajcorp.org');
	await page.fill('input[name=password]', process.env.JAAJCORP_PASSWORD);
	await page.click('input[type=submit]');
	// Création d'un article
	await page.click('a[href="/dashboard/create"]');
	// Nom et description
	await page.fill('input[name=name]', 'Saucisse');
	await page.fill(
		'textarea[name=description]',
		'Une saucisse utilisée dans le film "Le dîner de cons"'
	);
	// Dates et heures de debut et fin
	await page.fill('input[name=startDate]', '2024-06-01');
	await page.fill('input[name=endDate]', '2024-06-01');
	await page.fill('input[name=startHour]', '12:00');
	await page.fill('input[name=endHour]', '13:00');
	// Prix
	await page.fill('input[name=base_price]', '10');
	await page.fill('input[name=min_bidding]', '5');
	// Autocomplete text field
	await page.fill('input[name=movie_id]', 'Le dîner de');
	await page.getByText('Le dîner de Cons').first().click();
	// Verification de la valeur du champ data-movieid
	expect(await page.getAttribute('input[name=movie_id]', 'data-movieid')).toBe(
		'9421'
	);
	// Upload image
	const [fileChooser] = await Promise.all([
		page.waitForEvent('filechooser'),
		page.click('span[class=select]'),
	]);
	await fileChooser.setFiles('tests-playwright/images/saucisse-fumee.jpg');
	// Envoi du formulaire
	await page.click('input[id=create_article]');
	// Verification du popup Swal
	await page.waitForSelector('div[class=swal2-success-ring]');
	expect(await page.isVisible('div[class=swal2-success-ring]')).toBe(true);
});
