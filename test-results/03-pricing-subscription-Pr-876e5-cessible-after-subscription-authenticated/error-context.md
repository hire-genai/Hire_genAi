# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 03-pricing-subscription.spec.ts >> Pricing Page — Positive Scenarios >> 8. Feature gating — premium features accessible after subscription
- Location: tests\e2e\03-pricing-subscription.spec.ts:607:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://localhost:3000/jobs", waiting until "load"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - paragraph [ref=e4]: Loading...
  - region "Notifications (F8)":
    - list
```

# Test source

```ts
  544 |     await completeFiveStepSignup(page, "Starter");
  545 | 
  546 |     // After signup complete the app should either:
  547 |     //   (a) redirect to the Stripe checkout URL (external), or
  548 |     //   (b) redirect to /payment with session_id, or
  549 |     //   (c) redirect to /dashboard
  550 |     // We wait for any of these outcomes.
  551 |     await page.waitForFunction(
  552 |       () => {
  553 |         const url = window.location.href;
  554 |         return (
  555 |           url.includes("checkout.stripe.com") ||
  556 |           url.includes("/payment") ||
  557 |           url.includes("/dashboard") ||
  558 |           url.includes("session_id=")
  559 |         );
  560 |       },
  561 |       { timeout: 20_000 }
  562 |     ).catch(() => {
  563 |       // If the redirect was intercepted above (Stripe domain), the page may have
  564 |       // followed the 302 to the payment page — that is also acceptable.
  565 |     });
  566 | 
  567 |     const finalUrl = page.url();
  568 |     const navigatedToCheckoutOrSuccess =
  569 |       stripeRedirectDetected ||
  570 |       finalUrl.includes("checkout.stripe.com") ||
  571 |       finalUrl.includes("/payment") ||
  572 |       finalUrl.includes("/dashboard") ||
  573 |       finalUrl.includes("session_id=");
  574 | 
  575 |     expect(
  576 |       navigatedToCheckoutOrSuccess,
  577 |       `Expected redirect to Stripe checkout or payment/dashboard after signup. Got: ${finalUrl}`
  578 |     ).toBe(true);
  579 |   });
  580 | 
  581 |   test("7. Successful payment shows subscription active state on pricing page", async ({
  582 |     page,
  583 |   }) => {
  584 |     // Simulate an already-authenticated user with an active subscription
  585 |     await page.goto("/");
  586 |     await injectAuthSession(page);
  587 | 
  588 |     // Mock subscription status as active (Starter Monthly)
  589 |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_ACTIVE);
  590 | 
  591 |     // Open the pricing page in the app context (with company_id query param)
  592 |     await page.goto(
  593 |       `${PRICING_URL}?company_id=${encodeURIComponent(MOCK_SESSION.companyId)}`
  594 |     );
  595 | 
  596 |     // Wait for the pricing grid to load
  597 |     await expect(page.getByRole("heading", { name: "Starter", exact: true }).first()).toBeVisible({
  598 |       timeout: 15_000,
  599 |     });
  600 | 
  601 |     // The "Current Plan" badge should appear for the Starter card
  602 |     await expect(page.getByText("Current Plan", { exact: false }).first()).toBeVisible({
  603 |       timeout: 10_000,
  604 |     });
  605 |   });
  606 | 
  607 |   test("8. Feature gating — premium features accessible after subscription", async ({
  608 |     page,
  609 |   }) => {
  610 |     // Inject a full authenticated session (simulates post-subscription state)
  611 |     await page.goto("/");
  612 |     await injectAuthSession(page);
  613 | 
  614 |     // Mock relevant API endpoints for the dashboard
  615 |     await page.route("**/api/auth/me", async (route) => {
  616 |       await route.fulfill({
  617 |         status: 200,
  618 |         contentType: "application/json",
  619 |         body: JSON.stringify({
  620 |           ok: true,
  621 |           user: {
  622 |             id: MOCK_SESSION.userId,
  623 |             email: MOCK_SESSION.email,
  624 |             name: MOCK_SESSION.fullName,
  625 |             role: MOCK_SESSION.role,
  626 |           },
  627 |           company: {
  628 |             id: MOCK_SESSION.companyId,
  629 |             name: MOCK_SESSION.companyName,
  630 |           },
  631 |         }),
  632 |       });
  633 |     });
  634 | 
  635 |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_ACTIVE);
  636 | 
  637 |     // Navigate to the dashboard (a protected route)
  638 |     await page.goto("/dashboard");
  639 | 
  640 |     // Should not be redirected to /login — session is recognised
  641 |     await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
  642 | 
  643 |     // Navigate to /jobs (a premium feature route)
> 644 |     await page.goto("/jobs");
      |                ^ Error: page.goto: Test timeout of 30000ms exceeded.
  645 |     await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
  646 | 
  647 |     // The page should render something (not a blank screen or 404).
  648 |     // Allow a brief moment for the page to hydrate past the initial loading state.
  649 |     await page.waitForTimeout(500);
  650 |     const bodyText = await page.locator("body").innerText().catch(() => "");
  651 |     expect(bodyText.length, "Expected /jobs page to render content after subscription").toBeGreaterThan(5);
  652 |   });
  653 | });
  654 | 
  655 | // ---------------------------------------------------------------------------
  656 | // NEGATIVE scenarios
  657 | // ---------------------------------------------------------------------------
  658 | 
  659 | test.describe("Pricing — Subscription Purchase Negative Scenarios", () => {
  660 |   test("1. Stripe payment failure shows error message on pricing page", async ({ page }) => {
  661 |     // Simulate an authenticated user in the app context
  662 |     await page.goto("/");
  663 |     await injectAuthSession(page);
  664 | 
  665 |     // Mock stripe create to return a payment failure
  666 |     await mockStripeCheckoutCreate(page, {
  667 |       ok: false,
  668 |       error: "Your card was declined. Please use a different payment method.",
  669 |       code: "card_declined",
  670 |     } as unknown as typeof MOCK_STRIPE_CREATE_SUCCESS);
  671 |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
  672 | 
  673 |     await page.goto(
  674 |       `${PRICING_URL}?company_id=${encodeURIComponent(MOCK_SESSION.companyId)}`
  675 |     );
  676 | 
  677 |     await page.getByRole("button", { name: /^Monthly$/i }).click();
  678 |     await expect(page.getByRole("heading", { name: "Starter", exact: true }).first()).toBeVisible({
  679 |       timeout: 15_000,
  680 |     });
  681 | 
  682 |     // Click Choose Starter — this triggers the checkout create API call
  683 |     await page.getByRole("button", { name: "Choose Starter", exact: true }).first().click();
  684 | 
  685 |     // Error banner should appear on the pricing page
  686 |     await expect(
  687 |       page
  688 |         .getByText(/card was declined/i)
  689 |         .or(page.getByText(/payment.*failed/i))
  690 |         .or(page.getByText(/failed to start checkout/i))
  691 |         .or(page.locator(".bg-red-50, [role='alert']"))
  692 |         .first()
  693 |     ).toBeVisible({ timeout: 10_000 });
  694 | 
  695 |     // User must remain on the pricing page
  696 |     await expect(page).toHaveURL(/\/pricing/, { timeout: 5_000 });
  697 |   });
  698 | 
  699 |   test("2. Card declined scenario shows friendly error", async ({ page }) => {
  700 |     await page.goto("/");
  701 |     await injectAuthSession(page);
  702 | 
  703 |     // Mock with insufficient funds error
  704 |     await mockStripeCheckoutCreate(page, {
  705 |       ok: false,
  706 |       error: "Your card has insufficient funds. Please use a different payment method.",
  707 |       code: "insufficient_funds",
  708 |     } as unknown as typeof MOCK_STRIPE_CREATE_SUCCESS);
  709 |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
  710 | 
  711 |     await page.goto(
  712 |       `${PRICING_URL}?company_id=${encodeURIComponent(MOCK_SESSION.companyId)}`
  713 |     );
  714 | 
  715 |     await page.getByRole("button", { name: /^Monthly$/i }).click();
  716 |     await expect(
  717 |       page.getByRole("heading", { name: "Professional", exact: true }).first()
  718 |     ).toBeVisible({ timeout: 15_000 });
  719 | 
  720 |     // Attempt Professional plan checkout
  721 |     await page.getByRole("button", { name: "Choose Professional", exact: true }).first().click();
  722 | 
  723 |     // Error message referencing insufficient funds or a generic friendly message
  724 |     await expect(
  725 |       page
  726 |         .getByText(/insufficient funds/i)
  727 |         .or(page.getByText(/different payment method/i))
  728 |         .or(page.getByText(/card.*declined/i))
  729 |         .or(page.locator(".bg-red-50").filter({ hasText: /error/i }))
  730 |         .first()
  731 |     ).toBeVisible({ timeout: 10_000 });
  732 | 
  733 |     // Must still be on pricing page — no redirect to Stripe
  734 |     await expect(page).toHaveURL(/\/pricing/, { timeout: 5_000 });
  735 |   });
  736 | 
  737 |   test("3. Stripe checkout creation timeout / network error shows error state", async ({
  738 |     page,
  739 |   }) => {
  740 |     await page.goto("/");
  741 |     await injectAuthSession(page);
  742 | 
  743 |     // Simulate network timeout by aborting the request
  744 |     await page.route("**/api/subscriptions/stripe/create", async (route) => {
```