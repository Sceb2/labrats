# Release-aware content loading

Development update, 6 November 2026. No migration or hosted configuration change.

Chemistry's question/asset catalogues and Applied Science's bank/lesson map reuse
the browser's HTTP cache under URLs containing the release ID. Their SHA-256
checks still run on cached content. A mismatch or HTTP error triggers one fresh
fetch; a second
mismatch keeps the existing update gate and does not open practice. Fresh release
checks still use `no-store` and a new release requests new content URLs.

Applied Science renders topic selection before preloading its 56 diagrams.
Four background workers load them progressively into the existing in-memory
data-URI cache. Session starts and individual-question previews prioritise their
own diagrams, sharing in-flight requests with the preload. They open only when
those diagrams are available. Cancelling preparation keeps the previous session;
failed loads offer a fresh-fetch retry without discarding current work.

Loaded sessions retain their diagrams when the connection drops. Other questions
can also be opened offline once their diagrams have loaded. A diagram that has
never loaded still needs a connection. This is not a service-worker installation
or a guarantee that a new page can be opened entirely offline.

Reporting settings come from root `report-config.json`, without blocking topic
selection. An already-open report updates when settings arrive. That configuration
is included in release fingerprints but fetched freshly rather than cached.

Only public question content/diagrams use this caching change. Account validation,
attempt queues, private history and subject permissions retain their existing
behaviour. No account data is added to the public asset cache.

`npm run test:loading` covers topic rendering with delayed diagrams, actual HTTP
cache reuse on warm visits, new-release URLs, corrupt-bank recovery/update gates,
offline diagrams, missing-diagram retries, cancelled preparation, cached HTTP
failures and the reporting configuration path.
The tests use localhost with external HTTPS blocked; request interception is
avoided because it disables Chromium's HTTP cache.
