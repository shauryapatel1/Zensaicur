// Edge function to generate personalized affirmations using OpenAI
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import OpenAI from "npm:openai@4.28.0";

interface RequestBody {
  entry: string;
  mood: string;
  name?: string;
}

interface ResponseBody {
  success: boolean;
  affirmation: string;
  generated_by: string;
  error?: string;
  timestamp: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

// Fallback affirmations by mood
const fallbackAffirmations: Record<string, string[]> = {
  struggling: [
    "You are stronger than you know, and this difficult moment will pass. Your feelings are valid, and you deserve compassion.",
    "Even in your darkest moments, you carry a light within you that cannot be extinguished. You are worthy of love and support.",
    "It's okay to not be okay. Your struggles don't define you - your resilience does. Take it one breath at a time."
  ],
  low: [
    "It's okay to have challenging days. You're human, and you're doing the best you can. Tomorrow brings new possibilities.",
    "Your feelings are temporary visitors, not permanent residents. You have weathered storms before and you will again.",
    "Be gentle with yourself today. Small steps forward are still progress, and you are moving in the right direction."
  ],
  neutral: [
    "You are perfectly balanced in this moment. Trust in your journey and know that you are exactly where you need to be.",
    "In this neutral space, you have the power to choose your next step. Your potential is limitless.",
    "Sometimes the most profound growth happens in quiet moments like these. You are becoming who you're meant to be."
  ],
  good: [
    "Your positive energy lights up the world around you. Keep embracing the joy that flows through your life.",
    "You are a beacon of hope and happiness. Your good mood is a gift to yourself and everyone you encounter.",
    "Celebrate this beautiful feeling! You deserve all the happiness that comes your way."
  ],
  amazing: [
    "What a beautiful soul you are! Your happiness is a gift to yourself and everyone around you. Celebrate this wonderful moment!",
    "Your joy is contagious and your spirit is radiant. You are living proof that life is full of amazing possibilities.",
    "You are absolutely glowing with happiness! This energy you carry is a testament to your beautiful heart and positive spirit."
  ]
};

// Generate a fallback affirmation based on mood
function generateFallbackAffirmation(mood: string, name?: string): string {
  const moodCategory = mood.toLowerCase();
  const validMoods = ['struggling', 'low', 'neutral', 'good', 'amazing'];
  const safeMood = validMoods.includes(moodCategory) ? moodCategory : 'neutral';
  
  // Get affirmations for this mood
  const affirmations = fallbackAffirmations[safeMood];
  
  // Select a random affirmation
  const randomIndex = Math.floor(Math.random() * affirmations.length);
  let affirmation = affirmations[randomIndex];
  
  // Personalize with name if provided
  if (name) {
    // 50% chance to include name for more variety
    if (Math.random() > 0.5) {
      // Insert name at beginning of affirmation
      affirmation = `${name}, ${affirmation.charAt(0).toLowerCase()}${affirmation.slice(1)}`;
    }
  }
  
  return affirmation;
}

// Generate an affirmation using OpenAI
async function generateAffirmationWithAI(entry: string, mood: string, name?: string): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  // Use the specified model from environment or fall back to default
  const OPENAI_MODEL = "gpt-3.5-turbo"; 
  
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not found");
  }
  
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
  });
  
  // Construct system message
  const systemMessage = `You are an empathetic AI assistant that creates personalized affirmations to support mental wellness.
  
  Create a single, powerful affirmation that:
  1. Is tailored to the user's current mood (${mood})
  2. Relates to themes in their journal entry
  3. Is positive, supportive, and empowering
  4. Uses second-person perspective ("You are...")
  5. Is 1-3 sentences long
  6. Avoids clichés and generic platitudes
  7. Has a warm, compassionate tone
  
  IMPORTANT INSTRUCTIONS FOR USING THE USER'S NAME:
  - If the user's name is provided, use it naturally in the affirmation
  - NEVER use placeholders like [User] or [Name]
  - If including the name, place it at the beginning of a sentence (e.g., "John, you are...")
  - If no name is provided, simply create the affirmation without a name
  - Examples with name: "Sarah, your resilience shines through..." or "Remember, Michael, you have the strength..."
  - Examples without name: "You have the inner strength..." or "Your journey is uniquely yours..."`;
  
  // Construct user message
  let userMessage = `Journal entry: "${entry}"\n\nMood: ${mood}`;
  
  if (name && name.trim()) {
    userMessage += `\n\nName: ${name}`;
  }
  
  userMessage += "\n\nPlease create a personalized affirmation based on this journal entry and mood.";
  
  // Call OpenAI API
  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [ 
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage }
    ],
    temperature: 0.7,
    max_tokens: 150
  });
  
  // Extract and return the affirmation
  const affirmation = response.choices[0]?.message?.content?.trim();
  
  if (!affirmation) {
    throw new Error("Failed to generate affirmation from OpenAI");
  }
  
  return affirmation;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method.toUpperCase() === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  
  try {
    // Parse request body
    let body;
    try { 
      const requestText = await req.text();
      if (!requestText || requestText.trim() === "") {
        throw new Error("Empty request body");
      }
      body = JSON.parse(requestText) as RequestBody;
    } catch (e) {
      console.error("Error parsing request body:", e);
      return new Response(
        JSON.stringify({
          success: false,
          affirmation: "You are worthy of kindness and compassion, especially on challenging days.",
          generated_by: 'fallback',
          error: `Invalid JSON in request body: ${e instanceof Error ? e.message : String(e)}`,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const { entry, mood, name } = body;
    
    // Validate entry
    if (!entry || typeof entry !== 'string' || entry.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          affirmation: "You are worthy of kindness and compassion, especially on challenging days.",
          generated_by: 'fallback',
          error: "Journal entry text is required",
          timestamp: new Date().toISOString(),
        } as ResponseBody),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Validate mood
    if (!mood || typeof mood !== 'string') { 
      return new Response(
        JSON.stringify({
          success: false,
          affirmation: "You are exactly where you need to be on your journey.",
          generated_by: 'fallback',
          error: "Mood is required",
          timestamp: new Date().toISOString(),
        } as ResponseBody),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Try to generate affirmation with OpenAI
    console.log("Generating affirmation with OpenAI:", { 
      mood, 
      textLength: entry.length, 
      name: name ? "provided" : "not provided",
      apiKey: Deno.env.get("OPENAI_API_KEY") ? "present" : "missing"
    });
    
    try {
      // Trim the entry to avoid issues with very long texts
      const trimmedEntry = entry.length > 1000 ? entry.substring(0, 1000) + "..." : entry;
      
      const affirmation = await generateAffirmationWithAI(trimmedEntry, mood, name);
      
      // Return response with proper CORS headers
      return new Response(
        JSON.stringify({
          success: true,
          affirmation,
          generated_by: 'ai',
          timestamp: new Date().toISOString(),
        } as ResponseBody),
        {
          status: 200,
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json" 
          },
        }
      );
    } catch (aiError) {
      console.warn('OpenAI affirmation generation failed, using fallback:', aiError);
      
      // Fall back to predefined affirmations
      const fallbackAffirmation = generateFallbackAffirmation(mood, name);
      
      return new Response(
        JSON.stringify({
          success: true,
          affirmation: fallbackAffirmation, 
          generated_by: 'fallback',
          error: aiError instanceof Error ? aiError.message : String(aiError),
          timestamp: new Date().toISOString(),
        } as ResponseBody),
        {
          status: 200,
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json" 
          },
        }
      );
    }
  } catch (error) {
    // Log detailed error information
    console.error('Error in generate-affirmation function:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      timestamp: new Date().toISOString()
    });
    
    // Return a generic fallback affirmation
    return new Response(
      JSON.stringify({
        success: false,
        affirmation: "You are resilient and capable, even when things don't go as planned.", 
        generated_by: 'fallback',
        error: error instanceof Error ? error.message : "An error occurred during affirmation generation",
        timestamp: new Date().toISOString(),
      } as ResponseBody),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});