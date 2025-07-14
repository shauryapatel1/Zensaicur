import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { SETTINGS } from '../constants/uiStrings';

const MotionLink = motion(Link);

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-32 h-32 bg-zen-mint-200 dark:bg-zen-mint-800 rounded-full opacity-20"
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-40 right-20 w-24 h-24 bg-zen-lavender-200 dark:bg-zen-lavender-800 rounded-full opacity-20"
          animate={{
            x: [0, -20, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-32 left-1/4 w-40 h-40 bg-zen-peach-200 dark:bg-zen-peach-800 rounded-full opacity-15"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 10, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 p-4 bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm border-b border-white/20 dark:border-gray-600/20">
        <div className="container mx-auto max-w-4xl flex items-center">
          <MotionLink
            to="/"
            className="flex items-center space-x-2 px-4 py-2 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-zen-sage-600 dark:text-gray-300 hover:text-zen-sage-800 dark:hover:text-gray-100 hover:bg-white/90 dark:hover:bg-gray-600/90 rounded-full transition-all duration-300 shadow-lg"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Home</span>
          </MotionLink>
          <Logo size="md" className="ml-4" />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl p-8 md:p-12 shadow-xl border border-white/30 dark:border-gray-600/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.h1 
            className="text-3xl md:text-4xl font-display font-bold text-zen-sage-800 dark:text-gray-100 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Terms of Service
          </motion.h1>
          
          <motion.div 
            className="prose prose-lg prose-zen dark:prose-invert max-w-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-zen-sage-500 dark:text-gray-400 italic">Last updated: January 15, 2025</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">1. Acceptance of Terms</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">By accessing or using Zensai, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our service.</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">2. Eligibility</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">You must be at least <strong>13 years old</strong> to use Zensai. By using our service, you represent that you meet this age requirement and have the legal capacity to enter into these terms.</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">3. Description of Service</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">Zensai is a digital wellness platform that provides journaling tools, mood tracking, AI-powered insights, and mindfulness features. Our service is designed to support your mental wellness journey through guided reflection and personal growth tools.</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">4. User Accounts and Responsibilities</h2>
            <ul>
              <li className="text-zen-sage-700 dark:text-gray-300">You are responsible for maintaining the confidentiality of your account credentials</li>
              <li className="text-zen-sage-700 dark:text-gray-300">You must provide accurate and complete information when creating your account</li>
              <li className="text-zen-sage-700 dark:text-gray-300">You are responsible for all activities that occur under your account</li>
              <li className="text-zen-sage-700 dark:text-gray-300">You must notify us immediately of any unauthorized use of your account</li>
            </ul>

            <h2 className="text-zen-sage-800 dark:text-gray-200">5. User Content and Privacy</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">You retain ownership of all content you create in Zensai, including journal entries, photos, and other personal data. By using our service, you grant us a limited license to process your content solely to provide our services, including AI-powered features like mood analysis and personalized prompts.</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">6. AI-Generated Content</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">Zensai uses artificial intelligence to generate prompts, affirmations, and insights. This AI-generated content is provided for informational and motivational purposes only and should not be considered as professional medical, psychological, or therapeutic advice.</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">7. Subscription and Payment Terms</h2>
            <ul>
              <li className="text-zen-sage-700 dark:text-gray-300">Premium subscriptions are billed monthly or annually as selected</li>
              <li className="text-zen-sage-700 dark:text-gray-300">All subscriptions include a 7-day free trial period</li>
              <li className="text-zen-sage-700 dark:text-gray-300">You may cancel your subscription at any time through your account settings</li>
              <li className="text-zen-sage-700 dark:text-gray-300">Refunds are provided according to our refund policy and applicable law</li>
              <li className="text-zen-sage-700 dark:text-gray-300">Payment processing is handled securely by Stripe</li>
            </ul>

            <h2 className="text-zen-sage-800 dark:text-gray-200">8. Prohibited Uses</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">You agree not to:</p>
            <ul>
              <li className="text-zen-sage-700 dark:text-gray-300">Use the service for any illegal or unauthorized purpose</li>
              <li className="text-zen-sage-700 dark:text-gray-300">Attempt to gain unauthorized access to our systems or other users' accounts</li>
              <li className="text-zen-sage-700 dark:text-gray-300">Interfere with or disrupt the service or servers</li>
              <li className="text-zen-sage-700 dark:text-gray-300">Use the service to transmit harmful, offensive, or inappropriate content</li>
              <li className="text-zen-sage-700 dark:text-gray-300">Reverse engineer, decompile, or attempt to extract source code</li>
            </ul>

            <h2 className="text-zen-sage-800 dark:text-gray-200">9. Medical Disclaimer</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">Zensai is a wellness tool and is not intended to diagnose, treat, cure, or prevent any medical condition. Our service is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of qualified healthcare providers with any questions regarding your mental health.</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">10. Service Availability</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">We strive to maintain high service availability but cannot guarantee uninterrupted access. We may temporarily suspend service for maintenance, updates, or other operational reasons with reasonable notice when possible.</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">11. Termination</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">You may terminate your account at any time by deleting it through the app settings. We reserve the right to suspend or terminate accounts that violate these terms or engage in harmful behavior toward our community.</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">12. Limitation of Liability</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">To the maximum extent permitted by law, Zensai and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service.</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">13. Changes to Terms</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">We may update these Terms of Service from time to time. We will notify you of material changes via email or through the app. Your continued use of Zensai after such changes constitutes acceptance of the updated terms.</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">14. Governing Law</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">These Terms are governed by the laws of Ontario, Canada, without regard to conflict of law principles.</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">15. Contact Information</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">For questions about these Terms of Service, please contact us at <strong>{SETTINGS.SUPPORT.EMAIL}</strong>.</p>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}