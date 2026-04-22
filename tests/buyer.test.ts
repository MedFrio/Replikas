import Article from '../src/model/Article';
import Database from '../src/model/Database';
import { UtilisateurOuMotDePasseInvalideError } from '../src/model/users/Account';
import Buyer from '../src/model/users/Buyer';

test('Crée un utilisateur et lui assigne un id automatiquement', async () => {
	const user = await Buyer.createBuyer(
		'elon.musk@teslamotors.com',
		'ILoveTesla',
		'Musk',
		'Elon'
	);
	expect(user.getId()).toBeGreaterThan(0);
});

test('Récupère un utilisateur existant', async () => {
	const user = await Buyer.get('elon.musk@teslamotors.com', 'ILoveTesla');
	expect(user.getId()).toBeGreaterThan(0);
});

test("Renvoie une erreur si l'utilisateur n'existe pas", async () => {
	await expect(async () => {
		await Buyer.get('elon.musk@teslamotorze.com', 'ILoveTesla');
	}).rejects.toThrowError(UtilisateurOuMotDePasseInvalideError);
});

test('Renvoie une erreur si le mot de passe est incorrect', async () => {
	await expect(async () => {
		await Buyer.get('elon.musk@teslamotors.com', 'IHateTesla');
	}).rejects.toThrowError(UtilisateurOuMotDePasseInvalideError);
});

test('Crée le token de session', async () => {
	const user = await Buyer.get('elon.musk@teslamotors.com', 'ILoveTesla');
	const token = await user.createSession();

	const database = Database.get();
	const result = await database`SELECT * FROM session WHERE s_token = ${token}`;
	expect(result.count).toBe(1);
});

test("Récupère l'utilisateur à partir du token de session", async () => {
	const user = await Buyer.get('elon.musk@teslamotors.com', 'ILoveTesla');
	const token = await user.createSession();
	const user2 = await Buyer.getBySession(token);
	expect(user2.getId()).toBe(user.getId());
});

test('Test likeArticle', async () => {
	const article = await Article.create(
		'test',
		'test',
		1,
		1,
		new Date(),
		new Date(),
		[],
		550,
		1
	);
	const user = await Buyer.get('elon.musk@teslamotors.com', 'ILoveTesla');
	await user.likeArticle(article.getId());
	const result = await user.getLikedArticles();
	expect(result[0].getId()).toBe(article.getId());
	await user.unlikeArticle(article.getId());
	const result2 = await user.getLikedArticles();
	expect(result2.length).toBe(0);
});

afterAll(async () => {
	const database = Database.get();

	await database`DELETE FROM account WHERE a_login = 'elon.musk@teslamotors.com'`;
	await database`DELETE FROM article WHERE art_name = 'test'`;

	await Database.close();
});
