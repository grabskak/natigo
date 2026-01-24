import { test, expect } from "@playwright/test";
import { HomePage } from "./pages/home.page";

test.describe("Home Page", () => {
  test("should display the home page correctly", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    // Verify page loaded
    await expect(page).toHaveTitle(/natigo/i);
    
    // Verify main heading is visible
    await expect(homePage.heading).toBeVisible();
  });

  test("should navigate to login page", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await homePage.goToLogin();

    // Verify navigation to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test("should navigate to register page", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await homePage.goToRegister();

    // Verify navigation to register page
    await expect(page).toHaveURL(/\/register/);
  });
});
