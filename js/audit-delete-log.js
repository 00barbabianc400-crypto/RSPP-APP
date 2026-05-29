/**
 * AUDIT_DELETE_LOG — log fire-and-forget cancellazioni catalogo via webhook n8n (CSV).
 *
 *   notify(webhookUrl, payload)
 *
 * Nessuna auth: POST JSON semplice. Se webhookUrl è vuoto, no-op.
 */
(function () {
  'use strict';

  function notify(webhookUrl, payload) {
    if (!webhookUrl) return;
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(function (err) {
      console.warn('[AUDIT_DELETE_LOG]', err);
    });
  }

  window.AUDIT_DELETE_LOG = { notify };
})();
