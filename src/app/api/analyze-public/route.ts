import { NextRequest, NextResponse } from 'next/server';
import { analyzeReviews } from '@/lib/ai';
import { parseReviewsFromText, formatReviewsForAI } from '@/lib/scraper';

// Simple in-memory rate limiter: 5 requests per IP per hour
const rateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + 3600000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json({
        error: 'Free trial limit reached. Sign up for unlimited analyses.',
        upgrade: true,
      }, { status: 429 });
    }

    const { reviewText } = await request.json();

    if (!reviewText || reviewText.length < 20) {
      return NextResponse.json({
        error: 'Please paste at least 20 characters of review text for analysis.',
      }, { status: 400 });
    }

    const trimmedText = reviewText.slice(0, 8000);
    const reviews = parseReviewsFromText(trimmedText);

    if (reviews.length === 0) {
      return NextResponse.json({
        error: 'Could not detect reviews in the text. Try pasting one review per line.',
      }, { status: 400 });
    }

    const formattedReviews = formatReviewsForAI(reviews);
    const analysis = await analyzeReviews(formattedReviews);

    return NextResponse.json({
      success: true,
      analysis: {
        productName: analysis.productName,
        reviewsCount: reviews.length,
        overallSentiment: analysis.overallSentiment,
        sentimentScore: analysis.sentimentScore,
        opportunityScore: analysis.opportunityScore,
        painPoints: analysis.painPoints,
        likes: analysis.likes,
        improvementSuggestions: analysis.improvementSuggestions,
        competitorWeaknessSummary: analysis.competitorWeaknessSummary,
        keyPhrases: analysis.keyPhrases,
        actionableTakeaways: analysis.actionableTakeaways,
        ratingDistribution: analysis.ratingDistribution,
      },
    });
  } catch (error: any) {
    console.error('Public analysis error:', error);
    return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 });
  }
}
