# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 03-pricing-subscription.spec.ts >> Pricing — Subscription Purchase Negative Scenarios >> 5. Stripe checkout returns failure status — error shown on return page
- Location: tests\e2e\03-pricing-subscription.spec.ts:830:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/payment.*failed/i).or(getByText(/not completed/i)).or(getByText(/try again/i)).or(getByText(/error/i)).first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByText(/payment.*failed/i).or(getByText(/not completed/i)).or(getByText(/try again/i)).or(getByText(/error/i)).first()

```

```yaml
- heading "404" [level=1]
- heading "This page could not be found." [level=2]
- region "Notifications (F8)":
  - list
- alert
```

# Test source

```ts
  770 |         .or(page.locator("[role='alert'], .bg-red-50"))
  771 |         .first()
  772 |     ).toBeVisible({ timeout: 15_000 });
  773 | 
  774 |     // User must remain on the pricing page (no empty redirect)
  775 |     await expect(page).toHaveURL(/\/pricing/, { timeout: 5_000 });
  776 |   });
  777 | 
  778 |   test("4. Cancel from Stripe returns user to pricing page", async ({ page }) => {
  779 |     await page.goto("/");
  780 |     await injectAuthSession(page);
  781 | 
  782 |     // Mock successful checkout creation
  783 |     const cancelReturnUrl =
  784 |       "http://localhost:3000/pricing?company_id=" +
  785 |       encodeURIComponent(MOCK_SESSION.companyId) +
  786 |       "&cancel=true";
  787 | 
  788 |     await page.route("**/api/subscriptions/stripe/create", async (route) => {
  789 |       await route.fulfill({
  790 |         status: 200,
  791 |         contentType: "application/json",
  792 |         body: JSON.stringify({
  793 |           ok: true,
  794 |           subscription: {
  795 |             checkoutUrl:
  796 |               // Simulate a Stripe checkout URL that would normally redirect;
  797 |               // we point it to our own cancel URL to simulate the cancel flow.
  798 |               cancelReturnUrl,
  799 |             sessionId: "cs_test_mock_cancel_123",
  800 |           },
  801 |         }),
  802 |       });
  803 |     });
  804 |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
  805 | 
  806 |     await page.goto(
  807 |       `${PRICING_URL}?company_id=${encodeURIComponent(MOCK_SESSION.companyId)}`
  808 |     );
  809 | 
  810 |     await page.getByRole("button", { name: /^Monthly$/i }).click();
  811 |     await expect(page.getByRole("heading", { name: "Starter", exact: true }).first()).toBeVisible({
  812 |       timeout: 15_000,
  813 |     });
  814 | 
  815 |     // Click Choose Starter — the mocked checkout URL points back to pricing
  816 |     await page.getByRole("button", { name: "Choose Starter", exact: true }).first().click();
  817 | 
  818 |     // Wait for navigation to the cancel return URL (pricing page)
  819 |     await page.waitForURL(/\/pricing/, { timeout: 15_000 });
  820 | 
  821 |     // Verify we are back on the pricing page
  822 |     await expect(page).toHaveURL(/\/pricing/, { timeout: 5_000 });
  823 | 
  824 |     // Pricing content should still be visible (page is usable after cancel)
  825 |     await expect(
  826 |       page.getByRole("heading", { name: "Starter", exact: true }).first()
  827 |     ).toBeVisible({ timeout: 10_000 });
  828 |   });
  829 | 
  830 |   test("5. Stripe checkout returns failure status — error shown on return page", async ({
  831 |     page,
  832 |   }) => {
  833 |     await page.goto("/");
  834 |     await injectAuthSession(page);
  835 | 
  836 |     // Mock the verify endpoint to return a failed status
  837 |     await mockStripeVerify(page, {
  838 |       ok: false,
  839 |       error: "Payment was not completed. Please try again.",
  840 |       status: "failed",
  841 |     });
  842 |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
  843 | 
  844 |     // Simulate landing on the payment return page with a failed session
  845 |     await page.goto(
  846 |       "http://localhost:3000/payment?session_id=cs_test_failed_session&status=failed"
  847 |     );
  848 | 
  849 |     // The return/payment page should show an error or redirect to pricing
  850 |     const currentUrl = page.url();
  851 |     const hasErrorOrPricing =
  852 |       currentUrl.includes("/payment") ||
  853 |       currentUrl.includes("/pricing") ||
  854 |       currentUrl.includes("/dashboard");
  855 | 
  856 |     expect(
  857 |       hasErrorOrPricing,
  858 |       `Expected to land on payment, pricing, or dashboard page. Got: ${currentUrl}`
  859 |     ).toBe(true);
  860 | 
  861 |     // If on payment page, an error message should be visible
  862 |     if (currentUrl.includes("/payment")) {
  863 |       await expect(
  864 |         page
  865 |           .getByText(/payment.*failed/i)
  866 |           .or(page.getByText(/not completed/i))
  867 |           .or(page.getByText(/try again/i))
  868 |           .or(page.getByText(/error/i))
  869 |           .first()
> 870 |       ).toBeVisible({ timeout: 10_000 });
      |         ^ Error: expect(locator).toBeVisible() failed
  871 |     }
  872 |   });
  873 | 
  874 |   test("6. Signup with plan fails — error displayed, user stays on signup", async ({
  875 |     page,
  876 |   }) => {
  877 |     await mockSignupOtp(page);
  878 | 
  879 |     // Mock signup complete to return a server error
  880 |     await page.route("**/api/signup/complete", async (route) => {
  881 |       await route.fulfill({
  882 |         status: 500,
  883 |         contentType: "application/json",
  884 |         body: JSON.stringify({
  885 |           ok: false,
  886 |           error: "An internal error occurred. Please try again.",
  887 |         }),
  888 |       });
  889 |     });
  890 | 
  891 |     await page.goto(`${SIGNUP_URL}?section=company&plan=Starter&billing=monthly`);
  892 |     await page.locator("#companyName").waitFor({ state: "visible", timeout: 15_000 });
  893 | 
  894 |     // Step 1
  895 |     await page.locator("#companyName").fill("Error Test Corp");
  896 |     await page.locator("#industry").click();
  897 |     await page.getByRole("option", { name: "Technology", exact: true }).click();
  898 |     await page.locator("#companySize").click();
  899 |     await page.getByRole("option", { name: "1-10 employees", exact: true }).click();
  900 |     await page.getByRole("button", { name: /^Next$/i }).click();
  901 |     await page.waitForURL(/section=contact/, { timeout: 10_000 });
  902 | 
  903 |     // Step 2
  904 |     await page.locator("#street").waitFor({ state: "visible" });
  905 |     await page.locator("#street").fill("456 Error Lane");
  906 |     await page.locator("#city").fill("Boston");
  907 |     await page.locator("#state").fill("MA");
  908 |     await page.locator("#postalCode").fill("02101");
  909 |     await page.locator("#country").click();
  910 |     await page.getByRole("option", { name: "United States", exact: true }).click();
  911 |     await page.getByRole("button", { name: /^Next$/i }).click();
  912 |     await page.waitForURL(/section=legal/, { timeout: 10_000 });
  913 | 
  914 |     // Step 3
  915 |     await page.locator("#legalCompanyName").waitFor({ state: "visible" });
  916 |     await page.locator("#legalCompanyName").fill("Error Test Corporation LLC");
  917 |     await page.getByRole("button", { name: /^Next$/i }).click();
  918 |     await page.waitForURL(/section=manager/, { timeout: 10_000 });
  919 | 
  920 |     // Step 4 — OTP
  921 |     await page.locator("#firstName").waitFor({ state: "visible" });
  922 |     await page.locator("#firstName").fill("Error");
  923 |     await page.locator("#lastName").fill("Tester");
  924 |     await page.locator("#email").fill(`error-${Date.now()}@testcorp.io`);
  925 |     await page.getByRole("button", { name: /Send Code/i }).click();
  926 |     const otpInput = page.locator(
  927 |       'input[placeholder="000000"], input[inputmode="numeric"][maxlength="6"]'
  928 |     );
  929 |     await otpInput.waitFor({ state: "visible", timeout: 10_000 });
  930 |     await otpInput.fill(OTP_CODE);
  931 |     await page.getByRole("button", { name: /^Verify$/i }).click();
  932 |     await page.getByText(/Email verified successfully/i).waitFor({ state: "visible", timeout: 10_000 });
  933 |     await page.getByRole("button", { name: /^Next$/i }).click();
  934 |     await page.waitForURL(/section=review/, { timeout: 10_000 });
  935 | 
  936 |     // Step 5 — Submit (will fail due to mocked 500 response)
  937 |     await page.locator("#tos").waitFor({ state: "visible" });
  938 |     if (!(await page.locator("#tos").isChecked())) await page.locator("#tos").click();
  939 |     if (!(await page.locator("#privacy").isChecked())) await page.locator("#privacy").click();
  940 |     await page.getByRole("button", { name: /Complete Registration/i }).click();
  941 | 
  942 |     // Error banner should appear — user stays on /signup
  943 |     await expect(
  944 |       page
  945 |         .locator(".bg-red-50, [data-testid='signup-error']")
  946 |         .or(page.getByText(/internal error/i))
  947 |         .or(page.getByText(/try again/i))
  948 |         .first()
  949 |     ).toBeVisible({ timeout: 15_000 });
  950 | 
  951 |     // Must still be on the signup page
  952 |     await expect(page).toHaveURL(/\/signup/, { timeout: 5_000 });
  953 |   });
  954 | });
  955 | 
  956 | // ---------------------------------------------------------------------------
  957 | // Billing toggle state tests
  958 | // ---------------------------------------------------------------------------
  959 | 
  960 | test.describe("Pricing — Billing Toggle State", () => {
  961 |   test("Annual billing toggle is active by default", async ({ page }) => {
  962 |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
  963 |     await page.goto(PRICING_URL);
  964 |     await expect(page.getByRole("heading", { name: "Starter", exact: true }).first()).toBeVisible({
  965 |       timeout: 15_000,
  966 |     });
  967 | 
  968 |     // Default is annual — "/ year" should be visible, not "/ month"
  969 |     await expect(page.getByText("/ year", { exact: false }).first()).toBeVisible({
  970 |       timeout: 5_000,
```