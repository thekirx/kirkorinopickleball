export const SUPABASE_URL = 'https://qagqtdctkcvqfxkysoqx.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_UNEuBLNoUd1I48-1gjQU2g_M2GXdiAn';
export interface SharedRow {
  code?: string;
  edit_token?: string;
  payload?: unknown;
  updated_at?: string;
}
export function createRpcClient(fetcher: typeof fetch = (...args) => fetch(...args)) {
  async function rpc(name: string, body: Record<string, unknown>): Promise<SharedRow | null> {
    const response = await fetcher(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      let message = text;
      try {
        const json = JSON.parse(text);
        message = json.message || json.error || text;
      } catch {
        /* plain-text error */
      }
      throw Error(message || `Request failed (${response.status})`);
    }
    const result = await response.json();
    return Array.isArray(result) ? (result[0] ?? null) : result;
  }
  return {
    create: (payload: unknown) => rpc('kirq_create_session', { p_payload: payload }),
    update: (code: string, editToken: string, payload: unknown) =>
      rpc('kirq_update_session', { p_code: code, p_edit_token: editToken, p_payload: payload }),
    read: (code: string) => rpc('kirq_read_session', { p_code: code }),
  };
}
