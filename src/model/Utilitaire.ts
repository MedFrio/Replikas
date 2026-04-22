import fs from 'fs';
import { Readable } from 'node:stream';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import Config from './Config';
import Account, {
	AccountTypeMismatch,
	CaCestVraimentPasDeBolError,
	SessionTokenInvalideError,
} from './users/Account';
import Buyer from './users/Buyer';
import Company from './users/Company';

export { dateDiff };

/**
 * Retourne la difference entre 2 dates
 * @param date1
 * @param date2
 * @returns La difference entre les 2 dates en jour, heure, minute et seconde
 */
function dateDiff(
	date1: Date,
	date2: Date
): { day: number; hour: number; min: number; sec: number } {
	var diff = {
		sec: 0,
		min: 0,
		hour: 0,
		day: 0,
	};
	var diff_temps = date1.getTime() - date2.getTime();

	diff_temps = Math.floor(diff_temps / 1000); // Nombre de secondes entre les 2 dates
	diff.sec = diff_temps % 60; // Extraction du nombre de secondes

	diff_temps = Math.floor((diff_temps - diff.sec) / 60); // Nombre de minutes (partie entière)
	diff.min = diff_temps % 60; // Extraction du nombre de minutes

	diff_temps = Math.floor((diff_temps - diff.min) / 60); // Nombre d'heures (entières)
	diff.hour = diff_temps % 24; // Extraction du nombre d'heures

	diff_temps = Math.floor((diff_temps - diff.hour) / 24); // Nombre de jours restants
	diff.day = diff_temps;

	return diff;
}

/**
 * Ajoute un cookie aux headers d'une réponse
 * @param headers Les headers de la réponse où ajouter le cookie
 * @param cookie Le cookie à ajouter
 */
export function addCookie(
	headers: Headers,
	cookie: {
		name: string;
		value: string;
		maxAge?: number;
		secure?: boolean;
		path?: string;
	}
) {
	let val = `${cookie.name}=${cookie.value};`;
	val += cookie.maxAge ? ` Max-Age=${cookie.maxAge};` : '';
	val += cookie.secure ? ` Secure;` : '';
	val += cookie.path ? ` Path=${cookie.path};` : '';
	headers.append('Set-Cookie', val);
}

/**
 * Retourne un {@link Account} à partir d'un token de session
 * @param headers Les headers de la requête
 * @returns Le {@link Account} correspondant au token de session
 * @throws {@link SessionTokenInvalideError} Si le token de session est invalide
 * @throws {@link CaCestVraimentPasDeBolError} Si le token de session est associé à plusieurs comptes
 *
 */
export async function getAccountBySession(headers: Headers): Promise<Account> {
	const cookies = headers.get('cookie');
	if (cookies) {
		const token = (cookies.endsWith(';') ? cookies : cookies + ';').match(
			/token=([^;]*);/
		); // Recuperer le token de session
		if (token.length > 0) return Account.getBySession(token[1]);
	}
	throw new SessionTokenInvalideError();
}

/**
 * Retourne un {@link Buyer} à partir d'un token de session
 * @param headers Les headers de la requête
 * @returns Le {@link Buyer} correspondant au token de session
 * @throws {@link SessionTokenInvalideError} Si le token de session est invalide
 * @throws {@link CaCestVraimentPasDeBolError} Si le token de session est associé à plusieurs comptes
 * @throws {@link AccountTypeMismatch} Si le compte associé au token de session n'est pas un {@link Buyer}
 */
export async function getBuyerBySession(headers: Headers): Promise<Buyer> {
	const account = await getAccountBySession(headers);
	return Buyer.getFromAccount(account);
}

/**
 * Retourne un {@link Company} à partir d'un token de session
 * @param headers Les headers de la requête
 * @returns Le {@link Company} correspondant au token de session
 * @throws {@link SessionTokenInvalideError} Si le token de session est invalide
 * @throws {@link CaCestVraimentPasDeBolError} Si le token de session est associé à plusieurs comptes
 * @throws {@link AccountTypeMismatch} Si le compte associé au token de session n'est pas un {@link Company}
 */
export async function getCompanyBySession(headers: Headers): Promise<Company> {
	const account = await getAccountBySession(headers);
	return Company.getFromAccount(account);
}
/**
 * Upload les images d'un article dans ./public/images/articles/uploaded avec un nom unique
 * @param files Les {@link File} du formulaire d'upload
 * @returns Un {@link Map} contenant le nom du fichier et son chemin par rapport à /public
 */
export async function uploadImages(files: File[]): Promise<string[]> {
	const upload_dir = path.join(Config.get().uploads_dir);
	if (!fs.existsSync(upload_dir)) {
		await fs.promises.mkdir(upload_dir, { recursive: true }).catch((err) => {
			throw err;
		});
	}

	const files_names: string[] = [];
	let err: string = await Promise.all(
		files.map((file) => {
			const ext = path.extname(file.name);
			let name: string;
			do {
				name = uuidv4() + ext;
			} while (fs.existsSync(path.join(upload_dir, name)));
			files_names.push(name);
			uploadImage(file, path.join(upload_dir, name));
		})
	)
		.then(() => '')
		.catch((err) => {
			return err;
		});
	if (err) {
		// Suppression des images uploadées
		await Promise.all(
			files_names.map((file_name) =>
				fs.promises
					.unlink(path.join(upload_dir, file_name))
					.catch((err) => null)
			)
		);
		throw new UploadError(err);
	}
	return files_names;
}

/**
 * Upload une image dans un dossier
 * @param file Le {@link File} à uploader
 * @param file_path Le chemin du dossier où uploader l'image
 * @returns Un {@link Promise} résolu quand l'upload est terminé
 */
async function uploadImage(file: File, file_path: string) {
	const arrayBuffer = await file.arrayBuffer().catch((err) => {
		console.error('[ARRAY_BUFFER_ERROR] : ' + err);
		throw file.name;
	});
	let buffer: Buffer;
	try {
		buffer = Buffer.from(arrayBuffer);
	} catch (err) {
		console.error('[BUFFER_ERROR] : ' + err);
		throw file.name;
	}
	return new Promise((resolve, reject) => {
		const writeStream = fs.createWriteStream(file_path);
		writeStream.on('finish', () => resolve(0));
		writeStream.on('error', (err) => {
			console.error('[WRITE_STREAM_ERROR] : ' + err);
			reject(file.name);
		});
		const readStream = new Readable();
		readStream.push(buffer);
		readStream.push(null);
		readStream.on('error', (err) => {
			console.error('[READ_STREAM_ERROR] : ' + err);
			reject(file.name);
		});
		readStream.pipe(writeStream);
	});
}

/**
 * Programme l'appel d'une méthode à une date donnée.
 * Si la date est passée, ne fait rien.
 * @param method La méthode à appeler une fois le délai écoulé
 * @param date La date à laquelle appeler la méthode
 */
export function scheduleMethod(
	method: (...args: any) => any,
	date: Date,
	...args: any
) {
	const now = new Date();
	if (date > now) {
		const diff = date.getTime() - now.getTime();
		if (diff > 2147483647) {
			setTimeout(() => scheduleMethod(method, date, ...args), 2147483647);
		} else {
			setTimeout(() => method(...args), diff);
		}
	} // Else do nothing
}

export class EtatInnatenduError extends Error {
	constructor(description: string) {
		super(`[Etat innatendu] ${description}`);
	}
}

export class UploadError extends Error {
	constructor(file: string) {
		super(`Erreur lors de l'upload de ${file}`);
	}
}
