import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { execute, query } from '@/lib/db';
import { getUserId } from '@/lib/auth';
import { parseReviewsFromText, formatReviewsForAI } from '@/lib/scraper';
import { analyzeReviews } from '@/lib/ai';

// In-memory cache for extension-submitted analyses
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

    // Check quota BEFORE doing expensive AI analysis
    const userId = await getUserId();
    if (userId) {
      const users = await query(
        'SELECT analyses_used, analyses_limit, plan FROM users WHERE id = ?',
        [userId]
      );
      if (users.length > 0) {
        const user = users[0];
        if (user.analyses_used >= user.analyses_limit) {
          return NextResponse.json({
            error: 'Analysis limit reached',
            upgrade: true,
            used: user.analyses_used,
            limit: user.analyses_limit,
          }, { status: 402 });
        }
      }
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

    // If user is logged in, save and atomically increment
    if (userId) {
      await execute(
        'INSERT INTO analyses (id, user_id, product_name, product_url, source_type, raw_reviews, status, result_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [analysisId, userId, name, productUrl || '', 'extension', formattedReviews, 'completed', JSON.stringify(analysis)]
      );
      await execute(
        'UPDATE users SET analyses_used = analyses_used + 1 WHERE id = ? AND analyses_used < analyses_limit',
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
    console.error('Receive error:', error.message);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
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
