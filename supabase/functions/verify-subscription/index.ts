// Edge function to verify a Stripe subscription

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.38.4";

interface RequestBody {
  sessionId: string;
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
    const { sessionId, userId } = await req.json() as RequestBody;
    
    // Validate required fields
    if (!sessionId || !userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: sessionId and userId are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Retrieve checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    // Verify that the session belongs to this user
    if (session.client_reference_id !== userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid session ID for this user",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Check if payment was successful
    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Payment not completed",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Get subscription details
    const subscriptionId = session.subscription as string;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Determine subscription tier based on price
    const priceId = subscription.items.data[0].price.id;
    const monthlyPriceId = Deno.env.get("STRIPE_PRICE_ID_MONTHLY");
    const yearlyPriceId = Deno.env.get("STRIPE_PRICE_ID_YEARLY");
    
    let subscriptionTier = "premium";
    if (priceId === yearlyPriceId) {
      subscriptionTier = "premium_plus";
    }
    
    // Calculate expiry date
    const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
    
    // Update user's subscription status in database
    const { error: updateError } = await supabase.rpc(
      "update_user_subscription",
      {
        user_id: userId,
        status: "premium",
        tier: subscriptionTier,
        expires_at: expiresAt,
        revenuecart_id: subscription.customer as string
      }
    );
    
    if (updateError) {
      throw new Error(`Failed to update subscription status: ${updateError.message}`);
    }
    
    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        subscription: {
          id: subscriptionId,
          status: "premium",
          tier: subscriptionTier,
          expiresAt,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error verifying subscription:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to verify subscription",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});