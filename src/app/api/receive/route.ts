import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { execute } from '@/lib/db';
import { getUserId } from '@/lib/auth';
import { parseReviewsFromText, formatReviewsForAI } from '@/lib/scraper';
import { analyzeReviews } from '@/lib/ai';

// In-memory cache for extension-submitted analyses (survives between requests, not deploys)
const analysisCache = new Map<string, object>();

export async function POST(request: NextRequest) {
  try {
    const { reviews, productName, productUrl } = await request.json();

    const reviewText = typeof reviews === 'string'
      ? reviews
      : Array.isArray(reviews)
        ? reviews.map((r: any) =>
            `Rating: ${r.rating || '?'}/5${r.verified ? ' (Verified)' : ''}\nTitle: ${r.title || ''}\n${r.body || r.text || ''}`
          ).join('\n\n---\n\n')
        : '';

    if (!reviewText || reviewText.length < 20) {
      return NextResponse.json({ error: 'Not enough review data to analyze' }, { status: 400 });
    }

    const parsed = parseReviewsFromText(reviewText);
    if (parsed.length === 0) {
      return NextResponse.json({ error: 'Could not parse reviews' }, { status: 400 });
    }

    const formattedReviews = formatReviewsForAI(parsed);
    const analysis = await analyzeReviews(formattedReviews, productUrl);

    const analysisId = uuid();
    const name = productName || analysis.productName || 'Product Analysis';

    const result = {
      id: analysisId,
      productName: name,
      productUrl: productUrl || '',
      reviewsCount: parsed.length,
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
    };

    // Cache in memory
    analysisCache.set(analysisId, result);

    // If user is logged in, save to their account
    const userId = await getUserId();
    if (userId) {
      await execute(
        'INSERT INTO analyses (id, user_id, product_name, product_url, source_type, raw_reviews, status, result_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [analysisId, userId, name, productUrl || '', 'extension', formattedReviews, 'completed', JSON.stringify(analysis)]
      );
      const users = await execute(
        'UPDATE users SET analyses_used = analyses_used + 1 WHERE id = ?',
        [userId]
      );
    }

    return NextResponse.json({
      success: true,
      id: analysisId,
      url: `/dashboard?open=${analysisId}`,
      analysis: result,
    });
  } catch (error: any) {
    console.error('Receive error:', error);
    return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing analysis ID' }, { status: 400 });
  }

  const cached = analysisCache.get(id);
  if (cached) {
    return NextResponse.json({ analysis: cached });
  }

  return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
}
