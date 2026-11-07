// Records answer sets in Supabase and fetches totals. Exposes window.Responses.
// Each browser's first submission per question set is counted; later ones just show totals.
(() => {
  const { supabaseUrl: url, supabaseKey: key } = window.SITE_CONFIG || {};
  if (!url || !key) return; // not configured: summaries still work, nothing is saved

  const headers = { apikey: key, "Content-Type": "application/json" };
  if (!key.startsWith("sb_")) headers.Authorization = `Bearer ${key}`; // legacy anon JWT keys

  const seenKey = (set) => `answered:${set}`;
  const seen = (set) => { try { return localStorage.getItem(seenKey(set)) === "1"; } catch { return false; } };
  const markSeen = (set) => { try { localStorage.setItem(seenKey(set), "1"); } catch {} };

  async function record(set, answers) {
    if (!seen(set)) {
      const res = await fetch(`${url}/rest/v1/responses`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({ question_set: set, answers }),
      });
      if (res.ok) markSeen(set);
    }
    const tally = await fetch(`${url}/rest/v1/rpc/tally`, {
      method: "POST",
      headers,
      body: JSON.stringify({ set_name: set }),
    });
    return tally.ok ? tally.json() : null;
  }

  window.Responses = { record };
})();
