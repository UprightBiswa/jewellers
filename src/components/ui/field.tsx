import * as React from "react";
import { cn } from "@/lib/utils";

const controlBase = [
  "w-full rounded-lg border border-line-strong bg-surface px-3.5 text-ink",
  "placeholder:text-muted/80",
  "transition-[border-color,box-shadow] duration-150",
  "focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/20",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/20",
].join(" ");

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(controlBase, "h-11 text-[15px]", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea className={cn(controlBase, "min-h-28 py-2.5 text-[15px] leading-relaxed", className)} {...props} />
  );
}

export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select className={cn(controlBase, "h-11 text-[15px] pr-9 appearance-none", className)} {...props}>
      {children}
    </select>
  );
}

/**
 * One label + control + message unit. Every form in the app uses this, so a
 * required marker and an error message always look and read the same way.
 */
export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : hint ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
