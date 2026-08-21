import { isRemoteApiEnabled } from "@/lib/config";
import { httpOrderService } from "@/lib/api/http";
import { mockOrderService } from "@/lib/api/mock";
import type { OrderService } from "@/lib/api/types";

export { ApiError } from "@/lib/api/types";
export type { OrderService } from "@/lib/api/types";

export const orderService: OrderService = isRemoteApiEnabled()
  ? httpOrderService
  : mockOrderService;
