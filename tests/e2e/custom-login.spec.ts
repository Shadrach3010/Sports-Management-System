import { expect, test } from "@playwright/test";

test.describe("custom staff login", () => {
  test.skip(
    process.env.E2E_DEMO_LOGIN !== "1",
    "Run only against the isolated demo database.",
  );

  test("protected navigation shows roster state without an instant-navigation overlay", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Staff email").fill("representative@gmail.com");
    await page.getByLabel("Password").fill("rep123");
    await page.getByRole("button", { name: "Enter staff portal" }).click();
    await page
      .getByRole("navigation", { name: "Staff workspace" })
      .getByRole("link", { name: "Athlete registration" })
      .click();
    await expect(page.getByRole("link", { name: "Manage roster" })).toHaveCount(
      1,
    );
    await expect(page.getByText("Event closed", { exact: true })).toHaveCount(
      1,
    );
    await page.getByRole("link", { name: "View roster" }).first().click();
    await expect(
      page.getByText("This event is closed.", {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Next.js encountered uncached data during a navigation."),
    ).toHaveCount(0);
  });

  test("administrator can sign in and access users", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Staff email").fill("admin@gmail.com");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Enter staff portal" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto("/admin/users");
    await expect(
      page.getByRole("heading", { name: "Users and roles" }),
    ).toBeVisible();
    await page.goto("/admin/meets");
    await expect(
      page.getByRole("heading", { name: "Sports meets" }),
    ).toBeVisible();
    await page.goto("/admin/scoring");
    await expect(
      page.getByRole("heading", { name: "Scoring policy" }),
    ).toBeVisible();
  });

  test("administrator can configure an eventless draft meet", async ({
    page,
  }) => {
    test.skip(
      !process.env.E2E_TEST_MEET_ID,
      "Provide a draft meet ID for this check.",
    );
    await page.goto("/login");
    await page.getByLabel("Staff email").fill("admin@gmail.com");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Enter staff portal" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto(`/admin/meets/${process.env.E2E_TEST_MEET_ID}`);
    await expect(
      page.getByRole("heading", { name: "Create event" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create event" }),
    ).toBeEnabled();
  });

  test("administrator account icons open an edit dialog", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Staff email").fill("admin@gmail.com");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Enter staff portal" }).click();
    await page.goto("/admin/users");
    await page
      .getByRole("button", { name: "Edit Demo Check-in Officer" })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Edit user account" }),
    ).toBeVisible();
    await expect(dialog.getByLabel("Email")).toHaveValue("checkin@gmail.com");
    await dialog.getByRole("button", { name: "Close dialog" }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("scheduled event explains why check-in is unavailable", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Staff email").fill("admin@gmail.com");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Enter staff portal" }).click();
    await page.goto("/check-in/d4000000-0000-4000-8000-000000000001");
    await expect(page.getByText("Check-in is not open.")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Scan QR pass" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Record manual check-in" }),
    ).toBeDisabled();
  });

  test("administrator manages a demo account lifecycle", async ({ page }) => {
    test.setTimeout(120_000);
    const email = `account-check-${Date.now()}@example.invalid`;
    await page.goto("/login");
    await page.getByLabel("Staff email").fill("admin@gmail.com");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Enter staff portal" }).click();
    await page.goto("/admin/users");
    await page.getByLabel("Staff email").fill(email);
    await page.getByLabel("Display name").fill("Account Check");
    await page
      .getByLabel("Initial password")
      .fill("temporary-demo-password-123");
    await page
      .locator('select[name="role"]')
      .first()
      .selectOption("public_viewer");
    await page.getByRole("button", { name: "Provision access" }).click();
    const row = page.locator("tr").filter({ hasText: email });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Edit Account Check" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill("Edited Account Check");
    await dialog.getByRole("button", { name: "Save changes" }).click();
    await expect(
      row.getByText("Edited Account Check", { exact: true }),
    ).toBeVisible();
    await row
      .getByRole("button", { name: "Deactivate Edited Account Check" })
      .click();
    await dialog.getByRole("button", { name: "Deactivate account" }).click();
    await expect(row.getByText("Inactive")).toBeVisible();
    await row
      .getByRole("button", { name: "Activate Edited Account Check" })
      .click();
    await dialog.getByRole("button", { name: "Activate account" }).click();
    await expect(row.getByText("Active", { exact: true })).toBeVisible();
    await row
      .getByRole("button", { name: "Delete Edited Account Check" })
      .click();
    await dialog.getByLabel(/I understand this removes/).check();
    await dialog.getByRole("button", { name: "Delete account" }).click();
    await expect(row).toHaveCount(0);
  });

  for (const reviewer of [
    { email: "admin@gmail.com", password: "admin123" },
    { email: "coordinator@gmail.com", password: "coordinator123" },
    { email: "registration@gmail.com", password: "register123" },
  ]) {
    test(`${reviewer.email} sees athletes in submitted house rosters`, async ({
      page,
    }) => {
      await page.goto("/login");
      await page.getByLabel("Staff email").fill(reviewer.email);
      await page.getByLabel("Password").fill(reviewer.password);
      await page.getByRole("button", { name: "Enter staff portal" }).click();
      await page.goto("/admin/registrations");
      const roster = page
        .locator("article")
        .filter({ hasText: "Demo 100 Metres" })
        .filter({ hasText: "Demo Blue House" })
        .first();
      await expect(
        roster.getByText("Athletes in this house roster"),
      ).toBeVisible();
      await expect(
        roster.getByText("No active athletes in this submission."),
      ).toHaveCount(0);
    });
  }

  test("judge sees an assigned scheduled event", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Staff email").fill("judge@gmail.com");
    await page.getByLabel("Password").fill("judge123");
    await page.getByRole("button", { name: "Enter staff portal" }).click();
    await page.goto("/result-entry");
    await page.getByRole("link", { name: /Demo 100 Metres/ }).click();
    await expect(page.getByText(/is assigned to you/)).toBeVisible();
  });

  test("meet configuration navigation has no uncached-data overlay", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Staff email").fill("admin@gmail.com");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Enter staff portal" }).click();
    await page.goto("/admin/meets");
    await page
      .getByRole("link", { name: "Configure houses and events" })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: /CSMIS Demo Sports Meet/ }),
    ).toBeVisible();
    await expect(
      page.getByText("Next.js encountered uncached data during a navigation."),
    ).toHaveCount(0);
  });

  test("wrong password cannot sign in", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Staff email").fill("admin@gmail.com");
    await page.getByLabel("Password").fill("incorrect-password");
    await page.getByRole("button", { name: "Enter staff portal" }).click();
    await expect(page.getByText(/Sign-in failed/)).toBeVisible();
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/login/);
  });

  test("viewer cannot access administrator users", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Staff email").fill("viewer@gmail.com");
    await page.getByLabel("Password").fill("view123");
    await page.getByRole("button", { name: "Enter staff portal" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto("/admin/users");
    await expect(
      page.getByRole("heading", { name: "Users and roles" }),
    ).toHaveCount(0);
  });

  test("house representative sees their dashboard and registration", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Staff email").fill("representative@gmail.com");
    await page.getByLabel("Password").fill("rep123");
    await page.getByRole("button", { name: "Enter staff portal" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "House operations" }),
    ).toBeVisible();
    await page.goto("/registration");
    await expect(
      page.getByRole("heading", { name: "Athlete registration" }),
    ).toBeVisible();
    await page.goto("/admin/meets");
    await expect(
      page.getByRole("heading", { name: "Sports meets" }),
    ).toHaveCount(0);
  });

  for (const account of [
    {
      email: "coordinator@gmail.com",
      password: "coordinator123",
      heading: "Competition coordination",
      route: "/admin/meets",
      pageHeading: "Sports meets",
    },
    {
      email: "registration@gmail.com",
      password: "register123",
      heading: "Student registration",
      route: "/admin/students",
      pageHeading: "Student register",
    },
    {
      email: "checkin@gmail.com",
      password: "check123",
      heading: "Event check-in",
      route: "/check-in",
      pageHeading: "Event check-in",
    },
    {
      email: "judge@gmail.com",
      password: "judge123",
      heading: "Event judging",
      route: "/result-entry",
      pageHeading: "Result entry",
    },
    {
      email: "verifier@gmail.com",
      password: "verify123",
      heading: "Result verification",
      route: "/admin/results",
      pageHeading: "Verification, approval and scoring",
    },
    {
      email: "committee@gmail.com",
      password: "commit123",
      heading: "Integrity review",
      route: "/protests",
      pageHeading: "Protests",
    },
  ]) {
    test(`${account.heading} dashboard opens its assigned task`, async ({
      page,
    }) => {
      await page.goto("/login");
      await page.getByLabel("Staff email").fill(account.email);
      await page.getByLabel("Password").fill(account.password);
      await page.getByRole("button", { name: "Enter staff portal" }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(
        page.getByRole("heading", { name: account.heading, level: 1 }),
      ).toBeVisible();
      await page.goto(account.route);
      await expect(
        page
          .getByRole("heading", { name: account.pageHeading, exact: false })
          .first(),
      ).toBeVisible();
      await expect(page.getByText("This page could not be loaded")).toHaveCount(
        0,
      );
    });
  }
});
