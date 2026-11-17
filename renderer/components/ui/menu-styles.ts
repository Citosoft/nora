/**
 * Shared look for every pop-up menu: dropdowns, submenus, context menus, select lists and menu-like popovers.
 * Primitives compose these instead of repeating class strings, so menus stay visually identical.
 */

/** Floating panel that holds menu items. Size and position classes are added by each primitive. */
export const menuSurfaceClass =
  "rounded-lg border border-border/60 bg-popover/95 p-1 text-popover-foreground shadow-[0_10px_38px_-10px_rgb(0_0_0/0.35),0_10px_20px_-15px_rgb(0_0_0/0.2)] backdrop-blur-xl";

/**
 * One row. Highlight covers mouse hover, keyboard focus and Radix's data-highlighted.
 * Direct svg children are the leading icon: sized and muted so the label carries the row.
 */
export const menuItemClass = [
  "relative flex min-h-8 w-full cursor-default select-none items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] leading-tight tracking-[-0.005em] outline-none transition-colors duration-75",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-45",
  "text-popover-foreground hover:bg-accent/70 focus-visible:bg-accent/70 data-[highlighted]:bg-accent/70",
  "[&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground hover:[&>svg]:text-popover-foreground data-[highlighted]:[&>svg]:text-popover-foreground"
].join(" ");

export const menuItemDestructiveClass =
  "text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10 data-[highlighted]:bg-destructive/10 [&>svg]:text-destructive hover:[&>svg]:text-destructive data-[highlighted]:[&>svg]:text-destructive";

/** For plain-button items; Radix items get the same look from data-disabled in menuItemClass. */
export const menuItemDisabledClass = "pointer-events-none opacity-45";

/** Section heading above a run of items. */
export const menuLabelClass = "px-2 pb-1 pt-2 text-[11px] font-medium text-muted-foreground";

/** Full-bleed hairline between sections; -mx-1 cancels the surface padding. */
export const menuSeparatorClass = "-mx-1 my-1 h-px bg-border/60";

/** Secondary line inside a two-line item, such as a path under a name. */
export const menuItemDescriptionClass = "truncate text-[11px] leading-tight text-muted-foreground";
