import crypto from 'crypto';

const LS_API_KEY = process.env.LEMONSQUEEZY_API_KEY;
const LS_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID;
const LS_WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
const LS_PRO_MONTHLY_VARIANT_ID = process.env.LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID;

const BASE_URL = 'https://api.lemonsqueezy.com/v1';

export function isConfigured(): boolean {
  return !!(LS_API_KEY && LS_STORE_ID && LS_PRO_MONTHLY_VARIANT_ID);
}

interface CreateCheckoutInput {
  userId: string;
  userEmail: string;
  variantId?: string;
}

interface CreateCheckoutResult {
  url: string;
  id: string;
}

export async function createCheckout({
  userId,
  userEmail,
  variantId,
}: CreateCheckoutInput): Promise<CreateCheckoutResult> {
  if (!LS_API_KEY || !LS_STORE_ID) {
    throw new Error('LemonSqueezy is not configured');
  }

  const vid = variantId || LS_PRO_MONTHLY_VARIANT_ID;
  if (!vid) {
    throw new Error('No variant ID configured');
  }

  const res = await fetch(`${BASE_URL}/checkouts`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${LS_API_KEY}`,
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: userEmail,
            custom: {
              user_id: userId,
            },
          },
          product_options: {
            redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://reviewminer.xyz'}/dashboard?subscribed=1`,
          },
          checkout_options: {
            embed: false,
            button_color: '#10b981',
          },
        },
        relationships: {
          store: {
            data: { type: 'stores', id: LS_STORE_ID },
          },
          variant: {
            data: { type: 'variants', id: vid },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('LemonSqueezy checkout error:', res.status, text);
    throw new Error(`Checkout creation failed: ${res.status}`);
  }

  const json = await res.json();
  return {
    url: json.data.attributes.url,
    id: json.data.id,
  };
}

export function verifyWebhook(rawBody: string, signature: string): boolean {
  if (!LS_WEBHOOK_SECRET) {
    console.error('LEMONSQUEEZY_WEBHOOK_SECRET not configured');
    return false;
  }

  const hmac = crypto.createHmac('sha256', LS_WEBHOOK_SECRET);
  hmac.update(rawBody);
  const digest = hmac.digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(digest, 'utf-8'), Buffer.from(signature, 'utf-8'));
  } catch {
    return false;
  }
}

// Maps LemonSqueezy subscription status to our plan
export function planFromSubscriptionStatus(status: string): 'free' | 'pro' {
  const active = ['active', 'on_trial', 'past_due'];
  return active.includes(status) ? 'pro' : 'free';
}

// Maps LemonSqueezy subscription status to our status
export function subscriptionStatusFromLS(status: string): string {
  return status; // Pass through: active, cancelled, expired, past_due, on_trial, unpaid, paused
}

interface WebhookEvent {
  meta: {
    event_name: string;
    custom_data?: { user_id?: string };
  };
  data: {
    id: string;
    type: string;
    attributes: {
      status?: string;
      customer_id?: number;
      product_name?: string;
      variant_name?: string;
      renews_at?: string;
      ends_at?: string;
      cancelled?: boolean;
      urls?: {
        customer_portal?: string;
        update_payment_method?: string;
      };
      first_subscription_item?: {
        id: number;
      };
    };
  };
}

export function parseWebhookEvent(body: any): WebhookEvent | null {
  try {
    if (!body?.meta?.event_name) return null;
    return body as WebhookEvent;
  } catch {
    return null;
  }
}
