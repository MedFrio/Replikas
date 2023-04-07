import TMDB, { MovieNotFoundError } from '../src/model/TMDB';

test('Can fetch movie from id', async () => {
	const data = await TMDB.getMovie(550);
	expect(data).toHaveProperty('original_title', 'Fight Club'); // Check if the movie is Fight Club

	const posterURL = await TMDB.getMoviePosterURL(550);
	expect(posterURL).toBe(
		'https://image.tmdb.org/t/p/original/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg'
	);
});

test('Unknown movie id throws error', async () => {
	await expect(TMDB.getMovie(0)).rejects.toThrowError(MovieNotFoundError);
});

test('Search movie', async () => {
	const data = await TMDB.searchMovie('fight club');
	expect(data.length).toBeGreaterThanOrEqual(1);
	expect(data[0]).toHaveProperty('id', 550);
});
