import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Heart, Sparkles, AlertCircle, CheckCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { validateForm } from '../utils/validation';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';
import LottieAvatar from './LottieAvatar';

export default function AuthScreen() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string[] }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { login, signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    setFieldErrors({});

    // Validate form
    const validation = validateForm(formData, !isLogin);
    if (!validation.isValid) {
      setFieldErrors(validation.fieldErrors);
      setError('Please fix the errors below and try again.');
      setIsLoading(false);
      return;
    }

    // Check password confirmation for signup
    if (!isLogin && formData.password !== formData.confirmPassword) {
      setFieldErrors({ confirmPassword: ['Passwords do not match'] });
      setError('Please make sure your passwords match.');
      setIsLoading(false);
      return;
    }

    try {
      const result = isLogin 
        ? await login(formData.email, formData.password)
        : await signup(formData.name, formData.email, formData.password);

      if (result.success) {
        if (result.error) {
          // This is for email confirmation messages
          setSuccess(result.error);
          setIsLoading(false);
          return;
        }
        // Navigation will be handled by the AuthContext and App component
      } else {
        setError(result.error || 'Authentication failed. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear field-specific errors when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: []
      }));
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
    setFieldErrors({});
    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const getFieldError = (fieldName: string): string | undefined => {
    return fieldErrors[fieldName]?.[0];
  };

  const hasFieldError = (fieldName: string): boolean => {
    return fieldErrors[fieldName]?.length > 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 flex items-center justify-center p-4">
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

      {/* Back to Landing Button */}
      <motion.button
        onClick={() => navigate('/landing')}
        className="fixed top-6 left-6 z-20 flex items-center space-x-2 px-4 py-2 bg-white/80 backdrop-blur-sm text-zen-sage-600 hover:text-zen-sage-800 hover:bg-white/90 rounded-full transition-all duration-300 shadow-lg"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Back</span>
      </motion.button>

      {/* Logo with Zeno */}
      <motion.div
        className="fixed top-6 right-6 z-20 flex items-center space-x-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Logo size="sm" />
        <h1 className="font-display font-bold text-zen-sage-800">Zensai</h1>
        <p className="text-xs text-zen-sage-600">with Zeno</p>
      </motion.div>

      {/* Success Message */}
      <AnimatePresence>
        {success && (
          <motion.div
            className="fixed top-4 right-4 bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 text-white px-6 py-4 rounded-2xl shadow-xl z-50 border border-zen-mint-300 max-w-sm"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Success! 🎉</p>
                <p className="text-sm opacity-90">{success}</p>
              </div>
              <button
                onClick={() => setSuccess('')}
                className="ml-2 text-white/80 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="fixed top-4 right-4 bg-gradient-to-r from-red-400 to-red-500 text-white px-6 py-4 rounded-2xl shadow-xl z-50 border border-red-300 max-w-sm"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Error 😕</p>
                <p className="text-sm opacity-90">{error}</p>
              </div>
              <button
                onClick={() => setError('')}
                className="ml-2 text-white/80 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Welcome Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/30">
          {/* Header with Zeno */}
          <div className="text-center mb-8">
            <motion.div
              className="flex justify-center mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <Logo size="lg" />
            </motion.div>
            
            <motion.h1
              className="text-3xl font-display font-bold text-zen-sage-800 mb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {isLogin ? 'Welcome Back!' : 'Join Zensai'}
            </motion.h1>
            
            <motion.p
              className="text-zen-sage-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              {isLogin 
                ? 'Zeno missed you! Ready to continue your wellness journey?'
                : 'Start your mindful journey with Zeno as your companion'
              }
            </motion.p>
          </div>

          {/* Auth Toggle */}
          <div className="flex bg-zen-mint-100/80 rounded-2xl p-1 mb-8">
            <motion.button
              onClick={() => !isLoading && setIsLogin(true)}
              disabled={isLoading}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                isLogin
                  ? 'bg-white text-zen-sage-800 shadow-lg'
                  : 'text-zen-sage-600 hover:text-zen-sage-800'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              whileHover={!isLoading ? { scale: 1.02 } : {}}
              whileTap={{ scale: 0.98 }}
            >
              Sign In
            </motion.button>
            <motion.button
              onClick={() => !isLoading && setIsLogin(false)}
              disabled={isLoading}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                !isLogin
                  ? 'bg-white text-zen-sage-800 shadow-lg'
                  : 'text-zen-sage-600 hover:text-zen-sage-800'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              whileHover={!isLoading ? { scale: 1.02 } : {}}
              whileTap={{ scale: 0.98 }}
            >
              Sign Up
            </motion.button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zen-sage-400" />
                    <input
                      type="text"
                      name="name"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required={!isLogin}
                      disabled={isLoading}
                      className={`w-full pl-12 pr-4 py-4 bg-white/70 border-2 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zen-mint-400 focus:border-transparent placeholder-zen-sage-400 transition-all duration-300 ${
                        hasFieldError('name') 
                          ? 'border-red-300 focus:ring-red-400' 
                          : 'border-zen-mint-200 hover:border-zen-mint-300'
                      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    {hasFieldError('name') && (
                      <motion.p
                        className="text-red-500 text-sm mt-2 ml-1"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        {getFieldError('name')}
                      </motion.p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zen-sage-400" />
              <input
                type="email"
                name="email"
                placeholder="Email address"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                className={`w-full pl-12 pr-4 py-4 bg-white/70 border-2 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zen-mint-400 focus:border-transparent placeholder-zen-sage-400 transition-all duration-300 ${
                  hasFieldError('email') 
                    ? 'border-red-300 focus:ring-red-400' 
                    : 'border-zen-mint-200 hover:border-zen-mint-300'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              {hasFieldError('email') && (
                <motion.p
                  className="text-red-500 text-sm mt-2 ml-1"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {getFieldError('email')}
                </motion.p>
              )}
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zen-sage-400" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                className={`w-full pl-12 pr-12 py-4 bg-white/70 border-2 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zen-mint-400 focus:border-transparent placeholder-zen-sage-400 transition-all duration-300 ${
                  hasFieldError('password') 
                    ? 'border-red-300 focus:ring-red-400' 
                    : 'border-zen-mint-200 hover:border-zen-mint-300'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-zen-sage-400 hover:text-zen-sage-600 transition-colors"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
              {hasFieldError('password') && (
                <motion.p
                  className="text-red-500 text-sm mt-2 ml-1"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {getFieldError('password')}
                </motion.p>
              )}
            </div>

            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zen-sage-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Confirm password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required={!isLogin}
                      disabled={isLoading}
                      className={`w-full pl-12 pr-12 py-4 bg-white/70 border-2 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zen-mint-400 focus:border-transparent placeholder-zen-sage-400 transition-all duration-300 ${
                        hasFieldError('confirmPassword') 
                          ? 'border-red-300 focus:ring-red-400' 
                          : 'border-zen-mint-200 hover:border-zen-mint-300'
                      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-zen-sage-400 hover:text-zen-sage-600 transition-colors"
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                    {hasFieldError('confirmPassword') && (
                      <motion.p
                        className="text-red-500 text-sm mt-2 ml-1"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        {getFieldError('confirmPassword')}
                      </motion.p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 text-white font-semibold rounded-2xl hover:from-zen-mint-500 hover:to-zen-mint-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-300"
              whileHover={!isLoading ? { scale: 1.02 } : {}}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Please wait...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Heart className="w-5 h-5" />
                  <span>{isLogin ? 'Welcome Back' : 'Start Your Journey'}</span>
                </div>
              )}
            </motion.button>
          </form>

          {/* Toggle Auth Mode */}
          <div className="text-center mt-6">
            <p className="text-zen-sage-600">
              {isLogin ? "New to Zensai?" : "Already have an account?"}
              <button
                onClick={toggleAuthMode}
                disabled={isLoading}
                className="ml-2 text-zen-mint-600 hover:text-zen-mint-700 font-medium transition-colors disabled:opacity-50"
              >
                {isLogin ? "Create an account" : "Sign in instead"}
              </button>
            </p>
          </div>

          {/* Footer Message */}
          <motion.div
            className="text-center mt-8 text-sm text-zen-sage-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <div className="flex items-center justify-center space-x-1">
              <Sparkles className="w-4 h-4" />
              <span>
                {isLogin 
                  ? "Zeno is excited to see you again!" 
                  : "Begin your mindfulness journey with Zeno"
                }
              </span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}