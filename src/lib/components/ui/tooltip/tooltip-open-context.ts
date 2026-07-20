export const TOOLTIP_OPEN_CONTEXT = Symbol('runrate-tooltip-open');

export type TooltipOpenContext = {
  getOpen: () => boolean;
  setOpen: (open: boolean) => void;
};
