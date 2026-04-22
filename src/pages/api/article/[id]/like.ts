import { APIRoute } from 'astro';
import { ArticleInexistantError } from '../../../../model/Article';
import Buyer from '../../../../model/users/Buyer';
import { getBuyerBySession } from '../../../../model/Utilitaire';

export const post: APIRoute = async ({ params, request }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		return new Response('Invalid id in url path', {
			status: 400,
		});
	}

	let buyer: Buyer;
	try {
		buyer = await getBuyerBySession(request.headers);
		buyer.likeArticle(id);
	} catch (e) {
		if (e instanceof ArticleInexistantError) {
			return new Response(`Article ${id} not found`, {
				status: 404,
			});
		}
		return new Response(
			'[UNKNOWN_ERROR] ' + e.constructor.name + ' : ' + e.message,
			{
				status: 401,
			}
		);
	}

	return new Response('success', {
		status: 200,
	});
};

export const del: APIRoute = async ({ params, request }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		return new Response('Invalid id in url path', {
			status: 400,
		});
	}

	let buyer: Buyer;
	try {
		buyer = await getBuyerBySession(request.headers);
		buyer.unlikeArticle(id);
	} catch (e) {
		if (e instanceof ArticleInexistantError) {
			return new Response(`Article ${id} not found`, {
				status: 404,
			});
		}
		return new Response(
			'[UNKNOWN_ERROR] ' + e.constructor.name + ' : ' + e.message,
			{
				status: 401,
			}
		);
	}

	return new Response('success', {
		status: 200,
	});
};
