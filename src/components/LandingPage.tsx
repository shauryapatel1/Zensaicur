import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Sparkles, Calendar, TrendingUp, Users, Shield, ArrowRight, Star, CheckCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Logo from './Logo';
import LottieAvatar from './LottieAvatar';

export default function LandingPage() {
  const navigate = useNavigate();
  const isSupabaseConnected = !!supabase;

  const features = [
    {
      icon: Heart,
      title: "Intelligent Mood Tracking",
      description: "Track your emotions with Zeno's gentle guidance and AI-powered insights that help you understand your emotional patterns."
    },
    {
      icon: Sparkles,
      title: "Personalized AI Companion",
      description: "Receive thoughtful prompts, personalized affirmations, and mood analysis tailored to your unique wellness journey."
    },
    {
      icon: Calendar,
      title: "Mindful Habit Building",
      description: "Build lasting wellness habits with daily journaling streaks, achievement badges, and gentle encouragement from Zeno."
    },
    {
      icon: TrendingUp,
      title: "Growth Visualization",
      description: "See your emotional growth over time with beautiful charts, meaningful statistics, and insights into your progress."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Wellness Enthusiast",
      content: "Zensai has transformed my daily reflection practice. Zeno feels like a caring friend who truly understands my journey.",
      rating: 5
    },
    {
      name: "Marcus Rodriguez",
      role: "Mental Health Advocate",
      content: "The AI insights are incredibly thoughtful and personalized. It's like having a mindfulness coach available 24/7.",
      rating: 5
    },
    {
      name: "Emma Thompson",
      role: "Busy Professional",
      content: "I love how gentle and encouraging Zeno is. It's helped me build a consistent journaling habit for the first time in years.",
      rating: 5
    }
  ];

  const benefits = [
    "Reduce stress and anxiety through mindful daily reflection",
    "Build emotional intelligence and deeper self-awareness",
    "Create lasting positive habits with gentle, consistent guidance",
    "Track your mental wellness journey with meaningful insights",
    "Receive personalized support exactly when you need it most"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-32 h-32 bg-zen-mint-200 rounded-full opacity-20"
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
          className="absolute top-40 right-20 w-24 h-24 bg-zen-lavender-200 rounded-full opacity-20"
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
          className="absolute bottom-32 left-1/4 w-40 h-40 bg-zen-peach-200 rounded-full opacity-15"
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

      {/* Navigation */}
      <motion.nav
        className="relative z-10 flex items-center justify-between p-6 lg:px-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center space-x-3">
          <Logo size="md" />
          <h1 className="font-display font-bold text-zen-sage-800">Zensai</h1>
          <p className="text-xs text-zen-sage-600">with Zeno</p>
        </div>

        <div className="flex items-center space-x-6">
          <button
            onClick={() => navigate('/auth')}
            className="text-zen-sage-600 hover:text-zen-sage-800 font-medium transition-colors hover:underline"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/auth')}
            className="px-6 py-2 bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 text-white font-medium rounded-full hover:from-zen-mint-500 hover:to-zen-mint-600 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Start Free
          </button>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-6 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Hero Content */}
          <motion.div
            className="text-center lg:text-left"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <motion.h1
              className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-zen-sage-800 mb-6 leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Your Daily Path to
              <br />
              <span className="text-zen-mint-500">Inner Peace</span>
            </motion.h1>

            <motion.p
              className="text-xl text-zen-sage-600 mb-8 leading-relaxed"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              Transform your mental wellness with Zeno, your caring AI companion. 
              Experience personalized journaling, mood insights, and gentle guidance 
              designed to nurture your emotional growth every day.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <button
                onClick={() => navigate('/auth')}
                className="group px-8 py-4 bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 text-white font-semibold rounded-2xl hover:from-zen-mint-500 hover:to-zen-mint-600 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <span>Begin Your Journey</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button 
                onClick={() => {
                  const featuresSection = document.getElementById('features-section');
                  featuresSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-8 py-4 border-2 border-zen-sage-300 text-zen-sage-700 font-semibold rounded-2xl hover:bg-zen-sage-50 transition-all duration-300"
              >
                Discover Features
              </button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              className="flex items-center justify-center lg:justify-start space-x-6 mt-8 text-sm text-zen-sage-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
            >
              {!isSupabaseConnected && (
                <div className="flex items-center space-x-1 bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Please connect to Supabase</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Shield className="w-4 h-4" />
                <span>Privacy First</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>Trusted by Thousands</span>
              </div>
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 fill-current text-zen-peach-400" />
                <span>4.9/5 Rating</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Hero Animation */}
          <motion.div
            className="flex justify-center lg:justify-end"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="w-full max-w-lg h-96 rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-gradient-to-br from-zen-mint-100 to-zen-lavender-100 flex items-center justify-center">
              <LottieAvatar mood={4} size="lg" variant="greeting" aria-label="Zeno the fox, looking happy and welcoming new users" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features-section" className="relative z-10 py-20 bg-white/30 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-zen-sage-800 mb-4">
              Everything You Need for
              <span className="text-zen-mint-500"> Mindful Living</span>
            </h2>
            <p className="text-xl text-zen-sage-600 max-w-2xl mx-auto">
              Zeno combines the wisdom of mindfulness with the power of AI to create
              your perfect wellness companion.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 group"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
              >
                <div className="w-16 h-16 bg-gradient-to-br from-zen-mint-200 to-zen-mint-300 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-8 h-8 text-zen-mint-600" />
                </div>
                <h3 className="text-xl font-display font-semibold text-zen-sage-800 mb-3">
                  {feature.title}
                </h3>
                <p className="text-zen-sage-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-10 py-20">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-display font-bold text-zen-sage-800 mb-6">
                Transform Your
                <span className="text-zen-peach-500"> Mental Wellness</span>
              </h2>
              <p className="text-xl text-zen-sage-600 mb-8">
                Join thousands who have discovered the power of mindful journaling
                with Zeno's compassionate guidance and AI-powered insights.
              </p>

              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit}
                    className="flex items-start space-x-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <CheckCircle className="w-6 h-6 text-zen-mint-500 mt-0.5 flex-shrink-0" />
                    <span className="text-zen-sage-700 font-medium">{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20">
                <div className="flex items-center space-x-4 mb-6">
                  <LottieAvatar mood={4} size="sm" variant="journaling" aria-label="Zeno the fox companion ready to help with daily check-ins" />
                  <div>
                    <h3 className="font-display font-semibold text-zen-sage-800">
                      Daily Check-in with Zeno
                    </h3>
                    <p className="text-zen-sage-600 text-sm">
                      Your caring companion is always here
                    </p>
                  </div>
                </div>
                
                <div className="bg-zen-mint-50 rounded-2xl p-4 mb-4">
                  <p className="text-zen-sage-700 italic">
                    "How are you feeling today? I'm here to listen and support you
                    on your journey to wellness and inner peace."
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((mood) => (
                    <div
                      key={mood}
                      className="w-10 h-10 bg-zen-sage-100 rounded-xl flex items-center justify-center text-lg hover:bg-zen-mint-200 transition-colors cursor-pointer"
                    >
                      {mood === 1 ? '😢' : mood === 2 ? '😔' : mood === 3 ? '😐' : mood === 4 ? '😊' : '🤗'}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative z-10 py-20 bg-white/30 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-zen-sage-800 mb-4">
              Loved by Our
              <span className="text-zen-lavender-500"> Community</span>
            </h2>
            <p className="text-xl text-zen-sage-600">
              See how Zensai has transformed lives and wellness journeys around the world
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-white/20"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="flex space-x-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current text-zen-peach-400" />
                  ))}
                </div>
                
                <p className="text-zen-sage-700 mb-6 italic leading-relaxed">
                  "{testimonial.content}"
                </p>
                
                <div>
                  <h4 className="font-display font-semibold text-zen-sage-800">
                    {testimonial.name}
                  </h4>
                  <p className="text-zen-sage-500 text-sm">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20">
        <div className="container mx-auto px-6">
          <motion.div
            className="bg-gradient-to-br from-zen-mint-400 via-zen-mint-500 to-zen-peach-400 rounded-3xl p-12 md:p-16 text-center shadow-2xl"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="flex justify-center mb-8">
              <LottieAvatar mood={5} size="lg" variant="greeting" aria-label="Excited Zeno the fox encouraging you to begin your mindfulness journey" />
            </div>
            
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-6">
              Ready to Begin Your
              <br />
              Mindfulness Journey?
            </h2>
            
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Join Zeno today and discover the transformative power of mindful journaling.
              Your path to emotional wellness and inner peace starts with a single entry.
            </p>
            
            <motion.button
              onClick={() => navigate('/auth')}
              className="group px-10 py-4 bg-white text-zen-mint-600 font-bold rounded-2xl hover:bg-zen-sage-50 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 flex items-center justify-center space-x-2 mx-auto"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>Start Your Journey Free</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
            
            <p className="text-white/80 text-sm mt-4">
              No credit card required • Free forever • Privacy protected
            </p>
          </motion.div>
        </div>
      </section>
      
      {/* Bolt Badge */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end space-y-2">
        <a 
          href="https://bolt.new/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="transition-transform hover:scale-110"
          aria-label="Powered by Bolt.new"
        >
          <img 
            src="/black_Boltbadge_360x360.webp" 
            alt="Powered by Bolt.new" 
            className="w-16 h-16 md:w-20 md:h-20 object-contain"
          />
        </a>
      </div>
    </div>
  );
}