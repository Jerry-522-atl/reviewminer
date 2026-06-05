'use client';

import { useState, useRef } from 'react';
import { Zap, Loader2, AlertCircle, ChevronRight, Target, TrendingUp, Star, X } from 'lucide-react';

interface AnalysisResult {
  productName: string;
  reviewsCount: number;
  overallSentiment: string;
  sentimentScore: number;
  opportunityScore: number;
  painPoints: { issue: string; frequency: number; severity: string }[];
  likes: { aspect: string; frequency: number }[];
  improvementSuggestions: { suggestion: string; priority: string; impact: string }[];
  competitorWeaknessSummary: string;
  keyPhrases: string[];
  actionableTakeaways: string[];
  ratingDistribution: { stars: number; count: number; percentage: number }[];
}

const DEMO_REVIEWS = `5 stars - Absolutely love this yoga mat! The thickness is perfect for my knees during poses. No slipping at all even during hot yoga.
1 star - Started falling apart after just 2 weeks. Little bits of black material everywhere. Very disappointed.
3 stars - It's okay for the price. Does the job but nothing special. The smell took a week to go away.
5 stars - Best mat I've owned. The alignment lines really help with positioning. Easy to clean too.
2 stars - Way too slippery when wet. Nearly injured myself doing downward dog. Also it's much thinner than advertised.
4 stars - Good mat overall. Nice texture and grip. Wish it came with a carrying strap though.
1 star - Chemical smell was unbearable. Had to air it out for days. Gave me a headache.
5 stars - Perfect for my daily practice. Lightweight enough to carry to class, but still provides great cushioning.
3 stars - Decent basic mat. Not great for hot yoga - gets way too slippery. Fine for regular use.
2 stars - The edges started curling up after a month. Tripped over it twice. Not worth the money.`;

export default function TryItDemo() {
  const [reviewText, setReviewText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleAnalyze = async () => {
    const text = reviewText.trim() || DEMO_REVIEWS;
    setError('');
    setAnalyzing(true);
    setResult(null);

    try {
      const res = await fetch('/api/analyze-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewText: text }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Analysis failed. Please try again.');
        return;
      }

      setResult(data.analysis);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const loadDemo = () => {
    setReviewText(DEMO_REVIEWS);
    setError('');
    setResult(null);
  };

  const severityColor = (s: string) =>
    s === 'high' ? 'bg-red-500' : s === 'medium' ? 'bg-yellow-500' : 'bg-gray-500';

  const priorityBadge = (p: string) =>
    p === 'high'
      ? 'bg-red-500/10 text-red-400 border-red-500/30'
      : p === 'medium'
        ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
        : 'bg-gray-500/10 text-gray-400 border-gray-500/30';

  return (
    <section id="try-it" className="px-4 py-20 max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-3">Try It Now — Free</h2>
        <p className="text-gray-400">
          Paste product reviews below and see what our AI uncovers. No signup required.
        </p>
      </div>

      {/* Input Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            Paste Reviews
          </h3>
          <button
            onClick={loadDemo}
            className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Load demo reviews ↗
          </button>
        </div>

        <textarea
          value={reviewText}
          onChange={(e) => { setReviewText(e.target.value); setResult(null); }}
          rows={8}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none placeholder:text-gray-600"
          placeholder="Paste reviews here — one per line, from Amazon or any store...&#10;&#10;Or click 'Load demo reviews' above to see a sample analysis instantly."
        />

        {error && (
          <div className="mt-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="mt-4 w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              AI is analyzing reviews...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Analyze Reviews (Free)
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div ref={resultRef} className="bg-gray-900 border border-emerald-500/20 rounded-2xl p-6 space-y-6 animate-in fade-in">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-xl font-bold">{result.productName}</h3>
              <p className="text-sm text-gray-400">{result.reviewsCount} reviews analyzed</p>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-emerald-400">
                  {result.opportunityScore}<span className="text-sm">/10</span>
                </div>
                <div className="text-xs text-gray-500">Opportunity</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">
                  {result.sentimentScore}<span className="text-sm">/10</span>
                </div>
                <div className="text-xs text-gray-500">Sentiment</div>
              </div>
            </div>
          </div>

          {/* Weakness Summary */}
          <div className="bg-gradient-to-r from-red-500/5 to-emerald-500/5 border border-gray-800 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-1.5">
              <Target className="w-4 h-4" /> Competitor Weakness Summary
            </h4>
            <p className="text-gray-300 text-sm leading-relaxed">{result.competitorWeaknessSummary}</p>
          </div>

          {/* Pain Points + Likes */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-red-400 mb-3">😤 Customer Pain Points</h4>
              <div className="space-y-2">
                {result.painPoints.length === 0 ? (
                  <p className="text-gray-500 text-sm">No significant pain points detected.</p>
                ) : (
                  result.painPoints.slice(0, 5).map((p, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${severityColor(p.severity)}`} />
                      <span className="text-gray-300">{p.issue}</span>
                      <span className="text-gray-600 text-xs ml-auto shrink-0">×{p.frequency}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-emerald-400 mb-3">😍 What Customers Love</h4>
              <div className="space-y-2">
                {result.likes.length === 0 ? (
                  <p className="text-gray-500 text-sm">No clear positive patterns detected.</p>
                ) : (
                  result.likes.slice(0, 5).map((l, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Star className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <span className="text-gray-300">{l.aspect}</span>
                      <span className="text-gray-600 text-xs ml-auto shrink-0">×{l.frequency}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Improvement Suggestions */}
          <div>
            <h4 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> How to Beat This Product
            </h4>
            <div className="space-y-3">
              {result.improvementSuggestions.length === 0 ? (
                <p className="text-gray-500 text-sm">No specific improvement suggestions available.</p>
              ) : (
                result.improvementSuggestions.slice(0, 4).map((s, i) => (
                  <div key={i} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityBadge(s.priority)}`}>
                        {s.priority.toUpperCase()} PRIORITY
                      </span>
                    </div>
                    <p className="text-sm text-gray-200">{s.suggestion}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.impact}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Key Phrases */}
          {result.keyPhrases.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-purple-400 mb-3">🔑 Keywords for Listing</h4>
              <div className="flex flex-wrap gap-2">
                {result.keyPhrases.map((p, i) => (
                  <span key={i} className="bg-purple-500/10 text-purple-300 text-xs px-3 py-1 rounded-full">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actionable Takeaways */}
          {result.actionableTakeaways.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">✅ Your Action Plan</h4>
              <div className="space-y-2">
                {result.actionableTakeaways.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <ChevronRight className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span className="text-gray-200">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 text-center">
            <p className="text-gray-300 text-sm mb-3">
              Want unlimited analyses, competitor tracking, and export reports?
            </p>
            <a
              href="/register"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
            >
              Start Free — 3 Analyses Included <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
