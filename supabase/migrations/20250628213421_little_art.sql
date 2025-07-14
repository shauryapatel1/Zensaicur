/*
  # Stripe Webhook Handlers

  1. Functions
    - `handle_stripe_subscription_updated` - Updates user subscription status when Stripe events occur
    - `handle_stripe_checkout_completed` - Processes completed checkout sessions
    - `process_stripe_webhook` - Main webhook handler that routes events to specific handlers

  2. Security
    - All functions are SECURITY DEFINER to ensure they can update necessary tables
    - Functions are designed to be called by Edge Functions with service role
*/

-- Function to handle subscription updated events
CREATE OR REPLACE FUNCTION handle_stripe_subscription_updated(subscription_data JSONB)
RETURNS VOID AS $$
DECLARE
  customer_id TEXT;
  subscription_id TEXT;
  subscription_status TEXT;
  current_period_end TIMESTAMPTZ;
  price_id TEXT;
  user_id UUID;
  subscription_tier TEXT := 'premium'; -- Default tier
BEGIN
  -- Extract data from the subscription object
  customer_id := subscription_data->>'customer';
  subscription_id := subscription_data->>'id';
  subscription_status := subscription_data->>'status';
  current_period_end := to_timestamp((subscription_data->>'current_period_end')::bigint);
  
  -- Get the price ID from the first subscription item
  price_id := subscription_data->'items'->'data'->0->'price'->>'id';
  
  -- Get the user ID from the customer mapping
  SELECT sc.user_id INTO user_id
  FROM stripe_customers sc
  WHERE sc.customer_id = customer_id;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'No user found for Stripe customer %', customer_id;
  END IF;
  
  -- Determine subscription tier based on price ID
  IF price_id = (SELECT current_setting('app.stripe_price_id_yearly', true)) THEN
    subscription_tier := 'premium_plus';
  END IF;
  
  -- Update the subscription record
  INSERT INTO stripe_subscriptions (
    customer_id,
    subscription_id,
    price_id,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    updated_at
  ) VALUES (
    customer_id,
    subscription_id,
    price_id,
    subscription_status::stripe_subscription_status,
    to_timestamp((subscription_data->>'current_period_start')::bigint),
    current_period_end,
    (subscription_data->>'cancel_at_period_end')::boolean,
    NOW()
  )
  ON CONFLICT (customer_id)
  DO UPDATE SET
    subscription_id = EXCLUDED.subscription_id,
    price_id = EXCLUDED.price_id,
    status = EXCLUDED.status,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    updated_at = EXCLUDED.updated_at;
  
  -- Update the user's profile with subscription status
  UPDATE profiles
  SET
    subscription_status = CASE
      WHEN subscription_status IN ('active', 'trialing') THEN 'premium'
      ELSE 'free'
    END,
    subscription_tier = CASE
      WHEN subscription_status IN ('active', 'trialing') THEN subscription_tier
      ELSE 'free'
    END,
    subscription_expires_at = CASE
      WHEN subscription_status IN ('active', 'trialing') THEN current_period_end
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE user_id = user_id;
  
  -- If this is a new premium subscription, award the Premium Supporter badge
  IF subscription_status IN ('active', 'trialing') THEN
    -- Get the Premium Supporter badge ID
    DECLARE
      premium_badge_id UUID;
    BEGIN
      SELECT id INTO premium_badge_id
      FROM badges
      WHERE badge_name = 'Premium Supporter';
      
      IF premium_badge_id IS NOT NULL THEN
        -- Award the badge if not already earned
        INSERT INTO user_badges (user_id, badge_id, progress_current, earned, earned_at)
        VALUES (user_id, premium_badge_id, 1, true, NOW())
        ON CONFLICT (user_id, badge_id)
        DO UPDATE SET
          progress_current = 1,
          earned = true,
          earned_at = COALESCE(user_badges.earned_at, NOW()),
          updated_at = NOW();
          
        -- Update total badges earned
        UPDATE profiles
        SET
          total_badges_earned = (
            SELECT COUNT(*)
            FROM user_badges
            WHERE user_badges.user_id = profiles.user_id
            AND earned = true
          ),
          updated_at = NOW()
        WHERE profiles.user_id = user_id;
      END IF;
    END;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle checkout completed events
CREATE OR REPLACE FUNCTION handle_stripe_checkout_completed(session_data JSONB)
RETURNS VOID AS $$
DECLARE
  customer_id TEXT;
  user_id UUID;
  session_id TEXT;
  mode TEXT;
  subscription_id TEXT;
  payment_status TEXT;
BEGIN
  -- Extract data from the checkout session
  customer_id := session_data->>'customer';
  session_id := session_data->>'id';
  mode := session_data->>'mode';
  payment_status := session_data->>'payment_status';
  
  -- Get the user ID from the customer mapping
  SELECT sc.user_id INTO user_id
  FROM stripe_customers sc
  WHERE sc.customer_id = customer_id;
  
  IF user_id IS NULL THEN
    -- Try to get user ID from client_reference_id
    user_id := (session_data->>'client_reference_id')::UUID;
    
    IF user_id IS NULL THEN
      RAISE EXCEPTION 'No user found for checkout session %', session_id;
    END IF;
    
    -- Create customer mapping if it doesn't exist
    INSERT INTO stripe_customers (user_id, customer_id)
    VALUES (user_id, customer_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  -- Handle subscription checkout
  IF mode = 'subscription' AND payment_status = 'paid' THEN
    subscription_id := session_data->>'subscription';
    
    -- The subscription details will be handled by the subscription.created or subscription.updated event
    -- Just ensure we have a record in the subscriptions table
    INSERT INTO stripe_subscriptions (customer_id, subscription_id, status)
    VALUES (customer_id, subscription_id, 'active')
    ON CONFLICT (customer_id) DO NOTHING;
    
  -- Handle one-time payment checkout
  ELSIF mode = 'payment' AND payment_status = 'paid' THEN
    -- Insert order record
    INSERT INTO stripe_orders (
      checkout_session_id,
      payment_intent_id,
      customer_id,
      amount_subtotal,
      amount_total,
      currency,
      payment_status,
      status
    ) VALUES (
      session_id,
      session_data->>'payment_intent',
      customer_id,
      (session_data->>'amount_subtotal')::bigint,
      (session_data->>'amount_total')::bigint,
      session_data->>'currency',
      payment_status,
      'completed'
    )
    ON CONFLICT (checkout_session_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Main webhook handler function
CREATE OR REPLACE FUNCTION process_stripe_webhook(event_id TEXT, event_type TEXT, event_data JSONB)
RETURNS VOID AS $$
BEGIN
  -- Log the webhook event
  INSERT INTO stripe_webhooks (event_id, event_type, event_data)
  VALUES (event_id, event_type, event_data)
  ON CONFLICT (event_id) DO NOTHING;
  
  -- Process based on event type
  CASE event_type
    -- Subscription events
    WHEN 'customer.subscription.created' THEN
      PERFORM handle_stripe_subscription_updated(event_data->'object');
    WHEN 'customer.subscription.updated' THEN
      PERFORM handle_stripe_subscription_updated(event_data->'object');
    WHEN 'customer.subscription.deleted' THEN
      PERFORM handle_stripe_subscription_updated(event_data->'object');
    
    -- Checkout events
    WHEN 'checkout.session.completed' THEN
      PERFORM handle_stripe_checkout_completed(event_data->'object');
    
    -- Other events can be added here
    ELSE
      -- Just log the event, no special handling
      NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;