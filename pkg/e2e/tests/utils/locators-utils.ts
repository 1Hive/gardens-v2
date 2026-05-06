import { Page } from "@playwright/test";

export function getByTestId(page: Page, testId: string) {
  return page.locator(`[data-testid="${testId}"]:visible`).first();
}
