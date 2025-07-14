import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { SETTINGS } from '../constants/uiStrings';

const MotionLink = motion(Link);

export default function PrivacyPolicy() {
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
            Privacy Policy
          </motion.h1>
          
          <motion.div 
            className="prose prose-lg prose-zen dark:prose-invert max-w-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-zen-sage-500 dark:text-gray-400 italic">Last updated: January 15, 2025</p>

            <p className="text-zen-sage-700 dark:text-gray-300">Zensai ("<strong>we</strong>", "<strong>us</strong>", or "<strong>our</strong>") is committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, store, and protect your data when you use the Zensai application and services.</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">Information We Collect</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-zen-sage-700 dark:text-gray-300">
                <thead>
                  <tr>
                    <th className="text-left text-zen-sage-800 dark:text-gray-200">Category</th>
                    <th className="text-left text-zen-sage-800 dark:text-gray-200">Details</th>
                    <th className="text-left text-zen-sage-800 dark:text-gray-200">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Account Information</td>
                    <td>Email address, display name (optional)</td>
                    <td>Account creation, authentication, and personalization</td>
                  </tr>
                  <tr>
                    <td>Journal Content</td>
                    <td>Text entries, mood selections, optional photos, entry titles</td>
                    <td>Core journaling functionality, mood tracking, and AI-powered insights</td>
                  </tr>
                  <tr>
                    <td>Usage Analytics</td>
                    <td>Anonymous usage patterns, feature interactions, performance metrics</td>
                    <td>Improve app performance and user experience</td>
                  </tr>
                  <tr>
                    <td>Subscription Data</td>
                    <td>Payment information (processed by Stripe), subscription status</td>
                    <td>Premium feature access and billing management</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <blockquote>
              <p className="text-zen-sage-700 dark:text-gray-300"><strong>We never sell, rent, or share your personal data with third parties for marketing purposes.</strong></p>
            </blockquote>

            <h2 className="text-zen-sage-800 dark:text-gray-200">How We Use AI Services</h2>
            <ul>
              <li className="text-zen-sage-700 dark:text-gray-300"><strong>OpenAI</strong> processes your journal text temporarily to generate personalized prompts, mood analysis, and affirmations. Your data is not stored by OpenAI.</li>
              <li className="text-zen-sage-700 dark:text-gray-300"><strong>ElevenLabs</strong> converts affirmation text to speech for premium users. Audio is generated on-demand and not stored.</li>
            </ul>

            <p className="text-zen-sage-700 dark:text-gray-300">These AI services process your content only when you actively use features that require them, and your data is not retained by these providers after processing.</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">Data Storage & Security</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">Your data is securely stored using <strong>Supabase</strong>, which provides:</p>
            <ul>
              <li className="text-zen-sage-700 dark:text-gray-300">Encryption at rest and in transit</li>
              <li className="text-zen-sage-700 dark:text-gray-300">SOC 2 Type II compliance</li>
              <li className="text-zen-sage-700 dark:text-gray-300">Row-level security ensuring only you can access your data</li>
              <li className="text-zen-sage-700 dark:text-gray-300">Regular security audits and monitoring</li>
            </ul>

            <h2 className="text-zen-sage-800 dark:text-gray-200">Your Privacy Rights</h2>
            <ul>
              <li className="text-zen-sage-700 dark:text-gray-300"><strong>Access</strong>: View and export all your journal data at any time through the app settings</li>
              <li className="text-zen-sage-700 dark:text-gray-300"><strong>Delete</strong>: Remove individual entries or delete your entire account and all associated data</li>
              <li className="text-zen-sage-700 dark:text-gray-300"><strong>Control</strong>: Manage your privacy preferences and opt out of analytics in app settings</li>
              <li className="text-zen-sage-700 dark:text-gray-300"><strong>Portability</strong>: Export your data in JSON format for use elsewhere</li>
            </ul>

            <h2 className="text-zen-sage-800 dark:text-gray-200">Cookies and Tracking</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">We use minimal cookies for essential functionality:</p>
            <ul>
              <li className="text-zen-sage-700 dark:text-gray-300">Authentication cookies to keep you signed in</li>
              <li className="text-zen-sage-700 dark:text-gray-300">Preference cookies to remember your settings</li>
              <li className="text-zen-sage-700 dark:text-gray-300">No third-party advertising or tracking cookies</li>
            </ul>

            <h2 className="text-zen-sage-800 dark:text-gray-200">Data Retention</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">We retain your data only as long as your account is active. When you delete your account:</p>
            <ul>
              <li className="text-zen-sage-700 dark:text-gray-300">All journal entries and personal data are permanently deleted within 30 days</li>
              <li className="text-zen-sage-700 dark:text-gray-300">Anonymous usage analytics may be retained for product improvement</li>
              <li className="text-zen-sage-700 dark:text-gray-300">Legal or regulatory requirements may require longer retention in some cases</li>
            </ul>

            <h2 className="text-zen-sage-800 dark:text-gray-200">Children's Privacy</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">Zensai is not intended for children under 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected such information, we will delete it immediately.</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">Changes to This Policy</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">We may update this Privacy Policy from time to time. We will notify you of any material changes by email or through the app. Your continued use of Zensai after such changes constitutes acceptance of the updated policy.</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">Contact Us</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">For questions about this Privacy Policy or your data, please contact us at <strong>{SETTINGS.SUPPORT.EMAIL}</strong>.</p>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}