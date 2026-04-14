"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

type DivProps = React.HTMLAttributes<HTMLDivElement>;
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogPortal = AlertDialogPrimitive.Portal;
export const AlertDialogCancel = AlertDialogPrimitive.Cancel;
export const AlertDialogAction = AlertDialogPrimitive.Action;

export const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(function AlertDialogOverlay({ className = "", ...props }, ref) {
  return (
    <AlertDialogPrimitive.Overlay
      ref={ref}
      className={[
        "fixed inset-0 z-[100] bg-ink-fg/20",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        className,
      ].join(" ")}
      {...props}
    />
  );
});

export const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(function AlertDialogContent({ className = "", ...props }, ref) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
        <AlertDialogPrimitive.Content
          ref={ref}
          className={[
          "fixed left-1/2 top-1/2 z-[101] max-h-[calc(100vh-1rem)] w-[min(24rem,calc(100vw-1rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto",
          "rounded-[1.5rem] border-4 border-ink-fg bg-surface-white p-4 shadow-none brutal-shadow-lg sm:max-h-[calc(100vh-1.5rem)] sm:w-[min(30rem,calc(100vw-2rem))] sm:rounded-[2rem] sm:p-6",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          className,
        ].join(" ")}
        {...props}
      />
    </AlertDialogPortal>
  );
});

export function AlertDialogHeader({ className = "", ...props }: DivProps) {
  return <div className={["flex flex-col gap-2.5 sm:gap-3", className].join(" ")} {...props} />;
}

export function AlertDialogFooter({ className = "", ...props }: DivProps) {
  return <div className={["mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:flex sm:justify-end", className].join(" ")} {...props} />;
}

export const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(function AlertDialogTitle({ className = "", ...props }, ref) {
    return (
    <AlertDialogPrimitive.Title
      ref={ref}
      className={["font-display text-xl font-black uppercase tracking-tight text-ink-fg sm:text-3xl", className].join(" ")}
      {...props}
    />
  );
});

export const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(function AlertDialogDescription({ className = "", ...props }, ref) {
    return (
    <AlertDialogPrimitive.Description
      ref={ref}
      className={["text-sm leading-relaxed text-ink-fg sm:text-lg", className].join(" ")}
      {...props}
    />
  );
});

export function AlertDialogActionButton({ className = "", ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={[
        "inline-flex h-11 w-full items-center justify-center rounded-2xl border-2 border-ink-fg px-4 text-base font-bold sm:w-auto sm:px-5",
        "bg-accent-3 text-surface-white brutal-shadow-sm workbook-press",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

export function AlertDialogCancelButton({ className = "", ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={[
        "inline-flex h-11 w-full items-center justify-center rounded-2xl border-2 border-ink-fg px-4 text-base font-bold sm:w-auto sm:px-5",
        "bg-paper-bg text-ink-fg brutal-shadow-sm workbook-press",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
