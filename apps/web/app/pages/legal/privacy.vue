<script setup>
useSeo({
  title: 'Privacy policy',
  description:
    'What Ranked World collects from Discord and Gorilla Tag, how match results and movement recordings are used, and how to withdraw consent or ask for deletion.',
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
            This policy covers the Ranked World website and desktop launcher and explains related game, bot, replay, and
            support data. See <NuxtLink to="/legal/business">project and contact details</NuxtLink>.
          </p>
        </section>
        <section>
          <h2>Data we use and why</h2>
          <ul>
            <li>
              Discord ID, display name, and avatar to sign you in and identify your account. Discord login requests only
              the identify permission. We do not request your Discord email, messages, contacts, or password.
            </li>
            <li>
              Your Gorilla Tag account ID, game name, account connection, scores, tags, survival time, match timestamps,
              and rank to operate ranked play and match history.
            </li>
            <li>
              Party membership, invitations, friend relationships, lobby participation, and practice session results to
              provide those features.
            </li>
            <li>
              Scrim, Auto Ref, and Practice movement frames and player identifiers to produce game replays. Movement can
              identify or distinguish players even when names are removed.
            </li>
            <li>
              Voice chat in ranked codes: text transcripts with the code, time, and players in the room, and audio clips
              of lines that are flagged for possible rule breaking such as hate speech, slurs, threats, or sexual
              content, to moderate ranked play.
            </li>
            <li>
              Anti-cheat data from ranked codes: your movement, match statistics, connection quality such as frame rate
              and ping, information your game reports, and short video clips of your gameplay, to detect and review
              cheating.
            </li>
            <li>
              Ranked round replays: the movement, name, color, and tags of each player in a ranked round, kept for 5
              days and then deleted. Players who were in the round can watch it with a membership, and staff can watch
              it for moderation.
            </li>
            <li>
              Heat maps: a running count of where on the map you spend time, get tagged, and tag others in ranked
              rounds. Only you can see your own.
            </li>
            <li>Your in-game color and cosmetics, used for moderation such as reviewing alternate accounts.</li>
            <li>
              Support messages and moderation records to respond to requests, investigate abuse, and handle appeals.
            </li>
            <li>
              Stripe customer and subscription references, plan, status, and renewal information to manage billing.
              Stripe receives payment details and billing information through its payment form. The website does not
              store your full card number or security code.
            </li>
            <li>
              The policy version and time when you accept account, connection, or billing terms. We do not collect a
              birth date or an extra IP address for these acceptance records.
            </li>
            <li>
              IP addresses and request information for network delivery, security, and rate limiting. Hosting providers
              can also maintain access and error logs.
            </li>
            <li>
              An account activity log: which parts of the website, launcher, and Discord panel your account used and
              when, your browser or app type, your browser language, and a scrambled form of your IP address. We keep it
              for 180 days and use it to find ban evasion and alternate accounts.
            </li>
            <li>
              Device and network identifiers used to enforce bans: identifiers of the browser, PC, and VR hardware you
              use, technical details of your browser and device, a cookie and other browser storage on the website, the
              Steam accounts used on your PC when you use the launcher, and your IP address, each tied to the accounts
              that used them. From your IP address we also work out your internet provider, your rough location (city),
              and whether it belongs to a VPN or hosting provider, and we compare your device time zone with that
              location. We store them only in scrambled form, so the original identifiers and IP address are not kept in
              this record. We keep each one for 24 months after it was last used. Accounts linked this way to a rank
              banned account can be rank banned automatically or sent to staff for review. You can appeal an automatic
              ban and a staff member will review it.
            </li>
            <li>
              Discord account details when you sign in: your verified email address, the accounts you connected to your
              Discord profile, the servers you are in, your avatar and display name, and when your Discord account was
              made. We use these only to find alternate accounts of banned players and to require a minimum account age.
              We keep scrambled values that show when two accounts match. We do not keep your email address. From your
              server list we keep only the names of very small servers (15 members or fewer), and staff can see that
              name when your account and a banned account are both in it. A display name made only of symbols is kept
              the same way.
            </li>
            <li>
              A scrambled card identifier from Stripe when you save a card, to tell when two accounts use the same card.
            </li>
          </ul>
        </section>
        <section>
          <h2>What other players can see</h2>
          <p>
            Your public profile can show your display name, Discord profile identifier, rank, statistics, and recent
            match results. Your game account ID, ban status, current room presence, and historical room codes are not
            included in the public profile response. Bans and mutes can still appear in staff videos, as described under
            Videos and streams. Your own account can show those details. Party members and other participants can see
            information needed to play together.
          </p>
          <p>
            Disconnecting stops the Discord association on your game profile. It does not erase existing records or
            cancel a subscription.
          </p>
        </section>
        <section>
          <h2>Training and recordings</h2>
          <p>
            We ask for separate permission to record your gameplay movement and routes in Scrims (including Auto Ref),
            Practice, AI Trainer, and Mirror Bot when those modes are available, and to use new replays to train and
            improve AI bots. We store your permission version, time, source, and any withdrawal. Accepting account or
            connection terms does not grant this permission.
          </p>
          <p>
            You can withdraw permission in Settings to stop new recordings. These four modes require current permission
            when available. Withdrawal does not automatically delete earlier recordings or remove their influence from
            an existing trained model. Contact us to ask whether a recording includes you or to request access or
            removal.
          </p>
          <p>
            Earlier movement recordings used for training came from official CGT scrims. Participants in those scrims
            were told they were being recorded to train AI bots.
          </p>
        </section>
        <section>
          <h2>Ranked voice chat transcripts</h2>
          <p>
            Voice chat in ranked codes is converted to text on our own servers. We keep the text transcript, the code,
            when it was open, and the players who were in it. We also keep an audio clip of each line that is
            automatically flagged for possible rule breaking.
          </p>
          <p>
            To find alternate accounts of banned players, we also make a voice signature for each player in ranked
            codes. A voice signature is a set of numbers that describes how a voice sounds. We keep it together with up
            to ten short clips of your voice (3 to 25 seconds each) and what was said in them. A voice match is sent to
            staff for review with one clip from each account and does not ban anyone by itself. We do not use voice
            signatures for anything else or share them. Other audio is not kept. Contact us to have your voice signature
            and clips deleted.
          </p>
          <p>
            Flagged lines and their audio clips are sent to a private staff channel, where staff review them to enforce
            the rules. A clip can be sent to the player who said it as evidence for a ban or mute. Transcripts and clips
            are kept as moderation records and do not have an automatic deletion schedule. Contact us to ask for a copy
            or for removal.
          </p>
          <p>
            You must agree to this before you can see or join ranked codes. Players who have not agreed are removed from
            ranked codes. Moderation staff are exempt while in moderation mode.
          </p>
        </section>
        <section>
          <h2>Anti-cheat</h2>
          <p>
            In ranked codes we check gameplay for cheating. We store per-match statistics, a history of your statistics
            across matches, anti-cheat reports, and short video clips of gameplay around a suspicious moment. When a
            report has no clip, a clip of that player can be recorded in a later match.
          </p>
          <p>
            We also compare how accounts play, such as movement and body proportions shown by your in-game character,
            usual playing times, friends, and connection details, to find alternate accounts of banned players. A match
            of this kind is sent to staff for review and does not ban anyone by itself. Reports and clips are sent to a
            private staff channel. Some detections apply a ranked ban automatically and others are reviewed by staff
            first. You can appeal any ban and a staff member will review it. Players can also be removed from a code
            automatically for other rules, such as not being connected, being in the wrong bracket, or not agreeing to
            voice transcription. Clips are deleted from our server after three days. Reports, statistics, and clips
            posted to the staff channel are kept as moderation records and do not have an automatic deletion schedule.
            Contact us to ask for a copy or for removal.
          </p>
          <p>
            We also record your in-game color and cosmetics. Staff tools can link accounts that appear to belong to the
            same person and show those accounts' names, color, cosmetics, and Discord avatars to staff. Staff can see
            this moderation information about the players in their code while in game.
          </p>
        </section>
        <section>
          <h2>Videos and streams</h2>
          <p>
            Staff can record ranked codes, including while moderating, and publish the recordings as videos or streams,
            for example on YouTube. A recording can include what anyone in the code would see and hear: your display
            name, color, cosmetics, movement, and voice chat. It can also show moderation tools on screen: your Discord
            display name, rank and statistics, anti-cheat flags and clips, linked accounts, and bans or mutes with their
            reason, including one applied during the recording.
          </p>
          <p>
            Recordings do not show your Discord or game account IDs, device or network identifiers, or payment
            information. Contact us to have your name or voice removed from a video and we will blur, mute, or cut it.
          </p>
        </section>
        <section>
          <h2>Providers and transfers</h2>
          <p>
            Discord handles login and community features. IP location data comes from a database we run on our own
            servers (<a href="https://db-ip.com" rel="noopener" target="_blank">IP Geolocation by DB-IP</a>), so your IP
            address is not sent to anyone for this. Stripe handles requested payment services. Our hosting and database
            providers process information needed to run the service. Email providers process messages you send us.
            Providers can process information outside your country, including in the United States.
          </p>
          <p>
            We serve fonts and site artwork locally. Avatar images use a restricted server proxy instead of contacting
            Discord from your browser. Third-party links open their own services; they are not embedded social feeds or
            video players.
          </p>
          <p>
            Read <a href="https://discord.com/privacy" rel="noreferrer">Discord's Privacy policy</a> and
            <a href="https://stripe.com/privacy" rel="noreferrer">Stripe's Privacy policy</a>. Where transfer safeguards
            are legally required, those safeguards must cover the relevant provider and processing.
          </p>
        </section>
        <section>
          <h2>Cookies and optional tracking</h2>
          <p>
            The website uses necessary login and login-security cookies, and a cookie and browser storage entry that
            identify your browser to enforce bans. No advertising, audience analytics, session replay analytics, or
            marketing pixel is included in this website build. Game replays are separate from website analytics. Payment
            technology loads only when you open checkout. See the
            <NuxtLink to="/legal/cookies">Cookie policy</NuxtLink>.
          </p>
          <p>
            The website does not sell personal data or use it for targeted advertising. It does not activate sale or
            advertising processing when your browser sends a Global Privacy Control signal.
          </p>
        </section>
        <section>
          <h2>Desktop launcher</h2>
          <p>
            The launcher stores your selected game folder on your computer and its account session in Windows Credential
            Manager. To enforce bans it sends scrambled identifiers of your PC, its hardware, connected VR equipment,
            and the Steam accounts used on it, as described under Data we use and why. The server stores a hash of the
            session token with your Discord account identity. Desktop sessions expire after 30 days, and browser
            approval requests expire after ten minutes. Signing out removes the local session and attempts to revoke it
            on the server.
          </p>
          <p>
            Selecting a room writes a temporary join request in your Gorilla Tag configuration folder. Requests expire
            after two minutes. The helper writes local join status so the launcher can show whether the game joined.
            Your game folder and local join files are not uploaded by the launcher. Installing the helper copies its DLL
            into your existing BepInEx plugins folder.
          </p>
        </section>
        <section>
          <h2>Retention</h2>
          <p>
            Login cookies expire after seven days and login security cookies after ten minutes. Connection codes and
            temporary commands expire according to their service settings. Code session logs remain available while a
            code is open and expire 48 hours after it closes.
          </p>
          <p>
            Account, match, practice, replay, training, billing, and moderation records do not all have automatic
            deletion schedules. Disconnecting is not a deletion request. Contact us for deletion or retention
            information. Records needed for a legal obligation or a specific dispute can require longer retention;
            access to those records should remain limited to that purpose.
          </p>
        </section>
        <section>
          <h2>Your privacy choices</h2>
          <p>
            Email <a :href="'mailto:' + CONTACT_EMAIL">{{ CONTACT_EMAIL }}</a> to request access, a copy, correction,
            deletion, restriction, or an objection to processing. Describe the request and provide the account
            identifier needed to locate your records. Do not send a password, full card number, or identity document
            unless we establish that it is necessary through a secure process.
          </p>
          <p>
            Rights and deadlines depend on the law that applies. Where consent is the basis for an optional use, you can
            withdraw it without affecting earlier lawful processing. For core account and requested service functions,
            processing can instead be necessary to provide the service, meet legal obligations, or protect legitimate
            interests where the law allows. We do not treat a terms checkbox as blanket consent.
          </p>
          <p>
            If we deny a request, you can ask for an appeal by replying to the decision. You can also complain to the
            <a href="https://coag.gov/file-complaint/" rel="noreferrer">Colorado Attorney General</a> or your local data
            protection authority. Exercising privacy rights does not by itself remove access to unrelated services.
          </p>
        </section>
        <section>
          <h2>Young players</h2>
          <p>
            Ranked World requires players to be at least 13 and to meet any higher minimum age required by local law or
            Discord. Minors need a parent or guardian's agreement where required. This checkbox is not age verification
            or verifiable parental consent. If you believe a younger child's information has been collected, contact us
            so we can investigate and restrict the account and processing.
          </p>
        </section>
      </div>
    </div>
  </main>
</template>
<style src="~/assets/css/legal.css"></style>
