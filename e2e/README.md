# E2E Tests for Markdown Reader Application

This directory contains end-to-end (E2E) tests for the Markdown Reader application using Playwright.

## Overview

The E2E test suite automates the comprehensive test plan (TEST_PLAN.md) and covers:

- **Core Search Functionality** - Search operations, result display, validation
- **Collections Feature** - CRUD operations, document assignment, filtering, badges
- **Syntax Highlighting** - Code block rendering, theme verification (regression tests)

## Prerequisites

Before running the tests, ensure:

1. **Frontend is running** on http://localhost:4201
   ```bash
   cd frontend && npm start
   ```

2. **Backend API is running** on http://localhost:3001
   ```bash
   cd backend && npm start
   ```

3. **Playwright is installed**
   ```bash
   npm install
   ```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Headed Mode (see browser)
```bash
npm run test:headed
```

### Run Tests with UI Mode (interactive)
```bash
npm run test:ui
```

### Run Specific Test Suites

**Search Tests Only:**
```bash
npm run test:search
```

**Collections Tests Only:**
```bash
npm run test:collections
```

**Syntax Highlighting Tests Only:**
```bash
npm run test:highlighting
```

### Debug Tests
```bash
npm run test:debug
```

### View Test Report
```bash
npm run test:report
```

### Generate Tests (Codegen)
```bash
npm run test:codegen
```

## Test Structure

```
e2e/
├── tests/
│   ├── 01-search.spec.ts              # Core search functionality tests
│   ├── 02-collections.spec.ts         # Collections feature tests
│   └── 03-syntax-highlighting.spec.ts # Syntax highlighting regression tests
├── fixtures/                           # Test data and fixtures (optional)
└── README.md                           # This file
```

## Test Coverage

### 1. Core Search (01-search.spec.ts)
- Basic search with known keywords
- No results handling
- Search result card fields validation
- Special characters handling
- Empty search validation
- Favorite and collection buttons presence
- Document opening from search results
- Collection badges display

### 2. Collections (02-collections.spec.ts)
- Collections sidebar display
- Creating new collections
- Editing existing collections
- Deleting collections
- Assigning documents to collections
- Collection badges on document cards
- Filtering by collection
- Empty name validation
- Loading states
- API error verification
- Document count maintenance
- Selection persistence

### 3. Syntax Highlighting (03-syntax-highlighting.spec.ts)
- Code block highlighting verification
- Console error detection (regression)
- Inline code rendering
- Multi-language support
- Themed styling verification
- Layout preservation with code blocks
- Long code block handling

## Configuration

Test configuration is in `playwright.config.ts` at the project root:

- **Base URL:** http://localhost:4201
- **Timeout:** 30 seconds per test
- **Browser:** Chromium (Firefox and Safari commented out)
- **Screenshots:** On failure
- **Traces:** On first retry

## CI/CD Integration

To run tests in CI:

```bash
CI=true npm test
```

This will:
- Disable test.only enforcement
- Enable 2 retries for flaky tests
- Run tests sequentially (workers=1)

## Writing New Tests

1. Create a new spec file in `e2e/tests/`
2. Follow the naming convention: `##-feature-name.spec.ts`
3. Use descriptive test names
4. Include test.beforeEach for navigation
5. Add appropriate assertions

Example:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

## Troubleshooting

### Tests Fail with "Page not found"
- Ensure frontend is running on port 4201
- Ensure backend is running on port 3001

### Tests are Flaky
- Increase timeouts in specific tests
- Add more specific waits (waitForSelector)
- Use waitForLoadState('networkidle')

### Syntax Highlighting Tests Fail
- Check browser console for Prism/highlight.js errors
- Verify markdown documents contain code blocks
- Check that syntax highlighting CSS is loaded

## Next Steps

Future test additions:
- Favorites feature tests
- Recent documents tests
- Document upload tests
- Advanced filters tests
- Document viewing & rendering tests
- Annotations/highlights (if implemented)
