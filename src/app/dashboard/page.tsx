'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, FileText, Loader2, AlertCircle, Zap, Clock, TrendingUp, Target, ChevronRight, CheckCircle, Crown, ExternalLink } from 'lucide-react';

interface User {
  id: string; email: string; plan: string;
  analyses_used: number; analyses_limit: number;
  license_key?: string;
}

interface Analysis {
  id: string; product_name: string; product_url: string;
  status: string; created_at: string;
}

interface AnalysisResult {
  id: string; productName: string; reviewsCount: number;
  overallSentiment: string; sentimentScore: number;
  opportunityScore: number;
  painPoints: { issue: string; frequency: number; severity: string }[];
  likes: { aspect: string; frequency: number }[];
  improvementSuggestions: { suggestion: string; priority: string; impact: string }[];
  competitorWeaknessSummary: string;
  keyPhrases: string[];
  actionableTakeaways: string[];
  ratingDistribution: { stars: number; count: number; percentage: number }[];
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [productUrl, setProductUrl] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [inputMode, setInputMode] = useState<'url' | 'text'>('url');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [subscribed, setSubscribed] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [userRes, analysesRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/analysis'),
      ]);
      const userData = await userRes.json();
      const analysesData = await analysesRes.json();

      if (!userData.user) {
        router.push('/login');
        return;
      }
      setUser(userData.user);
      setAnalyses(analysesData.analyses || []);
      setRemaining(userData.user.analyses_limit - userData.user.analyses_used);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load analysis from extension via ?open=<id>
  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId || !user) return;

    fetch(`/api/receive?id=${encodeURIComponent(openId)}`)
      .then(r => r.json())
      .then(data => {
        if (data.analysis) {
          setResult(data.analysis);
          setInputMode('text');
        }
      })
      .catch(() => {});
  }, [searchParams, user]);

  // Show success banner after LemonSqueezy checkout redirect
  useEffect(() => {
    if (searchParams.get('subscribed') === '1') {
      setSubscribed(true);
      fetchData(); // Refresh user plan info
    }
  }, [searchParams, fetchData]);

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      // Free → Growth, Growth → Pro
      const targetPlan = user?.plan === 'free' ? 'growth' : 'pro';
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: targetPlan }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Payment not available yet');
      }
    } catch {
      setError('Network error');
    } finally {
      setUpgrading(false);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAnalyzing(true);
    setResult(null);

    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productUrl: inputMode === 'url' ? productUrl : undefined,
          reviewText: inputMode === 'text' ? reviewText : undefined,
          sourceType: inputMode === 'url' ? 'amazon' : 'text',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          setError('Analysis limit reached. Upgrade to Growth for 15 analyses/month, or Pro for 50.');
        } else {
          setError(data.error || 'Analysis failed');
        }
        return;
      }

      setResult(data.analysis);
      setRemaining(data.remaining);
      fetchData();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
          <p className="text-gray-400 text-sm">
            {user?.plan === 'pro'
              ? 'Pro Plan · 50 analyses/month'
              : user?.plan === 'growth'
              ? 'Growth Plan · 15 analyses/month'
              : `Free Plan · ${remaining} of ${user?.analyses_limit || 3} analyses remaining`}
          </p>
        </div>
        {user?.plan === 'free' ? (
          <button
            onClick={handleUpgrade}
            disabled={upgrading}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-medium px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {upgrading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Crown className="w-4 h-4" />
            )}
            {upgrading ? 'Redirecting...' : 'Upgrade to Growth'}
          </button>
        ) : user?.plan === 'growth' ? (
          <button
            onClick={handleUpgrade}
            disabled={upgrading}
            className="bg-purple-500 hover:bg-purple-400 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {upgrading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {upgrading ? 'Redirecting...' : 'Upgrade to Pro'}
          </button>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              {user?.plan === 'pro' ? 'Pro' : 'Growth'} Active
            </span>
          </div>
        )}
      </div>

      {/* Subscribed success banner */}
      {subscribed && (
        <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-5 py-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <div className="font-medium text-emerald-400">Subscription Active!</div>
            <div className="text-sm text-gray-400">
              Your account has been upgraded. You now have {user?.analyses_limit || 30} analyses per month.
            </div>
          </div>
          <button onClick={() => setSubscribed(false)} className="ml-auto text-gray-500 hover:text-gray-300 text-lg leading-none">&times;</button>
        </div>
      )}

      {/* License key for ImageGrab extension */}
      {user?.license_key && (
        <div className="mb-6 bg-purple-500/5 border border-purple-500/20 rounded-xl px-5 py-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs text-purple-400 font-semibold uppercase tracking-wide">ImageGrab License Key</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-gray-800 text-purple-300 font-mono text-sm px-3 py-2 rounded-lg flex-1 select-all">{user.license_key}</code>
            <button
              onClick={() => navigator.clipboard.writeText(user.license_key!)}
              className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-xs px-3 py-2 rounded-lg transition-colors"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Paste this key into the ImageGrab Chrome extension to unlock unlimited image downloads.
          </p>
        </div>
      )}

      {/* Usage bar for non-pro plans */}
      {user?.plan !== 'pro' && (
        <div className="mb-8 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">
              {user?.plan === 'growth' ? 'Growth analyses used' : 'Free analyses used'}
            </span>
            <span className="text-sm text-gray-300">{user?.analyses_used || 0} / {user?.analyses_limit || 3}</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2 mb-3">
            <div
              className={`h-2 rounded-full transition-all ${user?.plan === 'growth' ? 'bg-purple-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, ((user?.analyses_used || 0) / (user?.analyses_limit || 3)) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            {remaining > 0
              ? `${remaining} ${remaining === 1 ? 'analysis' : 'analyses'} remaining.`
              : user?.plan === 'growth'
                ? 'Growth limit reached. Upgrade to Pro for 50/month.'
                : 'No free analyses left. Upgrade to Growth to continue.'}
          </p>
        </div>
      )}

      {/* Analysis Form */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-emerald-400" />
          New Analysis
        </h2>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setInputMode('url')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${inputMode === 'url' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-800 text-gray-400'}`}
          >
            Paste URL
          </button>
          <button
            onClick={() => setInputMode('text')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${inputMode === 'text' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-800 text-gray-400'}`}
          >
            Paste Reviews
          </button>
        </div>

        <form onSubmit={handleAnalyze}>
          {inputMode === 'url' ? (
            <input
              type="url"
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors text-sm"
              placeholder="https://www.amazon.com/dp/B0XXXXXXX — paste any product URL"
            />
          ) : (
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={8}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors text-sm resize-none"
              placeholder="Paste review text here — one per line, or the full review HTML from any product page..."
            />
          )}

          {error && (
            <div className="mt-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={analyzing || (!productUrl && !reviewText)}
            className="mt-4 w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing reviews with AI...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Analyze Reviews
              </>
            )}
          </button>
        </form>
      </div>

      {/* Results */}
      {result && <AnalysisResultCard result={result} />}

      {/* Past Analyses */}
      <div className="mt-12">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-400" />
          Recent Analyses
        </h2>
        {analyses.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No analyses yet. Paste a product URL above to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {analyses.map((a) => (
              <div key={a.id} className="bg-gray-900/50 border border-gray-800/50 rounded-xl px-5 py-4 flex items-center justify-between hover:border-gray-700 transition-colors">
                <div>
                  <div className="font-medium text-sm">{a.product_name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {new Date(a.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    {a.product_url && <span className="ml-2 text-gray-600 truncate max-w-xs inline-block">{a.product_url}</span>}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AnalysisResultCard({ result }: { result: AnalysisResult }) {
  return (
    <div className="bg-gray-900 border border-emerald-500/20 rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-bold">{result.productName}</h3>
          <p className="text-sm text-gray-400">{result.reviewsCount} reviews analyzed</p>
        </div>
        <div className="flex gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-emerald-400">{result.opportunityScore}<span className="text-sm">/10</span></div>
            <div className="text-xs text-gray-500">Opportunity Score</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400">{result.sentimentScore}<span className="text-sm">/10</span></div>
            <div className="text-xs text-gray-500">Sentiment</div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-red-500/5 to-emerald-500/5 border border-gray-800 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-1.5">
          <Target className="w-4 h-4" /> Competitor Weakness Summary
        </h4>
        <p className="text-gray-300 text-sm leading-relaxed">{result.competitorWeaknessSummary}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-semibold text-red-400 mb-3">Pain Points</h4>
          <div className="space-y-2">
            {result.painPoints.slice(0, 5).map((p, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${p.severity === 'high' ? 'bg-red-500' : p.severity === 'medium' ? 'bg-yellow-500' : 'bg-gray-500'}`} />
                <span className="text-gray-300">{p.issue}</span>
                <span className="text-gray-600 text-xs ml-auto">{p.frequency}x</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-emerald-400 mb-3">What Customers Love</h4>
          <div className="space-y-2">
            {result.likes.slice(0, 5).map((l, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span className="text-gray-300">{l.aspect}</span>
                <span className="text-gray-600 text-xs ml-auto">{l.frequency}x</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4" /> Improvement Suggestions
        </h4>
        <div className="space-y-3">
          {result.improvementSuggestions.slice(0, 5).map((s, i) => (
            <div key={i} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${s.priority === 'high' ? 'bg-red-500/10 text-red-400' : s.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-gray-500/10 text-gray-400'}`}>
                  {s.priority.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-200">{s.suggestion}</p>
              <p className="text-xs text-gray-500 mt-1">{s.impact}</p>
            </div>
          ))}
        </div>
      </div>

      {result.keyPhrases.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-purple-400 mb-3">Key Phrases for Listing Optimization</h4>
          <div className="flex flex-wrap gap-2">
            {result.keyPhrases.map((p, i) => (
              <span key={i} className="bg-purple-500/10 text-purple-300 text-xs px-3 py-1 rounded-full">{p}</span>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-white mb-3">Action Plan</h4>
        <div className="space-y-2">
          {result.actionableTakeaways.map((t, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <ChevronRight className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <span className="text-gray-200">{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
