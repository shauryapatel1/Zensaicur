// Edge function to export a user's journal data

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.38.4";

interface RequestBody {
  user_id: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  
  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing required environment variables");
    }
    
    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    const { user_id } = await req.json() as RequestBody;
    
    // Validate required fields
    if (!user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required field: user_id",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user_id)
      .single();
    
    if (profileError) {
      throw new Error(`Failed to retrieve user profile: ${profileError.message}`);
    }
    
    // Get user's journal entries
    const { data: entries, error: entriesError } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });
    
    if (entriesError) {
      throw new Error(`Failed to retrieve journal entries: ${entriesError.message}`);
    }
    
    // Get user's badges
    const { data: badges, error: badgesError } = await supabase
      .rpc("get_user_badge_progress", { target_user_id: user_id });
    
    if (badgesError) {
      throw new Error(`Failed to retrieve badges: ${badgesError.message}`);
    }
    
    // Compile export data
    const exportData = {
      profile: {
        ...profile,
        // Remove sensitive fields
        revenuecart_user_id: undefined,
      },
      journal_entries: entries,
      badges: badges,
      export_date: new Date().toISOString(),
    };
    
    // Return the data
    return new Response(
      JSON.stringify({
        success: true,
        data: exportData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error exporting journal data:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to export journal data",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});