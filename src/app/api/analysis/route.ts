import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { execute, query } from '@/lib/db';
import { getUserId } from '@/lib/auth';
import { scrapeAmazonReviews, parseReviewsFromText, formatReviewsForAI } from '@/lib/scraper';
import { analyzeReviews } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Please log in first' }, { status: 401 });
    }

    const users = await query(
      'SELECT analyses_used, analyses_limit, plan FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];

    if (user.plan === 'free' && user.analyses_used >= user.analyses_limit) {
      return NextResponse.json({
        error: 'Free analysis limit reached',
        upgrade: true,
        used: user.analyses_used,
        limit: user.analyses_limit,
      }, { status: 402 });
    }

    const { productUrl, reviewText, sourceType } = await request.json();

    if (!productUrl && !reviewText) {
      return NextResponse.json({ error: 'Please provide a product URL or review text' }, { status: 400 });
    }

    let reviews;
    let productName = 'Unknown Product';

    if (reviewText) {
      reviews = parseReviewsFromText(reviewText);
      productName = 'Custom Product';
    } else if (productUrl) {
      const result = await scrapeAmazonReviews(productUrl);
      reviews = result.reviews;
      productName = result.productName;
    } else {
      return NextResponse.json({ error: 'No data to analyze' }, { status: 400 });
    }

    if (reviews.length === 0) {
      return NextResponse.json({
        error: 'No reviews found. Try pasting reviews directly, or check the URL.',
      }, { status: 400 });
    }

    const formattedReviews = formatReviewsForAI(reviews);
    const analysis = await analyzeReviews(formattedReviews, productUrl);

    const analysisId = uuid();
    await execute(
      'INSERT INTO analyses (id, user_id, product_name, product_url, source_type, raw_reviews, status, result_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        analysisId,
        userId,
        productName,
        productUrl || '',
        sourceType || 'text',
        formattedReviews,
        'completed',
        JSON.stringify(analysis),
      ]
    );

    const newUsed = user.analyses_used + 1;
    await execute('UPDATE users SET analyses_used = ? WHERE id = ?', [newUsed, userId]);

    const { productName: aiProductName, ...restAnalysis } = analysis;

    return NextResponse.json({
      success: true,
      analysis: {
        id: analysisId,
        productName: aiProductName || productName,
        reviewsCount: reviews.length,
        ...restAnalysis,
      },
      remaining: user.analyses_limit - newUsed,
    });
  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const analyses = await query(
      'SELECT id, product_name, product_url, status, created_at FROM analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [userId]
    );

    return NextResponse.json({ analyses });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
