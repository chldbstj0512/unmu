import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils.ts";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-md border border-[#d9cbb3] bg-[#fbf6ec] px-3 py-2 text-base text-[#241c14] outline-none placeholder:text-[#8a7764] focus-visible:ring-2 focus-visible:ring-[#7a2e2a]",
        className,
      )}
      {...props}
    />
  );
}
