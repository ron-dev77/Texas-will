/** Read `{ error: string }` from a failed supabase.functions.invoke call. */
export async function readEdgeFunctionError(
  error: unknown,
  data: unknown,
  fallback: string,
): Promise<string> {
  if (data && typeof data === 'object' && 'error' in data && (data as { error: unknown }).error) {
    return String((data as { error: string }).error)
  }

  const err = error as {
    message?: string
    context?: Response
  }

  try {
    const ctx = err?.context
    if (ctx && typeof ctx.json === 'function') {
      const body = await ctx.clone().json()
      if (body && typeof body === 'object' && 'error' in body && body.error) {
        return String((body as { error: string }).error)
      }
      if (body && typeof body === 'object' && 'message' in body && body.message) {
        return String((body as { message: string }).message)
      }
    }
  } catch {
    /* ignore */
  }

  const msg = err?.message || fallback
  if (msg.toLowerCase().includes('non-2xx')) {
    return fallback
  }
  return msg
}
