type PaddleCheckoutSession = {
  id: string;
  url: string;
};

const PADDLE_API_BASE = "https://api.paddle.com";

export const createPaddleCheckout = async (params: {
  customerId: string;
  priceId: string;
}): Promise<PaddleCheckoutSession> => {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) {
    throw new Error("Paddle API key is not configured.");
  }

  const response = await fetch(`${PADDLE_API_BASE}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customer_id: params.customerId,
      items: [
        {
          price_id: params.priceId,
          quantity: 1,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create Paddle checkout session.");
  }

  const json = (await response.json()) as {
    data: {
      id: string;
      url: string;
    };
  };

  return {
    id: json.data.id,
    url: json.data.url,
  };
};

