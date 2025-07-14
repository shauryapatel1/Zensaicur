import React, { ReactElement, useEffect } from 'react';
import { render, RenderOptions, waitFor, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';

/**
 * AuthReadyIndicator - A component that indicates when auth state is ready
 * This helps tests know when the async auth operations are complete
 */
const AuthReadyIndicator = () => {
  const { isLoading } = useAuth();
  
  return (
    <div data-testid="auth-ready-indicator" data-loading={isLoading}>
      {!isLoading && 'Auth Ready'}
    </div>
  );
};

/**
 * Custom render function that wraps components with necessary providers
 */
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AuthReadyIndicator />
          {children}
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

/**
 * Enhanced render function that waits for auth to be ready
 */
const renderWithAuth = async (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): Promise<ReturnType<typeof render>> => {
  const renderResult = render(ui, { wrapper: AllTheProviders, ...options });
  
  // Wait for auth to be ready
  await waitFor(() => {
    const indicator = screen.getByTestId('auth-ready-indicator');
    expect(indicator).toHaveAttribute('data-loading', 'false');
  });
  
  return renderResult;
};

/**
 * Standard render function for components that don't need auth
 */
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from testing-library
export * from '@testing-library/react';

// Export both render methods
export { customRender as render };
export { renderWithAuth };
export { AllTheProviders };