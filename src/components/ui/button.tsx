import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tepla-accent disabled:pointer-events-none disabled:opacity-50 ring-offset-transparent",
  {
    variants: {
      variant: {
        primary:
          "bg-tepla-accent text-white hover:bg-tepla-accent-hover shadow-md shadow-tepla-accent/30",
        ghost:
          "bg-transparent text-tepla-text-secondary hover:bg-tepla-surface border border-transparent hover:border-tepla-border/70",
        subtle:
          "bg-tepla-surface text-tepla-text hover:bg-tepla-surface-hover border border-tepla-border/60",
        danger:
          "bg-tepla-danger text-white hover:bg-red-500/90 shadow-md shadow-red-500/30",
        outline:
          "border border-tepla-border bg-transparent text-tepla-text hover:bg-tepla-surface",
        icon:
          "bg-tepla-surface text-tepla-text-secondary hover:bg-tepla-surface-hover border border-transparent hover:border-tepla-border/80 p-0",
      },
      size: {
        sm: "h-8 px-3 text-xs gap-1.5",
        md: "h-9 px-4 text-sm gap-2",
        lg: "h-10 px-5 text-sm gap-2.5",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

