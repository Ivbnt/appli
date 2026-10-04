import * as React from "react";
import { cn } from "@/lib/utils";

/** En-tête de page : titre fort, description discrète, actions à droite. */
export function PageHeader({
  title,
  description,
  actions,
  className,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("mb-8 flex flex-col gap-5 sm:mb-10", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-title hidden md:block">{title}</h1>
          {description && <p className="text-sm text-muted md:mt-1.5">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

/** Conteneur standard d'une page (marges et largeur maximale). */
export function PageContainer({ className, wide, ...props }: React.ComponentProps<"div"> & { wide?: boolean }) {
  return (
    <div
      className={cn("mx-auto w-full px-4 pt-6 pb-10 sm:px-6 md:px-8 md:pt-10 lg:px-12", wide ? "max-w-[1400px]" : "max-w-[1120px]", className)}
      {...props}
    />
  );
}
