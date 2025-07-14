/**
 * Stripe product configuration
 */

export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_SXubM10Mw2WKpj',
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID_MONTHLY || 'price_1RcomKLWkwWYEqp4aKMwj9Lv',
    name: 'Monthly Premium',
    description: 'Make it a habit.',
    mode: 'subscription'
  },
  {
    id: 'prod_SXuddrXOUtOOG5',
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID_YEARLY || 'price_1RdkFPLWkwWYEqp4AMPJDzF6',
    name: 'Yearly Premium',
    description: 'Make it part of your everyday life.',
    mode: 'subscription'
  }
];

/**
 * Get a product by its price ID
 * 
 * @param priceId - The Stripe price ID
 * @returns The product with the matching price ID, or undefined if not found
 */
export function getProductByPriceId(priceId: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.priceId === priceId);
}

/**
 * Get a product by its ID
 * 
 * @param productId - The Stripe product ID
 * @returns The product with the matching ID, or undefined if not found
 */
export function getProductById(productId: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.id === productId);
}