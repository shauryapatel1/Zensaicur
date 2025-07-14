// Gemini API integration utility
// Replace API_KEY and endpoint as needed

export interface GeminiMessage {
  role: 'user' | 'zeno';
  text: string;
}

export async function getGeminiResponse(history: GeminiMessage[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || '<YOUR_GEMINI_API_KEY>';
  const endpoint = 'https://api.gemini.com/v1/chat'; // Placeholder endpoint

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ messages: history }),
  });

  if (!response.ok) {
    throw new Error('Failed to get response from Gemini API');
  }

  const data = await response.json();
  // Adjust this based on actual Gemini response shape
  return data.text || '';
} 