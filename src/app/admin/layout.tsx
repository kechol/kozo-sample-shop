import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();
  return (
    <>
      <nav aria-label="Admin" className="mb-6 flex gap-4 text-sm">
        <span className="font-semibold">Admin</span>
        <Link href="/admin/orders" className="text-brand">
          Orders
        </Link>
        <Link href="/admin/products" className="text-brand">
          Products
        </Link>
      </nav>
      {children}
    </>
  );
}
