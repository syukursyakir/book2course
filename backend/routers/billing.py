import os
import stripe
from fastapi import APIRouter, HTTPException, Depends, Request, Header
from typing import Optional
from routers.auth import get_current_user
from services.supabase_client import get_supabase_client, add_credits

router = APIRouter(prefix="/api/billing", tags=["billing"])

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Price IDs for each plan (renamed from tier to plan for credit system)
PRICE_IDS = {
    "starter": os.getenv("STRIPE_STARTER_PRICE_ID"),  # $9.90 - 30 credits
    "pro": os.getenv("STRIPE_PRO_PRICE_ID"),          # $24.90 - 100 credits
}

# Credits granted per plan
CREDITS_PER_PLAN = {
    "starter": 30,
    "pro": 100,
}

# Frontend URL for redirects
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://www.book2course.org")


async def get_or_create_stripe_customer(user_id: str, email: str) -> str:
    """Get existing Stripe customer ID or create a new customer."""
    client = get_supabase_client()

    # Check if user already has a Stripe customer ID
    result = client.table("profiles").select("stripe_customer_id").eq("user_id", user_id).execute()

    if result.data and result.data[0].get("stripe_customer_id"):
        return result.data[0]["stripe_customer_id"]

    # Create new Stripe customer
    customer = stripe.Customer.create(
        email=email,
        metadata={"user_id": user_id}
    )

    # Save to profiles table (upsert)
    client.table("profiles").upsert({
        "user_id": user_id,
        "stripe_customer_id": customer.id,
        "tier": "free"
    }, on_conflict="user_id").execute()

    return customer.id


@router.post("/create-checkout-session")
async def create_checkout_session(
    plan: str,
    user: dict = Depends(get_current_user)
):
    """Create a Stripe Checkout session for credit purchase."""
    if plan not in PRICE_IDS:
        raise HTTPException(status_code=400, detail="Invalid plan. Must be 'starter' or 'pro'")

    price_id = PRICE_IDS[plan]
    if not price_id:
        raise HTTPException(status_code=500, detail=f"Price ID not configured for plan: {plan}")

    try:
        # Get or create Stripe customer
        customer_id = await get_or_create_stripe_customer(
            user["id"],
            user.get("email", "")
        )

        # Create checkout session (one-time payment, not subscription)
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price": price_id,
                "quantity": 1,
            }],
            mode="payment",  # Changed to one-time payment for credits
            success_url=f"{FRONTEND_URL}/dashboard?purchase=success&credits={CREDITS_PER_PLAN.get(plan, 0)}",
            cancel_url=f"{FRONTEND_URL}/pricing?purchase=cancelled",
            metadata={
                "user_id": user["id"],
                "plan": plan,
                "credits": str(CREDITS_PER_PLAN.get(plan, 0))
            }
        )

        return {"checkout_url": session.url}

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/create-portal-session")
async def create_portal_session(user: dict = Depends(get_current_user)):
    """Create a Stripe Customer Portal session for managing subscription."""
    try:
        # Get customer ID
        client = get_supabase_client()
        result = client.table("profiles").select("stripe_customer_id").eq("user_id", user["id"]).execute()

        if not result.data or not result.data[0].get("stripe_customer_id"):
            raise HTTPException(status_code=400, detail="No subscription found")

        customer_id = result.data[0]["stripe_customer_id"]

        # Create portal session
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{FRONTEND_URL}/dashboard",
        )

        return {"portal_url": session.url}

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/subscription")
async def get_subscription(user: dict = Depends(get_current_user)):
    """Get current user's credit balance and info."""
    from services.supabase_client import get_user_credits, CREDIT_COST_BOOK, CREDIT_COST_NOTES

    credits = await get_user_credits(user["id"])

    return {
        "credits": credits,
        "book_cost": CREDIT_COST_BOOK,
        "notes_cost": CREDIT_COST_NOTES
    }


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature")
):
    """Handle Stripe webhooks for subscription events."""
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    if not webhook_secret:
        # If no webhook secret, just acknowledge (for testing)
        print("[STRIPE] Warning: No webhook secret configured")
        return {"status": "received"}

    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the event
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        await handle_checkout_completed(session)

    elif event["type"] == "customer.subscription.updated":
        subscription = event["data"]["object"]
        await handle_subscription_updated(subscription)

    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        await handle_subscription_deleted(subscription)

    elif event["type"] == "invoice.payment_failed":
        invoice = event["data"]["object"]
        await handle_payment_failed(invoice)

    return {"status": "success"}


async def handle_checkout_completed(session: dict):
    """Handle successful checkout - add credits to user."""
    client = get_supabase_client()

    user_id = session.get("metadata", {}).get("user_id")
    plan = session.get("metadata", {}).get("plan")
    credits_str = session.get("metadata", {}).get("credits", "0")
    customer_id = session.get("customer")

    if not user_id:
        print(f"[STRIPE] Warning: No user_id in checkout session metadata")
        return

    # Parse credits from metadata
    try:
        credits_to_add = int(credits_str)
    except ValueError:
        credits_to_add = CREDITS_PER_PLAN.get(plan, 0)

    # Add credits to user
    new_balance = await add_credits(user_id, credits_to_add)

    # Update profile with customer ID
    client.table("profiles").upsert({
        "user_id": user_id,
        "stripe_customer_id": customer_id,
    }, on_conflict="user_id").execute()

    print(f"[STRIPE] User {user_id} purchased {plan} plan. Added {credits_to_add} credits. New balance: {new_balance}")


async def handle_subscription_updated(subscription: dict):
    """Handle subscription updates (for future subscription-based features)."""
    # Currently using one-time payments for credits, so this is a no-op
    print(f"[STRIPE] Subscription updated: {subscription['id']}")


async def handle_subscription_deleted(subscription: dict):
    """Handle subscription cancellation (for future subscription-based features)."""
    # Currently using one-time payments for credits, so this is a no-op
    print(f"[STRIPE] Subscription deleted: {subscription['id']}")


async def handle_payment_failed(invoice: dict):
    """Handle failed payment."""
    customer_id = invoice.get("customer")
    print(f"[STRIPE] Payment failed for customer {customer_id}")
