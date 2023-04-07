import Article from './Article';
import Database from './Database';
import Buyer from './users/Buyer';

export type Bid = {
	article: Article;
	buyer: Buyer;
	amount: number;
};

export default class Bids {
	/**
	 * Retourne toutes les enchères d'un article avec les informations de l'acheteur triées par montant décroissant
	 * @param article L'{@link Article} sur lequel on veut récupérer les enchères
	 * @returns Un tableau d'enchères ({@link Bid})
	 */
	public static async getEncheres(article: Article): Promise<Bid[]> {
		const database = Database.get();
		const enchere =
			await database`SELECT * FROM bid WHERE art_id = ${article.getId()} ORDER BY amount DESC`;
		const encheres: Bid[] = [];
		for (const e of enchere) {
			encheres.push({
				article,
				buyer: await Buyer.getById(e.b_id),
				amount: e.amount,
			});
		}
		return encheres;
	}

	/**
	 * Récupère l'enchère max d'un article
	 * @param article L'{@link Article} sur lequel on veut récupérer l'enchère max
	 * @returns L'enchère max, ou le prix de base si aucune enchère n'a été faite
	 */
	public static async getEnchereMax(article: Article): Promise<number> {
		const database = Database.get();
		const enchere =
			await database`SELECT MAX(amount) as amount FROM bid WHERE art_id = ${article.getId()}`;
		if (enchere[0].amount === null) {
			return article.getPrixBase();
		}
		return enchere[0].amount;
	}

	/**
	 * Place une enchère sur un article, ne vérifie pas si l'enchère est valide
	 * @param article L'{@link Article} sur lequel on veut placer l'enchère
	 * @param amount Le montant de l'enchère
	 * @param buyer Le {@link Buyer} qui fait l'enchère
	 */
	public static async placerEnchere(
		article: Article,
		amount: number,
		buyer: Buyer
	): Promise<void> {
		const database = Database.get();
		await database`INSERT INTO bid (art_id, b_id, amount) VALUES (${article.getId()}, ${buyer.getId()}, ${amount})`;
	}

	/**
	 * Recupère l'enchérisseur gagnant d'un article
	 * @param article L'{@link Article} sur lequel on veut récupérer l'enchérisseur gagnant
	 * @returns L'enchérisseur gagnant ({@link Buyer}), ou null si aucune enchère n'a été faite
	 */
	public static async getEncherisseurGagnant(article: Article): Promise<Buyer> {
		const database = Database.get();
		const enchere =
			await database`SELECT b_id FROM bid WHERE art_id = ${article.getId()} ORDER BY amount DESC LIMIT 1`;
		if (enchere.length === 0) {
			return null;
		}
		return await Buyer.getById(enchere[0].b_id);
	}
}
