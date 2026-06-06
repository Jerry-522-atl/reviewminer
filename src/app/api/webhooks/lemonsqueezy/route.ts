import { NextRequest, NextResponse } from 'next/server';
import {
  verifyWebhook,
  parseWebhookEvent,
  subscriptionStatusFromLS,
  planFromVariantId,
  extractVariantId,
  planLimits,
  generateLicenseKey,
  PlanType,
} from '@/lib/lemonsqueezy';
import { query, execute } from '@/lib/db';

async function setUserPlan(
  userId: string,
  plan: PlanType,
  status: string,
  subscriptionId: string,
  customerId: string | null
) {
  const limit = planLimits(plan);

  // Generate a license key for paid plans if user doesn't have one
  if (plan !== 'free') {
    const rows = await query('SELECT license_key FROM users WHERE id = ?', [userId]);
    const existingKey = rows[0]?.license_key;
    if (!existingKey) {
      const licenseKey = generateLicenseKey(userId);
      await execute(
        'UPDATE users SET plan = ?, analyses_limit = ?, subscription_status = ?, ls_subscription_id = ?, ls_customer_id = ?, license_key = ? WHERE id = ?',
        [plan, limit, subscriptionStatusFromLS(status), subscriptionId, customerId, licenseKey, userId]
      );
      console.log(`[LS Webhook] Generated license key for user ${userId}`);
      return;
    }
  }

  await execute(
    'UPDATE users SET plan = ?, analyses_limit = ?, subscription_status = ?, ls_subscription_id = ?, ls_customer_id = ? WHERE id = ?',
    [plan, limit, subscriptionStatusFromLS(status), subscriptionId, customerId, userId]
  );
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-signature') || '';

    if (!verifyWebhook(rawBody, signature)) {
      console.error('Webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const event = parseWebhookEvent(body);

    if (!event) {
      return NextResponse.json({ error: 'Invalid event format' }, { status: 400 });
    }

    const eventName = event.meta.event_name;
    const customData = event.meta.custom_data;
    const userId = customData?.user_id;
    const attrs = event.data.attributes;
    const subscriptionId = event.data.id;
    const customerId = attrs.customer_id ? String(attrs.customer_id) : null;

    // Determine which plan from the variant in the webhook
    const variantId = extractVariantId(event);
    const status = attrs.status || 'active';
    const plan: PlanType = variantId ? planFromVariantId(variantId) : 'free';

    console.log(`[LS Webhook] ${eventName} | user=${userId} plan=${plan} variant=${variantId}`);

    switch (eventName) {
      case 'order_created': {
        if (userId) {
          const users = await query('SELECT id FROM users WHERE id = ?', [userId]);
          if (users.length > 0) {
            await setUserPlan(userId, plan, status, subscriptionId, customerId);
            console.log(`[LS Webhook] User ${userId} → ${plan} (${planLimits(plan)} analyses/mo)`);
          }
        }
        break;
      }

      case 'subscription_updated':
      case 'subscription_payment_success': {
        if (userId) {
          await setUserPlan(userId, plan, status, subscriptionId, customerId);
        }
        break;
      }

      case 'subscription_cancelled': {
        if (userId) {
          await execute(
            'UPDATE users SET subscription_status = ? WHERE id = ?',
            ['cancelled', userId]
          );
        }
        break;
      }

      case 'subscription_expired': {
        if (userId) {
          await execute(
            'UPDATE users SET plan = ?, analyses_limit = ?, subscription_status = ?, license_key = ? WHERE id = ?',
            ['free', planLimits('free'), 'expired', null, userId]
          );
          console.log(`[LS Webhook] Downgraded user ${userId} to free`);
        }
        break;
      }

      default: {
        console.log(`[LS Webhook] Unhandled event: ${eventName}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message || 'Webhook processing failed' }, { status: 500 });
  }
}
