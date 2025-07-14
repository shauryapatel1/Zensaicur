// Edge function to create a Stripe customer portal session

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.38.4";

interface RequestBody {
  userId: string;
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
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing required environment variables");
    }
    
    // Initialize Stripe and Supabase
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    const { userId } = await req.json() as RequestBody;
    
    // Validate required fields
    if (!userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required field: userId",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Get user's profile to find their Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("revenuecart_user_id")
      .eq("user_id", userId)
      .single();
    
    if (profileError || !profile) {
      throw new Error(`Failed to retrieve user profile: ${profileError?.message || "User not found"}`);
    }
    
    const customerId = profile.revenuecart_user_id;
    
    if (!customerId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No subscription found for this user",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Get app URL from environment variables
    const appUrl = Deno.env.get("APP_URL") || "http://localhost:5173";
    
    // Create customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/settings`,
    });
    
    // Return portal URL
    return new Response(
      JSON.stringify({
        success: true,
        url: session.url,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating portal session:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to create customer portal session",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});