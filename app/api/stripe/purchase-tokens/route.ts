import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { stripe } from '@/lib/stripe/stripe-client';
import { TOKEN_PACKAGES } from '@/lib/constants';
import { z } from 'zod';

const purchaseTokensSchema = z.object({
  packageSize: z.enum(['small', 'medium', 'large']),
});

async function purchaseTokens(req: NextRequest, context: AuthContext) {
  try {
    const body = await req.json();
    const { packageSize } = purchaseTokensSchema.parse(body);

    const tokenPackage = TOKEN_PACKAGES[packageSize];

    if (!tokenPackage) {
      return NextResponse.json(
        { error: 'Invalid package size' },
        { status: 400 }
      );
    }

    // Create a Stripe Checkout session for one-time token purchase
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${tokenPackage.displayName} AI Token Package`,
              description: tokenPackage.description,
              metadata: {
                type: 'token_package',
                tokens: tokenPackage.tokens.toString(),
                packageSize,
              },
            },
            unit_amount: tokenPackage.price * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=tokens`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
      client_reference_id: context.user.organizationId,
      metadata: {
        userId: context.user.id,
        organizationId: context.user.organizationId,
        type: 'token_purchase',
        tokens: tokenPackage.tokens.toString(),
        packageSize,
      },
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Token purchase error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(purchaseTokens);
