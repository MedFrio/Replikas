import { APIRoute } from 'astro';
import Stripe from 'stripe';
import Config from '../../../model/Config';
import Buyer from '../../../model/users/Buyer';

export const post: APIRoute = async ({ params, request }) => {
	const stripe = new Stripe(Config.get().stripe.secretKey, {
		apiVersion: '2022-11-15',
	});

	const sig = request.headers.get('stripe-signature');
	let event = null;

	const text = await request.text();
	try {
		event = stripe.webhooks.constructEvent(
			text,
			sig,
			Config.get().stripe.webhookSecret
		);
	} catch (err) {
		console.error('Stripe webhook error : ' + err);
		// invalid signature
		return new Response('Invalid signature', {
			status: 400,
		});
	}

	// Handle the event
	switch (event.type) {
		case 'payment_intent.succeeded':
			console.info('Received payment succeeded webhook');
			break;
		case 'payment_intent.payment_failed':
			console.info('Received payment failed webhook');
			return new Response('Payment successfully failed', {
				status: 200,
			});
	}

	const sessions = (await stripe.checkout.sessions
		.list({
			payment_intent: event.data.object.id,
			expand: ['data.line_items'],
		})
		.catch((err) => {
			console.error('Stripe webhook error : ' + err);
			return new Response('Stripe error', {
				status: 500,
			});
		})) as Stripe.ApiList<Stripe.Checkout.Session>;

	if (sessions.data.length == 0) {
		console.error('Stripe webhook error : no session found');
		return new Response('Stripe error', {
			status: 500,
		});
	}

	const session = sessions.data[0];
	const article_id = parseInt(session.metadata.article_id);

	if (isNaN(article_id)) {
		console.error('Stripe webhook error : invalid article id');
		return new Response('Stripe error', {
			status: 500,
		});
	}

	const buyer_id = parseInt(session.metadata.buyer_id);
	if (isNaN(buyer_id)) {
		console.error('Stripe webhook error : invalid user id');
		return new Response('Stripe error', {
			status: 500,
		});
	}

	await Buyer.payArticle(buyer_id, article_id).catch((err) => {
		console.error('Stripe webhook error : ' + err);
		return new Response('Stripe error', {
			status: 500,
		});
	});

	console.info(
		`Payment for article ${article_id} by buyer ${buyer_id} succeeded!`
	);

	return new Response('Webhook received', {
		status: 200,
	});
};
