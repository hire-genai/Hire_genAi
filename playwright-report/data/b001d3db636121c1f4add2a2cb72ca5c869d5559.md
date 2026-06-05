# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 03-pricing-subscription.spec.ts >> Pricing Page — Positive Scenarios >> 8. Feature gating — premium features accessible after subscription
- Location: tests\e2e\03-pricing-subscription.spec.ts:612:7

# Error details

```
Error: Expected /jobs page to render content after subscription

expect(received).toBeGreaterThan(expected)

Expected: > 10
Received:   10
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - paragraph [ref=e5]: Loading...
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e11] [cursor=pointer]:
    - img [ref=e12]
  - alert [ref=e15]
```

# Test source

```ts
  554 |     //   (c) redirect to /dashboard
  555 |     // We wait for any of these outcomes.
  556 |     await page.waitForFunction(
  557 |       () => {
  558 |         const url = window.location.href;
  559 |         return (
  560 |           url.includes("checkout.stripe.com") ||
  561 |           url.includes("/payment") ||
  562 |           url.includes("/dashboard") ||
  563 |           url.includes("session_id=")
  564 |         );
  565 |       },
  566 |       { timeout: 20_000 }
  567 |     ).catch(() => {
  568 |       // If the redirect was intercepted above (Stripe domain), the page may have
  569 |       // followed the 302 to the payment page — that is also acceptable.
  570 |     });
  571 | 
  572 |     const finalUrl = page.url();
  573 |     const navigatedToCheckoutOrSuccess =
  574 |       stripeRedirectDetected ||
  575 |       finalUrl.includes("checkout.stripe.com") ||
  576 |       finalUrl.includes("/payment") ||
  577 |       finalUrl.includes("/dashboard") ||
  578 |       finalUrl.includes("session_id=");
  579 | 
  580 |     expect(
  581 |       navigatedToCheckoutOrSuccess,
  582 |       `Expected redirect to Stripe checkout or payment/dashboard after signup. Got: ${finalUrl}`
  583 |     ).toBe(true);
  584 |   });
  585 | 
  586 |   test("7. Successful payment shows subscription active state on pricing page", async ({
  587 |     page,
  588 |   }) => {
  589 |     // Simulate an already-authenticated user with an active subscription
  590 |     await page.goto("/");
  591 |     await injectAuthSession(page);
  592 | 
  593 |     // Mock subscription status as active (Starter Monthly)
  594 |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_ACTIVE);
  595 | 
  596 |     // Open the pricing page in the app context (with company_id query param)
  597 |     await page.goto(
  598 |       `${PRICING_URL}?company_id=${encodeURIComponent(MOCK_SESSION.companyId)}`
  599 |     );
  600 | 
  601 |     // Wait for the pricing grid to load
  602 |     await expect(page.getByRole("heading", { name: "Starter", exact: true }).first()).toBeVisible({
  603 |       timeout: 15_000,
  604 |     });
  605 | 
  606 |     // The "Current Plan" badge should appear for the Starter card
  607 |     await expect(page.getByText("Current Plan", { exact: false }).first()).toBeVisible({
  608 |       timeout: 10_000,
  609 |     });
  610 |   });
  611 | 
  612 |   test("8. Feature gating — premium features accessible after subscription", async ({
  613 |     page,
  614 |   }) => {
  615 |     // Inject a full authenticated session (simulates post-subscription state)
  616 |     await page.goto("/");
  617 |     await injectAuthSession(page);
  618 | 
  619 |     // Mock relevant API endpoints for the dashboard
  620 |     await page.route("**/api/auth/me", async (route) => {
  621 |       await route.fulfill({
  622 |         status: 200,
  623 |         contentType: "application/json",
  624 |         body: JSON.stringify({
  625 |           ok: true,
  626 |           user: {
  627 |             id: MOCK_SESSION.userId,
  628 |             email: MOCK_SESSION.email,
  629 |             name: MOCK_SESSION.fullName,
  630 |             role: MOCK_SESSION.role,
  631 |           },
  632 |           company: {
  633 |             id: MOCK_SESSION.companyId,
  634 |             name: MOCK_SESSION.companyName,
  635 |           },
  636 |         }),
  637 |       });
  638 |     });
  639 | 
  640 |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_ACTIVE);
  641 | 
  642 |     // Navigate to the dashboard (a protected route)
  643 |     await page.goto("/dashboard");
  644 | 
  645 |     // Should not be redirected to /login — session is recognised
  646 |     await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
  647 | 
  648 |     // Navigate to /jobs (a premium feature route)
  649 |     await page.goto("/jobs");
  650 |     await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
  651 | 
  652 |     // The page should render something (not a blank screen or 404)
  653 |     const bodyText = await page.locator("body").innerText().catch(() => "");
> 654 |     expect(bodyText.length, "Expected /jobs page to render content after subscription").toBeGreaterThan(10);
      |                                                                                         ^ Error: Expected /jobs page to render content after subscription
  655 |   });
  656 | });
  657 | 
  658 | // ---------------------------------------------------------------------------
  659 | // NEGATIVE scenarios
  660 | // ---------------------------------------------------------------------------
  661 | 
  662 | test.describe("Pricing — Subscription Purchase Negative Scenarios", () => {
  663 |   test("1. Stripe payment failure shows error message on pricing page", async ({ page }) => {
  664 |     // Simulate an authenticated user in the app context
  665 |     await page.goto("/");
  666 |     await injectAuthSession(page);
  667 | 
  668 |     // Mock stripe create to return a payment failure
  669 |     await mockStripeCheckoutCreate(page, {
  670 |       ok: false,
  671 |       error: "Your card was declined. Please use a different payment method.",
  672 |       code: "card_declined",
  673 |     } as unknown as typeof MOCK_STRIPE_CREATE_SUCCESS);
  674 |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
  675 | 
  676 |     await page.goto(
  677 |       `${PRICING_URL}?company_id=${encodeURIComponent(MOCK_SESSION.companyId)}`
  678 |     );
  679 | 
  680 |     await page.getByRole("button", { name: /^Monthly$/i }).click();
  681 |     await expect(page.getByRole("heading", { name: "Starter", exact: true }).first()).toBeVisible({
  682 |       timeout: 15_000,
  683 |     });
  684 | 
  685 |     // Click Choose Starter — this triggers the checkout create API call
  686 |     await page.getByRole("button", { name: "Choose Starter", exact: true }).first().click();
  687 | 
  688 |     // Error banner should appear on the pricing page
  689 |     await expect(
  690 |       page
  691 |         .getByText(/card was declined/i)
  692 |         .or(page.getByText(/payment.*failed/i))
  693 |         .or(page.getByText(/failed to start checkout/i))
  694 |         .or(page.locator(".bg-red-50, [role='alert']"))
  695 |         .first()
  696 |     ).toBeVisible({ timeout: 10_000 });
  697 | 
  698 |     // User must remain on the pricing page
  699 |     await expect(page).toHaveURL(/\/pricing/, { timeout: 5_000 });
  700 |   });
  701 | 
  702 |   test("2. Card declined scenario shows friendly error", async ({ page }) => {
  703 |     await page.goto("/");
  704 |     await injectAuthSession(page);
  705 | 
  706 |     // Mock with insufficient funds error
  707 |     await mockStripeCheckoutCreate(page, {
  708 |       ok: false,
  709 |       error: "Your card has insufficient funds. Please use a different payment method.",
  710 |       code: "insufficient_funds",
  711 |     } as unknown as typeof MOCK_STRIPE_CREATE_SUCCESS);
  712 |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
  713 | 
  714 |     await page.goto(
  715 |       `${PRICING_URL}?company_id=${encodeURIComponent(MOCK_SESSION.companyId)}`
  716 |     );
  717 | 
  718 |     await page.getByRole("button", { name: /^Monthly$/i }).click();
  719 |     await expect(
  720 |       page.getByRole("heading", { name: "Professional", exact: true }).first()
  721 |     ).toBeVisible({ timeout: 15_000 });
  722 | 
  723 |     // Attempt Professional plan checkout
  724 |     await page.getByRole("button", { name: "Choose Professional", exact: true }).first().click();
  725 | 
  726 |     // Error message referencing insufficient funds or a generic friendly message
  727 |     await expect(
  728 |       page
  729 |         .getByText(/insufficient funds/i)
  730 |         .or(page.getByText(/different payment method/i))
  731 |         .or(page.getByText(/card.*declined/i))
  732 |         .or(page.locator(".bg-red-50").filter({ hasText: /error/i }))
  733 |         .first()
  734 |     ).toBeVisible({ timeout: 10_000 });
  735 | 
  736 |     // Must still be on pricing page — no redirect to Stripe
  737 |     await expect(page).toHaveURL(/\/pricing/, { timeout: 5_000 });
  738 |   });
  739 | 
  740 |   test("3. Stripe checkout creation timeout / network error shows error state", async ({
  741 |     page,
  742 |   }) => {
  743 |     await page.goto("/");
  744 |     await injectAuthSession(page);
  745 | 
  746 |     // Simulate network timeout by aborting the request
  747 |     await page.route("**/api/subscriptions/stripe/create", async (route) => {
  748 |       await route.abort("timedout");
  749 |     });
  750 |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
  751 | 
  752 |     await page.goto(
  753 |       `${PRICING_URL}?company_id=${encodeURIComponent(MOCK_SESSION.companyId)}`
  754 |     );
```