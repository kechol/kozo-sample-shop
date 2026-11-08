import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateProductAction } from "@/app/admin/actions";
import { getDatabase } from "@/db/client";
import { getProductById } from "@/lib/admin/products";
import { requireAdmin } from "@/lib/auth";
import { listCategories } from "@/lib/catalog";
import { ProductForm } from "../../product-form";

export const metadata: Metadata = { title: "Edit product · Admin" };

export default async function EditProductPage({
  params,
}: PageProps<"/admin/products/[id]/edit">) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const db = getDatabase();
  const [product, categories] = await Promise.all([
    getProductById(db, id),
    listCategories(db),
  ]);
  if (!product) notFound();
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Edit {product.name}</h1>
      <ProductForm
        action={updateProductAction}
        categories={categories}
        product={product}
        submitLabel="Save changes"
      />
    </>
  );
}
