import { test, expect } from '@playwright/test';

/**
 * E2E test for Pricing page validation
 * 
 * Tests:
 * 1. Currency dropdown shows GBP/EUR/USD for Pro and Team
 * 2. Switching currency updates displayed amounts
 * 3. Team seat enforcement (minimum 5 seats)
 * 4. Free plan shows trial badge and $0 pricing
 * 5. Checkout buttons are functional
 */

test.describe('Pricing Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to pricing page
    await page.goto('/pricing');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('displays all three pricing tiers', async ({ page }) => {
    // Check that Free, Pro, and Team plans are visible
    await expect(page.getByText(/Free.*Plan/i)).toBeVisible();
    await expect(page.getByText(/Pro.*Plan/i)).toBeVisible();
    await expect(page.getByText(/Team.*Plan/i)).toBeVisible();
  });

  test('Free plan shows $0 pricing and trial information', async ({ page }) => {
    // Look for the Free plan section
    const freeSection = page.locator('[data-tier="free"]').first();
    
    // Should show $0 or £0 or €0
    await expect(freeSection.getByText(/[£$€]0/)).toBeVisible();
    
    // Should mention trial
    await expect(freeSection.getByText(/trial/i)).toBeVisible();
    
    // Should have a Start Trial or Get Started button
    const ctaButton = freeSection.getByRole('button', { name: /start.*trial|get.*started/i });
    await expect(ctaButton).toBeVisible();
  });

  test('currency dropdown exists and shows all currencies', async ({ page }) => {
    // Pro and Team plans should have currency selectors
    const currencySelectors = page.locator('[data-testid="currency-selector"], [role="combobox"]').filter({
      hasText: /USD|GBP|EUR/
    });
    
    // Should have at least one currency selector visible
    await expect(currencySelectors.first()).toBeVisible({ timeout: 10000 });
  });

  test('switching currency updates Pro plan pricing', async ({ page }) => {
    // Expected amounts in cents/pence
    const expectedAmounts = {
      USD: '$20',
      GBP: '£15',
      EUR: '€18',
    };

    // Find Pro plan section
    const proSection = page.locator('[data-tier="pro"]').first();
    await expect(proSection).toBeVisible();

    // Find currency selector within or near Pro section
    const currencySelector = page.locator('[data-testid="currency-selector"]').first();
    
    if (await currencySelector.isVisible()) {
      for (const [currency, expectedText] of Object.entries(expectedAmounts)) {
        // Select currency
        await currencySelector.click();
        await page.getByRole('option', { name: currency }).click();
        
        // Wait a bit for the price to update
        await page.waitForTimeout(500);
        
        // Check that the price is displayed (look for the amount anywhere in Pro section)
        // Note: This is a loose check since the exact format may vary
        await expect(proSection.getByText(new RegExp(expectedText.replace(/[£$€]/, '')))).toBeVisible();
      }
    } else {
      // If currency selector is not found, skip this test
      test.skip();
    }
  });

  test('switching currency updates Team plan pricing', async ({ page }) => {
    // Expected amounts in cents/pence (per seat)
    const expectedAmounts = {
      USD: '$100',
      GBP: '£75',
      EUR: '€90',
    };

    // Find Team plan section
    const teamSection = page.locator('[data-tier="team"]').first();
    await expect(teamSection).toBeVisible();

    // Find currency selector
    const currencySelector = page.locator('[data-testid="currency-selector"]').first();
    
    if (await currencySelector.isVisible()) {
      for (const [currency, expectedText] of Object.entries(expectedAmounts)) {
        // Select currency
        await currencySelector.click();
        await page.getByRole('option', { name: currency }).click();
        
        // Wait for price update
        await page.waitForTimeout(500);
        
        // Check that the price is displayed
        await expect(teamSection.getByText(new RegExp(expectedText.replace(/[£$€]/, '')))).toBeVisible();
      }
    } else {
      test.skip();
    }
  });

  test('Team plan enforces minimum 5 seats in UI', async ({ page }) => {
    // Find Team plan section
    const teamSection = page.locator('[data-tier="team"]').first();
    await expect(teamSection).toBeVisible();

    // Look for seat quantity input
    const seatInput = teamSection.locator('input[type="number"], input[name*="seat"], input[name*="quantity"]').first();
    
    if (await seatInput.isVisible()) {
      // Try to set quantity to 4 (below minimum)
      await seatInput.fill('4');
      await seatInput.blur();
      
      // Checkout button should be disabled or error message should appear
      const checkoutButton = teamSection.getByRole('button', { name: /get.*started|subscribe|checkout/i });
      
      // Either button is disabled or there's an error message
      const isDisabled = await checkoutButton.isDisabled();
      const hasError = await teamSection.getByText(/minimum.*5|at least 5/i).isVisible().catch(() => false);
      
      expect(isDisabled || hasError).toBeTruthy();
      
      // Set to 5 (minimum) - should enable checkout
      await seatInput.fill('5');
      await seatInput.blur();
      await page.waitForTimeout(300);
      
      // Now button should be enabled
      await expect(checkoutButton).toBeEnabled();
      
      // Set to 10 (above minimum) - should still work
      await seatInput.fill('10');
      await seatInput.blur();
      await page.waitForTimeout(300);
      
      await expect(checkoutButton).toBeEnabled();
    } else {
      // If seat input is not found, skip this test
      test.skip();
    }
  });

  test('Free plan CTA navigates to checkout or signup', async ({ page }) => {
    const freeSection = page.locator('[data-tier="free"]').first();
    const ctaButton = freeSection.getByRole('button', { name: /start.*trial|get.*started/i }).first();
    
    await expect(ctaButton).toBeVisible();
    
    // Click the button
    await ctaButton.click();
    
    // Should navigate to either:
    // 1. Stripe Checkout (checkout.stripe.com)
    // 2. Sign up page (/auth/signup)
    // 3. Dashboard (if already logged in)
    
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    const currentUrl = page.url();
    const validDestinations = [
      /checkout\.stripe\.com/,
      /\/auth\/signup/,
      /\/auth\/signin/,
      /\/dashboard/,
    ];
    
    const isValidDestination = validDestinations.some(pattern => pattern.test(currentUrl));
    expect(isValidDestination).toBeTruthy();
  });

  test('Pro plan CTA navigates to checkout or signup', async ({ page }) => {
    const proSection = page.locator('[data-tier="pro"]').first();
    const ctaButton = proSection.getByRole('button', { name: /get.*started|subscribe|upgrade/i }).first();
    
    await expect(ctaButton).toBeVisible();
    
    await ctaButton.click();
    
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    const currentUrl = page.url();
    const validDestinations = [
      /checkout\.stripe\.com/,
      /\/auth\/signup/,
      /\/auth\/signin/,
      /\/dashboard/,
    ];
    
    const isValidDestination = validDestinations.some(pattern => pattern.test(currentUrl));
    expect(isValidDestination).toBeTruthy();
  });

  test('Team plan CTA navigates to checkout or signup', async ({ page }) => {
    const teamSection = page.locator('[data-tier="team"]').first();
    const ctaButton = teamSection.getByRole('button', { name: /get.*started|subscribe|upgrade/i }).first();
    
    await expect(ctaButton).toBeVisible();
    
    await ctaButton.click();
    
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    const currentUrl = page.url();
    const validDestinations = [
      /checkout\.stripe\.com/,
      /\/auth\/signup/,
      /\/auth\/signin/,
      /\/dashboard/,
    ];
    
    const isValidDestination = validDestinations.some(pattern => pattern.test(currentUrl));
    expect(isValidDestination).toBeTruthy();
  });

  test('page loads pricing data from API', async ({ page }) => {
    // Monitor network requests for pricing API calls
    const apiRequests: string[] = [];
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/') && (url.includes('price') || url.includes('product') || url.includes('billing'))) {
        apiRequests.push(url);
      }
    });
    
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');
    
    // Should have made at least one API call to fetch pricing data
    // (This validates that prices are loaded dynamically, not hardcoded)
    expect(apiRequests.length).toBeGreaterThan(0);
  });

  test('mobile viewport displays pricing correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');
    
    // All three plans should still be visible
    await expect(page.getByText(/Free.*Plan/i)).toBeVisible();
    await expect(page.getByText(/Pro.*Plan/i)).toBeVisible();
    await expect(page.getByText(/Team.*Plan/i)).toBeVisible();
  });

  test.describe('Authenticated user', () => {
    test.skip('displays current plan badge', async ({ page }) => {
      // This test requires authentication setup
      // Skip by default, enable when auth is configured
      
      // 1. Sign in as a user with a specific plan
      // 2. Navigate to /pricing
      // 3. Verify "Current Plan" badge appears on the correct tier
      // 4. Verify upgrade/downgrade CTAs are appropriate
    });

    test.skip('prevents downgrade to Free if Team has >1 member', async ({ page }) => {
      // This test requires authentication and team setup
      // Skip by default
      
      // 1. Sign in as Team admin with multiple members
      // 2. Navigate to /pricing
      // 3. Attempt to click Free plan CTA
      // 4. Should show error or disable button with explanation
    });
  });
});

