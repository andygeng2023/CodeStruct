const DEFAULT_PUBLISHER = "https://syylksyuulzljivcvopo.supabase.co/functions/v1/sytely-site";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const slug = String(env.SITE_SLUG || "").toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return new Response("Configure the SITE_SLUG Worker variable first.", { status: 503 });
    }
    const upstream = new URL(env.PUBLISHER_URL || DEFAULT_PUBLISHER);
    if (upstream.protocol !== "https:" || upstream.hostname !== "syylksyuulzljivcvopo.supabase.co") {
      return new Response("Invalid publisher endpoint configuration.", { status: 500 });
    }
    const pageFromPath = url.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
    const page = url.searchParams.get("page") || pageFromPath;
    upstream.searchParams.set("slug", slug);
    if (page && page !== "index" && page !== slug) upstream.searchParams.set("page", page);
    else upstream.searchParams.delete("page");
    const headers = new Headers(request.headers);
    headers.delete("host");
    const upstreamResponse = await fetch(new Request(upstream.toString(), {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual"
    }));
    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.set("X-Content-Type-Options", "nosniff");
    responseHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders
    });
  }
};
