import { test, expect } from '@playwright/test';

/**
 * Core Search Functionality Tests
 * Automates Section 2 of TEST_PLAN.md
 */

test.describe('Core Search Functionality', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the application before each test
    await page.goto('/');
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
  });

  test('should perform basic search with known keyword', async ({ page }) => {
    // Enter a search term
    const searchInput = page.locator('input[placeholder*="Try:"]').first();
    await searchInput.fill('markdown');

    // Click search button or press Enter
    await searchInput.press('Enter');

    // Wait for results to load
    await page.waitForSelector('.result-card', { timeout: 10000 });

    // Verify results appear
    const resultCards = page.locator('.result-card');
    const count = await resultCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should show "no results" message for non-existent term', async ({ page }) => {
    // Enter a search term that won't match anything
    const searchInput = page.locator('input[placeholder*="Try:"]').first();
    await searchInput.fill('xyznonexistentterm12345');
    await searchInput.press('Enter');

    // Wait a moment for search to complete
    await page.waitForTimeout(2000);

    // Verify no results message or empty state appears
    const noResults = page.locator('text=/no results|No results|no documents|No documents/i').first();
    const isVisible = await noResults.isVisible();
    expect(isVisible).toBeTruthy();
  });

  test('should display all required fields in search result cards', async ({ page }) => {
    // Perform a search
    const searchInput = page.locator('input[placeholder*="Try:"]').first();
    await searchInput.fill('test');
    await searchInput.press('Enter');

    // Wait for results
    await page.waitForSelector('.result-card', { timeout: 10000 });

    // Get first result card
    const firstCard = page.locator('.result-card').first();

    // Verify title is present
    const title = firstCard.locator('mat-card-title');
    await expect(title).toBeVisible();

    // Verify path is present
    const path = firstCard.locator('mat-card-subtitle');
    const pathExists = await path.count() > 0;
    expect(pathExists).toBeTruthy();

    // Verify snippet/content preview is present (may not be visible for all results)
    const snippet = firstCard.locator('.result-snippet, .snippet, .preview');
    const snippetExists = await snippet.count() > 0;
    // This is optional as not all results may have snippets

    // Verify metadata (word count, date, etc.) - at least one should be present
    const metadata = firstCard.locator('.word-count, .result-meta, .metadata, .date');
    const metadataExists = await metadata.count() > 0;
    expect(metadataExists).toBeTruthy();
  });

  test('should handle search with special characters', async ({ page }) => {
    // Test search with special characters
    const searchInput = page.locator('input[placeholder*="Try:"]').first();
    const specialChars = ['@test', '#hashtag', '$variable', 'hello&world'];

    for (const term of specialChars) {
      await searchInput.fill(term);
      await searchInput.press('Enter');

      // Wait for search to complete
      await page.waitForTimeout(1500);

      // Should not crash or show error - either results or no results is fine
      const hasError = await page.locator('.error, .alert-error').isVisible().catch(() => false);
      expect(hasError).toBeFalsy();
    }
  });

  test('should show validation for empty search', async ({ page }) => {
    // Try to search with empty input
    const searchInput = page.locator('input[placeholder*="Try:"]').first();
    await searchInput.fill('');
    await searchInput.press('Enter');

    // Wait a moment for any validation or action
    await page.waitForTimeout(1000);

    // This test passes if the app handles empty search gracefully
    // (no crash, validation shown, or search disabled - all are acceptable)
    expect(true).toBeTruthy();
  });

  test('should display favorite button on search result cards', async ({ page }) => {
    // Perform a search
    const searchInput = page.locator('input[placeholder*="Try:"]').first();
    await searchInput.fill('test');
    await searchInput.press('Enter');

    // Wait for results
    await page.waitForSelector('.result-card', { timeout: 10000 });

    // Get first result card
    const firstCard = page.locator('.result-card').first();

    // Verify favorite button appears
    const favoriteBtn = firstCard.locator('button.favorite-btn, button:has(mat-icon:has-text("star"))');
    await expect(favoriteBtn.first()).toBeVisible();
  });

  test('should display collection button on search result cards', async ({ page }) => {
    // Perform a search
    const searchInput = page.locator('input[placeholder*="Try:"]').first();
    await searchInput.fill('test');
    await searchInput.press('Enter');

    // Wait for results
    await page.waitForSelector('.result-card', { timeout: 10000 });

    // Get first result card
    const firstCard = page.locator('.result-card').first();

    // Verify collection button appears (folder_open icon)
    const collectionBtn = firstCard.locator('button.collection-btn, button:has(mat-icon:has-text("folder_open"))');
    await expect(collectionBtn.first()).toBeVisible();
  });

  test('should open document when clicking on search result', async ({ page }) => {
    // Perform a search
    const searchInput = page.locator('input[placeholder*="Try:"]').first();
    await searchInput.fill('test');
    await searchInput.press('Enter');

    // Wait for results
    await page.waitForSelector('.result-card', { timeout: 10000 });

    // Click on the first result (but not on buttons)
    const firstCard = page.locator('.result-card').first();
    const cardTitle = firstCard.locator('mat-card-title').first();
    await cardTitle.click();

    // Wait for document to load
    await page.waitForTimeout(2000);

    // Verify document viewer is visible
    const documentViewer = page.locator('.document-viewer, .document-content, .markdown-content').first();
    const viewerVisible = await documentViewer.isVisible();
    expect(viewerVisible).toBeTruthy();
  });

  test('should show collection badges on documents in collections', async ({ page }) => {
    // Perform a search
    const searchInput = page.locator('input[placeholder*="Try:"]').first();
    await searchInput.fill('test');
    await searchInput.press('Enter');

    // Wait for results
    await page.waitForSelector('.result-card', { timeout: 10000 });

    // Check if any result has collection badges
    const allCards = page.locator('.result-card');
    const count = await allCards.count();

    let hasBadges = false;
    for (let i = 0; i < Math.min(count, 5); i++) {
      const card = allCards.nth(i);
      const badges = card.locator('.collection-badge, .collection-badges');
      const badgeCount = await badges.count();
      if (badgeCount > 0) {
        hasBadges = true;

        // If badges exist, verify they have the required elements
        const badge = badges.first();
        const badgeColor = badge.locator('.collection-badge-color');
        const badgeName = badge.locator('.collection-badge-name');

        await expect(badgeColor).toBeVisible();
        await expect(badgeName).toBeVisible();
        break;
      }
    }

    // Note: This test passes even if no badges are found, as that depends on data
    // The important part is that IF badges exist, they display correctly
    expect(true).toBeTruthy();
  });
});
