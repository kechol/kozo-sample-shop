import type { OrderStatus } from "@/db/schema";

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment confirmation",
  paid: "Paid",
  payment_failed: "Payment failed",
};
