import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '../utils';
import ToastNotification from '../../components/ToastNotification';

describe('ToastNotification', () => {
  // Use fake timers for all tests in this file
  beforeEach(() => {
    vi.useFakeTimers();
  });

  // Clean up timers after each test
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders success toast correctly', () => {
    render(
      <ToastNotification
        isVisible={true}
        message="Operation successful!"
        type="success"
        onClose={vi.fn()}
      />
    );
    
    // Check that the message is displayed
    expect(screen.getByText('Operation successful!')).toBeInTheDocument();
    
    // Check that it has the success styling
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('from-zen-mint-400');
  });
  
  it('renders error toast correctly', () => {
    render(
      <ToastNotification
        isVisible={true}
        message="An error occurred"
        type="error"
        onClose={vi.fn()}
      />
    );
    
    // Check that the message is displayed
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
    
    // Check that it has the error styling
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('from-red-400');
  });
  
  it('renders badge toast correctly', () => {
    render(
      <ToastNotification
        isVisible={true}
        message="You earned a new badge!"
        type="badge"
        onClose={vi.fn()}
        badge={{
          icon: '🏆',
          name: 'Achievement Badge',
          rarity: 'rare'
        }}
      />
    );
    
    // Check that the message and badge info are displayed
    expect(screen.getByText('You earned a new badge!')).toBeInTheDocument();
    
    // Use within to find text inside the toast content
    const toastContent = screen.getByTestId('toast-content');
    expect(within(toastContent).getByText('🎉 Badge Earned!')).toBeInTheDocument();
    expect(screen.getByText('rare • Achievement Badge')).toBeInTheDocument();
  });
  
  it('closes automatically after duration', () => {
    const mockOnClose = vi.fn();
    
    render(
      <ToastNotification
        isVisible={true}
        message="This will close soon"
        type="info"
        onClose={mockOnClose}
        duration={2000}
      />
    );
    
    // Check that the toast is visible
    expect(screen.getByText('This will close soon')).toBeInTheDocument();
    
    // The onClose function should not have been called yet
    expect(mockOnClose).not.toHaveBeenCalled();
    
    // Fast-forward time by the duration of the toast
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    
    // Now, the onClose function should have been called
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
  
  it('closes when close button is clicked', () => {
    const mockOnClose = vi.fn();
    
    render(
      <ToastNotification
        isVisible={true}
        message="Click to close"
        type="success"
        onClose={mockOnClose}
      />
    );
    
    // Click the close button
    const closeButton = screen.getByRole('button', { name: /close notification/i });
    fireEvent.click(closeButton);
    
    // Check that onClose was called
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
  
  it('does not render when not visible', () => {
    const mockOnClose = vi.fn();
    
    render(
      <ToastNotification
        isVisible={false}
        message="You should not see this"
        type="success"
        onClose={mockOnClose}
      />
    );
    
    // Check that the toast is not rendered
    expect(screen.queryByText('You should not see this')).not.toBeInTheDocument();
  });
});