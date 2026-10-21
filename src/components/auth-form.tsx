"use client";

import { useActionState } from "react";
import type { AuthFormState } from "@/app/account/actions";

type Field = {
  name: string;
  label: string;
  type: string;
  autoComplete: string;
};

export function AuthForm({
  action,
  fields,
  submitLabel,
  next,
}: {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  fields: Field[];
  submitLabel: string;
  next?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="grid max-w-sm gap-4" noValidate>
      {state.error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-red-800">
          {state.error}
        </p>
      )}
      {next && <input type="hidden" name="next" value={next} />}
      {fields.map((field) => (
        <label key={field.name} className="text-sm">
          {field.label}
          <input
            name={field.name}
            type={field.type}
            autoComplete={field.autoComplete}
            className="mt-1 block w-full rounded border border-stone-300 px-2 py-1"
          />
        </label>
      ))}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-brand px-4 py-2 text-white disabled:opacity-60"
      >
        {submitLabel}
      </button>
    </form>
  );
}
