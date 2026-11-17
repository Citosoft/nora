/**
 * The Bots home's two pages (Bots and Routines) share one frame, so the tabs at the top stay in the same place when switching.
 * The scroll area always reserves the scrollbar's gutter: a page that scrolls would otherwise be narrower than one that doesn't.
 */
export const BOTS_HOME_SCROLL_CLASS = "min-h-0 flex-1 [scrollbar-gutter:stable]";
export const BOTS_HOME_COLUMN_CLASS = "mx-auto flex w-full max-w-[68rem] flex-col px-5 pt-5 sm:px-8";
