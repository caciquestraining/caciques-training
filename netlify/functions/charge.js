exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { paymentMethodId, amount, customerName, customerEmail, bookingType } = JSON.parse(event.body);

    if (!paymentMethodId || !amount) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing paymentMethodId or amount' })
      };
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');

    async function stripePost(path, params) {
      const body = Object.entries(params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      const res = await fetch(`https://api.stripe.com/v1/${path}`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
      });
      return res.json();
    }

    async function stripeGet(path) {
      const res = await fetch(`https://api.stripe.com/v1/${path}`, {
        headers: { 'Authorization': authHeader }
      });
      return res.json();
    }

    let customerId;
    if (customerEmail) {
      const search = await stripeGet(`customers?email=${encodeURIComponent(customerEmail)}&limit=1`);
      if (search.data && search.data.length > 0) {
        customerId = search.data[0].id;
      }
    }

    if (!customerId) {
      const customer = await stripePost('customers', {
        name: customerName || 'Caciques Athlete',
        email: customerEmail || '',
        payment_method: paymentMethodId
      });
      customerId = customer.id;
    }

    await stripePost(`payment_methods/${paymentMethodId}/attach`, {
      customer: customerId
    });

    const pi = await stripePost('payment_intents', {
      amount: Math.round(amount * 100),
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: 'true',
      description: `Caciques Training - ${bookingType}`,
      'automatic_payment_methods[enabled]': 'true',
      'automatic_payment_methods[allow_redirects]': 'never'
    });

    if (pi.error) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: pi.error.message })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, paymentIntentId: pi.id, status: pi.status })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
