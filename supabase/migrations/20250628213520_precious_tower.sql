-- Seed script for Zensai database
-- This will populate the database with initial data for testing

-- Insert Stripe products
INSERT INTO stripe_products (product_id, name, description, active)
VALUES
  ('prod_SXubM10Mw2WKpj', 'Monthly Premium', 'Make it a habit.', true),
  ('prod_SXuddrXOUtOOG5', 'Yearly Premium', 'Make it part of your everyday life.', true)
ON CONFLICT (product_id) DO NOTHING;

-- Insert Stripe prices
INSERT INTO stripe_prices (price_id, product_id, currency, unit_amount, interval, interval_count, active)
VALUES
  ('price_1RcomKLWkwWYEqp4aKMwj9Lv', 'prod_SXubM10Mw2WKpj', 'usd', 899, 'month', 1, true),
  ('price_1RdkFPLWkwWYEqp4AMPJDzF6', 'prod_SXuddrXOUtOOG5', 'usd', 5999, 'year', 1, true)
ON CONFLICT (price_id) DO NOTHING;

-- Store price IDs as database settings for easy reference
SELECT set_config('app.stripe_price_id_monthly', 'price_1RcomKLWkwWYEqp4aKMwj9Lv', false);
SELECT set_config('app.stripe_price_id_yearly', 'price_1RdkFPLWkwWYEqp4AMPJDzF6', false);

-- Insert test user (only if running in development/test environment)
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Only run in development environment
  IF current_setting('app.environment', true) = 'development' THEN
    -- Create test user if it doesn't exist
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      'test@example.com',
      crypt('password123', gen_salt('bf')),
      now(),
      '{"name": "Test User"}',
      now(),
      now()
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO test_user_id;
    
    -- Create profile for test user
    INSERT INTO profiles (
      user_id,
      name,
      current_streak,
      best_streak,
      last_entry_date,
      journaling_goal_frequency,
      total_badges_earned,
      created_at,
      updated_at
    )
    VALUES (
      test_user_id,
      'Test User',
      3,
      5,
      CURRENT_DATE,
      3,
      2,
      now(),
      now()
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create some journal entries for test user
    INSERT INTO journal_entries (
      user_id,
      content,
      mood,
      title,
      created_at,
      updated_at
    )
    VALUES
      (
        test_user_id,
        'Today was a great day! I went for a walk in the park and enjoyed the sunshine.',
        'good',
        'Great Day',
        now() - interval '2 days',
        now() - interval '2 days'
      ),
      (
        test_user_id,
        'Feeling a bit down today. The weather is gloomy and I didn''t sleep well.',
        'low',
        'Tough Day',
        now() - interval '1 day',
        now() - interval '1 day'
      ),
      (
        test_user_id,
        'Just a normal day. Nothing special happened, but I''m grateful for the small moments.',
        'neutral',
        'Normal Day',
        now(),
        now()
      )
    ON CONFLICT DO NOTHING;
    
    -- Award some badges to test user
    INSERT INTO user_badges (
      user_id,
      badge_id,
      progress_current,
      earned,
      earned_at
    )
    SELECT
      test_user_id,
      id,
      CASE
        WHEN badge_name = 'First Step' THEN 1
        WHEN badge_name = 'Daily Habit' THEN 3
        ELSE 0
      END,
      CASE
        WHEN badge_name IN ('First Step', 'Daily Habit') THEN true
        ELSE false
      END,
      CASE
        WHEN badge_name IN ('First Step', 'Daily Habit') THEN now() - interval '1 day'
        ELSE NULL
      END
    FROM badges
    WHERE badge_name IN ('First Step', 'Daily Habit', 'Week Warrior')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
END $$;