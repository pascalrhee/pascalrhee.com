// The current portfolio is static. Retire the unused experimental counter API
// rather than expose public KV reads/writes, write contention, and abuse costs.
// Historical implementation remains in Git. The existing KV data is untouched.
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname.startsWith('/api/')) {
      return new Response(
        request.method === 'HEAD'
          ? null
          : 'This experimental API has been retired.',
        {
          status: 410,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
          },
        },
      );
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
