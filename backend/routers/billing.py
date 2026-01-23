import os
import stripe
from fastapi import APIRouter, HTTPException, Depends, Request, Header
from typing import Optional
from routers.auth import get_current_user
from services.supabase_client import get_supabase_client

router = APIRouter(prefix="/api/billing", tags=["billing"])

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Price IDs for each tier
PRICE_IDS = {
    "basic": os.getenv("STRIPE_BASIC_PRICE_ID"),
    "pro": os.getenv("STRIPE_PRO_PRICE_ID"),
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
    tier: str,
    user: dict = Depends(get_current_user)
):
    """Create a Stripe Checkout session for subscription."""
    if tier not in PRICE_IDS:
        raise HTTPException(status_code=400, detail="Invalid tier. Must be 'basic' or 'pro'")

    price_id = PRICE_IDS[tier]
    if not price_id:
        raise HTTPException(status_code=500, detail=f"Price ID not configured for tier: {tier}")

    try:
        # Get or create Stripe customer
        customer_id = await get_or_create_stripe_customer(
            user["id"],
            user.get("email", "")
        )

        # Create checkout session
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price": price_id,
                "quantity": 1,
            }],
            mode="subscription",
            success_url=f"{FRONTEND_URL}/dashboard?subscription=success",
            cancel_url=f"{FRONTEND_URL}/pricing?subscription=cancelled",
            metadata={
                "user_id": user["id"],
                "tier": tier
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
    """Get current user's subscription status."""
    client = get_supabase_client()

    result = client.table("profiles").select("*").eq("user_id", user["id"]).execute()

    if not result.data:
        return {
            "tier": "free",
            "status": None,
            "current_period_end": None
        }

    profile = result.data[0]

    # If user has an active subscription, get details from Stripe
    if profile.get("stripe_subscription_id"):
        try:
            subscription = stripe.Subscription.retrieve(profile["stripe_subscription_id"])
            return {
                "tier": profile.get("tier", "free"),
                "status": subscription.status,
                "current_period_end": subscription.current_period_end,
                "cancel_at_period_end": subscription.cancel_at_period_end
            }
        except stripe.error.StripeError:
            pass

    return {
        "tier": profile.get("tier", "free"),
        "status": profile.get("subscription_status"),
        "current_period_end": None
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
    """Handle successful checkout - activate subscription."""
    client = get_supabase_client()

    user_id = session.get("metadata", {}).get("user_id")
    tier = session.get("metadata", {}).get("tier")
    subscription_id = session.get("subscription")
    customer_id = session.get("customer")

    if not user_id:
        print(f"[STRIPE] Warning: No user_id in checkout session metadata")
        return

    # Update user profile with subscription info
    client.table("profiles").upsert({
        "user_id": user_id,
        "stripe_customer_id": customer_id,
        "stripe_subscription_id": subscription_id,
        "tier": tier or "basic",
        "subscription_status": "active"
    }, on_conflict="user_id").execute()

    print(f"[STRIPE] User {user_id} subscribed to {tier} plan")


async def handle_subscription_updated(subscription: dict):
    """Handle subscription updates (upgrades, downgrades, renewals)."""
    client = get_supabase_client()

    subscription_id = subscription["id"]
    status = subscription["status"]

    # Find user by subscription ID
    result = client.table("profiles").select("user_id").eq(
        "stripe_subscription_id", subscription_id
    ).execute()

    if not result.data:
        print(f"[STRIPE] Warning: No user found for subscription {subscription_id}")
        return

    user_id = result.data[0]["user_id"]

    # Determine tier from price
    price_id = subscription["items"]["data"][0]["price"]["id"]
    tier = "free"
    for tier_name, configured_price_id in PRICE_IDS.items():
        if configured_price_id == price_id:
            tier = tier_name
            break

    # Update profile
    update_data = {
        "subscription_status": status,
        "tier": tier if status == "active" else "free"
    }

    client.table("profiles").update(update_data).eq("user_id", user_id).execute()
    print(f"[STRIPE] Updated user {user_id} subscription: status={status}, tier={tier}")


async def handle_subscription_deleted(subscription: dict):
    """Handle subscription cancellation."""
    client = get_supabase_client()

    subscription_id = subscription["id"]

    # Find user by subscription ID
    result = client.table("profiles").select("user_id").eq(
        "stripe_subscription_id", subscription_id
    ).execute()

    if not result.data:
        return

    user_id = result.data[0]["user_id"]

    # Downgrade to free
    client.table("profiles").update({
        "tier": "free",
        "subscription_status": "canceled",
        "stripe_subscription_id": None
    }).eq("user_id", user_id).execute()

    print(f"[STRIPE] User {user_id} subscription canceled, downgraded to free")


async def handle_payment_failed(invoice: dict):
    """Handle failed payment."""
    client = get_supabase_client()

    customer_id = invoice.get("customer")

    # Find user by customer ID
    result = client.table("profiles").select("user_id").eq(
        "stripe_customer_id", customer_id
    ).execute()

    if not result.data:
        return

    user_id = result.data[0]["user_id"]

    # Update status to past_due
    client.table("profiles").update({
        "subscription_status": "past_due"
    }).eq("user_id", user_id).execute()

    print(f"[STRIPE] Payment failed for user {user_id}")
