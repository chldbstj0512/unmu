import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils.ts";

export const Dialog = DialogPrimitive.Root;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export function DialogContent({ className, children, ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#1a140f]/55" />
      <DialogPrimitive.Content
        className={cn(
          "hanji fixed left-1/2 top-1/2 z-50 w-[min(560px,calc(100%-1.5rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#e3e0da] p-6",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-3 top-3 rounded-md p-1 text-[#6b5c4a] hover:bg-[#efe4cf] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a2e2a]" aria-label="닫기">
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
