---
name: Laravel file-response tests
description: How to verify bytes returned by direct file responses in Laravel feature tests.
---

For endpoints returning `response()->file(...)`, a Laravel test response may wrap Symfony's `BinaryFileResponse`. `TestResponse::assertContent()` can report `false` even when the response references the correct file.

**Why:** The response is backed by a file object rather than a captured response body, so ordinary content assertions can mislead.

**How to apply:** Keep the request/assertion checks for status and headers, then compare expected bytes against `$response->baseResponse->getFile()->getContent()`.