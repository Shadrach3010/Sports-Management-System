import { expect, test, type Page } from "@playwright/test";

const eventId = process.env.E2E_EVENT_ID;
const identities = {
  judge: [process.env.E2E_JUDGE_EMAIL, process.env.E2E_JUDGE_PASSWORD],
  verifier: [process.env.E2E_VERIFIER_EMAIL, process.env.E2E_VERIFIER_PASSWORD],
  coordinator: [
    process.env.E2E_COORDINATOR_EMAIL,
    process.env.E2E_COORDINATOR_PASSWORD,
  ],
} as const;
const configured =
  Boolean(eventId) &&
  eventId !== "00000000-0000-0000-0000-000000000000" &&
  Object.values(identities).every(
    ([email, password]) =>
      email?.endsWith(".invalid") === false &&
      password !== "replace-with-local-test-password",
  );

async function signIn(
  page: Page,
  identity: readonly [string | undefined, string | undefined],
) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(identity[0] ?? "");
  await page.getByLabel("Password").fill(identity[1] ?? "");
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("public pages do not expose private student fields", async ({ page }) => {
  await page.goto("/public/results");
  await expect(
    page.getByRole("heading", { name: "Published event results" }),
  ).toBeVisible();
  await expect(page.getByText(/student number|date of birth/i)).toHaveCount(0);
});

test("unauthenticated user is redirected away from trusted result entry", async ({
  page,
}) => {
  await page.goto("/result-entry");
  await expect(page).toHaveURL(/\/login/);
});

test("judge → verifier → coordinator result workflow", async ({ browser }) => {
  test.skip(
    !configured,
    "Requires synthetic Supabase E2E accounts and a prepared checked-in event fixture.",
  );

  const judge = await browser.newPage();
  await signIn(judge, identities.judge);
  await judge.goto(`/result-entry?event=${eventId}`);
  await judge
    .getByLabel("Checked-in participant or approved team")
    .selectOption({ index: 1 });
  await judge.getByLabel("Placement").fill("1");
  await judge.getByRole("button", { name: "Submit for verification" }).click();
  await expect(
    judge.getByText("Result submitted for independent verification."),
  ).toBeVisible();
  await judge.close();

  const verifier = await browser.newPage();
  await signIn(verifier, identities.verifier);
  await verifier.goto("/admin/results");
  await verifier
    .getByPlaceholder("Independent review reason")
    .first()
    .fill("Synthetic E2E verification");
  await verifier.getByRole("button", { name: "Record review" }).first().click();
  await expect(verifier.getByText("Result verified.")).toBeVisible();
  await verifier.close();

  const coordinator = await browser.newPage();
  await signIn(coordinator, identities.coordinator);
  await coordinator.goto("/admin/results");
  await coordinator
    .getByPlaceholder("Authorization reason")
    .first()
    .fill("Synthetic E2E approval");
  await coordinator
    .getByRole("button", { name: "Apply decision" })
    .first()
    .click();
  await expect(
    coordinator.getByText("Result lifecycle updated."),
  ).toBeVisible();
  await coordinator.close();
});
