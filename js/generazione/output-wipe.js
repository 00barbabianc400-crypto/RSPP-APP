/**
 * GEN_OUTPUT_WIPE — richiesta cancellazione totale bucket output via webhook n8n.
 *
 *   countAllOutputFiles(client, bucket)
 *   requestWipe(webhookUrl, accessToken, payload)
 */
(function () {
  'use strict';

  async function listFolderFiles(client, bucket, prefix) {
    const { data, error } = await client.storage.from(bucket).list(prefix || '', {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    return data || [];
  }

  function isFileEntry(name) {
    return name && !name.endsWith('/') && name.includes('.');
  }

  /** Conta tutti i file nel bucket output (tutte le cartelle azienda). */
  async function countAllOutputFiles(client, bucket) {
    const root = await listFolderFiles(client, bucket, '');
    const folders = root.filter((f) => f.id == null || !String(f.name).includes('.'));
    if (folders.length) {
      const counts = await Promise.all(folders.map(async (f) => {
        const id = String(f.name).replace(/\/$/, '');
        const files = await listFolderFiles(client, bucket, id);
        return files.filter((ff) => isFileEntry(ff.name)).length;
      }));
      return counts.reduce((s, n) => s + n, 0);
    }
    return root.filter((f) => isFileEntry(f.name)).length;
  }

  /**
   * POST al webhook n8n. accessToken = JWT Supabase session.
   * payload: { totp_code, confirm_phrase, user_id, email, full_name, role }
   */
  async function requestWipe(webhookUrl, accessToken, payload) {
    if (!webhookUrl) throw new Error('Webhook n8n non configurato (N8N_OUTPUT_WIPE_WEBHOOK_URL in env.js)');
    if (!accessToken) throw new Error('Sessione non valida');

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + accessToken,
      },
      body: JSON.stringify({
        intent: 'output_wipe_request',
        requested_at: new Date().toISOString(),
        ...payload,
      }),
    });

    let body = {};
    try { body = await res.json(); } catch (_) { /* risposta non JSON */ }

    if (!res.ok) {
      const msg = body.message || body.error || ('HTTP ' + res.status);
      throw new Error(msg);
    }
    return body;
  }

  window.GEN_OUTPUT_WIPE = { countAllOutputFiles, requestWipe };
})();
