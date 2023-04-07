import { APIRoute } from 'astro';
import TMDB from '../../model/TMDB';

export const get: APIRoute = async ({ request }) => {
	// Get URL query parameters
	const url = new URL(request.url);
	const query: { [k: string]: any } = Object.fromEntries(url.searchParams);

	if (!query.search) {
		return new Response('Missing search query', {
			status: 400,
		});
	}

	const matches = await TMDB.searchMovie(query.search, 'fr-FR', 8);

	return new Response(JSON.stringify(matches), {
		headers: {
			'content-type': 'application/json',
		},
		status: 200,
	});
};
