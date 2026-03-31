---
description: app.json registration checklist — loaded automatically when editing the manifest
paths: app.json
---

## app.json Checklist

When adding a page: register under `targets.common.module.page.pages` — prefer `/zepphyr:new-page` which handles this automatically.
When adding a service: register under `targets.common.module["app-service"].services`.
When using a new `@zos/*` API: add its permission to the top-level `permissions` array.
App icon must be at `assets/common.r/icon.png` — NOT `assets/icon.png`.
