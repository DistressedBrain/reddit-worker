export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response('Missing ?url= parameter. Usage: ?url=https://example.com', { status: 400 });
    }

    
    if (!targetUrl.includes('reddit.com')) {
      return new Response('Only reddit.com requests are allowed', { status: 403 });
    }

    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'CloudflareWorker/1.0',
        },
      });

      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

      return newResponse;
    } catch (err) {
      return new Response(`Error: ${err.message}`, { status: 500 });
    }
  },
};
        const newResponse = new Response(response.body, response);
        newResponse.headers.set('Access-Control-Allow-Origin', '*');

        return newResponse;
    },
};
