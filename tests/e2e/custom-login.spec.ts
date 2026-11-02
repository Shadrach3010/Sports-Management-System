import { expect, test } from "@playwright/test";

test.describe("custom staff login", () => {
  test.skip(
    process.env.E2E_DEMO_LOGIN !== "1",
    "Run only against the isolated demo database.",
  );

  test("administrator can sign in and access users", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Staff email").fill("admin@gmail.com");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Enter staff portal" }).click();
    await expect(page).toHaveURL(/\/workspace$/);
    await page.goto("/admin/users");
    await expect(
      page.getByRole("heading", { name: "Users and roles" }),
    ).toBeVisible();
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
    await expect(page).toHaveURL(/\/workspace$/);
    await page.goto("/admin/users");
    await expect(
      page.getByRole("heading", { name: "Users and roles" }),
    ).toHaveCount(0);
  });
});
