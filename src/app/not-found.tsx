import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold">Not found</h1>
      <p className="text-stone-600">
        That page does not exist.{" "}
        <Link href="/" className="text-brand">
          Back to all products
        </Link>
      </p>
    </>
  );
}
