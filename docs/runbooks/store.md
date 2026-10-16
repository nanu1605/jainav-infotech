# Store: test mode on staging (Phase 7)

How to switch on accounts and checkout on staging with Razorpay's test mode. Production keeps the store off until Launch 2 (spec §20 Phase 10). Locally nothing is needed: without Razorpay keys, development uses the stand-in gateway (`docs/decisions.md`, Phase 7).

## Inputs from Tanishq

- Razorpay **test** keys (Dashboard → Test mode → Account & Settings → API Keys): key id `rzp_test_…` and secret.
- The VYRO plans and prices, and from the CA: GST status, SAC code, export treatment, invoice prefix, how long orders and invoices must be kept.

## Steps

1. **Secrets** in the staging app's environment (`/srv/jainav/staging.env`, see `server.md`):
   - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (test mode);
   - `RAZORPAY_WEBHOOK_SECRET`: a new random value, also entered in step 2 (`openssl rand -hex 32`);
   - `OTP_PEPPER`: a new random value (`openssl rand -hex 32`). Changing it later invalidates codes in flight only.

   Restart the staging app so it reads them: in `/srv/jainav`, `docker compose -f compose.prod.yml up -d --force-recreate app-staging`.

2. **Webhook** (Razorpay Dashboard, test mode → Webhooks → Add): URL `https://staging.{{DOMAIN}}/api/v1/webhooks/razorpay` (Caddy lets it past basic auth), the secret from step 1, events `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`, `refund.created`, `refund.processed`, `refund.failed`, `payment.dispute.created`.
3. **Capture:** Dashboard → Account & Settings → Payment capture: automatic.
4. **Admin** (staging, as Owner):
   - Settings → Commerce settings: the SAC code, invoice prefixes and, once the CA confirms, "Charge GST" (needs the company GSTIN in Site settings first); the current Terms and EULA versions (they are recorded with every order).
   - Products → Plans: VYRO Pro's price (paise, GST-inclusive) and "Active".
   - Settings → Site settings → Site: "Store enabled".
5. **Content security policy:** keep the browser console open during the test purchase (step 6), starting from the pricing page. Any `Content-Security-Policy` violation naming a Razorpay host goes into `src/lib/csp.ts` (`RAZORPAY`).

## Test purchase (spec §20 Phase 7 "done when")

6. Sign in at `/account/sign-in` (the code arrives by email), open VYRO's pricing page → Buy Pro → fill in the billing details, tick the Terms box → Pay. In Razorpay's test checkout use UPI `success@razorpay` or card `4100 2800 0000 1007` (any future expiry, any CVV, any OTP).
7. Check:
   - the success page shows the order and, a few seconds later, the invoice link;
   - the order confirmation email arrives with the invoice PDF attached;
   - in the admin, the order is `paid` with `paid` (verify) and webhook entries in its events, and Webhook events lists the `payment.captured` and `order.paid` events as processed;
   - the invoice PDF has every field of spec §11.4.
8. Failure path: pay with `failure@razorpay`; the checkout says the payment failed and lets you retry; the order gets a `payment-failed` event.
9. Late capture: Razorpay's test mode can't delay a capture; the reconciliation job (every 15 minutes) is covered by the integration tests.

## Turning it off

Untick "Store enabled". Orders, invoices and accounts stay; checkout and account pages answer 404.
