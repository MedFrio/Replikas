import { config } from 'dotenv';
import path from 'path';
config();

function getEnv(key: string, optional = false): string {
	const value = process.env[key];
	if (!value && !optional) {
		throw new UndefinedConfigEntry(key);
	}
	return value;
}

export class UndefinedConfigEntry extends Error {
	constructor(key: string) {
		super(`La variable d'environnement (.env) ${key} n'est pas définie`);
	}
}

type ConfigType = {
	tmdb: {
		apiKey: string;
	};
	db: {
		host: string;
		port: number;
		user: string;
		password: string;
		name: string;
	};
	stripe: {
		secretKey: string;
		publicKey: string;
		webhookSecret: string;
	};
	sendgrid: {
		apiKey: string;
	};
	uploads_dir: string;
};

export default class Config {
	private static _instance: Config;
	private _config: ConfigType;

	private constructor() {
		this._config = {
			tmdb: {
				apiKey: getEnv('TMDB_API_KEY'),
			},
			db: {
				host: getEnv('DB_HOST'),
				port: parseInt(getEnv('DB_PORT')),
				user: getEnv('DB_USER'),
				password: getEnv('DB_PASS'),
				name: getEnv('DB_NAME'),
			},
			stripe: {
				secretKey: getEnv('STRIPE_SECRET', true),
				publicKey: getEnv('STRIPE_PUBLIC', true),
				webhookSecret: getEnv('STRIPE_WEBHOOK_SECRET', true),
			},
			sendgrid: {
				apiKey: getEnv('SENDGRID_API_KEY', false),
			},
			uploads_dir: path.join(path.resolve(), 'uploads'),
		};
	}

	/**
	 * Recupere le singleton de la classe Config
	 * @returns L'instance de la classe Config
	 */
	public static get(): ConfigType {
		if (!Config._instance) {
			Config._instance = new Config();
		}
		return Config._instance._config;
	}
}
