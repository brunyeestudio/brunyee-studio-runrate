import { expect, waitFor, within } from 'storybook/test';

/** Simulate a touch pointerup for Storybook interaction tests. */
export function touchToggle(target: Element) {
  target.dispatchEvent(
    new PointerEvent('pointerup', {
      bubbles: true,
      cancelable: true,
      pointerType: 'touch',
    }),
  );
}

/** Wait until a portaled tooltip finishes its exit animation and unmounts. */
export async function expectTooltipClosed(testId: string) {
  await waitFor(() => {
    expect(
      within(document.body).queryByTestId(testId),
    ).not.toBeInTheDocument();
  });
}
