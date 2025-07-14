import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import OpenAI from "npm:openai@4.28.0";

interface RequestBody {
  user_id?: string;
  mood?: string;
  name?: string;
  previousPrompts?: string[];
}

interface ResponseBody {
  success: boolean;
  prompt: string;
  generated_by: 'ai' | 'fallback';
  error?: string;
  timestamp: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

// Fallback prompts by mood
const moodBasedPrompts: Record<string, string[]> = {
  'struggling': [
    "What's one small thing that could bring you a moment of comfort today?",
    "If you could send a message of kindness to yourself right now, what would it say?",
    "What's one person or memory that makes you feel less alone?",
    "How can you be gentle with yourself today?",
    "What's one tiny step you could take toward feeling better?"
  ],
  'low': [
    "What's something you're grateful for, even in this difficult moment?",
    "What would you tell a friend who was feeling the way you do right now?",
    "What's one small step you could take today to care for yourself?",
    "How have you shown strength in challenging times before?",
    "What's one thing that usually helps lift your mood?"
  ],
  'neutral': [
    "What's one thing you're curious about today?",
    "How are you feeling right now, and what might be contributing to that feeling?",
    "What's something you learned about yourself recently?",
    "What would make today feel meaningful to you?",
    "What's one small thing you're looking forward to?"
  ],
  'good': [
    "What's bringing you joy today, and how can you savor that feeling?",
    "How did you contribute to your own happiness today?",
    "What's something you're excited about in the near future?",
    "How can you share your positive energy with others today?",
    "What's one good habit that's serving you well lately?"
  ],
  'amazing': [
    "What's making this such a wonderful day for you?",
    "How can you remember and recreate this feeling of joy?",
    "What would you like to celebrate about yourself today?",
    "How has your happiness impacted those around you?",
    "What's one way you can channel this positive energy into something meaningful?"
  ]
};

const generalPrompts = [
  "What are three things you're grateful for today, and why do they matter to you?",
  "How did you show kindness to yourself or others today?",
  "What's one small accomplishment from today that you're proud of?",
  "If you could give your past self one piece of advice, what would it be?",
  "What's something you're looking forward to, and what excites you about it?",
  "Describe a moment today when you felt most like yourself.",
  "What's one thing you learned about yourself recently that surprised you?",
  "How are you feeling right now, and what might be contributing to that feeling?",
  "What would you like to let go of today to make space for something better?",
  "What's one small moment from today that brought you joy or made you smile?"
];

// Generate a journal prompt using fallback method
function generateFallbackPrompt(mood?: string, name?: string, previousPrompts: string[] = []): string {
  // Get mood-specific prompts or use general ones
  const moodKey = mood?.toLowerCase() || '';
  const availablePrompts = moodBasedPrompts[moodKey] 
    ? [...moodBasedPrompts[moodKey], ...generalPrompts]
    : generalPrompts;

  // Filter out previously used prompts
  const filteredPrompts = availablePrompts.filter(prompt => 
    !previousPrompts.some(prev => prev.includes(prompt.substring(0, 20)))
  );

  // Use filtered prompts or fall back to all prompts if none available
  const promptsToUse = filteredPrompts.length > 0 ? filteredPrompts : availablePrompts;

  // Select a random prompt
  const randomIndex = Math.floor(Math.random() * promptsToUse.length);
  let prompt = promptsToUse[randomIndex];
  
  // Personalize with name if provided
  if (name && Math.random() > 0.7) { // 30% chance to include name
    if (prompt.includes('?')) {
      // Insert name before the question
      const parts = prompt.split('?');
      prompt = `${name}, ${parts[0].toLowerCase()}?${parts.slice(1).join('?')}`;
    } else {
      // Add name at the beginning
      prompt = `${name}, ${prompt.charAt(0).toLowerCase()}${prompt.slice(1)}`;
    }
  }
  
  return prompt;
}

// Generate a journal prompt using OpenAI
async function generateAIPrompt(mood?: string, name?: string, previousPrompts: string[] = [], user_id?: string): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  const OPENAI_MODEL = "gpt-3.5-turbo";
  
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not found");
  }
  
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
  });
  
  // Construct system message
  const systemMessage = `You are a thoughtful journaling assistant that creates personalized, reflective prompts to help users with their mental wellness journey. 
  Your prompts should be:
  1. Thought-provoking but gentle
  2. Specific enough to inspire reflection
  3. Open-ended to encourage exploration
  4. Tailored to the user's current mood
  5. Varied in topic and approach
  6. Between 15-30 words in length
  7. Phrased as a question or invitation to reflect`;
  
  // Construct user message
  let userMessage = "Please create a thoughtful journaling prompt";
  
  if (user_id) {
    userMessage += ` for user ${user_id}`;
  }
  
  if (mood) {
    userMessage += ` for someone who is feeling ${mood}`;
  }
  
  if (name) {
    userMessage += `. Their name is ${name}`;
  }
  
  if (previousPrompts && previousPrompts.length > 0) {
    userMessage += `. Please avoid topics similar to these recent prompts: "${previousPrompts.join('", "')}"`;
  }
  
  // Call OpenAI API
  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage }
    ],
    temperature: 0.7,
    max_tokens: 100
  });
  
  // Extract and return the prompt
  const prompt = response.choices[0]?.message?.content?.trim();
  
  if (!prompt) {
    throw new Error("Failed to generate prompt from OpenAI");
  }
  
  return prompt;
}

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method.toUpperCase() === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  
  try {
    // Parse request body
    let body: RequestBody;
    
    try {
      body = await req.json() as RequestBody;
      console.log('Request body parsed successfully:', { 
        mood: body.mood ? 'provided' : 'not provided', 
        name: body.name ? 'provided' : 'not provided',
        previousPromptsCount: body.previousPrompts?.length || 0
      });
    } catch (e) {
      console.error(`Error parsing request body: ${e instanceof Error ? e.message : String(e)}`);
      
      return new Response(
        JSON.stringify({
          success: true,
          prompt: "What's on your mind today? How are you feeling?",
          generated_by: 'fallback',
          error: "Invalid request body",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const { mood, name, previousPrompts } = body;
    const user_id = body.user_id || null;
    
    // Log request details for debugging
    console.log("Generate prompt request:", { 
      mood, 
      name: name ? "provided" : "not provided", 
      previousPromptsCount: previousPrompts?.length || 0,
      user_id: user_id ? "provided" : "not provided",
      apiKey: Deno.env.get("OPENAI_API_KEY") ? "present" : "missing"
    });
    
    // Try to generate prompt with OpenAI
    try {
      const prompt = await generateAIPrompt(mood, name, previousPrompts, user_id);
      
      // Return response
      return new Response(
        JSON.stringify({
          success: true,
          prompt,
          generated_by: 'ai',
          timestamp: new Date().toISOString(),
        } as ResponseBody),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (aiError) {
      console.warn('OpenAI prompt generation failed, using fallback:', aiError);
      
      // Fall back to predefined prompts
      const fallbackPrompt = generateFallbackPrompt(mood, name, previousPrompts);
      
      return new Response(
        JSON.stringify({
          success: true,
          prompt: fallbackPrompt,
          generated_by: 'fallback',
          error: aiError instanceof Error ? aiError.message : String(aiError),
          timestamp: new Date().toISOString(),
        } as ResponseBody),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    // Log detailed error information
    console.error('Error in generate-prompt function:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      timestamp: new Date().toISOString()
    });
    
    // Use a generic fallback prompt
    const fallbackPrompt = "What's on your mind today? How are you feeling?";
    
    return new Response(
      JSON.stringify({
        success: false,
        prompt: fallbackPrompt,
        generated_by: 'fallback',
        error: error instanceof Error ? error.message : "An error occurred during prompt generation",
        timestamp: new Date().toISOString(),
      } as ResponseBody),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});