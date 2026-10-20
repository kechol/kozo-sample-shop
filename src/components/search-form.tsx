export function SearchForm() {
  return (
    <search>
      <form action="/search" className="flex gap-2">
        <label htmlFor="search-q" className="sr-only">
          Search products
        </label>
        <input
          id="search-q"
          name="q"
          type="search"
          placeholder="Search products"
          className="w-48 rounded border border-stone-300 px-2 py-1 text-sm"
        />
        <button
          type="submit"
          className="rounded bg-brand px-3 py-1 text-sm text-white"
        >
          Search
        </button>
      </form>
    </search>
  );
}
