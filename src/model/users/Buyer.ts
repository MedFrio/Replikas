import Article, { ArticleInexistantError } from '../Article';
import Database from '../Database';
import { EtatInnatenduError } from '../Utilitaire';
import Account, { AccountTypeMismatch } from './Account';

export default class Buyer extends Account {
	private last_name: string;
	private first_name: string;

	/**
	 * @inheritdoc Account.get
	 * @throws {@link AccountTypeMismatch} Si l'account n'est pas un acheteur mais une entreprise
	 */
	public static async get(email: string, password: string): Promise<Buyer> {
		const account = await super.get(email, password);
		return this.getFromAccount(account);
	}

	/**
	 * Convertit un account en acheteur
	 * @param account L'account à convertir en acheteur
	 * @returns L'acheteur correspondant à l'account
	 * @throws {@link AccountTypeMismatch} Si l'account n'est pas un acheteur mais une entreprise
	 * @throws {@link EtatInnatenduError} Si l'account existe mais pas l'acheteur
	 */
	public static async getFromAccount(account: Account): Promise<Buyer> {
		if (account.isCompany()) {
			throw new AccountTypeMismatch('buyer');
		}
		const database = Database.get();
		const result =
			await database`SELECT * FROM buyer WHERE a_id = ${account.getId()}`;
		if (result.count === 0) {
			throw new EtatInnatenduError("L'utilisateur existe mais pas l'acheteur");
		}
		const buyer = new Buyer();
		buyer.id = account.getId();
		buyer.email = account.getEmail();
		buyer.created_at = account.getDateCreation();
		buyer.is_company = false;
		buyer.last_name = result[0].b_last_name;
		buyer.first_name = result[0].b_first_name;

		return buyer;
	}

	/**
	 * @inheritdoc Account.getById
	 * @throws {@link AccountTypeMismatch} Si l'account n'est pas un acheteur mais une entreprise
	 */
	public static async getById(id: number): Promise<Buyer> {
		const account = await super.getById(id);
		return this.getFromAccount(account);
	}

	/**
	 * Crée un acheteur et son compte correspondant
	 * @param email L'adresse courriel de l'acheteur
	 * @param password Le mot de passe du compte
	 * @param last_name Le nom de famille de l'acheteur
	 * @param first_name Le prénom de l'acheteur
	 * @returns L'acheteur nouvellement créé
	 * @throws {@link EmailDejaUtiliseError} Si l'adresse courriel est déjà utilisée
	 */
	public static async createBuyer(
		email: string,
		password: string,
		last_name: string,
		first_name: string
	): Promise<Buyer> {
		const account = await super.create(email, password);
		const database = Database.get();
		await database`INSERT INTO buyer (a_id, b_last_name, b_first_name) VALUES (${account.getId()}, ${last_name}, ${first_name})`;
		const buyer = new Buyer();
		buyer.id = account.getId();
		buyer.email = account.getEmail();
		buyer.created_at = account.getDateCreation();
		buyer.is_company = false;
		buyer.last_name = last_name;
		buyer.first_name = first_name;

		return buyer;
	}

	/**
	 * @inheritdoc Account.getBySession
	 * @throws {@link AccountTypeMismatch} Si l'account n'est pas un acheteur mais une entreprise
	 */
	public static async getBySession(token: string): Promise<Buyer> {
		const account = await super.getBySession(token);
		return this.getFromAccount(account);
	}

	/**
	 * Ajoute un article dans la liste des "intérêts" de l'acheteur
	 * @param article_id L'id de l'article à liker
	 * @throws {@link ArticleInexistantError} Si l'article n'existe pas
	 */
	public async likeArticle(article_id: number): Promise<void> {
		const database = Database.get();
		await database`INSERT INTO interests (b_id, art_id) VALUES (${this.id}, ${article_id})`.catch(
			(error) => {
				if (error.code === '23503') {
					throw new ArticleInexistantError(article_id);
				}
			}
		);
	}

	/**
	 * Retire un article de la liste des "intérêts" de l'acheteur
	 * @param article_id L'id de l'article à unliker
	 */
	public async unlikeArticle(article_id: number): Promise<void> {
		const database = Database.get();
		await database`DELETE FROM interests WHERE b_id = ${this.id} AND art_id = ${article_id}`.catch(
			(error) => {
				// Si l'article n'existe pas, on ne fait rien
				if (error.code !== '23503')
					throw new RangeError("Le like n'existe pas");
			}
		);
	}

	/**
	 *
	 * @returns Une liste des articles likés par l'utilisateur
	 */
	public async getLikedArticles(): Promise<Article[]> {
		const database = Database.get();
		const result =
			await database`SELECT art_id FROM interests WHERE b_id = ${this.id}`;
		const articles = [];
		for (const row of result) {
			articles.push(await Article.get(row.art_id));
		}
		return articles;
	}

	/**
	 *
	 * @param is_paid permet de chercher les article payés ou non
	 * @returns Une liste des articles possédés par l'achereur
	 */
	public async getAquiredArticles(is_paid = true): Promise<Article[]> {
		const database = Database.get();
		const result = await database`
			SELECT art_id FROM aquired WHERE b_id = ${this.id} AND is_paid = ${is_paid}`;
		const articles = [];
		for (const row of result) {
			articles.push(await Article.get(row.art_id));
		}
		return articles;
	}

	/**
	 * Marque un article comme payé (aquired::is_paid=true), n'effectue aucune vérification
	 * @param b_id L'id de l'acheteur
	 * @param art_id L'id de l'article
	 */
	public static async payArticle(b_id: number, art_id: number): Promise<void> {
		const database = Database.get();
		await database`
			UPDATE aquired SET is_paid = true WHERE b_id = ${b_id} AND art_id = ${art_id}`;
	}

	/**
	 * Change le nom de famille de l'acheteur et le met à jour dans la base de données
	 * @param last_name Le nouveau nom de famille de l'acheteur
	 */
	public async setNom(last_name: string): Promise<void> {
		const database = Database.get();
		const response = await database`
			UPDATE buyer SET b_last_name = ${last_name} WHERE a_id = ${this.getId()}`;
		if (response.count === 0) {
			throw new Error("L'utilisateur n'existe pas alors qu'il devrait");
		}
	}

	/**
	 * Change le prénom de l'acheteur et le met à jour dans la base de données
	 * @param first_name Le nouveau prénom de l'acheteur
	 */
	public async setPrenom(first_name: string): Promise<void> {
		const database = Database.get();
		const response = await database`
			UPDATE buyer SET b_first_name = ${first_name} WHERE a_id = ${this.getId()}`;
		if (response.count === 0) {
			throw new Error("L'utilisateur n'existe pas alors qu'il devrait");
		}
	}

	public getNom(): string {
		return this.last_name;
	}

	public getPrenom(): string {
		return this.first_name;
	}

	public toString(): string {
		return `${this.first_name} ${this.last_name}`;
	}
}
