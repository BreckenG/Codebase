<script setup>
import { loadStripe } from "@stripe/stripe-js/pure";
loadStripe.setLoadParameters({ advancedFraudSignals: false });
const props = defineProps({ open: { type: Boolean, default: false }, tier: { type: Object, default: null }, interval: { type: String, default: "yearly" }, publishableKey: { type: String, default: "" } });
const emit = defineEmits(["close"]);
const STEPS = ["Payment", "Confirm"];
const step = ref(0);
const dir = ref("fwd");
const busy = ref(false);
const failure = ref("");
const finished = ref(false);
const methods = ref([]);
const paymentMethodId = ref(null);
const taxQuote = ref(null);
const accepted = ref(false);
const route=useRoute(),referral=ref(String(route.query.ref||'').toUpperCase().slice(0,20));
const addressMount = ref(null);
const paymentMount = ref(null);
const box = ref(null);
let stripe = null;
let elements = null;
let opener = null;
const chosen = computed(() => { const list = props.tier?.intervals || []; return list.find(i => i.key === props.interval) || list[0] || null; });
const per = computed(() => chosen.value ? chosen.value.label.toLowerCase() : "");
function token(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
function appearance() { return { theme: "night", variables: { colorPrimary: token("--color-plus"), colorBackground: token("--surface-2"), colorText: token("--color-text-primary"), colorTextSecondary: token("--color-text-secondary"), colorDanger: token("--color-red"), fontFamily: "Sora, system-ui, sans-serif", borderRadius: token("--radius-lg") || "10px", spacingUnit: "4px" }, rules: { ".Input": { border: "1px solid " + token("--surface-4"), boxShadow: "none" }, ".Input:focus": { border: "1px solid " + token("--color-plus"), boxShadow: "0 0 0 3px " + token("--color-plus-highlight") }, ".Label": { color: token("--color-text-secondary"), fontWeight: "600" }, ".Tab": { border: "1px solid " + token("--surface-4") }, ".Tab--selected": { border: "1px solid " + token("--color-plus"), color: token("--color-plus") } } }; }
const stageH = ref(0);
let ro = null;
function onEnter(el) { ro?.disconnect(); stageH.value = el.offsetHeight; ro = new ResizeObserver(() => stageH.value = el.offsetHeight); ro.observe(el); }
function close() { if (!busy.value) emit("close"); }
function onKey(e) { if (e.key === "Escape") close(); if (e.key === "Tab" && box.value) { const focusable = [...box.value.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), iframe, [tabindex="0"]')].filter(el => el.getClientRects().length); const first = focusable[0], last = focusable.at(-1); if (!first) { e.preventDefault(); box.value.focus(); } else if (e.shiftKey && (document.activeElement === first || document.activeElement === box.value)) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } } }
async function mountStripe() { failure.value = ""; try { if (!props.open) return; const setup = await apiPost("/api/billing/setup-intent"); if (!props.open) return; methods.value = setup.methods || []; stripe = stripe || (await loadStripe(props.publishableKey)); elements = stripe.elements({ clientSecret: setup.clientSecret, appearance: appearance(), fonts: [{ family: "Sora", src: `url(${window.location.origin}/fonts/sora-variable.ttf)`, weight: "100 800" }] }); await nextTick(); if (!props.open || !addressMount.value || !paymentMount.value) return; elements.create("address", { mode: "billing", display: { name: "full" }, autocomplete: { mode: "disabled" } }).mount(addressMount.value); elements.create("payment", { layout: "tabs", wallets: { applePay: "never", googlePay: "never" } }).mount(paymentMount.value); } catch (e) { failure.value = e.message; } }
async function toConfirm() { if (!elements) throw new Error("The payment form has not finished loading."); busy.value = true; failure.value = ""; try { const { error, setupIntent } = await stripe.confirmSetup({ elements, redirect: "if_required", confirmParams: { return_url: window.location.origin + "/subscribe" } }); if (error) throw new Error(error.message || "That card could not be saved."); paymentMethodId.value = setupIntent.payment_method; } finally { busy.value = false; } }
function afterCard() { setTimeout(async () => { dir.value = "fwd"; step.value = 1; try { taxQuote.value = await apiPost("/api/billing/quote", { tier: props.tier.key, interval: props.interval, referralCode: referral.value.trim(), paymentMethodId: paymentMethodId.value }); } catch { taxQuote.value = null; failure.value = "Could not confirm the total. Go back and try again before paying."; } }, 740); }
function onFail(e) { failure.value = e?.message || "That did not go through."; }
function back() { if (busy.value) return; dir.value = "back"; step.value = 0; }
async function pay() { if (!accepted.value) throw new Error("Accept the subscription terms before paying."); if (!taxQuote.value?.taxKnown) throw new Error("Confirm your billing address so we can calculate the final total before paying."); busy.value = true; failure.value = ""; try { const sub = await apiPost("/api/billing/subscription", { tier: props.tier.key, interval: props.interval, paymentMethodId: paymentMethodId.value, expectedTotal: taxQuote.value.total, referralCode: referral.value.trim(), accepted: true, policyVersion: POLICY_VERSION }); if (sub.clientSecret) { const { error } = await stripe.confirmCardPayment(sub.clientSecret, { payment_method: paymentMethodId.value }); if (error) throw new Error(error.message || "The payment did not go through."); } else if (!["active", "trialing", "updated"].includes(sub.status)) throw new Error("Your payment needs attention. Retry with the same payment method to continue."); } finally { busy.value = false; } }
function afterPay() { setTimeout(() => finished.value = true, 560); }
const cardOptions = computed(() => { let list = methods.value; if (!list.length && paymentMethodId.value) { list = [{ id: paymentMethodId.value, brand: "card", last4: "" }]; } const out = []; for (const m of list) { let brand = "Card"; if (m.brand) brand = m.brand[0].toUpperCase() + m.brand.slice(1); out.push({ id: m.id, label: brand + " ending in " + m.last4 }); } return out; });
async function opened() { step.value = 0; dir.value = "fwd"; busy.value = false; failure.value = ""; finished.value = false; paymentMethodId.value = null; taxQuote.value = null; accepted.value = false; stageH.value = 0; elements = null; opener = document.activeElement; document.body.classList.add("modal-open"); document.addEventListener("keydown", onKey); await nextTick(); box.value?.focus(); mountStripe(); }
function closed() { ro?.disconnect(); elements?.getElement("address")?.destroy(); elements?.getElement("payment")?.destroy(); elements = null; document.body.classList.remove("modal-open"); document.removeEventListener("keydown", onKey); }
onMounted(() => props.open && opened());
watch(() => props.open, open => open ? opened() : (closed(), opener?.focus?.()));
watch(paymentMethodId, async () => { if (step.value !== 1 || !props.open || busy.value) return; taxQuote.value = null; try { taxQuote.value = await apiPost("/api/billing/quote", { tier: props.tier.key, interval: props.interval, referralCode: referral.value.trim(), paymentMethodId: paymentMethodId.value }); } catch { failure.value = "Could not confirm the total for this payment method. Go back and try again."; } });
onBeforeUnmount(closed);
</script>
<template>
<div v-if="tier && open" class="modal" :data-closed="open ? undefined : ''" :data-accent="tier.key" role="dialog" aria-modal="true" aria-labelledby="checkouttitle" @click.self="close" ><div ref="box" class="modal__box" tabindex="-1"><div class="modal__head"><button v-if="step === 1 && !finished" class="icon-btn" aria-label="Back to payment details" @click="back"><AppIcon name="arrowLeft" /></button><h2 id="checkouttitle">
          {{ finished ? "You're in" : "Subscribe to Ranked World " + tier.name }}
        </h2><button class="icon-btn" aria-label="Close checkout" @click="close"><AppIcon name="x" /></button></div><div class="modal__body"><template v-if="finished"><SuccessCheck :label="'Subscribed to Ranked World ' + tier.name" /><div class="done"><h3>Welcome to Ranked World {{ tier.name }}</h3><p class="meta">
              Your membership updates after payment confirmation. Manage or cancel it in Settings.
            </p></div><div class="modal__foot modal__foot--solo"><button class="btn btn--plus btn--large modal__go" @click="$router.go(0)"><AppIcon name="check" />Done
            </button></div></template><template v-else><div class="summary"><div><div class="summary__plan">Ranked World {{ tier.name }}</div><div class="meta">{{ chosen.label }}, renews until you cancel</div></div><div class="summary__price"><b>{{ chosen.price }}</b><span class="meta">/ {{ per }}</span></div></div><p v-if="taxQuote?.referral" class="meta">{{ taxQuote.referral.code }}: {{ taxQuote.referral.percent }}% off this first month. Regular renewal: {{ chosen.price }}.</p><StepRail :steps="STEPS" :at="step" label="Checkout progress" /><div class="stage" :style="stageH ? { height: stageH + 'px' } : null"><Transition :name="dir" mode="out-in" appear @enter="onEnter"><div :key="step" class="stage__pane"><template v-if="step === 0"><label class="referral-input">Referral code<input v-model="referral" class="input" maxlength="20" autocomplete="off" placeholder="Optional" /></label><p v-if="referral" class="meta">15% off your first month with monthly billing. Later months renew at the regular price.</p><div ref="addressMount" class="stripe-box" /><div ref="paymentMount" class="stripe-box" /><p class="fineprint"><AppIcon name="info" /><span>
                      Card details go straight to Stripe, we never see them. Your payment method is saved for this subscription. You confirm the charge on the next step.
                    </span></p></template><template v-else><div class="receipt"><div class="receipt__row"><span>Ranked World {{ tier.name }}, {{ per }}</span><span>{{ chosen.price }}</span></div><div v-if="taxQuote?.referral" class="receipt__row"><span>First month discount ({{ taxQuote.referral.percent }}%)</span><span>{{ money(Math.max(0, taxQuote.subtotal + taxQuote.tax - taxQuote.total)) }} off</span></div><div class="receipt__row"><span>Tax</span><span>{{ taxQuote ? money(taxQuote.tax) : "..." }}</span></div><div class="receipt__total"><b>Due today</b><b>{{ taxQuote ? money(taxQuote.total) : chosen.price }}</b></div></div><p v-if="taxQuote && !taxQuote.taxKnown" class="bad" role="alert">We could not confirm the final tax amount. Please try again later or contact support.</p><ThemedSelect v-model="paymentMethodId" :options="cardOptions" label="Paying with" /><label class="consent-check"><input v-model="accepted" type="checkbox" /><span>I authorize recurring payments at the amount and interval shown and agree to the <NuxtLink to="/legal/terms" target="_blank" rel="noopener">Terms</NuxtLink> and <NuxtLink to="/legal/refunds" target="_blank" rel="noopener">Refund policy</NuxtLink>. I am an adult or have permission from my parent or guardian to make this purchase. Cancel in Settings before renewal. My statutory rights remain unchanged.</span></label><p class="fineprint"><AppIcon name="info" /><span>
                      Today you pay {{ taxQuote ? money(taxQuote.total) : chosen.price }}. Future renewals charge {{ chosen.price }} every {{ per }} plus applicable tax. Your subscription starts
                      today, until you cancel from your settings.
                    </span></p></template></div></Transition></div><Transition name="swap"><div v-if="failure" class="alert" role="alert"><AppIcon name="info" /><span>{{ failure }}</span></div></Transition><div class="modal__foot"><button class="btn btn--ghost" :disabled="busy" @click="step === 1 ? back() : close()">
              {{ step === 1 ? "Back" : "Cancel" }}
            </button><ActionButton v-if="step === 0" class="modal__go" variant="plus" wide icon="arrowRight" trailing :action="toConfirm" done-label="Card saved" fail-label="Check the card" @ok="afterCard" @fail="onFail" >
              Save payment method and review
            </ActionButton><ActionButton v-else class="modal__go" variant="plus" wide :action="pay" :disabled="!accepted || !taxQuote?.taxKnown" done-label="Payment submitted" fail-label="Payment failed" @ok="afterPay" @fail="onFail" >
              Subscribe for {{ taxQuote ? money(taxQuote.total) : chosen.price }}
            </ActionButton></div></template></div></div></div>
</template>
<style src="~/assets/css/modal.css">
</style>
