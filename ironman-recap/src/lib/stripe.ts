import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-11-20.acacia" as Stripe.LatestApiVersion,
});

export const REPORT_PRICE_CENTS = Number(process.env.REPORT_PRICE_CENTS ?? 500);
