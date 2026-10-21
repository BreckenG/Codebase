<script setup>
useSeo({
  title: 'Terms and conditions',
  description: 'The rules for using Ranked World: who can use it, fair play, ranked codes, and memberships.',
});
</script>
<template>
  <main id="main" class="page">
    <div class="wrap legal">
      <LegalNav />
      <div class="page-head">
        <div>
          <h1>Terms and conditions</h1>
          <p class="meta">Last updated {{ POLICY_DATE }}</p>
        </div>
      </div>
      <div class="legal__body">
        <section>
          <h2>The service</h2>
          <LegalContact />
          <p>
            Ranked World provides ranked codes, scores, match history, parties, and practice tools for Gorilla Tag. It
            is an independent community project, not an official Another Axiom service. The
            <NuxtLink to="/legal/privacy">Privacy policy</NuxtLink> explains data use.
          </p>
        </section>
        <section>
          <h2>Who can use it</h2>
          <p>
            You must be at least 13, or older if your country or
            <a
              href="https://support.discord.com/hc/en-us/articles/360040724612-Why-is-Discord-asking-for-my-birthday"
              rel="noreferrer"
              >Discord</a
            >
            requires it. If you are a minor, a parent or guardian must agree to these terms where the law requires it.
            Only connect accounts you control, and keep your sign in and private codes safe.
          </p>
        </section>
        <section>
          <h2>Rules</h2>
          <p>
            Do not cheat, manipulate results, evade bans, harass others, share private codes, or interfere with the
            service. A ban applies to the person, not only the account. Some bans, including bans of alternate accounts,
            are applied automatically. Your Discord account must meet a minimum age to connect. You can appeal any
            moderation decision.
          </p>
        </section>
        <section>
          <h2>Ranked codes</h2>
          <p>
            Your display name, rank, statistics, and recent matches are public. To join ranked codes you must agree to
            voice chat being transcribed and voice matched. Staff can record ranked codes and publish videos that show
            names, gameplay, voice, and moderation actions. Connecting does not give permission to train AI bots on your
            gameplay. See the <NuxtLink to="/legal/privacy">Privacy policy</NuxtLink>.
          </p>
        </section>
        <section>
          <h2>Paid plans</h2>
          <p>
            The plan, billing interval, price, taxes, and amount due are shown before you pay. Features marked coming
            soon are not part of what you buy.
          </p>
          <p>
            Subscriptions renew until cancelled. Cancel in <NuxtLink to="/settings#membership">Settings</NuxtLink>, or
            in Discord if you subscribed there. See the <NuxtLink to="/legal/refunds">Refund policy</NuxtLink>. A ban
            does not remove refund rights the law gives you.
          </p>
        </section>
        <section>
          <h2>Availability and changes</h2>
          <p>
            Features can be down for maintenance or outages, and ranks and matchmaking are not guaranteed. When we make
            an important change to these terms, we ask you to agree again.
          </p>
        </section>
        <section>
          <h2>Content and intellectual property</h2>
          <p>
            Only share content you own or have permission to use. Gorilla Tag and other third-party content belong to
            their owners.
          </p>
          <p>
            Report copyright concerns through the <NuxtLink to="/legal/business">contact page</NuxtLink>. See the
            <a href="https://www.gorillatagvr.com/fan-content-mod-policy" rel="noreferrer"
              >Another Axiom Fan Content and Mod Policy</a
            >.
          </p>
        </section>
        <section>
          <h2>Your legal rights</h2>
          <p>
            Nothing here takes away rights the law gives you. Ranked World operates from Colorado, United States, and
            where you live can give you more rights.
          </p>
        </section>
      </div>
    </div>
  </main>
</template>
<style src="~/assets/css/legal.css"></style>
