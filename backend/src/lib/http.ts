export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function createId(prefix = "ord") {
  const random = crypto.randomUUID().slice(0, 8);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

export function isValidIdempotencyKey(key: string) {
  return /^[\w.-]{8,128}$/.test(key);
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function computeTotals(items: { unitPrice: number; quantity: number }[], taxRate: number) {
  const subtotal = roundMoney(items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
  const tax = roundMoney(subtotal * taxRate);
  const total = roundMoney(subtotal + tax);
  return { subtotal, tax, total };
}

export function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

export function corsHeaders(request: Request) {
  const configured = process.env.CORS_ORIGIN?.trim();
  const origin = request.headers.get("origin") ?? "";
  const allow = configured || origin || "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Idempotency-Key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function json(data: unknown, status = 200, request?: Request) {
  return Response.json(data, {
    status,
    headers: request ? corsHeaders(request) : undefined,
  });
}

export function empty(status: number, request: Request) {
  return new Response(null, { status, headers: corsHeaders(request) });
}

export function errorResponse(err: unknown, request: Request) {
  if (err instanceof ApiError) {
    return json({ message: err.message }, err.status, request);
  }
  console.error(err);
  return json({ message: "Kitchen error" }, 500, request);
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError("Request body must be JSON", 400);
  }
}
