import { EventEmitter } from 'events';
import postgres from 'postgres';
import TypedEmitter from 'typed-emitter';
import Config from './Config';

type DatabaseEvents = {
	clean: () => void;
};

export default class Database extends (EventEmitter as new () => TypedEmitter<DatabaseEvents>) {
	private static _instance: Database;
	private _client: postgres.Sql<{}>;

	private constructor() {
		super();
		const config = Config.get().db;
		this._client = postgres({
			host: config.host,
			port: config.port,
			user: config.user,
			password: config.password,
			database: config.name,
			idle_timeout: 20,
		});

		setInterval(() => {
			// Clean the database every minute
			Database.getInstance().emit('clean');
		}, 60 * 1000);
	}

	/**
	 * Recupere le client SQL du singleton de la classe Database
	 * @returns Le client SQL
	 */
	public static get(): postgres.Sql<{}> {
		return Database.getInstance()._client;
	}

	/**
	 * Recupere l'instance de la classe Database
	 * @returns L'instance de la classe Database
	 */
	public static getInstance(): Database {
		if (!Database._instance) {
			Database._instance = new Database();
		}
		return Database._instance;
	}

	/**
	 * Ferme la connexion avec la base de donnees
	 */
	public static async close(): Promise<void> {
		if (Database._instance) {
			await Database._instance._client.end();
		}
	}
}
