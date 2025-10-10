/**
 * E2E tests for student management flow
 */
import { test, expect } from '@playwright/test';

test.describe('Student Management', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'mock-token');
    });

    // Mock API response for getting current user
    await page.route('**/api/v1/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: '1',
            email: 'test@example.com',
            role: 'admin',
            name: 'Test Admin'
          }
        })
      });
    });

    // Mock API response for getting students
    await page.route('**/api/v1/students/**', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              items: [
                {
                  id: '1',
                  name: 'John Doe',
                  reg_number: 'REG001',
                  section: 'A',
                  department: 'CSE',
                  batch_year: '2023',
                  email: 'john@example.com',
                  phone: '1234567890'
                },
                {
                  id: '2',
                  name: 'Jane Smith',
                  reg_number: 'REG002',
                  section: 'B',
                  department: 'ECE',
                  batch_year: '2023',
                  email: 'jane@example.com',
                  phone: '0987654321'
                }
              ],
              pagination: {
                page: 1,
                limit: 10,
                total: 2,
                pages: 1
              }
            }
          })
        });
      }
    });

    await page.goto('/hod-dashboard');
  });

  test('should display students list', async ({ page }) => {
    await page.getByText('Students').click();
    
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('Jane Smith')).toBeVisible();
    await expect(page.getByText('REG001')).toBeVisible();
    await expect(page.getByText('REG002')).toBeVisible();
  });

  test('should add new student', async ({ page }) => {
    // Mock API response for creating student
    await page.route('**/api/v1/students/', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: '3',
              name: 'New Student',
              reg_number: 'REG003',
              section: 'A',
              department: 'CSE',
              batch_year: '2023',
              email: 'new@example.com',
              phone: '1111111111'
            }
          })
        });
      }
    });

    await page.getByText('Students').click();
    await page.getByRole('button', { name: 'Add Student' }).click();
    
    await page.getByLabel('Name').fill('New Student');
    await page.getByLabel('Registration Number').fill('REG003');
    await page.getByLabel('Section').selectOption('A');
    await page.getByLabel('Department').selectOption('CSE');
    await page.getByLabel('Batch Year').fill('2023');
    await page.getByLabel('Email').fill('new@example.com');
    await page.getByLabel('Phone').fill('1111111111');
    
    await page.getByRole('button', { name: 'Create Student' }).click();
    
    await expect(page.getByText('Student created successfully')).toBeVisible();
    await expect(page.getByText('New Student')).toBeVisible();
  });

  test('should edit student', async ({ page }) => {
    // Mock API response for updating student
    await page.route('**/api/v1/students/1', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: '1',
              name: 'John Updated',
              reg_number: 'REG001',
              section: 'A',
              department: 'CSE',
              batch_year: '2023',
              email: 'john.updated@example.com',
              phone: '1234567890'
            }
          })
        });
      }
    });

    await page.getByText('Students').click();
    await page.getByRole('button', { name: 'Edit' }).first().click();
    
    await page.getByLabel('Name').fill('John Updated');
    await page.getByLabel('Email').fill('john.updated@example.com');
    
    await page.getByRole('button', { name: 'Update Student' }).click();
    
    await expect(page.getByText('Student updated successfully')).toBeVisible();
    await expect(page.getByText('John Updated')).toBeVisible();
  });

  test('should delete student', async ({ page }) => {
    // Mock API response for deleting student
    await page.route('**/api/v1/students/1', async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Student deleted successfully'
          })
        });
      }
    });

    await page.getByText('Students').click();
    await page.getByRole('button', { name: 'Delete' }).first().click();
    
    // Confirm deletion
    await page.getByRole('button', { name: 'Confirm Delete' }).click();
    
    await expect(page.getByText('Student deleted successfully')).toBeVisible();
  });

  test('should filter students by department', async ({ page }) => {
    await page.getByText('Students').click();
    
    await page.getByLabel('Department').selectOption('CSE');
    
    // Should only show CSE students
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('Jane Smith')).not.toBeVisible();
  });

  test('should search students', async ({ page }) => {
    await page.getByText('Students').click();
    
    await page.getByPlaceholder('Search students...').fill('John');
    
    // Should only show John Doe
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('Jane Smith')).not.toBeVisible();
  });

  test('should handle bulk operations', async ({ page }) => {
    // Mock API response for bulk operations
    await page.route('**/api/v1/students/bulk-delete', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            successful: 2,
            failed: 0,
            errors: []
          }
        })
      });
    });

    await page.getByText('Students').click();
    
    // Select multiple students
    await page.getByRole('checkbox').first().check();
    await page.getByRole('checkbox').nth(1).check();
    
    await page.getByRole('button', { name: 'Bulk Actions' }).click();
    await page.getByRole('button', { name: 'Delete Selected' }).click();
    
    // Confirm bulk deletion
    await page.getByRole('button', { name: 'Confirm Delete' }).click();
    
    await expect(page.getByText('2 students deleted successfully')).toBeVisible();
  });

  test('should handle pagination', async ({ page }) => {
    // Mock API response with more students
    await page.route('**/api/v1/students/**', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              items: Array.from({ length: 10 }, (_, i) => ({
                id: `${i + 1}`,
                name: `Student ${i + 1}`,
                reg_number: `REG${(i + 1).toString().padStart(3, '0')}`,
                section: i % 2 === 0 ? 'A' : 'B',
                department: 'CSE',
                batch_year: '2023'
              })),
              pagination: {
                page: 1,
                limit: 10,
                total: 25,
                pages: 3
              }
            }
          })
        });
      }
    });

    await page.getByText('Students').click();
    
    await expect(page.getByText('Page 1 of 3')).toBeVisible();
    await expect(page.getByText('25 total students')).toBeVisible();
    
    // Go to next page
    await page.getByRole('button', { name: 'Next' }).click();
    
    await expect(page.getByText('Page 2 of 3')).toBeVisible();
  });

  test('should handle validation errors', async ({ page }) => {
    // Mock API response for validation error
    await page.route('**/api/v1/students/', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Validation failed',
            errors: [
              'Registration number already exists',
              'Email is required'
            ]
          })
        });
      }
    });

    await page.getByText('Students').click();
    await page.getByRole('button', { name: 'Add Student' }).click();
    
    await page.getByLabel('Name').fill('Test Student');
    await page.getByLabel('Registration Number').fill('REG001'); // Duplicate
    await page.getByRole('button', { name: 'Create Student' }).click();
    
    await expect(page.getByText('Registration number already exists')).toBeVisible();
    await expect(page.getByText('Email is required')).toBeVisible();
  });

  test('should handle network errors', async ({ page }) => {
    // Mock network error
    await page.route('**/api/v1/students/**', async route => {
      await route.abort('failed');
    });

    await page.getByText('Students').click();
    
    await expect(page.getByText('Failed to load students')).toBeVisible();
    await expect(page.getByText('Please try again')).toBeVisible();
  });
});
