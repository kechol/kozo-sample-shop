import { addToCartAction } from "@/app/cart/actions";

export function AddToCartForm({
  productId,
  stock,
}: {
  productId: number;
  stock: number;
}) {
  return (
    <form action={addToCartAction} className="mt-6 flex items-end gap-3">
      <input type="hidden" name="productId" value={productId} />
      <label className="text-sm">
        Quantity
        <input
          name="quantity"
          type="number"
          min={1}
          max={Math.min(stock, 99)}
          defaultValue={1}
          className="mt-1 block w-20 rounded border border-stone-300 px-2 py-1"
        />
      </label>
      <button type="submit" className="rounded bg-brand px-4 py-2 text-white">
        Add to cart
      </button>
    </form>
  );
}
