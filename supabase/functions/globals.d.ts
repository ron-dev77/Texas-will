/** Ambient types so the editor recognizes the Deno edge runtime. */
declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined
  }
  function serve(handler: (req: Request) => Response | Promise<Response>): void
}

declare module 'https://esm.sh/@supabase/supabase-js@2.49.1' {
  type QueryResult = {
    data: Record<string, unknown> | null
    error: { message: string } | null
  }
  type FilterBuilder = {
    select: (columns: string) => FilterBuilder
    insert: (values: Record<string, unknown>) => FilterBuilder
    update: (values: Record<string, unknown>) => FilterBuilder
    eq: (column: string, value: unknown) => FilterBuilder
    maybeSingle: () => Promise<QueryResult>
    single: () => Promise<QueryResult>
    then: Promise<QueryResult>['then']
  }
  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: Record<string, unknown>,
  ): { from: (table: string) => FilterBuilder }
}

declare module 'https://esm.sh/stripe@17.7.0?target=deno' {
  type StripeClient = {
    paymentIntents: {
      create: (params: Record<string, unknown>) => Promise<{
        id: string
        client_secret: string | null
      }>
      retrieve: (id: string) => Promise<{ id: string; status: string }>
    }
  }
  const Stripe: {
    new (stripeKey: string, opts?: Record<string, unknown>): StripeClient
    createFetchHttpClient: () => unknown
  }
  export default Stripe
}
