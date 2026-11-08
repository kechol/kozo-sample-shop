"use client";

import { startTransition, useActionState } from "react";
import type { ProductFormState } from "@/app/admin/actions";
import type { Category, Product } from "@/db/schema";
import { formatPriceInput } from "@/lib/money";

const textFields: {
  name: "name" | "slug" | "price" | "stock";
  label: string;
  inputMode?: "decimal" | "numeric";
}[] = [
  { name: "name", label: "Name" },
  { name: "slug", label: "Slug" },
  { name: "price", label: "Price (USD)", inputMode: "decimal" },
  { name: "stock", label: "Stock", inputMode: "numeric" },
];

export function ProductForm({
  action,
  categories,
  product,
  submitLabel,
}: {
  action: (
    state: ProductFormState,
    formData: FormData,
  ) => Promise<ProductFormState>;
  categories: Category[];
  product?: Product;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const initial = {
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    description: product?.description ?? "",
    price: product ? formatPriceInput(product.priceCents) : "",
    stock: product ? String(product.stock) : "0",
    categoryId: product ? String(product.categoryId) : "",
  };
  const fieldError = (name: string) => state.fieldErrors?.[name];
  const describedBy = (name: string) =>
    fieldError(name) ? `${name}-error` : undefined;
  const errorText = (name: string) =>
    fieldError(name) && (
      <span id={`${name}-error`} className="text-red-700">
        {fieldError(name)}
      </span>
    );
  const inputClass =
    "mt-1 block w-full rounded border border-stone-300 px-2 py-1";

  return (
    <form
      // The action prop serves submissions before hydration or without JavaScript. Once
      // hydrated, onSubmit calls the action itself, which skips React's form reset, so a
      // rejected submission keeps what the admin typed.
      action={formAction}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
      className="grid max-w-md gap-4"
      noValidate
    >
      {state.error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-red-800">
          {state.error}
        </p>
      )}
      {product && (
        <>
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="expectedStock" value={product.stock} />
        </>
      )}
      {textFields.map((field) => (
        <label key={field.name} className="text-sm">
          {field.label}
          <input
            name={field.name}
            defaultValue={initial[field.name]}
            inputMode={field.inputMode}
            aria-invalid={fieldError(field.name) ? true : undefined}
            aria-describedby={describedBy(field.name)}
            className={inputClass}
          />
          {errorText(field.name)}
        </label>
      ))}
      <label className="text-sm">
        Category
        <select
          name="categoryId"
          defaultValue={initial.categoryId}
          aria-invalid={fieldError("categoryId") ? true : undefined}
          aria-describedby={describedBy("categoryId")}
          className={inputClass}
        >
          <option value="">Choose…</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {errorText("categoryId")}
      </label>
      <label className="text-sm">
        Description
        <textarea
          name="description"
          rows={4}
          defaultValue={initial.description}
          aria-invalid={fieldError("description") ? true : undefined}
          aria-describedby={describedBy("description")}
          className={inputClass}
        />
        {errorText("description")}
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-brand px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
