import Article from '../src/model/Article';
import Bids from '../src/model/Bids';
import Database from '../src/model/Database';
import TMDB from '../src/model/TMDB';
import Buyer from '../src/model/users/Buyer';

test('Test enchere', async () => {
	const article = await Article.create(
		'Sabre laser',
		"Un sabre laser de la marque Jedi, utilisé par Darth Vader dans l'épisode 4. @test-product",
		1000,
		1,
		new Date('2020-01-01'),
		new Date('2020-01-02'),
		[],
		(
			await TMDB.searchMovie('star wars')
		)[0].id,
		1
	);

	let bids = await Bids.getEncheres(article);
	const buyer = await Buyer.getById(14);
	expect(bids.length).toBe(0);
	await Bids.placerEnchere(article, 1000, buyer);
	await Bids.placerEnchere(article, 2000, buyer);
	await Bids.placerEnchere(article, 3000, buyer);
	bids = await Bids.getEncheres(article);
	expect(bids.length).toBe(3);
	const maxBid = await Bids.getEnchereMax(article);
	expect(maxBid).toBe(3000);
});

afterAll(async () => {
	const articles_crees = await Article.getBySearch('@test-product');
	for (const article of articles_crees) {
		await article.delete();
	}
	await Database.close();
});
