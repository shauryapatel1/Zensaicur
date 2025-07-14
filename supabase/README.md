# Zensai Database

This directory contains the database schema, migrations, and functions for the Zensai application.

## Database Structure

The Zensai database consists of the following main tables:

- **profiles**: User profiles with journaling stats and subscription info
- **journal_entries**: User journal entries with mood tracking and affirmations
- **badges**: Available achievement badges
- **user_badges**: Tracks which badges users have earned
- **stripe_customers**: Maps users to Stripe customers
- **stripe_subscriptions**: Tracks subscription status
- **stripe_products**: Product catalog
- **stripe_prices**: Price information for products
- **stripe_orders**: One-time purchases
- **stripe_webhooks**: Webhook event logs

## Storage Buckets

- **journal-photos**: For storing user-uploaded journal photos
- **affirmation-audio**: For storing generated audio files

## Key Functions

- **get_user_badge_progress**: Returns badge progress for a user
- **update_user_subscription**: Updates a user's subscription status
- **update_streak_on_new_entry**: Triggered when a new journal entry is created
- **process_stripe_webhook**: Handles Stripe webhook events

## Setting Up Local Development

1. Install the Supabase CLI if you haven't already:
   ```
   npm install -g supabase
   ```

2. Start the local Supabase instance:
   ```
   npm run supabase:start
   ```

3. Apply migrations:
   ```
   supabase db reset
   ```

4. Verify the database setup:
   ```
   npm run db:verify
   ```

## Working with Migrations

To create a new migration:

1. Create a new SQL file in the `migrations` directory with a descriptive name
2. Write your SQL statements
3. Apply the migration with `supabase db reset`

## Connecting to the Database

The application connects to the database using the Supabase client. The connection details are stored in the `.env` file.

## Stripe Integration

The database includes tables and functions for Stripe integration. The Stripe webhook handler processes events from Stripe and updates the database accordingly.

## Row Level Security (RLS)

All tables have Row Level Security enabled. Users can only access their own data. The RLS policies are defined in the migrations.

## Troubleshooting

If you encounter issues with the database:

1. Check the Supabase logs:
   ```
   supabase logs
   ```

2. Reset the database:
   ```
   npm run db:seed
   ```

3. Verify the database setup:
   ```
   npm run db:verify
   ```