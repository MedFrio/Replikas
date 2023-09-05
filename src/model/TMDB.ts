import Config from './Config';

type TMDBMovie = {
	adult: boolean;
	backdrop_path: string | null;
	belongs_to_collection: any;
	budget: number;
	genres: { id: number; name: string }[];
	homepage: string | null;
	id: number;
	imdb_id: string | null;
	original_language: string;
	original_title: string;
	overview: string | null;
	popularity: number;
	poster_path: string | null;
	production_companies: {
		id: number;
		logo_path: string | null;
		name: string;
		origin_country: string;
	}[];
	production_countries: { iso_3166_1: string; name: string }[];
	release_date: string;
	revenue: number;
	runtime: number | null;
	spoken_languages: { iso_639_1: string; name: string }[];
	status: string;
	tagline: string;
	title: string | null;
	video: boolean;
	vote_average: number;
	vote_count: number;
};

export default class TMDB {
	private static _apiKey: string = Config.get().tmdb.apiKey;
	private static _baseUrl: string = 'https://api.themoviedb.org/3';
	private static _imageBaseUrl: string = 'https://image.tmdb.org/t/p';

	constructor() {
		throw new Error('This class is not meant to be instantiated.');
	}

	/**
	 * Recupere les donnees d'un film à partir de son ID
	 * @param id The movie ID
	 * @returns The movie data
	 */
	public static async getMovie(id: number): Promise<TMDBMovie> {
		const response = await fetch(
			`${this._baseUrl}/movie/${id}?api_key=${this._apiKey}`
		);
		const data = await response.json();
		if (data.success === false) throw new MovieNotFoundError(id);
		return data;
	}

	/**
	 * Recupere l'URL de l'affiche d'un film à partir de son ID
	 * @param id The movie ID
	 * @returns Absolute URL to the movie poster or empty string if no poster is available
	 */
	public static async getMoviePosterURL(
		id: number,
		size:
			| 'w92'
			| 'w154'
			| 'w185'
			| 'w342'
			| 'w500'
			| 'w780'
			| 'original' = 'original'
	): Promise<string> {
		const movie = await this.getMovie(id);
		return movie.poster_path
			? `${this._imageBaseUrl}/${size}${movie.poster_path}`
			: '';
	}

	/**
	 * Recherche un film à partir d'un mot clé
	 * @param query The search query
	 * @param language The language of the results (default: fr-FR) ISO 639-1
	 * @returns The list of movies matching the query
	 */
	public static async searchMovie(
		query: string,
		language = 'fr-FR',
		limit?: number
	): Promise<TMDBMovie[]> {
		const response = await fetch(
			`${this._baseUrl}/search/movie?api_key=${this._apiKey}&language=${language}&query=${query}&include_adult=false`
		);
		const data = await response.json();
		return data.results.slice(0, limit);
	}
}

export class MovieNotFoundError extends Error {
	constructor(id: number) {
		super(`Movie with ID ${id} could not be found.`);
	}
}
