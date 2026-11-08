import { z } from "zod";
import { type OrderStatus, orderStatus } from "@/db/schema";

export const orderStatusSchema = z.enum(orderStatus.enumValues);

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment confirmation",
  paid: "Paid",
  payment_failed: "Payment failed",
  shipped: "Shipped",
  cancelled: "Cancelled",
};
