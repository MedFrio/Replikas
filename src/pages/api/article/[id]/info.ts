import { APIRoute } from 'astro';
import Article from '../../../../model/Article';
import Bids from '../../../../model/Bids';

export const get: APIRoute = async ({ params, request }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		return new Response('Invalid parameters', {
			status: 400,
		});
	}

	const article: Article = await Article.get(id).catch(() => null);
	if (!article) {
		return new Response('Article not found', {
			status: 404,
		});
	}
	const current_bid = await Bids.getEnchereMax(article);
	const min_bid = article.getEncherissementMin();
	const bids_history = (await Bids.getEncheres(article)).map((bid) => ({
		amount: bid.amount,
		buyer: bid.buyer.toString(),
	}));

	return new Response(JSON.stringify({ current_bid, min_bid, bids_history }), {
		headers: {
			'content-type': 'application/json',
		},
		status: 200,
	});
};
