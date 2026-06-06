import { NextRequest, NextResponse } from 'next/server';
import {
  verifyWebhook,
  parseWebhookEvent,
  planFromSubscriptionStatus,
  subscriptionStatusFromLS,
} from '@/lib/lemonsqueezy';
import { query, execute } from '@/lib/db';

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

    console.log(`[LS Webhook] ${eventName}`, { userId, subscriptionId });

    switch (eventName) {
      case 'order_created': {
        if (userId) {
          const status = attrs.status || 'active';
          const plan = planFromSubscriptionStatus(status);
          const users = await query('SELECT id FROM users WHERE id = ?', [userId]);
          if (users.length > 0) {
            await execute(
              'UPDATE users SET plan = ?, analyses_limit = ?, subscription_status = ?, ls_subscription_id = ?, ls_customer_id = ? WHERE id = ?',
              [plan, plan === 'pro' ? 30 : 3, subscriptionStatusFromLS(status), subscriptionId, customerId, userId]
            );
            console.log(`[LS Webhook] Upgraded user ${userId} to ${plan}`);
          }
        }
        break;
      }

      case 'subscription_updated':
      case 'subscription_payment_success': {
        const status = attrs.status || 'active';
        const plan = planFromSubscriptionStatus(status);
        if (userId) {
          await execute(
            'UPDATE users SET plan = ?, analyses_limit = ?, subscription_status = ?, ls_subscription_id = ?, ls_customer_id = ? WHERE id = ?',
            [plan, plan === 'pro' ? 30 : 3, subscriptionStatusFromLS(status), subscriptionId, customerId, userId]
          );
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
            'UPDATE users SET plan = ?, analyses_limit = ?, subscription_status = ? WHERE id = ?',
            ['free', 3, 'expired', userId]
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
