const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { items, successUrl, cancelUrl } = JSON.parse(event.body);

        // Build line items for Stripe from the cart
        const lineItems = items.map(item => ({
            price_data: {
                currency: 'eur',
                product_data: {
                    name: item.name,
                    description: [
                        item.text   ? `Engraving: "${item.text}"` : null,
                        item.theme  ? `Theme: ${item.theme}`       : null,
                        item.delivery === 'courier' ? 'Delivery: Malta Courier' : 'Delivery: Studio Pickup',
                    ].filter(Boolean).join(' · '),
                },
                unit_amount: Math.round(item.price * 100), // Stripe uses cents
            },
            quantity: 1,
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            // Store all order details in metadata so they appear in your Stripe dashboard
            metadata: {
                order_summary: items.map(i =>
                    `${i.name} | "${i.text}"${i.theme ? ` | ${i.theme}` : ''} | ${i.delivery}`
                ).join(' ;; ').substring(0, 500), // Stripe metadata limit
            },
            // Ask for customer email so Stripe can send them a receipt
            customer_email: undefined, // Stripe will ask on the checkout page
        });

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: session.url }),
        };

    } catch (err) {
        console.error('Stripe error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message }),
        };
    }
};
