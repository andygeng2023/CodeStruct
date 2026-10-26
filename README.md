# CodeStruct Visual Website Editor

CodeStruct is a browser-based visual website editor with a multi-panel design workspace. It aims toward professional visual-builder workflows, but it is not an exact Webflow clone or a claim of complete Webflow feature parity.

## Run locally

Open `index.html` in a modern browser, or run:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. Cloud save, CMS sync, form inbox and publishing require a configured Supabase project and an authenticated account. The tracked schema is in `supabase/migrations/20261026_production_editor_features.sql`.

## Implemented editor workflows

- Element palette, selection, inline editing, inspector styling, drag reordering/nesting, duplicate/delete, undo/redo, zoom and preview.
- Local auto-save and multi-page create/switch/rename/duplicate/delete.
- Desktop, tablet and mobile style overrides, with breakpoint-specific CSS included in exported HTML.
- Reusable linked component IDs, cross-page instances and explicit update-all-from-selected behavior.
- CSS entrance animation presets with duration/delay controls and a visual timeline list.
- Local CMS collection/item management and a binding control that marks a canvas container for a dynamic collection.
- SEO metadata, exported robots/canonical/social metadata and a basic accessibility audit.
- Current-page standalone HTML export.

## Cloud and publishing workflows

- Supabase email/password authentication, cloud project save/load, optimistic revision checks, version snapshots and restore.
- Supabase Realtime editor presence and change notifications. Saves with stale revisions are rejected rather than silently overwriting newer data.
- Cloud CMS sync into `sytely_cms_items`; published pages resolve bound collections dynamically on request.
- Multi-page publishing snapshots and query-string routes such as `?slug=YOUR-SITE-SLUG&page=about`.
- Authenticated asset uploads into Supabase Storage.
- Form submissions inbox, delete controls, payload validation, a honeypot, and an atomic per-site/per-IP-hash rate limit.
- A deployed `sytely-site` Edge Function serving public HTML and processing submissions.
- A Cloudflare Worker template and custom-domain setup guide under `deployment/`.

## Checks

- Node syntax checks and static smoke tests run in GitHub Actions.
- Playwright end-to-end tests cover editing/persistence, linked components, responsive/animation export, multiple pages and CMS bindings. They are configured in CI; consult the latest workflow run to see whether the current revision passed.

## Remaining limitations

This is not yet Webflow feature parity. Collaboration currently provides live session presence, change notifications and optimistic conflict rejection; it does not merge simultaneous edits with a CRDT or provide real-time shared cursors. The CSS engine is a limited responsive override system, not a full CSS cascade/grid/flex visual editor. The animation timeline supports entrance presets and timing, not arbitrary keyframe tracks or scroll-triggered timelines.

The CMS currently supports basic title/body/fields records and dynamic collection lists, not the full set of relational CMS fields, reference fields, filtering/sorting UI, per-item SEO, or automatic static route generation for every CMS item. Published page routes are query-string based. Custom domains require the owner to deploy the included Cloudflare Worker, configure a domain and DNS in Cloudflare, and verify HTTPS; this repository cannot register a domain or configure a third-party account without that account's authorization. Forms have basic anti-spam controls, not CAPTCHA, email notifications, or advanced abuse analytics. The accessibility check is a basic heuristic, not a complete WCAG audit. Real browser tests must pass in CI before calling a release verified.
