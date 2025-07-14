expect(result.current.error).toBeNull();
  });
  
  it('should play audio from URL successfully', async () => {
    const { result } = renderHook(() => useVoiceSynthesis());
    
    let response;
    
    await act(async () => {
      response = await result.current.playAudioFromUrl('https://example.com/audio.mp3');
    });
    
    // Check result
    expect(response.success).toBe(true);
    
    // Check state
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.error).toBeNull();
  });
  
  it('should handle invalid audio URL', async () => {
    const { result } = renderHook(() => useVoiceSynthesis());
    
    let response;
    
    await act(async () => {
      response = await result.current.playAudioFromUrl(null);
    });
    
    // Check result
    expect(response.success).toBe(false);
    
    // Check error state
    expect(result.current.error).toContain('No URL provided');
    expect(result.current.isPlaying).toBe(false);
  });
});