interface ReviewAnalysis {
  productName: string;
  overallSentiment: 'positive' | 'mixed' | 'negative';
  sentimentScore: number;
  painPoints: { issue: string; frequency: number; severity: 'high' | 'medium' | 'low' }[];
  likes: { aspect: string; frequency: number }[];
  improvementSuggestions: { suggestion: string; priority: 'high' | 'medium' | 'low'; impact: string }[];
  opportunityScore: number;
  competitorWeaknessSummary: string;
  keyPhrases: string[];
  ratingDistribution: { stars: number; count: number; percentage: number }[];
  actionableTakeaways: string[];
}

const SYSTEM_PROMPT = `You are an expert e-commerce product analyst specializing in cross-border selling. You analyze product reviews to find actionable business insights.

Analyze the provided reviews and return a JSON object with this exact structure:

{
  "productName": "extracted product name",
  "overallSentiment": "positive" | "mixed" | "negative",
  "sentimentScore": 1-10,
  "painPoints": [{"issue": "specific problem", "frequency": 1-10, "severity": "high"|"medium"|"low"}],
  "likes": [{"aspect": "what customers like", "frequency": 1-10}],
  "improvementSuggestions": [{"suggestion": "how to improve", "priority": "high"|"medium"|"low", "impact": "expected business impact"}],
  "opportunityScore": 1-10,
  "competitorWeaknessSummary": "2-3 sentence summary of why this product is vulnerable to competition",
  "keyPhrases": ["important keywords from reviews"],
  "ratingDistribution": [{"stars": 1-5, "count": number, "percentage": number}],
  "actionableTakeaways": ["specific actions the seller should take"]
}

Rules:
- Focus on actionable insights a seller can actually use to improve their product or listing
- Be specific, not generic. Instead of "improve quality", say "reinforce stitching on shoulder straps"
- opportunityScore: 10 means extremely easy to beat, 1 means very hard
- Write all output in English
- Return ONLY valid JSON, no markdown, no explanation`;

async function callXiaomiMiMo(prompt: string, apiKey: string): Promise<string> {
  // Token Plan keys (tp- prefix) use a different endpoint
  const baseUrl = apiKey.startsWith('tp-')
    ? 'https://token-plan-cn.xiaomimimo.com/v1'
    : 'https://api.xiaomimimo.com/v1';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'mimo-v2.5',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 4096,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`MiMo API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callAnthropic(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

export async function analyzeReviews(reviews: string, productUrl?: string): Promise<ReviewAnalysis> {
  const miMoKey = process.env.MIMO_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const prompt = `Analyze these product reviews${productUrl ? ` from ${productUrl}` : ''}:\n\n${reviews.slice(0, 15000)}`;

  let text: string;

  try {
    if (miMoKey) {
      text = await callXiaomiMiMo(prompt, miMoKey);
    } else if (anthropicKey) {
      text = await callAnthropic(prompt, anthropicKey);
    } else {
      return mockAnalysis(reviews);
    }
  } catch (error: any) {
    console.error('AI API error:', error.message);
    return mockAnalysis(reviews);
  }

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as ReviewAnalysis;
    }
    return JSON.parse(text) as ReviewAnalysis;
  } catch {
    console.error('Failed to parse AI response as JSON, raw:', text.slice(0, 200));
    return mockAnalysis(reviews);
  }
}

function mockAnalysis(reviews: string): ReviewAnalysis {
  const lines = reviews.split('\n').filter((l) => l.trim()).length;
  const positiveWords = ['love', 'great', 'good', 'excellent', 'perfect', 'best', 'amazing', 'awesome', 'happy', 'worth'];
  const negativeWords = ['bad', 'poor', 'terrible', 'worst', 'broke', 'waste', 'disappointed', 'cheap', 'flimsy', 'return'];

  let positive = 0;
  let negative = 0;
  const lower = reviews.toLowerCase();

  positiveWords.forEach((w) => {
    positive += (lower.match(new RegExp(w, 'g')) || []).length;
  });
  negativeWords.forEach((w) => {
    negative += (lower.match(new RegExp(w, 'g')) || []).length;
  });

  const total = positive + negative || 1;
  const sentimentScore = Math.round((positive / total) * 10) || 5;

  return {
    productName: 'Product (from reviews)',
    overallSentiment: sentimentScore > 6 ? 'positive' : sentimentScore > 4 ? 'mixed' : 'negative',
    sentimentScore,
    painPoints: negative > 0
      ? [{ issue: 'Some negative feedback detected in reviews', frequency: negative, severity: 'medium' }]
      : [{ issue: 'No significant pain points detected', frequency: 0, severity: 'low' }],
    likes: positive > 0
      ? [{ aspect: 'Product has positive feedback', frequency: positive }]
      : [{ aspect: 'Mixed reception', frequency: 0 }],
    improvementSuggestions: [
      { suggestion: 'Enable AI-powered analysis by setting MIMO_API_KEY', priority: 'high', impact: 'Get detailed, actionable insights instead of this basic summary' },
    ],
    opportunityScore: 5,
    competitorWeaknessSummary: 'Add your Xiaomi MiMo API key to get real AI-powered analysis. Current results are based on basic keyword counting.',
    keyPhrases: [],
    ratingDistribution: [{ stars: 4, count: positive + negative, percentage: 100 }],
    actionableTakeaways: [
      'Set MIMO_API_KEY environment variable to unlock full AI analysis',
      `Analyzed ${lines} review entries with basic heuristics`,
    ],
  };
}
