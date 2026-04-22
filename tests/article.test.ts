import fs from 'fs';
import path from 'path';
import Article from '../src/model/Article';
import Config from '../src/model/Config';
import Database from '../src/model/Database';
import TMDB from '../src/model/TMDB';

test('Crée un article et lui assigne un id automatiquement', async () => {
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
	expect(article.getId()).toBeGreaterThan(0);
});

test('Récupère un article existant', async () => {
	const article = await Article.create(
		'Sabre laser',
		"Un sabre laser de la marque Jedi, utilisé par maître Yoda dans l'épisode 4. @test-product",
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
	const article2 = await Article.get(article.getId());
	expect(article2.getId()).toBe(article.getId());
});

test('Cherche des article', async () => {
	const resultats = await Article.getBySearch('sabre');
	expect(resultats.length).toBeGreaterThanOrEqual(2);

	const resultats2 = await Article.getBySearch('star wars');
	expect(resultats2.length).toBeGreaterThanOrEqual(2);

	const resultats3 = await Article.getBySearch('yoda');
	expect(resultats3.length).toBeGreaterThanOrEqual(1);
});

test('Cherche des article avec bon ordre de pertinence', async () => {
	const resultats = await Article.getBySearch('sabre Yoda');
	expect(resultats[0].getDescription()).toContain('Yoda');

	const resultats2 = await Article.getBySearch('sabre star wars Vader');
	expect(resultats2[0].getDescription()).toContain('Vader');
});

test('Autoclean works', async () => {
	// Creer fichier test
	const file_path = path.join(Config.get().uploads_dir, 'test-image.png');
	await fs.promises.writeFile(file_path, 'test');
	await Article.clean();
	// Verifier que le fichier a été supprimé
	expect(
		await fs.promises
			.access(file_path)
			.then(() => true)
			.catch(() => false)
	).toBe(false);
	// Creer un article avec un fichier
	const article = await Article.create(
		'Sabre laser',
		"Un sabre laser de la marque Jedi, utilisé par maître Yoda dans l'épisode 4. @test-product",
		1000,
		1,
		new Date('2020-01-01'),
		new Date('2020-01-02'),
		['test-image.png'],
		(
			await TMDB.searchMovie('star wars')
		)[0].id,
		1
	);
	// Creer le fichier
	await fs.promises.writeFile(
		path.join(Config.get().uploads_dir, 'test-image.png'),
		'test'
	);
	// Clean
	await Article.clean();
	// Verifier que le fichier existe toujours
	expect(
		await fs.promises
			.access(file_path)
			.then(() => true)
			.catch(() => false)
	).toBe(true);
	// Supprimer l'article
	await article.delete();
	// Clean
	await Article.clean();
	// Verifier que le fichier a été supprimé
	expect(
		await fs.promises
			.access(file_path)
			.then(() => true)
			.catch(() => false)
	).toBe(false);
});

afterAll(async () => {
	const articles_crees = await Article.getBySearch('@test-product');
	for (const article of articles_crees) {
		await article.delete();
	}
	await Database.close();
});
