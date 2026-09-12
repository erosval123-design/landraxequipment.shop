module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SK = process.env.STRIPE_SECRET_KEY;
  if (!SK) return res.status(503).json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY in Vercel environment variables.' });

  try {
    const body = req.body || {};
    const origin = req.headers.origin || 'https://landraxequipment.shop';

    let lineItems = [];
    if (Array.isArray(body.items) && body.items.length > 0) {
      lineItems = body.items.map((item, i) => ({
        name: item.name || item.sku || 'Machine',
        amount: Math.round(parseFloat(String(item.price || 0).replace(/,/g, '')) * 100),
        qty: Math.max(1, parseInt(item.qty) || 1),
        idx: i
      }));
    } else {
      lineItems = [{
        name: body.productName || 'Machine',
        amount: Math.round(parseFloat(String(body.price || 0).replace(/,/g, '')) * 100),
        qty: 1,
        idx: 0
      }];
    }

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

    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + SK, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const data = await r.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    return res.status(200).json({ url: data.url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
