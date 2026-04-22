import { APIRoute } from 'astro';
import fs from 'fs';
import Config from '../../../model/Config';

export const get: APIRoute = async ({ params, request }) => {
	const name = params.name;
	if (!name) {
		return new Response('Missing search query', {
			status: 400,
		});
	}

	let path = `${Config.get().uploads_dir}/${name}`;
	if (!fs.existsSync(path)) {
		path = 'public/img/article/placeholder.jpg';
	}

	const file = await fs.promises.readFile(path);
	return new Response(file, {
		headers: {
			'Content-Type': `image/${path.split('.').pop()}`,
			'Cache-Control': 'max-age=31536000',
		},
		status: 200,
	});
};
