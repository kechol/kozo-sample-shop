import type { Metadata } from "next";
import { createProductAction } from "@/app/admin/actions";
import { getDatabase } from "@/db/client";
import { requireAdmin } from "@/lib/auth";
import { listCategories } from "@/lib/catalog";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "New product · Admin" };

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await listCategories(getDatabase());
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">New product</h1>
      <ProductForm
        action={createProductAction}
        categories={categories}
        submitLabel="Create product"
      />
    </>
  );
}
