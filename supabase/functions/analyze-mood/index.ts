// Edge function to analyze mood from journal text using OpenAI
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import OpenAI from "npm:openai@4.28.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey"
};

interface RequestBody {
  entry: string;
  name?: string;
}

interface ResponseBody {
  success: boolean;
  mood: string;
  confidence?: number;
  analysis?: string;
  error?: string;
  timestamp: string;
}

// Simple mood analysis function (fallback when AI service is unavailable)
function analyzeMoodFallback(text: string): { mood: string; confidence: number; analysis: string } {
  const text_lower = text.toLowerCase();
  
  // Define mood indicators
  const moodIndicators = {
    struggling: ["terrible", "awful", "horrible", "depressed", "miserable", "hopeless", "despair", "struggling", "overwhelmed", "anxious", "panic", "stressed"],
    low: ["sad", "down", "disappointed", "unhappy", "blue", "upset", "worried", "concerned", "tired", "exhausted", "frustrated"],
    neutral: ["okay", "fine", "alright", "neutral", "average", "normal", "so-so", "moderate", "balanced"],
    good: ["happy", "good", "pleased", "content", "satisfied", "positive", "optimistic", "hopeful", "cheerful", "upbeat", "glad"],
    amazing: ["amazing", "excellent", "fantastic", "wonderful", "great", "awesome", "ecstatic", "thrilled", "euphoric", "overjoyed", "incredible", "brilliant"]
  };
  
  // Count occurrences of mood indicators
  const moodCounts = {
    struggling: 0,
    low: 0,
    neutral: 0,
    good: 0,
    amazing: 0
  };
  
  // Count occurrences of each mood indicator
  for (const [mood, indicators] of Object.entries(moodIndicators)) {
    for (const indicator of indicators) {
      const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
      const matches = text_lower.match(regex);
      if (matches) {
        moodCounts[mood as keyof typeof moodCounts] += matches.length;
      }
    }
  }
  
  // Find the mood with the highest count
  let detectedMood = "neutral";
  let highestCount = 0;
  
  for (const [mood, count] of Object.entries(moodCounts)) {
    if (count > highestCount) {
      highestCount = count;
      detectedMood = mood;
    }
  }
  
  // Calculate confidence (simple version)
  const totalCounts = Object.values(moodCounts).reduce((sum, count) => sum + count, 0);
  const confidence = totalCounts > 0 ? (highestCount / totalCounts) * 100 : 50;
  
  // Generate a simple analysis
  const analysis = `Based on your journal entry, you seem to be feeling ${detectedMood}. I detected ${highestCount} indicators of this mood in your text.`;
  
  return {
    mood: detectedMood,
    confidence,
    analysis
  };
}

// Analyze mood using OpenAI
async function analyzeMoodWithAI(text: string, name?: string): Promise<{ mood: string; confidence: number; analysis: string }> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  const OPENAI_MODEL = "gpt-3.5-turbo";
  
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not found");
  }
  
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
  });
  
  // Construct system message
  const systemMessage = `You are an empathetic AI assistant that analyzes journal entries to determine the writer's emotional state.
  You should categorize the mood into exactly one of these categories: "struggling", "low", "neutral", "good", or "amazing".
  
  Respond with a JSON object containing:
  1. "mood": The mood category (must be one of the five options)
  2. "confidence": A number from 0-100 indicating your confidence in this assessment
  3. "analysis": A brief, compassionate 1-2 sentence explanation of why you assessed this mood
  
  Your analysis should be supportive and understanding, never judgmental.`;
  
  // Construct user message
  let userMessage = `Please analyze this journal entry to determine the writer's mood:\n\n"${text}"`;
  
  if (name) {
    userMessage += `\n\nThe writer's name is ${name}.`;
  }
  
  // Call OpenAI API
  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 150
  });
  
  // Extract and parse the response
  const content = response.choices[0]?.message?.content?.trim();
  
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }
  
  try {
    const result = JSON.parse(content);
    
    // Validate the response
    if (!result.mood || !["struggling", "low", "neutral", "good", "amazing"].includes(result.mood)) {
      throw new Error("Invalid mood category in response");
    }
    
    return {
      mood: result.mood,
      confidence: result.confidence || 70,
      analysis: result.analysis || `You seem to be feeling ${result.mood}.`
    };
  } catch (parseError) {
    console.error("Failed to parse OpenAI response:", parseError);
    throw new Error("Failed to parse mood analysis response");
  }
}

Deno.serve(async (req: Request) => {
  try {
    // Handle CORS preflight request (case-insensitive method check)
    if (req.method.toUpperCase() === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }
    
    // Only allow POST requests
    if (req.method.toUpperCase() !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Method not allowed",
          timestamp: new Date().toISOString(),
        } as ResponseBody),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Parse request body
    let body;
    try {
      body = await req.json() as RequestBody;
    } catch (e) {
      console.error("Error parsing request body:", e);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid request body",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const { entry, name } = body;
    
    if (!entry || typeof entry !== 'string' || entry.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Journal entry text is required",
          timestamp: new Date().toISOString(),
        } as ResponseBody),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Try to analyze mood with OpenAI
    console.log("Analyzing mood with OpenAI:", { 
      textLength: entry.length,
      name: name ? "provided" : "not provided", 
      apiKey: Deno.env.get("OPENAI_API_KEY") ? "present" : "missing"
    });
    
    try {
      const { mood, confidence, analysis } = await analyzeMoodWithAI(entry, name);
      
      // Return response with proper CORS headers
      return new Response(
        JSON.stringify({
          success: true,
          mood,
          confidence,
          analysis,
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
      console.warn('OpenAI mood analysis failed, using fallback:', aiError);
      
      // Fall back to simple analysis
      const { mood, confidence, analysis } = analyzeMoodFallback(entry);
      
      return new Response(
        JSON.stringify({
          success: true,
          mood,
          confidence,
          analysis,
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
    console.error('Error in analyze-mood function:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      timestamp: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An error occurred during mood analysis",
        timestamp: new Date().toISOString(),
      } as ResponseBody),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});