/**
 * E2E tests for authentication flow
 */
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page
    await page.goto('/admin-login');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Login' }).click();
    
    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('should show validation error for invalid email format', async ({ page }) => {
    await page.getByLabel('Email').fill('invalid-email');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Login' }).click();
    
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
  });

  test('should handle login failure', async ({ page }) => {
    // Mock API response for failed login
    await page.route('**/api/v1/auth/admin-login', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Invalid credentials'
        })
      });
    });

    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Login' }).click();
    
    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });

  test('should handle successful login', async ({ page }) => {
    // Mock API response for successful login
    await page.route('**/api/v1/auth/admin-login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: '1',
              email: 'test@example.com',
              role: 'admin',
              name: 'Test Admin'
            },
            access_token: 'mock-token',
            refresh_token: 'mock-refresh-token'
          }
        })
      });
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

    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Login' }).click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/hod-dashboard');
    await expect(page.getByText('Welcome, Test Admin')).toBeVisible();
  });

  test('should handle network error', async ({ page }) => {
    // Mock network error
    await page.route('**/api/v1/auth/admin-login', async route => {
      await route.abort('failed');
    });

    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Login' }).click();
    
    await expect(page.getByText('Network error. Please try again.')).toBeVisible();
  });

  test('should show loading state during login', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/v1/auth/admin-login', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: { id: '1', email: 'test@example.com', role: 'admin' },
            access_token: 'mock-token',
            refresh_token: 'mock-refresh-token'
          }
        })
      });
    });

    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Login' }).click();
    
    // Should show loading state
    await expect(page.getByText('Logging in...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeDisabled();
  });

  test('should handle password reset flow', async ({ page }) => {
    await page.getByText('Forgot Password?').click();
    
    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send Reset Link' })).toBeVisible();
  });

  test('should handle password reset request', async ({ page }) => {
    // Mock API response for password reset
    await page.route('**/api/v1/auth/request-password-reset', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'If the email exists, a password reset link has been sent'
        })
      });
    });

    await page.getByText('Forgot Password?').click();
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByRole('button', { name: 'Send Reset Link' }).click();
    
    await expect(page.getByText('If the email exists, a password reset link has been sent')).toBeVisible();
  });
});

test.describe('Student Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/student-login');
  });

  test('should display student login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Student Login' })).toBeVisible();
    await expect(page.getByLabel('Registration Number')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  });

  test('should handle student login', async ({ page }) => {
    // Mock API response for student login
    await page.route('**/api/v1/auth/student-login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: '1',
              reg_number: 'REG001',
              name: 'Test Student',
              section: 'A',
              department: 'CSE'
            },
            access_token: 'mock-token',
            refresh_token: 'mock-refresh-token'
          }
        })
      });
    });

    await page.getByLabel('Registration Number').fill('REG001');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Login' }).click();
    
    // Should redirect to feedback form
    await expect(page).toHaveURL('/feedback');
    await expect(page.getByText('Welcome, Test Student')).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/hod-dashboard');
    
    // Should redirect to login page
    await expect(page).toHaveURL('/admin-login');
  });

  test('should allow access to protected route with valid token', async ({ page }) => {
    // Set auth token in localStorage
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

    await page.goto('/hod-dashboard');
    
    // Should allow access to dashboard
    await expect(page.getByText('HOD Dashboard')).toBeVisible();
  });
});
