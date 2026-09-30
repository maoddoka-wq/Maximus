import assert from "node:assert/strict";
import { test } from "node:test";
import { formatApiMessage } from "../src/lib/api-message.ts";

const fallback = "Vérifiez votre connexion ou contactez votre responsable.";

test("replaces a gateway HTML error page with a useful transport message", () => {
  const error = new Error(
    "HTTP 502 Bad Gateway: <!DOCTYPE html><html><body>upstream error</body></html>",
  );

  assert.equal(
    formatApiMessage(error, fallback),
    "Le service de transport est temporairement indisponible. Réessayez dans quelques instants.",
  );
});

test("does not expose HTML for other server responses", () => {
  const error = new Error("HTTP 500 Server Error: <html><body>trace</body></html>");

  assert.equal(
    formatApiMessage(error, fallback),
    "Le serveur a renvoyé une réponse inattendue. Réessayez ou contactez votre responsable.",
  );
});

test("keeps useful plain-text API errors", () => {
  const error = new Error("HTTP 422 Unprocessable Entity: Numéro de téléphone invalide.");

  assert.equal(
    formatApiMessage(error, fallback),
    "Numéro de téléphone invalide.",
  );
});

test("uses the fallback for missing errors or empty messages", () => {
  assert.equal(formatApiMessage(undefined, fallback), fallback);
  assert.equal(formatApiMessage(new Error("HTTP 502 Bad Gateway: "), fallback), fallback);
});