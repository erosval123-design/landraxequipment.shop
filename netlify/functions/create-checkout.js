exports.handler = async (event) => {
  const H = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: H, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: H, body: JSON.stringify({ error: 'Method not allowed' }) };

  const SK = process.env.STRIPE_SECRET_KEY;
  if (!SK) return { statusCode: 503, headers: H, body: JSON.stringify({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY in Netlify environment variables.' }) };

  try {
    const body = JSON.parse(event.body || '{}');
    const origin = event.headers.origin || 'https://landraxequipment.shop';

    // Build line items — support both:
    //   { items: [{sku, name, price, qty}, ...] }   ← cart checkout
    //   { productId, productName, price }            ← single-product buy now
    let lineItems = [];

    if (Array.isArray(body.items) && body.items.length > 0) {
      lineItems = body.items.map((item, i) => ({
        name: item.name || item.sku || 'Machine',
        amount: Math.round(parseFloat(String(item.price || 0).replace(/,/g, '')) * 100),
        qty: Math.max(1, parseInt(item.qty) || 1),
        idx: i
      }));
    } else {
      const { productName, price } = body;
      lineItems = [{
        name: productName || 'Machine',
        amount: Math.round(parseFloat(String(price || 0).replace(/,/g, '')) * 100),
        qty: 1,
        idx: 0
      }];
    }

    // Build URLSearchParams with all line items
    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', origin + '/success.html');
    params.append('cancel_url', origin + '/cart.html');
    params.append('shipping_address_collection[allowed_countries][]', 'US');
    params.append('payment_method_types[]', 'card');

    lineItems.forEach((item, i) => {
      params.append(`line_items[${i}][price_data][currency]`, 'usd');
      params.append(`line_items[${i}][price_data][product_data][name]`, item.name);
      params.append(`line_items[${i}][price_data][unit_amount]`, String(item.amount));
      params.append(`line_items[${i}][quantity]`, String(item.qty));
    });

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + SK,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await res.json();
    if (data.error) return { statusCode: 400, headers: H, body: JSON.stringify({ error: data.error.message }) };
    return { statusCode: 200, headers: H, body: JSON.stringify({ url: data.url }) };

  } catch (err) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: err.message }) };
  }
};
