export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response('Missing ?url= parameter', { status: 400 });
    }

    if (!targetUrl.includes('reddit.com')) {
      return new Response('Only reddit.com requests are allowed', { status: 403 });
    }

    const cache = caches.default;
    let response = await cache.match(request);

    if (!response) {
      response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'public, max-age=3600');
      
      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers,
      });

      await cache.put(request, response.clone());
    }

    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    return newResponse;
  },
};
