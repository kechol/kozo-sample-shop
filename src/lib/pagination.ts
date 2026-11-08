// Clamps the requested page into range; an empty list still has one page.
export function pageWindow(total: number, pageSize: number, requested = 1) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, Math.trunc(requested)), pageCount);
  return { page, pageCount, offset: (page - 1) * pageSize };
}
