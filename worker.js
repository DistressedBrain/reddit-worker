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

    // Try to serve from cache first
    const cache = caches.default;
    let response = await cache.match(request);
    if (response) {
      // Add CORS headers to cached response
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      return newResponse;
    }

    // If not cached, fetch with retry logic
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const fetchResponse = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        // If rate limited, wait and retry
        if (fetchResponse.status === 429) {
          const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          console.warn(`Rate limited, retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        if (!fetchResponse.ok) {
          throw new Error(`Reddit API returned ${fetchResponse.status}`);
        }

        // Clone the response to store in cache
        const responseToCache = fetchResponse.clone();
        const headers = new Headers(responseToCache.headers);
        headers.set('Cache-Control', 'public, max-age=3600'); // cache for 1 hour

        const cachedResponse = new Response(responseToCache.body, {
          status: responseToCache.status,
          statusText: responseToCache.statusText,
          headers: headers,
        });

        await cache.put(request, cachedResponse);

        // Return the response with CORS headers
        const finalResponse = new Response(fetchResponse.body, fetchResponse);
        finalResponse.headers.set('Access-Control-Allow-Origin', '*');
        return finalResponse;
      } catch (err) {
        lastError = err;
        if (attempt === maxRetries - 1) break;
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    // If all retries fail, return a 429 error with explanation
    return new Response(
      JSON.stringify({ error: 'Reddit is currently rate limiting this service. Please try again later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  },
};
