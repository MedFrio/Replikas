import Article from '../src/model/Article';
import Database from '../src/model/Database';
import TMDB from '../src/model/TMDB';
import Company from '../src/model/users/Company';

// On nee fait pas les tests de compte car déjà fait dans buyer.test.ts
jest.setTimeout(10000);
test('Recupere les articles soon et ongoing', async () => {
	const company = await Company.createCompany(
		'lucasfilm@yahoo.fr',
		'IL0veStarW@rs',
		'Lucasfilm Ltd.'
	);
	let ongoing = await company.getOnGoingSales();
	expect(ongoing.length).toBe(0);
	let soon = await company.getComingSoonSales();
	expect(soon.length).toBe(0);

	let startD = new Date();
	startD.setDate(startD.getDate() - 1);
	let endD = new Date();
	endD.setDate(endD.getDate() + 1);
	const article = await Article.create(
		"étoile noire à l'échelle",
		"étoile noire à l'échelle comme dans le film, prévoir de l'espace. @test-product",
		1000000000,
		100,
		startD,
		endD,
		[],
		(
			await TMDB.searchMovie('star wars')
		)[0].id,
		company.getId()
	);
	ongoing = await company.getOnGoingSales();
	expect(ongoing.length).toBe(1);
	expect(ongoing[0].getId()).toBe(article.getId());
	startD = new Date();
	startD.setDate(startD.getDate() + 1);
	endD = new Date();
	endD.setDate(endD.getDate() + 2);
	const article2 = await Article.create(
		"Destroyer à l'échelle",
		"Destroyer à l'échelle comme dans le film, prévoir de l'espace. @test-product",
		1000000000,
		100,
		startD,
		endD,
		[],
		(
			await TMDB.searchMovie('star wars')
		)[0].id,
		company.getId()
	);
	ongoing = await company.getComingSoonSales();
	expect(ongoing.length).toBe(1);
	expect(ongoing[0].getId()).toBe(article2.getId());
});

afterAll(async () => {
	const articles_crees = await Article.getBySearch('@test-product');
	for (const article of articles_crees) {
		await article.delete();
	}
	const company = await Company.get('lucasfilm@yahoo.fr', 'IL0veStarW@rs');
	await company.delete();
	await Database.close();
});
