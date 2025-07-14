# Zensai - Mental Wellness Journal

Zensai is a mental wellness journaling application with AI-powered insights, mood tracking, and personalized affirmations.

## Features

- **Daily Journaling**: Record your thoughts and feelings with a beautiful, intuitive interface
- **Mood Tracking**: Track your emotional state over time with visual analytics
- **AI Insights**: Receive personalized affirmations and reflective prompts
- **Badge System**: Earn achievements as you build your journaling habit
- **Voice Synthesis**: Listen to your affirmations with natural-sounding voice (Premium)
- **Photo Uploads**: Add visual memories to your journal entries (Premium)
- **Streak Tracking**: Build consistency with streak tracking and goals

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI Services**: OpenAI for text generation, ElevenLabs for voice synthesis
- **Payments**: Stripe for subscription management

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase CLI (for local development)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/zensai.git
   cd zensai
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```

4. Update the `.env` file with your Supabase and other API keys.

5. Start the development server:
   ```
   npm run dev
   ```

### Database Setup

1. Install the Supabase CLI:
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

## Edge Functions

Zensai uses Supabase Edge Functions for serverless backend logic:

- **analyze-mood**: Analyzes journal text to detect mood
- **generate-affirmation**: Creates personalized affirmations
- **generate-prompt**: Provides journaling prompts
- **generate-speech**: Converts text to speech using ElevenLabs
- **create-checkout-session**: Creates Stripe checkout sessions
- **stripe-webhook**: Handles Stripe webhook events

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for providing the AI capabilities
- ElevenLabs for the voice synthesis technology
- Supabase for the backend infrastructure
- Stripe for payment processing