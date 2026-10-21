<script setup>
useSeo({
  title: 'Privacy policy',
  description: 'What Ranked World collects, why, how long we keep it, who gets it, and how to use your privacy rights.',
});
</script>
<template>
  <main id="main" class="page">
    <div class="wrap legal">
      <LegalNav />
      <div class="page-head">
        <div>
          <h1>Privacy policy</h1>
          <p class="meta">Last updated {{ POLICY_DATE }}</p>
        </div>
      </div>
      <div class="legal__body">
        <section>
          <h2>Who we are</h2>
          <LegalContact />
          <p>
            This policy covers the Ranked World website, desktop launcher, Discord bots, and ranked codes. See
            <NuxtLink to="/legal/business">project and contact details</NuxtLink>.
          </p>
        </section>
        <section>
          <h2>What we collect and why</h2>
          <ul>
            <li>Your Discord ID, display name, and avatar, to sign you in.</li>
            <li>Your Gorilla Tag account ID, name, platform, scores, rank, and match history, to run ranked play.</li>
            <li>Parties, friends, and practice results, to run those features.</li>
            <li>Your in-game color and cosmetics, to show on your profile and for moderation.</li>
            <li>
              Ranked round replays (movement, name, color, and tags) so players in the round and staff can watch it, and
              heat maps of where you play that only you can see.
            </li>
            <li>
              Scrim, Auto Ref, and Practice movement, to make replays. We ask separate permission before recording these
              modes or using them to train AI bots. Withdrawing stops new recordings but does not undo bots already
              trained.
            </li>
            <li>
              Ranked voice chat, only if you agree: text transcripts, audio clips of lines flagged for possible rule
              breaking, and a voice signature with a few short clips of your voice, to moderate ranked play and find
              alternate accounts of banned players.
            </li>
            <li>
              Anti-cheat data from ranked codes and scrims: your gameplay, statistics, connection quality, information
              your game reports, and short clips, to detect cheating.
            </li>
            <li>
              Security information: device, browser, and network information, your IP address, your Discord email,
              connected accounts, and servers, and a payment card identifier. We keep these only in scrambled form,
              except a few Discord server names staff can see when reviewing alternate accounts, and use them to protect
              accounts and enforce bans.
            </li>
            <li>A log of which parts of Ranked World your account used and when, for security and ban enforcement.</li>
            <li>Your IP address and request details, to deliver the site and stop abuse.</li>
            <li>
              Your plan, billing status, and Stripe or Discord billing references, to manage subscriptions. We never see
              or store your full card number.
            </li>
            <li>Support messages, moderation records, and when you accepted our terms.</li>
          </ul>
        </section>
        <section>
          <h2>Who can see it</h2>
          <p>
            Anyone can see your public profile: display name, Discord ID, rank, statistics, recent matches, color, and
            cosmetics. Pro members and players using their free peek can see who is in a ranked code. Staff can see
            moderation information. Your game account ID, devices, and payment details are never public.
          </p>
          <p>
            Staff can record ranked codes and publish videos or streams that show names, gameplay, voice, and moderation
            actions. Videos never show account IDs, device information, or payment details. Ask us to blur, mute, or cut
            you out.
          </p>
        </section>
        <section>
          <h2>Bans and automatic decisions</h2>
          <p>
            Some cheating detections, and accounts our security checks link to a rank banned account, can be banned
            automatically. Voice and play style matches are only ever reviewed by staff. You can appeal any ban and a
            staff member will review it.
          </p>
        </section>
        <section>
          <h2>Who we share it with</h2>
          <p>
            Discord (sign in, community features, Discord subscriptions, and private staff channels), Stripe (payments),
            and our hosting and database providers. They can process data outside your country, including in the United
            States. We do not sell your data or use it for advertising. Read
            <a href="https://discord.com/privacy" rel="noreferrer">Discord's</a> and
            <a href="https://stripe.com/privacy" rel="noreferrer">Stripe's</a> privacy policies.
          </p>
        </section>
        <section>
          <h2>How long we keep it</h2>
          <ul>
            <li>Ranked round replays: 5 days.</li>
            <li>Anti-cheat clips on our servers: 3 days. Copies sent to staff are kept as moderation records.</li>
            <li>Account activity log: 180 days.</li>
            <li>Security information: 24 months after it was last used.</li>
            <li>Sign-in cookie: 7 days. Our hosting providers keep their own short access logs.</li>
            <li>
              Everything else, including voice signatures, transcripts, and moderation records: until you ask us to
              delete it, unless we need it for a legal obligation or dispute.
            </li>
          </ul>
        </section>
        <section>
          <h2>Cookies</h2>
          <p>
            We only use necessary cookies and browser storage, for sign in and ban enforcement. No ad trackers or
            analytics. See the <NuxtLink to="/legal/cookies">Cookie policy</NuxtLink>.
          </p>
        </section>
        <section>
          <h2>Desktop launcher</h2>
          <p>
            The launcher keeps your game folder and sign in on your PC and sends the security information above. It can
            show your rank in your Discord status, which you can turn off in Discord's activity privacy settings. It
            does not upload your game files.
          </p>
        </section>
        <section>
          <h2>Your choices and rights</h2>
          <p>
            You can withdraw your voice agreement or replay permission in Settings at any time. Withdrawing voice
            removes you from ranked codes. Disconnecting your game account does not delete your data.
          </p>
          <p>
            Email <a :href="'mailto:' + CONTACT_EMAIL">{{ CONTACT_EMAIL }}</a> to ask for a copy, correction, or
            deletion of your data, or to object to how we use it. If we say no, reply to appeal. You can also complain
            to the <a href="https://coag.gov/file-complaint/" rel="noreferrer">Colorado Attorney General</a> or your
            local data protection authority.
          </p>
        </section>
        <section>
          <h2>Young players</h2>
          <p>
            You must be at least 13, or older if your country or Discord requires it. If you think a younger child's
            data was collected, contact us and we will remove it.
          </p>
        </section>
        <section>
          <h2>Changes</h2>
          <p>
            When we make an important change to this policy, we ask you to agree again before you keep using the website
            or launcher.
          </p>
        </section>
      </div>
    </div>
  </main>
</template>
<style src="~/assets/css/legal.css"></style>
