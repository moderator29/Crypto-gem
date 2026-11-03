"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface Common {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Square control, for icon-only buttons. Always pass an aria-label. */
  icon?: boolean;
  className?: string;
  children?: ReactNode;
}

const VARIANT: Record<ButtonVariant, string> = { primary: "btn-primary", secondary: "", ghost: "btn-ghost", danger: "btn-danger" };
const SIZE: Record<ButtonSize, string> = { sm: "btn-sm", md: "", lg: "btn-lg" };

export function buttonClass({ variant = "secondary", size = "md", icon = false, className = "" }: Common): string {
  return ["btn", VARIANT[variant], SIZE[size], icon ? "btn-icon" : "", className].filter(Boolean).join(" ");
}

interface ButtonProps extends Common, Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> {
  /** Shows a spinner, blocks clicks and sets aria-busy. The label stays so width does not jump. */
  loading?: boolean;
}

/** The only way to render an action button. Variants, sizes and states are defined once in globals.css. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant, size, icon, className, loading = false, disabled, children, type = "button", ...rest }, ref) {
  return (
    <button ref={ref} type={type} className={buttonClass({ variant, size, icon, className })} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

/** A navigation link that looks like a button. Use this, not a button with an onClick, for anything that changes the page. */
export function ButtonLink({ href, variant, size, icon, className, children, external = false, ...rest }: Common & { href: string; external?: boolean } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "href" | "children">) {
  const cls = buttonClass({ variant, size, icon, className });
  if (external) {
    return (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer nofollow" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}
