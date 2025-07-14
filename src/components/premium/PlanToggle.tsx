import React from 'react';
import { motion } from 'framer-motion';

/**
 * PlanToggle - A toggle component for switching between monthly and yearly subscription plans
 * 
 * @component
 * @param {('monthly'|'yearly')} selectedPlan - Currently selected plan
 * @param {function} onSelectPlan - Callback function when plan is changed
 * 
 * @example
 * const [plan, setPlan] = useState('yearly');
 * return <PlanToggle selectedPlan={plan} onSelectPlan={setPlan} />
 */
interface PlanToggleProps {
  selectedPlan: 'monthly' | 'yearly';
  onSelectPlan: (plan: 'monthly' | 'yearly') => void;
}

const PlanToggle = React.memo(function PlanToggle({
  selectedPlan,
  onSelectPlan
}: PlanToggleProps) {
  const { MONTHLY_BUTTON, YEARLY_BUTTON } = PREMIUM.PLAN_SELECTION;
  
  return (
    <div className="flex justify-center mb-8">
      <div className="bg-white/60 dark:bg-gray-800/60 p-1 rounded-xl shadow-md inline-flex">
        {['monthly', 'yearly'].map((plan) => (
          <motion.button
            key={plan}
            onClick={() => onSelectPlan(plan as 'monthly' | 'yearly')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              selectedPlan === plan
                ? 'bg-zen-mint-500 text-white shadow-md'
                : 'text-zen-sage-600 dark:text-gray-400 hover:bg-zen-mint-100 dark:hover:bg-gray-700'
            }`}
            whileHover={selectedPlan !== plan ? { scale: 1.02 } : {}}
            whileTap={{ scale: 0.95 }}
            aria-pressed={selectedPlan === plan}
            aria-label={`Select ${plan} billing plan`}
          >
            {plan === 'monthly' ? MONTHLY_BUTTON : YEARLY_BUTTON}
          </motion.button>
        ))}
      </div>
    </div>
  );
});

export default PlanToggle;