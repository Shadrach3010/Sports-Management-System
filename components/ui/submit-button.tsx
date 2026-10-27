"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function SubmitButton({
  idleLabel,
  pendingLabel,
  disabled = false,
  name,
  value,
}: {
  idleLabel: string;
  pendingLabel: string;
  disabled?: boolean;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      name={name}
      value={value}
    >
      {pending ? (
        <LoaderCircle aria-hidden="true" className="mr-2 size-4 animate-spin" />
      ) : null}
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}
