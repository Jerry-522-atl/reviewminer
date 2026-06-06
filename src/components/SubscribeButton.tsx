'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Star } from 'lucide-react';

export default function SubscribeButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubscribe = async () => {
    setLoading(true);
    setError('');

    try {
      // Check if user is logged in
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();

      if (!meData.user) {
        // Not logged in — redirect to register, then to checkout after
        router.push('/register?plan=pro');
        return;
      }

      // Create checkout
      const res = await fetch('/api/billing/checkout', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 503) {
          setError('Payment coming soon! Check back in a few days.');
        } else {
          setError(data.error || 'Something went wrong');
        }
        return;
      }

      // Redirect to LemonSqueezy checkout
      window.location.href = data.url;
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="w-full text-center bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Redirecting...
          </>
        ) : (
          <>
            <Star className="w-4 h-4" />
            Start Pro Trial
          </>
        )}
      </button>
      {error && (
        <p className="text-red-400 text-xs mt-2 text-center">{error}</p>
      )}
    </div>
  );
}
