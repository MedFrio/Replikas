import shajs from 'sha.js';
import Database from '../Database';

export default class Account {
	static SESSION_DURATION = 60 * 60 * 24 * 7; // secs, 7 days
	static RECOVERY_DURATION = 60 * 30 * 1000; // ms, 30 minutes
	static SALT_BAE = "g4cO#'=%sn{*Y?3v";

	static {
		Database.getInstance().on('clean', Account.clean);
	}

	protected id: number;
	protected email: string;
	protected created_at: Date;
	protected is_company: boolean;

	protected constructor() {}

	/**
	 * Récupère un utilisateur à partir de son email et de son mot de passe.
	 * @param email L'email de l'utilisateur sert de login
	 * @param password Le mot de passe de l'utilisateur non haché
	 * @returns L'utilisateur correspondant à l'email et au mot de passe
	 * @throws {@link UtilisateurOuMotDePasseInvalideError} Si l'email ou le mot de passe est invalide
	 */
	public static async get(email: string, password: string): Promise<Account> {
		const database = Database.get();
		const account = new Account();
		const hash = shajs('sha256')
			.update(password + Account.SALT_BAE)
			.digest('hex');
		const result = await database`
			SELECT * FROM account WHERE a_login = ${email} AND a_password = ${hash}`;
		if (result.count === 0) {
			throw new UtilisateurOuMotDePasseInvalideError();
		}
		account.id = result[0].a_id;
		account.email = result[0].a_login;
		account.created_at = result[0].a_created_at;
		account.is_company = result[0].a_is_company;

		return account;
	}

	/**
	 * Récupère un utilisateur à partir de son id.
	 * @param id L'id de l'utilisateur
	 * @returns L'utilisateur correspondant à l'id
	 * @throws {@link RangeError} Si l'id ne correspond à aucun utilisateur
	 */
	public static async getById(id: number): Promise<Account> {
		const database = Database.get();
		const account = new Account();
		const result = await database`
			SELECT * FROM account WHERE a_id = ${id}`;
		if (result.count === 0) {
			throw new RangeError(`L'id ${id} ne correspond à aucun utilisateur`);
		}
		account.id = result[0].a_id;
		account.email = result[0].a_login;
		account.created_at = new Date(result[0].a_created_at);
		account.is_company = result[0].a_is_company;

		return account;
	}

	/**
	 * Crée un nouvel utilisateur. Ne doit être appelé que par les classes filles.
	 * @param email L'email de l'utilisateur sert de login
	 * @param password Le mot de passe de l'utilisateur, il sera haché en SHA-256 dans la base de données
	 * @param nom Le nom de l'utilisateur
	 * @param prenom Le prénom de l'utilisateur
	 * @returns L'utilisateur nouvellement créé
	 * @throws {@link EmailDejaUtiliseError} Si l'email est déjà utilisé
	 */
	protected static async create(
		email: string,
		password: string,
		is_company: boolean = false
	): Promise<Account> {
		const database = Database.get();
		const account = new Account();
		const hash = shajs('sha256')
			.update(password + Account.SALT_BAE)
			.digest('hex');
		// Mail de test pour les tests playwright qui ne respecte pas la contrainte unique
		if (email === 'dooverwrite@testmail.com')
			await database`DELETE FROM account WHERE a_login = ${email}`;
		// @TODO A enlever dans la version finale
		const result = await database`
			INSERT INTO account (a_login, a_password, a_created_at, a_is_company) VALUES (${email}, ${hash}, ${new Date()}, ${is_company}) RETURNING a_id`.catch(
			(err) => {
				// If the email is already in use, throw a more specific error
				if (err.code === '23505') {
					throw new EmailDejaUtiliseError();
				}
				throw err;
			}
		);
		console.info('Created user with id ' + result[0].a_id);
		account.id = result[0].a_id;
		account.email = email;
		account.created_at = new Date();
		account.is_company = is_company;

		return account;
	}

	/**
	 * Crée une session pour l'utilisateur permettant de s'authentifier sur le site sans avoir à renseigner son mot de passe grâce à la méthode {@link Account.getBySession}.
	 * @returns Le token de la session
	 */
	public async createSession(): Promise<string> {
		const database = Database.get();
		const token = shajs('sha256')
			.update('' + this.getId() + Date.now())
			.digest('hex');
		const dateCreation = new Date();
		const dateExpiration = new Date(
			dateCreation.getTime() + Account.SESSION_DURATION * 1000
		);

		return database`
			INSERT INTO session (s_token, s_created_at, s_expires_at, a_id) VALUES (${token}, ${dateCreation}, ${dateExpiration}, ${this.getId()})`.then(
			() => token
		);
	}

	/**
	 * Récupère un utilisateur à partir de son token de session.
	 * @param token Le token de session
	 * @returns L'utilisateur correspondant au token de session
	 * @throws {@link SessionTokenInvalideError} Si le token de session est invalide ou expiré
	 * @throws {@link CaCestVraimentPasDeBolError} Si plusieurs sessions sont créées pour un même utilisateur avec le même token
	 */
	public static async getBySession(token: string): Promise<Account> {
		const database = Database.get();
		const account = new Account();
		const result = await database`
			SELECT * FROM account INNER JOIN session ON account.a_id = session.a_id WHERE s_token = ${token}`;
		if (result.count === 0) {
			throw new SessionTokenInvalideError();
		} else if (result[0].s_expires_at < new Date()) {
			throw new SessionTokenInvalideError();
		} else if (result.count > 1) {
			throw new CaCestVraimentPasDeBolError(); // Supprimer dans la version finale
		}

		account.id = result[0].a_id;
		account.email = result[0].a_login;
		account.created_at = new Date(result[0].a_created_at);
		account.is_company = result[0].a_is_company;

		return account;
	}

	/**
	 * Vérifie si un utilisateur existe à partir de son email
	 * @param email L'email de l'utilisateur
	 * @returns Vrai si le mail est déjà utilisé, faux sinon
	 */
	public static async existByEmail(email: string): Promise<boolean> {
		const database = Database.get();
		const result =
			await database`SELECT * FROM account WHERE a_login = ${email}`;
		return result.count > 0;
	}

	/**
	 * Créé un token de récupération de mot de passe pour l'utilisateur correspondant à l'email
	 * @param email L'email de l'utilisateur
	 * @returns Le token de récupération de mot de passe
	 * @throws {@link EmailInconnuError} Si l'email n'est pas associé à un compte
	 */
	public static async createPasswordRecoveryToken(
		email: string
	): Promise<string> {
		const database = Database.get();
		const token = shajs('sha256')
			.update(email + Date.now())
			.digest('hex');
		const dateCreation = new Date();
		const response = await database`
			INSERT INTO password_recovery (pr_token, pr_created_at, a_id) VALUES (${token}, ${dateCreation}, (SELECT a_id FROM account WHERE a_login = ${email})) RETURNING pr_token`;
		if (response.count === 0) {
			throw new EmailInconnuError();
		}
		return response[0].pr_token;
	}

	/**
	 * Modifie le mot de passe de l'utilisateur correspondant au token de récupération de mot de passe
	 * @param token Le token de récupération de mot de passe
	 * @param password Le nouveau mot de passe
	 * @throws {@link TokenInconnuError} Si le token est invalide
	 */
	public static async setPassword(
		token: string,
		password: string
	): Promise<void> {
		const database = Database.get();
		const hash = shajs('sha256')
			.update(password + Account.SALT_BAE)
			.digest('hex');

		await Account.clean();
		const response = await database`
			UPDATE account SET a_password = ${hash} WHERE a_id = (SELECT a_id FROM password_recovery WHERE pr_token = ${token})`;
		if (response.count === 0) {
			throw new TokenInconnuError();
		}
		// Consuming the token
		await database`DELETE FROM password_recovery WHERE pr_token = ${token}`;
	}

	/**
	 * Change le mot de passe de l'instance d'utilisateur et le met à jour dans la base de données
	 * @param password Le mot de passe à modifier
	 */
	public async setPassword(password: string): Promise<void> {
		const database = Database.get();
		const hash = shajs('sha256')
			.update(password + Account.SALT_BAE)
			.digest('hex');

		const response = await database`
			UPDATE account SET a_password = ${hash} WHERE a_id = ${this.getId()}`;
		if (response.count === 0) {
			throw new Error("L'utilisateur n'existe pas alors qu'il devrait");
		}
	}

	/**
	 * Change le mail de l'utilisateur, en vérifiant qu'il n'est pas déjà utilisé et le met à jour dans la base de données
	 * @param email Le nouveau mail
	 * @throws {@link EmailDejaUtiliseError} Si le mail est déjà utilisé
	 */
	public async setEmail(email: string): Promise<void> {
		const database = Database.get();
		const result = await database`
			UPDATE account SET a_login = ${email} WHERE a_id = ${this.getId()} RETURNING a_id`.catch(
			() => {
				throw new EmailDejaUtiliseError();
			}
		);
		if (result.count === 0) {
			throw new Error("L'utilisateur n'existe pas alors qu'il devrait");
		}
	}

	/**
	 * Supprime l'utilisateur de la base de données
	 */
	public async delete(): Promise<void> {
		const database = Database.get();
		await database`DELETE FROM account WHERE a_id = ${this.getId()}`;
	}

	/**
	 * Supprime le token de session de l'utilisateur
	 * @param token Le token de session
	 */
	public static async deleteSession(token: string): Promise<void> {
		const database = Database.get();
		await database`DELETE FROM session WHERE s_token = ${token}`;
	}

	/**
	 * Supprime les tokens de session et de récupération de mot de passe expirés
	 */
	static async clean(): Promise<void> {
		const database = Database.get();
		// Clear session tokens
		const tokens = await database`SELECT * FROM session;`;
		for (const token of tokens) {
			if (new Date(token.s_expires_at) < new Date()) {
				await Account.deleteSession(token.s_token);
				console.info(
					'Suppression du token de session pour le compte ' + token.a_id
				);
			}
		}
		// Clear password recovery tokens
		const passwordRecoveryTokens =
			await database`SELECT * FROM password_recovery;`;
		for (const token of passwordRecoveryTokens) {
			const creationDate = new Date(token.pr_created_at);
			const expirationDate = new Date(
				creationDate.getTime() + Account.RECOVERY_DURATION
			);
			if (expirationDate < new Date()) {
				await database`DELETE FROM password_recovery WHERE pr_token = ${token.pr_token}`;
				console.info(
					'Suppression du token de password recovery pour le compte ' +
						token.a_id
				);
			}
		}
	}

	public getId(): number {
		return this.id;
	}

	public getEmail(): string {
		return this.email;
	}

	public getDateCreation(): Date {
		return this.created_at;
	}

	public isCompany(): boolean {
		return this.is_company;
	}
}

export class UtilisateurOuMotDePasseInvalideError extends Error {
	constructor() {
		super('Utilisateur ou mot de passe invalide');
	}
}

export class EmailDejaUtiliseError extends Error {
	constructor() {
		super('Email déjà utilisé');
	}
}

export class SessionTokenInvalideError extends Error {
	constructor() {
		super('Token  de session invalide invalide');
	}
}

export class CaCestVraimentPasDeBolError extends Error {
	constructor() {
		super("C'est vraiment pas de bol");
	}
}

export class AccountTypeMismatch extends Error {
	constructor(required: 'buyer' | 'company') {
		super(
			`Essayé d'utiliser un compte utilisateur ${
				{ buyer: 'company', company: 'buyer' }[required]
			} sur une méthode qui demandait un ${required}`
		);
	}
}

export class EmailInconnuError extends Error {
	constructor() {
		super('Email inconnu');
	}
}
export class TokenInconnuError extends Error {
	constructor() {
		super('Token inconnu');
	}
}
