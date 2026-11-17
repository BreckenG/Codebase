<script setup>
useSeo({
  title: 'Refund policy',
  description:
    'How billing, cancellation and refunds work for Ranked World Plus and Pro memberships, and what to send when you ask for a refund.',
});
</script>
<template>
  <main id="main" class="page">
    <div class="wrap legal">
      <LegalNav />
      <div class="page-head">
        <div>
          <h1>Refund policy</h1>
          <p class="meta">Last updated {{ POLICY_DATE }}</p>
        </div>
      </div>
      <div class="legal__body">
        <section>
          <h2>All payments are final</h2>
          <p>
            Payments for Ranked World Plus and Pro are non-refundable, except in the cases listed under When we refund.
            This includes, without limitation:
          </p>
          <ul>
            <li>time left in a billing period after you cancel</li>
            <li>a renewal you forgot to cancel</li>
            <li>switching plans or billing intervals</li>
            <li>not using the membership or any of its features</li>
            <li>features marked coming soon, or features that change, pause or are removed</li>
            <li>a rank ban, suspension or account action for breaking the rules</li>
            <li>not liking how bots, matchmaking, codes or other features work</li>
            <li>changes to Gorilla Tag by Another Axiom that affect the service</li>
          </ul>
        </section>
        <section>
          <h2>When we refund</h2>
          <p>We only refund a charge when one of these happened:</p>
          <ul>
            <li>you were charged twice for the same period</li>
            <li>you were charged after your cancellation had already taken effect</li>
            <li>you were charged the wrong amount because of our mistake</li>
            <li>
              paid features were unavailable because of a fault on our side for more than 7 days in a row. We can extend
              your membership by the lost time instead of refunding.
            </li>
          </ul>
          <p>
            Ask within 14 days of the charge by emailing <a :href="'mailto:' + CONTACT_EMAIL">{{ CONTACT_EMAIL }}</a> with
            your account, the charge date, the amount and the invoice reference if you have it. Do not send a full card
            number or password. Any other refund is at our sole discretion and does not create a right to future refunds.
            Approved refunds go back through the original payment method. Your bank controls when it appears.
          </p>
        </section>
        <section>
          <h2>Cancel your subscription</h2>
          <p>
            Use <NuxtLink to="/settings#membership">Settings, Membership, Cancel subscription</NuxtLink>. Cancelling stops
            future renewals. You keep access until the end of the period you already paid for, and that period is not
            refunded. Cancel before the renewal date to avoid the next charge.
          </p>
          <p>
            If you cannot sign in or cancellation fails, email
            <a :href="'mailto:' + CONTACT_EMAIL">{{ CONTACT_EMAIL }}</a
            > before the renewal date. Disconnecting Gorilla Tag or signing out does not cancel billing.
          </p>
        </section>
        <section>
          <h2>Purchases through Discord</h2>
          <p>
            Memberships bought in Discord are billed by Discord. Refunds for those follow Discord's own terms and are
            requested from Discord, not from us.
          </p>
        </section>
        <section>
          <h2>Disputes and chargebacks</h2>
          <p>
            Contact us before opening a dispute with your bank or card provider. While a dispute or chargeback is open,
            paid features on the account can be paused. If a chargeback is filed for a charge that was valid under this
            policy, the account can lose access to paid plans.
          </p>
        </section>
        <section>
          <h2>Right to withdraw</h2>
          <p>
            Your membership starts as soon as you pay. At checkout you ask for it to start right away and confirm that you
            lose any right to withdraw from the purchase once it has started. This is how the 14-day withdrawal period for
            digital services works in the EU and UK.
          </p>
          <p>
            Nothing in this policy takes away rights that the law in your country gives you and that cannot be waived.
          </p>
        </section>
        <section>
          <h2>Plan and price changes</h2>
          <p>
            A plan change shows its price and timing before you agree to it. Price changes for renewals are announced
            before they apply, and you can cancel before the new price is charged. If a payment fails, check Settings and
            the payment provider's notice for the account's actual status.
          </p>
        </section>
        <section>
          <h2>Contact</h2>
          <LegalContact />
        </section>
      </div>
    </div>
  </main>
</template>
<style src="~/assets/css/legal.css"></style>
