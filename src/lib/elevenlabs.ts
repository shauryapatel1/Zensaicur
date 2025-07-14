// ElevenLabs Speech-to-Text (STT) integration utility
// Replace API_KEY and endpoint as needed

export async function transcribeAudioWithElevenLabs(audioBlob: Blob): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY || '<YOUR_ELEVENLABS_API_KEY>';
  const endpoint = 'https://api.elevenlabs.io/v1/speech-to-text'; // Placeholder endpoint

  const formData = new FormData();
  formData.append('audio', audioBlob, 'audio.webm');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      // 'Content-Type' is set automatically by FormData
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to transcribe audio with ElevenLabs');
  }

  const data = await response.json();
  // Adjust this based on actual ElevenLabs response shape
  return data.text || '';
}

export async function synthesizeSpeechWithElevenLabs(text: string): Promise<Blob> {
  const apiKey = process.env.ELEVENLABS_API_KEY || '<YOUR_ELEVENLABS_API_KEY>';
  const endpoint = 'https://api.elevenlabs.io/v1/text-to-speech/<VOICE_ID>'; // Replace <VOICE_ID>

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_monolingual_v1', // or your preferred model
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8,
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to synthesize speech with ElevenLabs');
  }

  const audioBlob = await response.blob();
  return audioBlob;
} 