import os
import stripe
from fastapi import APIRouter, HTTPException, Depends, Request, Header
from typing import Optional
from routers.auth import get_current_user
from services.supabase_client import get_supabase_client, add_credits

router = APIRouter(prefix="/api/billing", tags=["billing"])

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Price IDs for each plan
PRICE_IDS = {
    "starter": os.getenv("STRIPE_BASIC_PRICE_ID"),   # $9.90/month - 30 credits
    "pro": os.getenv("STRIPE_PRO_PRICE_ID"),         # $24.90/month - 100 credits
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
    """Create a Stripe Checkout session for monthly credit subscription."""
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

        # Create checkout session for monthly subscription
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price": price_id,
                "quantity": 1,
            }],
            mode="subscription",
            success_url=f"{FRONTEND_URL}/dashboard?subscription=success&plan={plan}",
            cancel_url=f"{FRONTEND_URL}/pricing?subscription=cancelled",
            metadata={
                "user_id": user["id"],
                "plan": plan,
                "credits": str(CREDITS_PER_PLAN.get(plan, 0))
            },
            subscription_data={
                "metadata": {
                    "user_id": user["id"],
                    "plan": plan,
                    "credits": str(CREDITS_PER_PLAN.get(plan, 0))
                }
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

    elif event["type"] == "invoice.payment_succeeded":
        invoice = event["data"]["object"]
        await handle_invoice_paid(invoice)

    elif event["type"] == "invoice.payment_failed":
        invoice = event["data"]["object"]
        await handle_payment_failed(invoice)

    return {"status": "success"}


async def handle_checkout_completed(session: dict):
    """Handle successful checkout - activate subscription and add initial credits."""
    client = get_supabase_client()

    user_id = session.get("metadata", {}).get("user_id")
    plan = session.get("metadata", {}).get("plan")
    subscription_id = session.get("subscription")
    customer_id = session.get("customer")

    if not user_id:
        print(f"[STRIPE] Warning: No user_id in checkout session metadata")
        return

    credits_to_add = CREDITS_PER_PLAN.get(plan, 0)

    # Add credits to user
    new_balance = await add_credits(user_id, credits_to_add)

    # Update profile with subscription info
    client.table("profiles").upsert({
        "user_id": user_id,
        "stripe_customer_id": customer_id,
        "stripe_subscription_id": subscription_id,
        "subscription_plan": plan,
        "subscription_status": "active"
    }, on_conflict="user_id").execute()

    print(f"[STRIPE] User {user_id} subscribed to {plan} plan. Added {credits_to_add} credits. New balance: {new_balance}")


async def handle_subscription_updated(subscription: dict):
    """Handle subscription updates (status changes, plan changes)."""
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

    # Update subscription status
    client.table("profiles").update({
        "subscription_status": status
    }).eq("user_id", user_id).execute()

    print(f"[STRIPE] Updated subscription {subscription_id} status to {status}")


async def handle_subscription_deleted(subscription: dict):
    """Handle subscription cancellation."""
    client = get_supabase_client()

    subscription_id = subscription["id"]

    # Find user by subscription ID
    result = client.table("profiles").select("user_id").eq(
        "stripe_subscription_id", subscription_id
    ).execute()

    if not result.data:
        print(f"[STRIPE] Warning: No user found for subscription {subscription_id}")
        return

    user_id = result.data[0]["user_id"]

    # Clear subscription info (but keep remaining credits)
    client.table("profiles").update({
        "stripe_subscription_id": None,
        "subscription_plan": None,
        "subscription_status": "canceled"
    }).eq("user_id", user_id).execute()

    print(f"[STRIPE] User {user_id} subscription canceled")


async def handle_invoice_paid(invoice: dict):
    """Handle successful invoice payment - add monthly credits on renewal."""
    # Skip if this is the first invoice (handled by checkout.session.completed)
    billing_reason = invoice.get("billing_reason")
    if billing_reason == "subscription_create":
        print(f"[STRIPE] Skipping initial invoice (handled by checkout)")
        return

    # Only process subscription renewals
    if billing_reason not in ("subscription_cycle", "subscription_update"):
        print(f"[STRIPE] Skipping invoice with billing_reason: {billing_reason}")
        return

    subscription_id = invoice.get("subscription")
    if not subscription_id:
        return

    client = get_supabase_client()

    # Find user by subscription ID
    result = client.table("profiles").select("user_id, subscription_plan").eq(
        "stripe_subscription_id", subscription_id
    ).execute()

    if not result.data:
        print(f"[STRIPE] Warning: No user found for subscription {subscription_id}")
        return

    user_id = result.data[0]["user_id"]
    plan = result.data[0].get("subscription_plan")

    if not plan:
        print(f"[STRIPE] Warning: No plan found for user {user_id}")
        return

    credits_to_add = CREDITS_PER_PLAN.get(plan, 0)

    # Add monthly credits
    new_balance = await add_credits(user_id, credits_to_add)
    print(f"[STRIPE] Monthly renewal: Added {credits_to_add} credits to user {user_id}. New balance: {new_balance}")


async def handle_payment_failed(invoice: dict):
    """Handle failed payment."""
    client = get_supabase_client()
    customer_id = invoice.get("customer")

    # Find user by customer ID and update status
    result = client.table("profiles").select("user_id").eq(
        "stripe_customer_id", customer_id
    ).execute()

    if result.data:
        user_id = result.data[0]["user_id"]
        client.table("profiles").update({
            "subscription_status": "past_due"
        }).eq("user_id", user_id).execute()
        print(f"[STRIPE] Payment failed for user {user_id}")
    else:
        print(f"[STRIPE] Payment failed for customer {customer_id}")
