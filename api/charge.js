export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    const { paymentMethodId, amount, customerName, customerEmail, bookingType } = req.body;
    if (!paymentMethodId || !amount) return res.status(400).json({ error: 'Missing params' });
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');
    async function stripePost(path, params) {
      const body = Object.entries(params).map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
      const r = await fetch(`https://api.stripe.com/v1/${path}`, { method:'POST', headers:{'Authorization':authHeader,'Content-Type':'application/x-www-form-urlencoded'}, body });
      return r.json();
    }
    async function stripeGet(path) {
      const r = await fetch(`https://api.stripe.com/v1/${path}`, { headers:{'Authorization':authHeader} });
      return r.json();
    }
    let customerId;
    if (customerEmail) {
      const search = await stripeGet(`customers?email=${encodeURIComponent(customerEmail)}&limit=1`);
      if (search.data && search.data.length > 0) customerId = search.data[0].id;
    }
    if (!customerId) {
      const customer = await stripePost('customers', { name: customerName||'Caciques Athlete', email: customerEmail||'', payment_method: paymentMethodId });
      customerId = customer.id;
    }
    await stripePost(`payment_methods/${paymentMethodId}/attach`, { customer: customerId });
    const pi = await stripePost('payment_intents', { amount: Math.round(amount*100), currency:'usd', customer:customerId, payment_method:paymentMethodId, confirm:'true', description:`Caciques Training - ${bookingType}`, 'automatic_payment_methods[enabled]':'true', 'automatic_payment_methods[allow_redirects]':'never' });
    if (pi.error) return res.status(400).json({ error: pi.error.message });
    return res.status(200).json({ success:true, paymentIntentId:pi.id, status:pi.status });
  } catch(err) { return res.status(500).json({ error: err.message }); }
}
