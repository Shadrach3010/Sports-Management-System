"use client";

import { useActionState } from "react";

import { ActionMessage } from "@/components/ui/action-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { signInAction } from "@/features/auth/actions";
import { initialActionState } from "@/features/shared/action-state";

export function SignInForm() {
  const [state, action] = useActionState(signInAction, initialActionState);
  const inputClass =
    "mt-1 min-h-10 w-full rounded-md border bg-white px-3 py-2 text-sm";
  return (
    <form action={action} className="space-y-5">
      <label className="block text-xs font-bold uppercase tracking-wider text-muted">
        Staff email
        <input
          className={inputClass}
          name="email"
          type="email"
          autoComplete="username"
          required
        />
      </label>
      <label className="block text-xs font-bold uppercase tracking-wider text-muted">
        Password
        <input
          className={inputClass}
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      <ActionMessage state={state} />
      <div className="[&_button]:w-full [&_button]:min-h-12">
        <SubmitButton
          idleLabel="Enter staff portal"
          pendingLabel="Signing in"
        />
      </div>
      <p className="text-xs leading-5 text-muted">
        Accounts and roles are provisioned by authorized administrators. There
        is no public sign-up or administrator bootstrap.
      </p>
    </form>
  );
}
