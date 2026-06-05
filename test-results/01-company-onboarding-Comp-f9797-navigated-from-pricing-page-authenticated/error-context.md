# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 01-company-onboarding.spec.ts >> Company Onboarding Flow >> Submitted payload validation >> should include planName and billing when navigated from pricing page
- Location: tests\e2e\01-company-onboarding.spec.ts:941:9

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "professional"
Received: undefined
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]:
          - generic [ref=e6]:
            - img [ref=e8]
            - generic [ref=e13]: HireGenAI
          - button "Collapse Sidebar" [ref=e15] [cursor=pointer]:
            - img
        - generic [ref=e16]:
          - generic [ref=e17]: JD
          - generic [ref=e18]:
            - heading "Jane Doe" [level=4] [ref=e19]
            - paragraph [ref=e20]: jane.doe@playwrighttest.com
            - paragraph [ref=e21]: Member
      - navigation [ref=e22]:
        - generic [ref=e23]:
          - heading "MAIN" [level=3] [ref=e24]
          - generic [ref=e25]:
            - link "Dashboard" [ref=e26] [cursor=pointer]:
              - /url: /dashboard
              - button "Dashboard" [ref=e27]:
                - img
                - generic [ref=e28]: Dashboard
            - link "Applications" [ref=e29] [cursor=pointer]:
              - /url: /candidate
              - button "Applications" [ref=e30]:
                - img
                - generic [ref=e31]: Applications
            - link "Job Postings" [ref=e32] [cursor=pointer]:
              - /url: /jobs
              - button "Job Postings" [ref=e33]:
                - img
                - generic [ref=e34]: Job Postings
            - link "Talent Pool" [ref=e35] [cursor=pointer]:
              - /url: /talent-pool
              - button "Talent Pool" [ref=e36]:
                - img
                - generic [ref=e37]: Talent Pool
        - generic [ref=e38]:
          - heading "MANAGEMENT" [level=3] [ref=e39]
          - generic [ref=e40]:
            - link "Delegation" [ref=e41] [cursor=pointer]:
              - /url: /delegation
              - button "Delegation" [ref=e42]:
                - img
                - generic [ref=e43]: Delegation
            - link "Support" [ref=e44] [cursor=pointer]:
              - /url: /support
              - button "Support" [ref=e45]:
                - img
                - generic [ref=e46]: Support
            - link "Settings" [ref=e47] [cursor=pointer]:
              - /url: /settings
              - button "Settings" [ref=e48]:
                - img
                - generic [ref=e49]: Settings
      - button "Logout" [ref=e51] [cursor=pointer]:
        - img
        - text: Logout
    - main [ref=e52]:
      - generic [ref=e55]:
        - generic [ref=e56]:
          - heading "Dashboard" [level=1] [ref=e57]
          - paragraph
        - button "Last 90 Days" [ref=e60] [cursor=pointer]:
          - img
          - text: Last 90 Days
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e208] [cursor=pointer]:
    - img [ref=e209]
  - alert [ref=e212]
```

# Test source

```ts
  861 | 
  862 |       // Step 1
  863 |       await signupPage.expectStep(1);
  864 |       await fillStep1(signupPage, VALID_SIGNUP);
  865 |       await signupPage.clickNext();
  866 | 
  867 |       // Step 2
  868 |       await signupPage.expectStep(2);
  869 |       await signupPage.fillStreet(VALID_SIGNUP.street);
  870 |       await signupPage.fillCity(VALID_SIGNUP.city);
  871 |       await signupPage.fillState(VALID_SIGNUP.state);
  872 |       await signupPage.fillPostalCode(VALID_SIGNUP.postalCode);
  873 |       await signupPage.selectCountry(VALID_SIGNUP.country);
  874 |       await signupPage.clickNext();
  875 | 
  876 |       // Step 3
  877 |       await signupPage.expectStep(3);
  878 |       await signupPage.fillLegalCompanyName(VALID_SIGNUP.legalCompanyName);
  879 |       await signupPage.clickNext();
  880 | 
  881 |       // Step 4
  882 |       await signupPage.expectStep(4);
  883 |       await signupPage.fillFirstName(VALID_SIGNUP.firstName);
  884 |       await signupPage.fillLastName(VALID_SIGNUP.lastName);
  885 |       await signupPage.completeOtpVerification(VALID_SIGNUP.email, FIXED_OTP);
  886 |       await signupPage.clickNext();
  887 | 
  888 |       // Step 5
  889 |       await signupPage.expectStep(5);
  890 |     });
  891 | 
  892 |     test("Previous button is disabled on Step 1", async ({ page }) => {
  893 |       await signupPage.goto();
  894 |       await signupPage.expectStep(1);
  895 |       await expect(signupPage.previousButton).toBeDisabled();
  896 |     });
  897 |   });
  898 | 
  899 |   // =========================================================================
  900 |   // FIELD PAYLOAD TESTS
  901 |   // =========================================================================
  902 | 
  903 |   test.describe("Submitted payload validation", () => {
  904 |     test("should include all required fields in /api/signup/complete request", async ({
  905 |       page,
  906 |     }) => {
  907 |       await mockOtpSend(page);
  908 |       await mockOtpVerify(page);
  909 | 
  910 |       let signupPayload: Record<string, unknown> = {};
  911 |       await page.route("**/api/signup/complete", async (route) => {
  912 |         try { signupPayload = route.request().postDataJSON() ?? {}; } catch { signupPayload = {} }
  913 |         await route.fulfill({
  914 |           status: 200,
  915 |           contentType: "application/json",
  916 |           body: JSON.stringify(SIGNUP_SUCCESS_RESPONSE),
  917 |         });
  918 |       });
  919 | 
  920 |       await signupPage.fullSignup(VALID_SIGNUP);
  921 | 
  922 |       // Assert all required fields are present in the submitted body
  923 |       expect(signupPayload.companyName).toBe(VALID_SIGNUP.companyName);
  924 |       expect(signupPayload.industry).toBe(VALID_SIGNUP.industry);
  925 |       expect(signupPayload.companySize).toBe(VALID_SIGNUP.companySize);
  926 |       expect(signupPayload.street).toBe(VALID_SIGNUP.street);
  927 |       expect(signupPayload.city).toBe(VALID_SIGNUP.city);
  928 |       expect(signupPayload.state).toBe(VALID_SIGNUP.state);
  929 |       expect(signupPayload.postalCode).toBe(VALID_SIGNUP.postalCode);
  930 |       // country is stored as ISO code (e.g. "US") in form state, but displayed
  931 |       // as "United States"; the select uses value=code so payload should be ISO
  932 |       expect(signupPayload.country).toBeTruthy();
  933 |       expect(signupPayload.legalCompanyName).toBe(VALID_SIGNUP.legalCompanyName);
  934 |       expect(signupPayload.firstName).toBe(VALID_SIGNUP.firstName);
  935 |       expect(signupPayload.lastName).toBe(VALID_SIGNUP.lastName);
  936 |       expect(signupPayload.email).toBe(VALID_SIGNUP.email);
  937 |       expect(signupPayload.agreeTos).toBe(true);
  938 |       expect(signupPayload.agreePrivacy).toBe(true);
  939 |     });
  940 | 
  941 |     test("should include planName and billing when navigated from pricing page", async ({
  942 |       page,
  943 |     }) => {
  944 |       await mockOtpSend(page);
  945 |       await mockOtpVerify(page);
  946 | 
  947 |       let signupPayload: Record<string, unknown> = {};
  948 |       await page.route("**/api/signup/complete", async (route) => {
  949 |         try { signupPayload = route.request().postDataJSON() ?? {}; } catch { signupPayload = {} }
  950 |         await route.fulfill({
  951 |           status: 200,
  952 |           contentType: "application/json",
  953 |           body: JSON.stringify(SIGNUP_SUCCESS_RESPONSE),
  954 |         });
  955 |       });
  956 | 
  957 |       // Navigate with ?plan=professional&billing=monthly
  958 |       await signupPage.goto({ plan: "professional", billing: "monthly" });
  959 |       await signupPage.fullSignup(VALID_SIGNUP);
  960 | 
> 961 |       expect(signupPayload.planName).toBe("professional");
      |                                      ^ Error: expect(received).toBe(expected) // Object.is equality
  962 |       expect(signupPayload.billing).toBe("monthly");
  963 |     });
  964 | 
  965 |     test("should omit planName and billing when navigated without plan", async ({
  966 |       page,
  967 |     }) => {
  968 |       await mockOtpSend(page);
  969 |       await mockOtpVerify(page);
  970 | 
  971 |       let signupPayload: Record<string, unknown> = {};
  972 |       await page.route("**/api/signup/complete", async (route) => {
  973 |         try { signupPayload = route.request().postDataJSON() ?? {}; } catch { signupPayload = {} }
  974 |         await route.fulfill({
  975 |           status: 200,
  976 |           contentType: "application/json",
  977 |           body: JSON.stringify(SIGNUP_SUCCESS_RESPONSE),
  978 |         });
  979 |       });
  980 | 
  981 |       await signupPage.goto();
  982 |       await signupPage.fullSignup(VALID_SIGNUP);
  983 | 
  984 |       // planName should be undefined or absent in the payload
  985 |       expect(signupPayload.planName).toBeUndefined();
  986 |       expect(signupPayload.billing).toBeUndefined();
  987 |     });
  988 |   });
  989 | });
  990 | 
```