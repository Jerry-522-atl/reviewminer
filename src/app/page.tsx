import Link from 'next/link';
import { TrendingUp, Target, Zap, Shield, ArrowRight, Star, Check } from 'lucide-react';

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="px-4 pt-24 pb-20 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 text-sm px-4 py-1.5 rounded-full mb-6">
          <Zap className="w-3.5 h-3.5" />
          AI-Powered Competitive Intelligence
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
          Find Your Competitor&apos;s Weakness
          <br />
          <span className="text-emerald-400">Before They Know It</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Paste any product URL or reviews. Our AI analyzes thousands of customer reviews
          to tell you exactly what to improve, what to copy, and how to win. Built for
          cross-border sellers who want to dominate.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-8 py-3 rounded-xl text-lg transition-all hover:scale-105 inline-flex items-center justify-center gap-2"
          >
            Start Free — 3 Analyses Included
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="#how-it-works"
            className="border border-gray-700 hover:border-gray-500 text-gray-300 px-8 py-3 rounded-xl text-lg transition-colors"
          >
            See How It Works
          </Link>
        </div>
        <div className="mt-8 text-sm text-gray-500">
          No credit card required · Cancel anytime · 3 free analyses
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-4 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-16">Three Steps to Outperform</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: '1',
              title: 'Paste Product URL',
              desc: 'Drop in any Amazon, Shopify, or Shopee product link. We automatically pull all reviews.',
              icon: Target,
            },
            {
              step: '2',
              title: 'AI Deep Analysis',
              desc: 'Our AI reads every review and identifies pain points, what customers love, and where competitors fall short.',
              icon: Zap,
            },
            {
              step: '3',
              title: 'Get Your Battle Plan',
              desc: 'Receive a detailed report with improvement suggestions, keyword opportunities, and a competitor vulnerability score.',
              icon: TrendingUp,
            },
          ].map((item) => (
            <div key={item.step} className="bg-gray-900 border border-gray-800 rounded-2xl p-8 hover:border-emerald-500/30 transition-colors">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-5">
                <item.icon className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="text-xs text-emerald-400 font-semibold mb-2">STEP {item.step}</div>
              <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
              <p className="text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-4 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-16">Everything You Need to Win</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { title: 'Pain Point Detection', desc: 'Automatically identify every complaint pattern across hundreds of reviews. Know exactly what customers hate.' },
            { title: 'Opportunity Scoring', desc: 'Get a 1-10 score on how easy it is to beat each competitor. Prioritize your product improvements.' },
            { title: 'Keyword Intelligence', desc: 'Extract high-value keywords from real customer language. Optimize your listing with words buyers actually use.' },
            { title: 'Sentiment Breakdown', desc: 'See rating distribution, verified vs unverified reviews, and overall sentiment trends at a glance.' },
            { title: 'Actionable Suggestions', desc: 'Not just data — specific recommendations for product improvements, listing changes, and pricing strategy.' },
            { title: 'Multi-Platform Support', desc: 'Works with Amazon, Shopify stores, Shopee, AliExpress, and more. Paste any URL or copy-paste reviews directly.' },
          ].map((f) => (
            <div key={f.title} className="flex gap-4 p-6 bg-gray-900/50 border border-gray-800/50 rounded-xl">
              <Check className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-4 py-20 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">Simple Pricing</h2>
        <p className="text-gray-400 text-center mb-12">Start free. Upgrade when you&apos;re ready to scale.</p>
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <h3 className="text-lg font-semibold mb-2">Starter</h3>
            <div className="text-4xl font-bold mb-1">Free</div>
            <p className="text-gray-400 text-sm mb-6">3 analyses included</p>
            <ul className="space-y-3 mb-8">
              {['3 full product analyses', 'Pain point detection', 'Sentiment analysis', 'Basic keyword extraction'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/register" className="block text-center border border-gray-700 hover:border-gray-500 text-white font-medium py-3 rounded-xl transition-colors">
              Get Started
            </Link>
          </div>
          {/* Pro */}
          <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-2xl p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-xs font-bold px-3 py-1 rounded-full">
              MOST POPULAR
            </div>
            <h3 className="text-lg font-semibold mb-2">Professional</h3>
            <div className="text-4xl font-bold mb-1">$29<span className="text-lg text-gray-400">/mo</span></div>
            <p className="text-gray-400 text-sm mb-6">Unlimited analyses</p>
            <ul className="space-y-3 mb-8">
              {[
                'Unlimited product analyses',
                'Advanced AI insights',
                'Competitor tracking',
                'Full keyword intelligence',
                'Export reports (PDF/CSV)',
                'Priority support',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                  <Star className="w-4 h-4 text-emerald-400 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/register" className="block text-center bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-3 rounded-xl transition-colors">
              Start Pro Trial
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto bg-gradient-to-b from-gray-900 to-gray-950 border border-gray-800 rounded-3xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Crush Your Competitors?</h2>
          <p className="text-gray-400 mb-8">Join hundreds of cross-border sellers using ReviewMiner to find winning products and optimize listings.</p>
          <Link href="/register" className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-8 py-3 rounded-xl text-lg transition-all">
            Get Started Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-4 py-8 text-center text-sm text-gray-600">
        <p>ReviewMiner — Competitive intelligence for cross-border sellers.</p>
      </footer>
    </>
  );
}
