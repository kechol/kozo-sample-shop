"use client";

import { useActionState } from "react";
import { COUNTRIES } from "@/lib/countries";
import { type CheckoutState, checkoutAction } from "./actions";

const fields = [
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  { name: "name", label: "Full name", type: "text", autoComplete: "name" },
  {
    name: "address",
    label: "Street address",
    type: "text",
    autoComplete: "street-address",
  },
  { name: "city", label: "City", type: "text", autoComplete: "address-level2" },
  {
    name: "postalCode",
    label: "Postal code",
    type: "text",
    autoComplete: "postal-code",
  },
] as const;

const initialState: CheckoutState = {};

export function CheckoutForm() {
  const [state, formAction, pending] = useActionState(
    checkoutAction,
    initialState,
  );
  const fieldError = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="grid max-w-md gap-4" noValidate>
      {state.error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-red-800">
          {state.error}
        </p>
      )}
      {fields.map((field) => (
        <label key={field.name} className="text-sm">
          {field.label}
          <input
            name={field.name}
            type={field.type}
            autoComplete={field.autoComplete}
            aria-invalid={fieldError(field.name) ? true : undefined}
            className="mt-1 block w-full rounded border border-stone-300 px-2 py-1"
          />
          {fieldError(field.name) && (
            <span className="text-red-700">{fieldError(field.name)}</span>
          )}
        </label>
      ))}
      <label className="text-sm">
        Country
        <select
          name="country"
          defaultValue="US"
          className="mt-1 block w-full rounded border border-stone-300 px-2 py-1"
        >
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Card number
        <input
          name="cardNumber"
          inputMode="numeric"
          autoComplete="cc-number"
          aria-invalid={fieldError("cardNumber") ? true : undefined}
          className="mt-1 block w-full rounded border border-stone-300 px-2 py-1"
        />
        {fieldError("cardNumber") && (
          <span className="text-red-700">{fieldError("cardNumber")}</span>
        )}
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-brand px-4 py-2 text-white disabled:opacity-60"
      >
        {pending ? "Processing…" : "Place order"}
      </button>
    </form>
  );
}
