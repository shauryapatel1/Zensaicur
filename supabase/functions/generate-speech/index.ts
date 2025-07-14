// Edge function to generate speech from text using ElevenLabs
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.38.4";

// Define proper CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

interface RequestBody {
  text: string;
  voice_settings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
  save_to_storage?: boolean;
  user_id?: string;
}

interface ResponseBody {
  success: boolean;
  audio_url?: string;
  error?: string;
  timestamp: string;
}

// Generate speech using ElevenLabs API
async function generateSpeechWithElevenLabs(text: string, voiceSettings?: RequestBody['voice_settings']): Promise<ArrayBuffer> {
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
  // Use the specified voice ID from environment or fall back to default
  const ELEVENLABS_VOICE_ID = Deno.env.get("ELEVENLABS_VOICE_ID") || "MpZY6e8MW2zHVi4Vtxrn"; 
  
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ElevenLabs API key not found");
  }
  
  // Prepare request body
  const requestBody = {
    text,
    model_id: "eleven_monolingual_v1", // Use a more stable model
    voice_settings: {
      stability: voiceSettings?.stability || 0.5,
      similarity_boost: voiceSettings?.similarity_boost || 0.75,
      style: voiceSettings?.style || 0.0,
      use_speaker_boost: voiceSettings?.use_speaker_boost !== undefined ? voiceSettings.use_speaker_boost : true
    }
  };
  
  // Call ElevenLabs API
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify(requestBody)
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`ElevenLabs API error (${response.status}):`, errorText);
    throw new Error(`ElevenLabs API error (${response.status}): ${response.statusText}`);
  }
  
  // Get audio data
  return await response.arrayBuffer();
}

// Fallback function that returns a data URL with a short audio clip
function generateFallbackSpeech(): ArrayBuffer {
  // This is a base64-encoded empty MP3 file
  const base64Data = "SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTguMjkuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";
  
  // Decode base64 to binary string
  const binaryString = atob(base64Data);
  
  // Convert binary string to ArrayBuffer
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes.buffer;
}

// Save audio to Supabase Storage
async function saveAudioToStorage(audioData: ArrayBuffer, userId: string): Promise<string | null> {
  try {
    console.log('Attempting to save audio to storage for user:', userId);
    
    // Get Supabase credentials from environment variables
    
    // Get Supabase credentials from environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      throw new Error("Missing Supabase environment variables");
    }
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${userId}/${timestamp}_affirmation.mp3`;
    
    // Upload to Supabase Storage
    console.log(`Uploading audio file to path: ${fileName}`);
    const { data, error } = await supabase.storage
      .from('affirmation-audio')
      .upload(fileName, audioData, {
        contentType: 'audio/mpeg',
        cacheControl: '3600'
      });
    
    if (error) {
      console.error('Error uploading audio to storage:', error.message);
      throw error;
    }
    
    console.log('Audio successfully saved to storage at path:', fileName);
    // Return the path (not the full URL)
    return fileName;
  } catch (error) {
    console.error('Failed to save audio to storage:', error instanceof Error ? error.message : String(error));
    return null;
  }
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
    // Check if request has content and proper Content-Type
    const contentType = req.headers.get("Content-Type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error("Invalid Content-Type:", contentType);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Content-Type must be application/json",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    let body;
    try {
      const requestText = await req.text();
      if (!requestText || requestText.trim() === "") {
        throw new Error("Empty request body");
      }
      body = JSON.parse(requestText) as RequestBody;
    } catch (e) {
      console.error("Error parsing request body:", e instanceof Error ? e.message : String(e));
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid JSON in request body: ${e instanceof Error ? e.message : String(e)}`,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const { text, voice_settings, save_to_storage, user_id } = body;
    
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Text is required for speech generation",
          timestamp: new Date().toISOString(),
        } as ResponseBody),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Try to generate speech with ElevenLabs
    console.log("Generating speech with ElevenLabs:", { 
      textLength: text.length,
      apiKey: Deno.env.get("ELEVENLABS_API_KEY") ? "present" : "missing", 
      voiceId: Deno.env.get("ELEVENLABS_VOICE_ID") || "default",
      saveToStorage: save_to_storage || false
    });
    
    try {
      const audioData = await generateSpeechWithElevenLabs(text, voice_settings);
      
      // If requested, save to storage
      let storagePath = null;
      if (save_to_storage && user_id) {
        console.log(`Attempting to save audio to storage for user ${user_id}`);
        try {
          storagePath = await saveAudioToStorage(audioData, user_id);
          
          if (storagePath) {
            console.log(`Audio saved successfully at path: ${storagePath}`);
            // Return JSON with the storage path
            return new Response(
              JSON.stringify({
                success: true,
                audio_url: storagePath,
                timestamp: new Date().toISOString(),
              }),
              {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          } else {
            console.error('Failed to save audio to storage: No path returned');
            // Return error response when storage fails
            return new Response(
              JSON.stringify({
                success: false,
                error: "Failed to save audio to storage",
                timestamp: new Date().toISOString(),
              }),
              {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        } catch (storageError) {
          console.error('Storage error:', storageError instanceof Error ? storageError.message : String(storageError));
          // Return error response when storage fails with exception
          return new Response(
            JSON.stringify({
              success: false,
              error: "Exception while saving audio to storage",
              details: storageError instanceof Error ? storageError.message : String(storageError),
              timestamp: new Date().toISOString(),
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }
      
      // Return the audio directly
      return new Response(audioData, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
          "Content-Disposition": "attachment; filename=speech.mp3"
        }
      });
    } catch (elevenlabsError) {
      console.warn('ElevenLabs speech generation failed:', 
        elevenlabsError instanceof Error ? elevenlabsError.message : String(elevenlabsError)); 
      
      // Return JSON error response if storage was requested
      if (save_to_storage) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Speech generation failed",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      // If save_to_storage is requested, return JSON error response
      const fallbackAudio = generateFallbackSpeech();
      
      return new Response(fallbackAudio, {
        status: 200,
        headers: { 
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
          "Content-Disposition": "attachment; filename=speech.mp3"
        }
      });
    }
  } catch (error) {
    // Log detailed error information
    console.error('Error in generate-speech function:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      timestamp: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An error occurred during speech generation",
        timestamp: new Date().toISOString(), 
      } as ResponseBody),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});