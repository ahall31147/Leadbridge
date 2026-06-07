import { Check } from 'lucide-react';
import axios from 'axios';

const tiers = [
  {
    name: 'Starter',
    price: '$499',
    leads: '10 leads/mo',
    features: ['Pre-qualified buyer/renter leads', 'Dedicated agent support', 'Lead tracking dashboard', 'Email delivery'],
    priceId: 'price_starter'
  },
  {
    name: 'Pro',
    price: '$1,299',
    leads: '30 leads/mo',
    features: ['Everything in Starter', 'Priority lead delivery', 'Custom qualification criteria', 'SMS notifications'],
    priceId: 'price_pro'
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    leads: 'Unlimited',
    features: ['Bulk lead volume', 'Full white-label support', 'API access', 'Dedicated account manager'],
    priceId: 'price_enterprise'
  }
];

const LandingPage = () => {
  const handleSubscribe = async (priceId: string) => {
    try {
      const response = await axios.post('http://localhost:3001/api/create-checkout-session', { priceId });
      alert(response.data.message + '\nRedirecting to: ' + response.data.url);
    } catch (error) {
      console.error('Subscription error', error);
      alert('Error creating checkout session. Make sure the backend is running.');
    }
  };

  return (
    <div className="bg-white">
      {/* Hero section */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Steady pipeline of pre-qualified real estate leads
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Stop hunting. Start closing. We deliver warm leads and provide active conversion support to help you grow your business.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <a href="#pricing" className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
              View Pricing
            </a>
          </div>
        </div>
      </div>

      {/* Pricing section */}
      <div id="pricing" className="py-24 sm:py-32 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600">Pricing</h2>
            <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Choose the right tier for your business
            </p>
          </div>
          <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8">
            {tiers.map((tier) => (
              <div key={tier.name} className="flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 ring-gray-200 xl:p-10">
                <div>
                  <h3 className="text-lg font-semibold leading-8 text-gray-900">{tier.name}</h3>
                  <p className="mt-4 text-sm leading-6 text-gray-600">{tier.leads}</p>
                  <p className="mt-6 flex items-baseline gap-x-1">
                    <span className="text-4xl font-bold tracking-tight text-gray-900">{tier.price}</span>
                    <span className="text-sm font-semibold leading-6 text-gray-600">/month</span>
                  </p>
                  <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex gap-x-3">
                        <Check className="h-6 w-5 flex-none text-blue-600" aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => handleSubscribe(tier.priceId)}
                  className="mt-8 block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  Subscribe
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
