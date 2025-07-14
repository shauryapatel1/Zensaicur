import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act, within, waitFor } from '../utils';
import MoodSelector from '../../components/MoodSelector';
import { MoodLevel } from '../../types';
import { moods } from '../../data/moods';

describe('MoodSelector', () => {
  it('renders all mood options', async () => {
    act(() => {
      render(
        <MoodSelector
          onMoodSelect={vi.fn()}
        />
      );
    });
    
    // Check that all moods are rendered
    await waitFor(() => {
      moods.forEach(mood => {
        const moodElement = screen.getByText(mood.label);
        expect(moodElement).toBeInTheDocument();
        
        // Find the parent button that contains this mood
        const moodButton = moodElement.closest('button');
        expect(moodButton).not.toBeNull();
        
        // Check that the emoji is in the same button
        if (moodButton) {
          expect(within(moodButton).getByText(mood.emoji)).toBeInTheDocument();
        }
      });
    });
  });
  
  it('shows selected mood', async () => {
    const selectedMood: MoodLevel = 4; // Good
    
    act(() => {
      render(
        <MoodSelector
          selectedMood={selectedMood}
          onMoodSelect={vi.fn()}
        />
      );
    });
    
    // Check that the selected mood has the correct aria-checked state
    await waitFor(() => {
      const selectedMoodButton = screen.getByRole('radio', { checked: true });
      expect(selectedMoodButton).toHaveTextContent(moods.find(m => m.level === selectedMood)?.label || '');
    });
  });
  
  it('calls onMoodSelect when a mood is clicked', async () => {
    const mockOnMoodSelect = vi.fn();
    
    act(() => {
      render(
        <MoodSelector
          onMoodSelect={mockOnMoodSelect}
        />
      );
    });
    
    // Click on the "Good" mood
    await waitFor(() => {
      const goodMood = screen.getByText('Good');
      expect(goodMood).toBeInTheDocument();
    });
    
    const goodMood = screen.getByText('Good');
    fireEvent.click(goodMood);
    
    // Check that onMoodSelect was called with the correct mood level
    await waitFor(() => {
      expect(mockOnMoodSelect).toHaveBeenCalledWith(4);
    });
  });
  
  it('handles keyboard navigation', async () => {
    const mockOnMoodSelect = vi.fn();
    
    act(() => {
      render(
        <MoodSelector
          onMoodSelect={mockOnMoodSelect}
        />
      );
    });
    
    // Find all mood buttons
    let moodButtons: HTMLElement[] = [];
    await waitFor(() => {
      moodButtons = screen.getAllByRole('radio');
      expect(moodButtons.length).toBeGreaterThan(0);
    });
    
    // Press Enter key on the "Good" mood
    fireEvent.keyDown(moodButtons[3], { key: 'Enter' });
    
    await waitFor(() => {
      expect(mockOnMoodSelect).toHaveBeenCalledWith(4);
    });
    
    // Press Space key on the "Amazing" mood
    fireEvent.keyDown(moodButtons[4], { key: ' ' });
    
    await waitFor(() => {
      expect(mockOnMoodSelect).toHaveBeenCalledWith(5);
    });
  });
  
  it('respects disabled state', async () => {
    const mockOnMoodSelect = vi.fn();
    
    act(() => {
      render(
        <MoodSelector
          onMoodSelect={mockOnMoodSelect}
          disabled={true}
        />
      );
    });
    
    // Click on a mood
    await waitFor(() => {
      const goodMood = screen.getByText('Good');
      expect(goodMood).toBeInTheDocument();
    });
    
    const goodMood = screen.getByText('Good');
    fireEvent.click(goodMood);
    
    // onMoodSelect should not be called
    await waitFor(() => {
      expect(mockOnMoodSelect).not.toHaveBeenCalled();
    });
  });
  
  it('renders with different sizes', async () => {
    let rerender;
    
    act(() => {
      const result = render(
        <MoodSelector
          onMoodSelect={vi.fn()}
          size="sm"
        />
      );
      rerender = result.rerender;
    });
    
    // Check small size
    await waitFor(() => {
      const moodButtons = screen.getAllByRole('radio');
      expect(moodButtons[0]).toHaveClass('p-2');
    });
    
    // Check medium size
    await act(async () => {
      rerender(
        <MoodSelector
          onMoodSelect={vi.fn()}
          size="md"
        />
      );
    });
    
    await waitFor(() => {
      const moodButtons = screen.getAllByRole('radio');
      expect(moodButtons[0]).toHaveClass('p-3');
    });
    
    // Check large size
    await act(async () => {
      rerender(
        <MoodSelector
          onMoodSelect={vi.fn()}
          size="lg"
        />
      );
    });
    
    await waitFor(() => {
      const moodButtons = screen.getAllByRole('radio');
      expect(moodButtons[0]).toHaveClass('p-4');
    });
  });
  
  it('renders with different layouts', async () => {
    let rerender;
    
    act(() => {
      const result = render(
        <MoodSelector
          onMoodSelect={vi.fn()}
          layout="horizontal"
        />
      );
      rerender = result.rerender;
    });
    
    // Check horizontal layout
    await waitFor(() => {
      const container = screen.getByRole('radiogroup');
      expect(container.firstChild).toHaveClass('flex');
    });
    
    // Check grid layout
    await act(async () => {
      rerender(
        <MoodSelector
          onMoodSelect={vi.fn()}
          layout="grid"
        />
      );
    });
    
    await waitFor(() => {
      const container = screen.getByRole('radiogroup');
      expect(container.firstChild).toHaveClass('grid');
    });
  });
});