import { test, expect } from '@playwright/test';

test.describe('CSV Upload and Dataset Ingestion', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to customers dashboard
    await page.goto('http://localhost:3000/customers');
    // Open the CSV Ingestion modal
    await page.getByRole('button', { name: 'Ingest CSV Data' }).click();
    await expect(page.getByRole('heading', { name: 'Ingest CSV Dataset' })).toBeVisible();
  });

  test('Test 1: Paste CSV manually', async ({ page }) => {
    // Click "Insert Mock Template"
    await page.getByRole('button', { name: 'Insert Mock Template' }).click();
    
    // Textarea should have the template data
    const textarea = page.locator('textarea');
    await expect(textarea).not.toBeEmpty();

    // The upload button should be enabled
    const uploadButton = page.getByRole('button', { name: 'Upload dataset' });
    await expect(uploadButton).toBeEnabled();

    // NOTE: We do not actually click upload to avoid polluting the DB, 
    // or we can click it and intercept the API request to verify it works.
    await page.route('**/api/customers/upload', route => {
      route.fulfill({ status: 200, json: { message: "Success" } });
    });
    
    await uploadButton.click();
    await expect(page.getByText('CSV processed successfully!')).toBeVisible();
  });

  test('Test 2: Upload CSV file', async ({ page }) => {
    const validCsv = 'name,email\nJohn,john@example.com';
    const buffer = Buffer.from(validCsv);

    // Set files on the hidden input
    const fileChooserPromise = page.waitForEvent('filechooser');
    // We click the dropzone or hidden input triggers
    await page.getByRole('button', { name: 'Drag and drop CSV file here or click to select' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'valid.csv',
      mimeType: 'text/csv',
      buffer
    });

    // Expect preview dialog to appear
    await expect(page.getByRole('heading', { name: 'Import Preview' })).toBeVisible();
    await page.getByRole('button', { name: 'Use This CSV' }).click();

    // Expect textarea to be populated
    const textarea = page.locator('textarea');
    await expect(textarea).toHaveValue(validCsv);

    // Mock upload
    await page.route('**/api/customers/upload', route => {
      route.fulfill({ status: 200, json: { message: "Success" } });
    });
    await page.getByRole('button', { name: 'Upload dataset' }).click();
    await expect(page.getByText('CSV processed successfully!')).toBeVisible();
  });

  test('Test 3: Type data -> upload another file (Unsaved Data Dialog)', async ({ page }) => {
    // Manually type into textarea
    await page.locator('textarea').fill('some unsaved data');

    const validCsv = 'name,email\nJane,jane@example.com';
    const buffer = Buffer.from(validCsv);

    // Attempt to upload a file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Drag and drop CSV file here or click to select' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'valid2.csv',
      mimeType: 'text/csv',
      buffer
    });

    // Expect Unsaved Data warning
    await expect(page.getByRole('heading', { name: 'Unsaved CSV Data' })).toBeVisible();
    
    // Click Replace Data
    await page.getByRole('button', { name: 'Replace Data' }).click();

    // Expect Preview Dialog
    await expect(page.getByRole('heading', { name: 'Import Preview' })).toBeVisible();
    await page.getByRole('button', { name: 'Use This CSV' }).click();

    // Verify textarea is replaced
    await expect(page.locator('textarea')).toHaveValue(validCsv);
  });

  test('Test 4: Drop malformed CSV (Warning Banner)', async ({ page }) => {
    // A CSV with trailing quotes that breaks standard structure without closing
    const malformedCsv = 'name,email\n"John,john@example.com\nJane,jane@example.com';
    const buffer = Buffer.from(malformedCsv);

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Drag and drop CSV file here or click to select' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'malformed.csv',
      mimeType: 'text/csv',
      buffer
    });

    // Expect preview dialog to show warning banner
    await expect(page.getByRole('heading', { name: 'Import Preview' })).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('We detected formatting issues in this CSV');
  });

  test('Test 5: Close modal during parsing', async ({ page }) => {
    // For this, we'll need a large file to slow down parsing
    const rows = Array.from({ length: 100000 }).map((_, i) => `row${i},test@test.com`).join('\n');
    const buffer = Buffer.from(`name,email\n${rows}`);

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Drag and drop CSV file here or click to select' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'large.csv',
      mimeType: 'text/csv',
      buffer
    });

    // Wait for the reading indicator to appear
    await expect(page.getByText(/Reading CSV\.\.\./)).toBeVisible();

    // Click 'Cancel' or press Escape to close the modal before it finishes
    await page.getByRole('button', { name: 'Cancel' }).click();

    // The modal should close
    await expect(page.getByRole('heading', { name: 'Ingest CSV Dataset' })).toBeHidden();

    // Reopen modal to ensure state was reset
    await page.getByRole('button', { name: 'Ingest CSV Data' }).click();
    
    // The dropzone should show default state, not reading state
    await expect(page.getByText('Drag & drop CSV here')).toBeVisible();
    await expect(page.getByText(/Reading CSV\.\.\./)).toBeHidden();
  });

});
