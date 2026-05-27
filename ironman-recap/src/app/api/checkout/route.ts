import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { stripe, REPORT_PRICE_CENTS } from "@/lib/stripe";

const Body = z.object({
  participantId: z.string().min(1),
  email: z.string().email(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { participantId, email } = parsed.data;

  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
    include: { race: true },
  });
  if (!participant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: REPORT_PRICE_CENTS,
          product_data: {
            name: `Race Recap — ${participant.firstName} ${participant.lastName}`,
            description: participant.race.name,
          },
        },
      },
    ],
    success_url: `${appUrl}/report/{CHECKOUT_SESSION_ID}?welcome=1`,
    cancel_url: `${appUrl}/participant/${participantId}`,
    metadata: { participantId },
  });

  await prisma.purchase.create({
    data: {
      participantId,
      email,
      stripeSessionId: session.id,
      amountCents: REPORT_PRICE_CENTS,
      status: "pending",
    },
  });

  // Stripe substitutes {CHECKOUT_SESSION_ID} in success_url at redirect time
  return NextResponse.json({ url: session.url });
}
