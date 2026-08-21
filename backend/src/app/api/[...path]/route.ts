import {
  ApiError,
  bearerToken,
  corsHeaders,
  empty,
  errorResponse,
  json,
  readJson,
} from "@/lib/http";
import { kitchen } from "@/lib/kitchen";
import type { CreateOrderInput, CreateSessionInput, OrderStatus, ReviewInput, StaffLoginInput } from "@/lib/types";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ path?: string[] }> };

async function parts(context: RouteContext) {
  const { path = [] } = await context.params;
  return path;
}

function eq(path: string[], ...expected: string[]) {
  return path.length === expected.length && expected.every((part, index) => path[index] === part);
}

export async function OPTIONS(request: Request) {
  return empty(204, request);
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const path = await parts(context);
    const url = new URL(request.url);
    const staff = bearerToken(request);

    if (eq(path, "health")) return json(await kitchen.health(), 200, request);
    if (eq(path, "menu")) return json(kitchen.getMenu(), 200, request);
    if (path.length === 2 && path[0] === "tables") {
      return json(await kitchen.getTableOccupancy(path[1]), 200, request);
    }
    if (eq(path, "sessions", "me")) {
      const tableId = url.searchParams.get("tableId") ?? "";
      return json(await kitchen.getMySession(tableId, staff), 200, request);
    }
    if (eq(path, "sessions")) return json(await kitchen.listSessions(staff), 200, request);
    if (eq(path, "orders") && path.length === 1) {
      return json(await kitchen.listOrders(staff), 200, request);
    }
    if (path.length === 2 && path[0] === "orders") {
      return json(await kitchen.getOrder(path[1], staff), 200, request);
    }
    if (eq(path, "audit")) return json(await kitchen.listAuditEvents(staff), 200, request);
    if (eq(path, "analytics")) return json(await kitchen.getAnalytics(staff), 200, request);

    throw new ApiError("Not found", 404);
  } catch (err) {
    return errorResponse(err, request);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const path = await parts(context);
    const staff = bearerToken(request);

    if (eq(path, "staff", "login")) {
      const body = await readJson<StaffLoginInput>(request);
      return json(await kitchen.staffLogin(body), 200, request);
    }
    if (eq(path, "staff", "logout")) {
      await kitchen.staffLogout(staff);
      return empty(204, request);
    }
    if (eq(path, "sessions") && path.length === 1) {
      const body = await readJson<CreateSessionInput>(request);
      return json(await kitchen.startSession(body), 201, request);
    }
    if (eq(path, "sessions", "claim")) {
      const body = await readJson<{ code?: string }>(request);
      return json(await kitchen.claimResume(body.code ?? ""), 200, request);
    }
    if (path.length === 3 && path[0] === "sessions") {
      const sessionId = path[1];
      const action = path[2];
      if (action === "bill") {
        const body = await readJson<{ token?: string }>(request);
        return json(await kitchen.requestBill(sessionId, body.token ?? staff), 200, request);
      }
      if (action === "pay") {
        const body = await readJson<{ token?: string; method?: unknown }>(request);
        return json(
          await kitchen.paySession(sessionId, body.token ?? staff, kitchen.parseMethod(body.method)),
          200,
          request,
        );
      }
      if (action === "close") {
        return json(await kitchen.closeSession(sessionId, staff), 200, request);
      }
      if (action === "abandon") {
        const body = await readJson<{ note?: string }>(request);
        return json(await kitchen.abandonSession(sessionId, staff, body.note ?? ""), 200, request);
      }
      if (action === "exit") {
        const body = await readJson<{ token?: string }>(request);
        return json(await kitchen.exitSession(sessionId, body.token ?? staff), 200, request);
      }
      if (action === "resume") {
        return json(await kitchen.createResumeCode(sessionId, staff), 200, request);
      }
      if (action === "review") {
        const body = await readJson<ReviewInput>(request);
        return json(await kitchen.reviewSession(sessionId, body), 200, request);
      }
    }
    if (eq(path, "orders") && path.length === 1) {
      const body = await readJson<CreateOrderInput>(request);
      const idempotencyKey =
        request.headers.get("idempotency-key")?.trim() || body.idempotencyKey;
      return json(
        await kitchen.createOrder({ ...body, token: body.token || staff, idempotencyKey }),
        201,
        request,
      );
    }

    throw new ApiError("Not found", 404);
  } catch (err) {
    return errorResponse(err, request);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const path = await parts(context);
    const staff = bearerToken(request);
    if (path.length === 2 && path[0] === "orders") {
      const body = await readJson<{ status?: OrderStatus }>(request);
      return json(await kitchen.updateOrderStatus(path[1], body.status as OrderStatus, staff), 200, request);
    }
    throw new ApiError("Not found", 404);
  } catch (err) {
    return errorResponse(err, request);
  }
}

export function HEAD(request: Request) {
  return new Response(null, { headers: corsHeaders(request) });
}
