// Edge function to delete a user's data

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.38.4";
import Stripe from "npm:stripe@17.7.0";

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
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    
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
    
    // Get user profile to check for Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("revenuecart_user_id, subscription_status")
      .eq("user_id", user_id)
      .single();
    
    if (profileError && profileError.code !== "PGRST116") { // PGRST116 is "no rows returned"
      throw new Error(`Failed to retrieve user profile: ${profileError.message}`);
    }
    
    // If user has a Stripe subscription, cancel it
    if (profile?.revenuecart_user_id && profile?.subscription_status === "premium" && stripeSecretKey) {
      try {
        const stripe = new Stripe(stripeSecretKey, {
          apiVersion: "2023-10-16",
        });
        
        // Cancel all subscriptions for this customer
        const subscriptions = await stripe.subscriptions.list({
          customer: profile.revenuecart_user_id,
        });
        
        for (const subscription of subscriptions.data) {
          await stripe.subscriptions.cancel(subscription.id);
        }
      } catch (stripeError) {
        console.error("Error canceling Stripe subscription:", stripeError);
        // Continue with deletion even if Stripe operations fail
      }
    }
    
    // Delete user's photos from storage
    try {
      // List all objects in the journal-photos bucket for this user
      const { data: journalPhotos, error: journalPhotosError } = await supabase
        .storage
        .from("journal-photos")
        .list(user_id);
      
      if (journalPhotosError) {
        throw journalPhotosError;
      }
      
      // Delete journal photos if any exist
      if (journalPhotos && journalPhotos.length > 0) {
        const photoPaths = journalPhotos.map(photo => `${user_id}/${photo.name}`);
        await supabase.storage.from("journal-photos").remove(photoPaths);
      }
      
      // List all objects in the profile-photos bucket for this user
      const { data: profilePhotos, error: profilePhotosError } = await supabase
        .storage
        .from("profile-photos")
        .list(user_id);
      
      if (profilePhotosError) {
        throw profilePhotosError;
      }
      
      // Delete profile photos if any exist
      if (profilePhotos && profilePhotos.length > 0) {
        const photoPaths = profilePhotos.map(photo => `${user_id}/${photo.name}`);
        await supabase.storage.from("profile-photos").remove(photoPaths);
      }
    } catch (storageError) {
      console.error("Error deleting user's photos:", storageError);
      // Continue with deletion even if storage operations fail
    }
    
    // Delete user's profile (this will cascade to journal_entries and user_badges)
    const { error: deleteError } = await supabase
      .from("profiles")
      .delete()
      .eq("user_id", user_id);
    
    if (deleteError) {
      throw new Error(`Failed to delete user profile: ${deleteError.message}`);
    }
    
    // Delete the user from auth.users
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user_id);
    
    if (authDeleteError) {
      throw new Error(`Failed to delete user from auth: ${authDeleteError.message}`);
    }
    
    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "User data deleted successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error deleting user data:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to delete user data",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});