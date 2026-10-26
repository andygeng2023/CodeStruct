# Custom-domain publishing with Cloudflare Workers

The editor's Supabase publisher serves a public website at:

`https://syylksyuulzljivcvopo.supabase.co/functions/v1/sytely-site?slug=YOUR-SITE-SLUG`

A custom domain requires a domain you own and a DNS provider. This repository includes `deployment/cloudflare-worker.js` as a fixed-origin reverse proxy. It is not deployed automatically and does not register a domain or create DNS records.

## Setup

1. Publish your site in the editor and copy its site slug from the public URL.
2. In the Cloudflare dashboard, create a Worker and paste `deployment/cloudflare-worker.js`.
3. Add a Worker variable named `SITE_SLUG` containing that exact published slug. Leave `PUBLISHER_URL` unset unless the publisher endpoint changes.
4. Add your domain to Cloudflare, follow its DNS nameserver instructions, and wait until Cloudflare reports the domain active.
5. Add a Worker route for the hostname you want to use (for example, `www.example.com/*`) and select this Worker. For an apex domain, configure the apex route separately.
6. Test the home page, every `?page=` link, form submissions, and HTTPS. The Worker maps `/about` to the published page key `about`; the editor-generated query-string links also work.
7. Keep the Supabase public URL as a fallback until the custom hostname is verified.

Do not copy DNS records from examples or guess target addresses. Use the exact records and TLS status shown by your domain provider. The Worker only serves one configured site slug per Worker deployment; use separate Worker variables/deployments or add an explicit, reviewed hostname-to-site mapping for multiple sites. Form posts currently submit directly to the Supabase function endpoint.

## Security notes

- The Worker forwards only to the fixed Sytely Supabase project endpoint; it is not an arbitrary URL proxy.
- The Supabase function enforces payload limits, a honeypot, and an atomic per-site/per-IP-hash submission limit.
- Custom domains, DNS, and certificates are not active until the owner completes the provider-side setup.
