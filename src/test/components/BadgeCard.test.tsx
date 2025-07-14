import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act, within } from '../utils';
import BadgeCard from '../../components/BadgeCard';

// Create mock badges for testing
const mockBadges = [
  {
    id: 'badge-1',
    badge_name: 'First Steps',
    badge_description: 'Complete your very first journal entry',
    badge_icon: '🌱',
    badge_category: 'milestone',
    badge_rarity: 'common',
    earned: true,
    earned_at: '2023-01-02T10:00:00Z',
    progress_current: 1,
    progress_target: 1,
    progress_percentage: 100
  },
  {
    id: 'badge-2',
    badge_name: 'Daily Habit',
    badge_description: 'Maintain a 3-day journaling streak',
    badge_icon: '🔥',
    badge_category: 'streak',
    badge_rarity: 'common',
    earned: true,
    earned_at: '2023-06-15T10:00:00Z',
    progress_current: 3,
    progress_target: 3,
    progress_percentage: 100
  },
  {
    id: 'badge-3',
    badge_name: 'Week Warrior',
    badge_description: 'Maintain a 7-day journaling streak',
    badge_icon: '⚡',
    badge_category: 'streak',
    badge_rarity: 'rare',
    earned: false,
    earned_at: null,
    progress_current: 3,
    progress_target: 7,
    progress_percentage: 43
  }
];

describe('BadgeCard', () => {
  it('renders an earned badge correctly', () => {
    const mockOnClick = vi.fn();
    const earnedBadge = mockBadges[0]; // First Steps badge (earned)
    
    act(() => {
      render(
        <BadgeCard 
          badge={earnedBadge}
          onClick={mockOnClick}
        />
      );
    });
    
    // Check that badge name and icon are displayed
    expect(screen.getByText(earnedBadge.badge_name)).toBeInTheDocument();
    
    // Find the badge icon within the component
    const badgeElement = screen.getByRole('button');
    expect(within(badgeElement).getByText(earnedBadge.badge_icon)).toBeInTheDocument();
    
    // Check that earned status is indicated
    expect(screen.getByText('common')).toBeInTheDocument(); // Rarity
    
    // Check that clicking the badge calls the onClick handler
    fireEvent.click(screen.getByRole('button'));
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
  
  it('renders an unearned badge correctly', () => {
    const mockOnClick = vi.fn();
    const unearnedBadge = mockBadges[2]; // Week Warrior badge (not earned)
    
    act(() => {
      render(
        <BadgeCard 
          badge={unearnedBadge}
          onClick={mockOnClick}
        />
      );
    });
    
    // Check that badge name is displayed
    expect(screen.getByText(unearnedBadge.badge_name)).toBeInTheDocument();
    
    // Check that progress is displayed for unearned badges
    expect(screen.getByText(`${unearnedBadge.progress_current}/${unearnedBadge.progress_target}`)).toBeInTheDocument();
    
    // Check that clicking the badge calls the onClick handler
    fireEvent.click(screen.getByRole('button'));
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
  
  it('handles keyboard navigation correctly', () => {
    const mockOnClick = vi.fn();
    const badge = mockBadges[0];
    
    act(() => {
      render(
        <BadgeCard 
          badge={badge}
          onClick={mockOnClick}
        />
      );
    });
    
    const badgeElement = screen.getByRole('button');
    
    // Press Enter key
    fireEvent.keyDown(badgeElement, { key: 'Enter' });
    expect(mockOnClick).toHaveBeenCalledTimes(1);
    
    // Press Space key
    fireEvent.keyDown(badgeElement, { key: ' ' });
    expect(mockOnClick).toHaveBeenCalledTimes(2);
    
    // Other keys should not trigger onClick
    fireEvent.keyDown(badgeElement, { key: 'A' });
    expect(mockOnClick).toHaveBeenCalledTimes(2);
  });
  
  it('applies different styles based on badge rarity', () => {
    const commonBadge = { ...mockBadges[0], badge_rarity: 'common' };
    const rareBadge = { ...mockBadges[0], badge_rarity: 'rare' };
    const epicBadge = { ...mockBadges[0], badge_rarity: 'epic' };
    const legendaryBadge = { ...mockBadges[0], badge_rarity: 'legendary' };
    
    let rerender;
    
    act(() => {
      const result = render(<BadgeCard badge={commonBadge} onClick={() => {}} />);
      rerender = result.rerender;
    });
    
    expect(screen.getByText('common')).toBeInTheDocument();
    
    act(() => {
      rerender(<BadgeCard badge={rareBadge} onClick={() => {}} />);
    });
    expect(screen.getByText('rare')).toBeInTheDocument();
    
    act(() => {
      rerender(<BadgeCard badge={epicBadge} onClick={() => {}} />);
    });
    expect(screen.getByText('epic')).toBeInTheDocument();
    
    act(() => {
      rerender(<BadgeCard badge={legendaryBadge} onClick={() => {}} />);
    });
    expect(screen.getByText('legendary')).toBeInTheDocument();
  });
  
  it('renders with different sizes', () => {
    const badge = mockBadges[0];
    
    let rerender;
    
    act(() => {
      const result = render(<BadgeCard badge={badge} size="sm" onClick={() => {}} />);
      rerender = result.rerender;
    });
    
    let badgeElement = screen.getByRole('button');
    expect(badgeElement).toHaveClass('p-3');
    
    act(() => {
      rerender(<BadgeCard badge={badge} size="md" onClick={() => {}} />);
    });
    
    badgeElement = screen.getByRole('button');
    expect(badgeElement).toHaveClass('p-4');
    
    act(() => {
      rerender(<BadgeCard badge={badge} size="lg" onClick={() => {}} />);
    });
    
    badgeElement = screen.getByRole('button');
    expect(badgeElement).toHaveClass('p-6');
  });
});