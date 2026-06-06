import crypto from 'crypto';

const LS_API_KEY = process.env.LEMONSQUEEZY_API_KEY;
const LS_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID;
const LS_WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
const JWT_SECRET = process.env.JWT_SECRET || 'reviewminer-dev-secret';
const LS_GROWTH_MONTHLY_VARIANT_ID = process.env.LEMONSQUEEZY_GROWTH_MONTHLY_VARIANT_ID;
const LS_PRO_MONTHLY_VARIANT_ID = process.env.LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID;

const BASE_URL = 'https://api.lemonsqueezy.com/v1';

export type PlanType = 'free' | 'growth' | 'pro';

export function isConfigured(): boolean {
  return !!(LS_API_KEY && LS_STORE_ID && LS_GROWTH_MONTHLY_VARIANT_ID && LS_PRO_MONTHLY_VARIANT_ID);
}

/** Maps plan slug → LemonSqueezy variant ID */
export function getVariantId(plan: PlanType): string | undefined {
  if (plan === 'growth') return LS_GROWTH_MONTHLY_VARIANT_ID;
  if (plan === 'pro') return LS_PRO_MONTHLY_VARIANT_ID;
  return undefined;
}

/** Analyses per month for each plan */
export function planLimits(plan: PlanType): number {
  if (plan === 'pro') return 50;
  if (plan === 'growth') return 15;
  return 3;
}

/** Reverse-map variant ID → plan type (used by webhook) */
export function planFromVariantId(variantId: string | number): PlanType {
  const id = String(variantId);
  if (id === LS_PRO_MONTHLY_VARIANT_ID) return 'pro';
  if (id === LS_GROWTH_MONTHLY_VARIANT_ID) return 'growth';
  return 'free';
}

interface CreateCheckoutInput {
  userId: string;
  userEmail: string;
  plan: PlanType;
}

interface CreateCheckoutResult {
  url: string;
  id: string;
}

export async function createCheckout({
  userId,
  userEmail,
  plan,
}: CreateCheckoutInput): Promise<CreateCheckoutResult> {
  if (!LS_API_KEY || !LS_STORE_ID) {
    throw new Error('LemonSqueezy is not configured');
  }

  const variantId = getVariantId(plan);
  if (!variantId) {
    throw new Error(`No variant ID configured for plan: ${plan}`);
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
            data: { type: 'variants', id: variantId },
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
      variant_id?: number;
      renews_at?: string;
      ends_at?: string;
      cancelled?: boolean;
      urls?: {
        customer_portal?: string;
        update_payment_method?: string;
      };
      first_subscription_item?: {
        id: number;
        variant_id?: number;
      };
      first_order_item?: {
        id: number;
        variant_id?: number;
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

/** Extract variant_id from webhook event attributes (different event shapes) */
export function extractVariantId(event: WebhookEvent): string | number | null {
  const attrs = event.data.attributes;
  // Different webhook events put the variant in different places
  if (attrs.first_order_item?.variant_id) return attrs.first_order_item.variant_id;
  if (attrs.first_subscription_item?.variant_id) return attrs.first_subscription_item.variant_id;
  if (attrs.variant_id) return attrs.variant_id;
  return null;
}

/** Generate a license key for the ImageGrab extension */
export function generateLicenseKey(userId: string): string {
  const payload = `${userId}:${Date.now()}`;
  const hmac = crypto.createHmac('sha256', JWT_SECRET);
  hmac.update(payload);
  const raw = hmac.digest('base64url').replace(/[^A-Z0-9]/gi, '').slice(0, 16).toUpperCase();
  // Format: RM-XXXX-XXXX-XXXX-XXXX
  return `RM-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}
