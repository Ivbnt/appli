import { cva } from "class-variance-authority";

/** Classes des boutons, utilisables aussi depuis un composant serveur (liens stylés en bouton). */
export const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium select-none",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out",
    "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover",
        secondary:
          "border border-border bg-surface text-foreground shadow-xs hover:border-border-strong hover:bg-surface-hover",
        ghost: "text-muted hover:bg-surface-hover hover:text-foreground",
        subtle: "bg-surface-muted text-foreground hover:bg-surface-hover",
        accent: "bg-accent text-accent-foreground shadow-xs hover:opacity-90",
        danger: "bg-danger text-white shadow-xs hover:bg-danger-hover",
        "danger-ghost": "text-danger hover:bg-danger-soft",
        link: "h-auto px-0 text-foreground underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        sm: "h-8 rounded-md px-3 text-[13px] [&_svg]:size-3.5",
        md: "h-9 rounded-[10px] px-3.5 text-sm [&_svg]:size-4",
        lg: "h-11 rounded-xl px-5 text-[15px] [&_svg]:size-4",
        icon: "size-9 rounded-[10px] [&_svg]:size-[18px]",
        "icon-sm": "size-8 rounded-md [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);
