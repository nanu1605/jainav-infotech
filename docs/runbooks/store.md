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

2. **Webhook** (Razorpay Dashboard, test mode → Webhooks → Add): URL `https://staging.{{DOMAIN}}/api/v1/webhooks/razorpay` (Caddy lets it past basic auth), the secret from step 1, events `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`, `refund.created`, `refund.processed`, `refund.failed`, and the six dispute events `payment.dispute.created`, `.won`, `.lost`, `.closed`, `.under_review`, `.action_required`.
3. **Capture:** Dashboard → Account & Settings → Payment capture: automatic.
4. **Admin** (staging, as Owner):
   - Settings → Commerce settings: the SAC code, invoice prefixes and, once the CA confirms, "Charge GST" (needs the company GSTIN in Site settings first); the current Terms and EULA versions (they are recorded with every order).
   - Products → Plans: VYRO Pro's price (paise, GST-inclusive) and "Active".
   - Content → Legal pages: publish Terms, the VYRO EULA (`eula-vyro`), Refunds and Cancellation, and Shipping and Delivery. Until all four are live, the checkout shows "can't be bought right now" and refuses orders.
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

## Refunds, disputes and reports (Phase 9 "done when")

10. **Refund from the admin:** as Owner, Store → Orders → the paid test order → **Refund…**. Enter part of the amount and a reason → **Review refund** → **Refund**. Within a few seconds of Razorpay's `refund.processed` webhook (reload the order):
    - the order is `partially-refunded`, its Refunded amount set, with a `JC/…` credit note under Credit notes;
    - the credit note PDF says "Against invoice JI/… dated …";
    - the customer gets the refund email with the credit note attached, and their Orders page lists it.
      Refund the rest: the order is `refunded`, the credit notes add up to the invoice, and the license is revoked (the refund email says so; no separate email).
11. **Refund from Razorpay's dashboard:** buy again, then Dashboard → Payments → the payment → Issue refund. The same effects follow, because they all come from the webhook.
12. **Failed refund:** Razorpay's test mode can't fail a refund on request; the `refund.failed` path (a Telegram alert, an email to the customer, no credit note) is covered by the integration tests.
13. **Dispute:** if Razorpay's test mode offers a way to raise a test dispute on a payment, use it; otherwise the path is covered by the integration tests and the stand-in gateway (below). The order becomes `disputed`, the license `suspended`, the customer gets the suspended email and Telegram an alert with the respond-by date. When the dispute ends, the order goes back to `paid` or `partially-refunded` (won, closed), or to `chargeback` if it was lost, even if the loss is processed before the dispute opened, when the alert says the license wasn't suspended. The license never follows by itself: reinstate (Support or Owner; the customer gets an email) or revoke (Owner) it by hand. A lost dispute gets no credit note by itself: ask the CA how to record it.
    **Check on staging:** Razorpay's disputes page says it refunds an accepted non-fraud dispute by itself. If test mode lets you accept one, see which webhooks arrive (`payment.dispute.lost`, `refund.processed` or both) and what the order ends as. A refund after a loss issues a credit note and keeps `chargeback`, unless it covers the whole order, which then shows `refunded`.
14. **Paid twice:** an order flagged "Paid twice" shows **Refund duplicate** for each extra payment in **Refund…**. It issues no credit note and leaves the order and license alone; the flag goes once every extra payment is refunded. Two separate orders are different: Telegram says when one customer has two paid orders for one plan within 7 days (a late capture plus a retry, or a deliberate second purchase). If it was one purchase, refund the extra order as usual, which revokes its license.
15. **Other actions:** Licenses → a license → **Resend license email**; Invoices → an invoice → **Re-render PDF** (same number, new file); Customers → a customer → **Delete account** (Owner; what the customer's Settings page does, for someone who can't use it).
16. **Reports:** sidebar Reports → Reports, pick the month: the CA report (Owner) lists the month's invoices and credit notes (credit notes negative) and a SAC summary; its Total is the month's paid orders minus its refunds. A last section, when there are any, lists the month's lost disputes: no credit note covers them and the Total leaves them out, so ask the CA how to record them. The leads report counts the month's leads by type, product and status. Daily stats shows 7- and 30-day totals above the list, and the Umami link once `NEXT_PUBLIC_UMAMI_URL` is set.

Locally the stand-in gateway takes the dashboard's place: `POST /api/v1/dev/razorpay/refund` with `{"payment_id": "pay_dev…", "amount": 10000, "outcome": "processed"}` (or `"failed"`), and `POST /api/v1/dev/razorpay/dispute` with `{"payment_id": "pay_dev…"}` (then `"event": "won"` and the `dispute_id` it returned).

## Email a waitlist (Phase 9)

Leads → Waitlist emails → Create new: the product, the English subject and message (switch the language to add Hindi). Save, then **Send a test to me** (the English and the Hindi version arrive), then **Send to N people…**. It goes once per address, only to waitlist leads with marketing consent that wasn't withdrawn or unsubscribed, about two a second; the email shows "Sending: x of N", then "Sent". Sent emails can't be changed or deleted.

## Turning it off

Untick "Store enabled". Orders, invoices and accounts stay; checkout and account pages answer 404.
