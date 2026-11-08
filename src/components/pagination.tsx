import Link from "next/link";

export function Pagination({
  page,
  pageCount,
  basePath,
  params = {},
}: {
  page: number;
  pageCount: number;
  basePath: string;
  params?: Record<string, string>;
}) {
  if (pageCount <= 1) return null;
  const hrefFor = (target: number) => {
    const search = new URLSearchParams({ ...params, page: String(target) });
    return `${basePath}?${search.toString()}`;
  };
  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex items-center gap-4 text-sm"
    >
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className="text-brand">
          Previous
        </Link>
      ) : (
        <span className="text-stone-400">Previous</span>
      )}
      <span>
        Page {page} of {pageCount}
      </span>
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} rel="next" className="text-brand">
          Next
        </Link>
      ) : (
        <span className="text-stone-400">Next</span>
      )}
    </nav>
  );
}
