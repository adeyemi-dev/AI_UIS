import React, { useMemo, useState } from "react";

/**
 * Authentik.ng — Personal Shopper / Authentic Sourcing Service (MVP)
 * Single-file React prototype with:
 * - Visual wireframes (toggleable low‑fi mode)
 * - Functional flows: Request → Quote → Escrow → Purchase → Ship → Deliver → Verify
 * - Admin tools for quoting, status updates, and verification uploads
 *
 * Notes for developers:
 * - Drop this file into a Next.js/React app and ensure TailwindCSS is configured.
 * - This is front‑end only; replace mock logic with real APIs (payments, currency, tracking, QR, email).
 * - Escrow, currency, and notifications are simulated for demo.
 */

// ---- Config (tweak for your business) --------------------------------------
const BRAND = {
  name: "Authentik.ng",
  tagline: "Shop Abroad, Worry Less.",
};

const DEFAULTS = {
  escrowProvider: "Paystack (simulated)",
  serviceFeePct: 0.1, // 10%
  minServiceFeeNGN: 3000,
  baseShippingNGN: 15000, // base local+intl handling
  shippingPctOfItem: 0.25, // 25% of item for intl+customs est.
  currencyRates: {
    GBP: 1800,
    USD: 1500,
    EUR: 1650,
    NGN: 1,
  },
};

const FEATURED_BRANDS = [
  "Nike",
  "Zara",
  "Sephora",
  "Apple",
  "Adidas",
  "Dior",
  "H&M",
  "Uniqlo",
  "ASOS",
  "Amazon",
];

const STEPS = [
  { k: "request", label: "Request" },
  { k: "quote", label: "Quote" },
  { k: "escrow", label: "Escrow" },
  { k: "procure", label: "Procure & Verify" },
  { k: "ship", label: "Ship" },
  { k: "deliver", label: "Deliver" },
];

const PAGES = [
  { k: "home", label: "Home" },
  { k: "request", label: "Request" },
  { k: "quote", label: "Quote" },
  { k: "orders", label: "My Orders" },
  { k: "verify", label: "Verification" },
  { k: "about", label: "About & Support" },
  { k: "admin", label: "Admin" },
];

// ---- Helpers ---------------------------------------------------------------
function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function parsePriceToNGN(input) {
  if (!input) return { currency: "NGN", amountNGN: 0, raw: 0 };
  const str = String(input).trim();
  const clean = Number(String(str).replace(/[^0-9.]/g, "")) || 0;
  const lower = str.toUpperCase();
  let cur = "GBP";
  if (lower.includes("NGN") || lower.includes("₦")) cur = "NGN";
  else if (lower.includes("USD") || lower.includes("$")) cur = "USD";
  else if (lower.includes("EUR") || lower.includes("€")) cur = "EUR";
  else if (lower.includes("GBP") || lower.includes("£")) cur = "GBP";
  const rate = DEFAULTS.currencyRates[cur] || 1;
  return { currency: cur, amountNGN: Math.round(clean * rate), raw: clean };
}

function formatNGN(v) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(
    Math.max(0, Math.round(v || 0))
  );
}

function estimateQuoteNGN(itemPriceNGN) {
  const shipping = Math.round(itemPriceNGN * DEFAULTS.shippingPctOfItem + DEFAULTS.baseShippingNGN);
  const preFee = itemPriceNGN + shipping;
  const fee = Math.max(Math.round(preFee * DEFAULTS.serviceFeePct), DEFAULTS.minServiceFeeNGN);
  const total = itemPriceNGN + shipping + fee;
  return { shipping, fee, total };
}

function newId(prefix = "ORD") {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  const ts = Date.now().toString().slice(-6);
  return `${prefix}-${ts}-${rand}`;
}

// ---- Mock DB (in-memory for demo) -----------------------------------------
const initialRequests = [
  // Seed with one example
  {
    id: newId("ORD"),
    createdAt: new Date().toISOString(),
    customer: { name: "Jane Doe", email: "jane@example.com", phone: "+2348012345678" },
    product: {
      name: "Nike Air Force 1",
      brand: "Nike",
      options: { size: "42", color: "White", quantity: 1 },
      link: "https://www.nike.com/air-force-1",
      notes: "Prefer UK store",
    },
    pricing: {
      sourceCurrency: "GBP",
      sourcePriceRaw: 100,
      itemPriceNGN: 100 * DEFAULTS.currencyRates.GBP,
      ...estimateQuoteNGN(100 * DEFAULTS.currencyRates.GBP),
    },
    status: "Quoted",
    timeline: [
      { at: new Date().toISOString(), status: "Requested" },
      { at: new Date().toISOString(), status: "Quoted" },
    ],
    escrow: { provider: DEFAULTS.escrowProvider, held: false, txRef: null },
    verification: { inspector: null, qr: null, result: null, note: null },
    shipping: { carrier: null, tracking: null },
  },
];

// ---- UI Components ---------------------------------------------------------
const Badge = ({ children, tone = "slate" }) => (
  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-${tone}-100 text-${tone}-800`}>{children}</span>
);

const Section = ({ title, desc, children, actions }) => (
  <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-7">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
      <div>
        <h3 className="text-lg md:text-xl font-semibold text-slate-800">{title}</h3>
        {desc && <p className="text-slate-500 text-sm mt-1">{desc}</p>}
      </div>
      {actions}
    </div>
    <div>{children}</div>
  </section>
);

const Stepper = ({ current }) => (
  <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
    {STEPS.map((s, idx) => (
      <li key={s.k} className={classNames("flex items-center gap-2 rounded-xl border p-2", idx <= current ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-slate-50") }>
        <div className={classNames("size-6 rounded-full flex items-center justify-center text-xs", idx <= current ? "bg-emerald-500 text-white" : "bg-slate-300 text-white")}>{idx+1}</div>
        <span className="text-xs sm:text-sm font-medium text-slate-700">{s.label}</span>
      </li>
    ))}
  </ol>
);

const EmptyState = ({ title = "Nothing here yet", subtitle = "Submit a request to get started." }) => (
  <div className="border border-dashed border-slate-300 rounded-2xl p-8 text-center">
    <h4 className="font-semibold text-slate-700">{title}</h4>
    <p className="text-slate-500 text-sm mt-2">{subtitle}</p>
  </div>
);

function useWireframe() {
  const [wire, setWire] = useState(false);
  return { wire, setWire };
}

const WireToggle = ({ on, setOn }) => (
  <button
    onClick={() => setOn(!on)}
    title="Toggle wireframe mode"
    className={classNames(
      "rounded-xl border px-3 py-1 text-xs font-medium",
      on ? "bg-slate-800 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300"
    )}
  >
    {on ? "Wireframe: ON" : "Wireframe: OFF"}
  </button>
);

// ---- Main App --------------------------------------------------------------
export default function App() {
  const { wire, setWire } = useWireframe();
  const [page, setPage] = useState("home");
  const [requests, setRequests] = useState(initialRequests);
  const [activeQuote, setActiveQuote] = useState(null); // a request object
  const [flash, setFlash] = useState(null);

  const nav = (
    <nav className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/75 bg-white/95 border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-emerald-500"></div>
          <div>
            <div className="text-base md:text-lg font-bold tracking-tight text-slate-900">{BRAND.name}</div>
            <div className="text-[10px] md:text-xs text-slate-500 -mt-0.5">{BRAND.tagline}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 text-sm">
          {PAGES.map((p) => (
            <button
              key={p.k}
              onClick={() => setPage(p.k)}
              className={classNames(
                "px-3 py-1.5 rounded-xl border",
                page === p.k ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300 hover:border-slate-400"
              )}
            >
              {p.label}
            </button>
          ))}
          <WireToggle on={wire} setOn={setWire} />
        </div>
      </div>
    </nav>
  );

  return (
    <div className={wire ? "grayscale" : ""}>
      {nav}
      <main className="max-w-6xl mx-auto px-4 py-6 md:py-10 space-y-6">
        {flash && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 p-3 text-sm flex items-center justify-between">
            <span>{flash}</span>
            <button className="text-emerald-900/80 underline" onClick={() => setFlash(null)}>dismiss</button>
          </div>
        )}

        {page === "home" && <Home setPage={setPage} />}
        {page === "request" && (
          <RequestPage onSubmit={(req) => {
            setRequests((prev) => [req, ...prev]);
            setActiveQuote(req);
            setPage("quote");
            setFlash("Request received. Quote generated.");
          }} />
        )}
        {page === "quote" && (
          <QuotePage
            active={activeQuote}
            onAccept={() => {
              if (!activeQuote) return;
              const txRef = newId("ESCROW");
              setRequests((prev) => prev.map((r) => r.id === activeQuote.id ? { ...r, status: "Purchased", escrow: { ...r.escrow, held: true, txRef }, timeline: [...r.timeline, { at: new Date().toISOString(), status: "Escrow Paid" }, { at: new Date().toISOString(), status: "Purchased" }] } : r));
              setActiveQuote((r) => r ? { ...r, status: "Purchased", escrow: { ...r.escrow, held: true, txRef }, timeline: [...r.timeline, { at: new Date().toISOString(), status: "Escrow Paid" }, { at: new Date().toISOString(), status: "Purchased" }] } : null);
              setFlash(`Escrow payment successful via ${DEFAULTS.escrowProvider} (simulated).`);
              setPage("orders");
            }}
          />
        )}
        {page === "orders" && <OrdersPage items={requests} setItems={setRequests} />}
        {page === "verify" && <VerificationPage items={requests} />}
        {page === "about" && <AboutPage />}
        {page === "admin" && <AdminPage items={requests} setItems={setRequests} setFlash={setFlash} />}
      </main>
      <Footer />
    </div>
  );
}

// ---- Pages -----------------------------------------------------------------
function Home({ setPage }) {
  return (
    <div className="space-y-6">
      <header className="bg-gradient-to-br from-emerald-50 to-white border border-slate-200 rounded-3xl p-8 md:p-12">
        <div className="max-w-3xl">
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-slate-900">Get Authentic Brands from Abroad, Stress‑Free.</h1>
          <p className="mt-3 text-slate-600">Submit a link, approve a transparent quote, pay via escrow, and relax. We buy from verified stores, verify authenticity, ship, clear, and deliver to your door in Nigeria.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => setPage("request")} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-medium">Start a Request</button>
            <button onClick={() => setPage("about")} className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-800 font-medium bg-white">How it works</button>
          </div>
        </div>
      </header>

      <Section title="How it Works" desc="Simple 3-step process">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: "Request", text: "Paste a product link or details (brand, size, color)." },
            { title: "Confirm & Escrow", text: "Get a transparent quote in NGN. Pay into escrow." },
            { title: "Delivered", text: "We procure, verify, clear customs, and deliver to you." },
          ].map((x, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 p-5 bg-white">
              <div className="size-10 rounded-xl bg-slate-900 mb-3" />
              <div className="font-semibold text-slate-800">{x.title}</div>
              <p className="text-sm text-slate-600 mt-1">{x.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Featured Brands" desc="We buy from official stores & authorized retailers">
        <div className="flex flex-wrap gap-2">
          {FEATURED_BRANDS.map((b) => (
            <span key={b} className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm">{b}</span>
          ))}
        </div>
      </Section>

      <Section title="Guarantees" desc="Trust & transparency, built-in">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { h: "Escrow-protected", p: "Funds are held until you confirm delivery & authenticity." },
            { h: "Authenticity checks", p: "Batch codes, packaging, receipts — verified by our team." },
            { h: "Clear pricing", p: "Item + shipping + customs + service fee. No surprises." },
          ].map((x, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 p-5 bg-white">
              <div className="size-10 rounded-xl bg-emerald-500 mb-3" />
              <div className="font-semibold text-slate-800">{x.h}</div>
              <p className="text-sm text-slate-600 mt-1">{x.p}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function RequestPage({ onSubmit }) {
  const [form, setForm] = useState({ brand: "", name: "", size: "", color: "", quantity: 1, link: "", budget: "", email: "", phone: "", notes: "" });
  const [busy, setBusy] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === "quantity" ? Number(value) : value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    const price = parsePriceToNGN(form.budget);
    const quote = estimateQuoteNGN(price.amountNGN);
    const req = {
      id: newId("ORD"),
      createdAt: new Date().toISOString(),
      customer: { name: form.email?.split("@")[0] || "Guest", email: form.email, phone: form.phone },
      product: { name: form.name, brand: form.brand, options: { size: form.size, color: form.color, quantity: form.quantity }, link: form.link, notes: form.notes },
      pricing: { sourceCurrency: price.currency, sourcePriceRaw: price.raw, itemPriceNGN: price.amountNGN, ...quote },
      status: "Quoted",
      timeline: [ { at: new Date().toISOString(), status: "Requested" }, { at: new Date().toISOString(), status: "Quoted" } ],
      escrow: { provider: DEFAULTS.escrowProvider, held: false, txRef: null },
      verification: { inspector: null, qr: null, result: null, note: null },
      shipping: { carrier: null, tracking: null },
    };
    setTimeout(() => { onSubmit(req); setBusy(false); }, 600);
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-white border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-900">Request a Product</h2>
        <p className="text-slate-600 text-sm mt-1">Paste a product link or enter details. We’ll send a transparent NGN quote.</p>
      </header>

      <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4 bg-white border border-slate-200 rounded-3xl p-6">
        <div className="space-y-3">
          <Input label="Brand" name="brand" value={form.brand} onChange={handleChange} placeholder="Nike, Dior, Apple…" />
          <Input label="Product Name" name="name" value={form.name} onChange={handleChange} placeholder="Air Force 1, Sauvage, AirPods Pro…" />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Size" name="size" value={form.size} onChange={handleChange} placeholder="42 / M / 256GB" />
            <Input label="Color" name="color" value={form.color} onChange={handleChange} placeholder="White" />
            <Input type="number" min={1} label="Qty" name="quantity" value={form.quantity} onChange={handleChange} />
          </div>
          <Input label="Link to Product" name="link" value={form.link} onChange={handleChange} placeholder="https://…" />
        </div>
        <div className="space-y-3">
          <Input label="Estimated Price (with currency)" name="budget" value={form.budget} onChange={handleChange} placeholder="£100 or $120 or ₦200,000" />
          <Input label="Email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" />
          <Input label="Phone (WhatsApp)" name="phone" value={form.phone} onChange={handleChange} placeholder="+234…" />
          <TextArea label="Notes (optional)" name="notes" value={form.notes} onChange={handleChange} placeholder="Any preferences or deadlines?" />
        </div>
        <div className="md:col-span-2 flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">We will verify the seller is authorized before purchase. Escrow via {DEFAULTS.escrowProvider}.</p>
          <button disabled={busy} className={classNames("px-5 py-2.5 rounded-xl text-white font-medium", busy ? "bg-slate-400" : "bg-slate-900 hover:opacity-90")}>{busy ? "Generating Quote…" : "Request Quote"}</button>
        </div>
      </form>
    </div>
  );
}

function QuotePage({ active, onAccept }) {
  if (!active) return <EmptyState title="No quote yet" subtitle="Submit a request to see your quote." />;
  const { pricing } = active;
  const stepIdx = 1; // Quote step
  return (
    <div className="space-y-6">
      <Section title="Your Quote" desc={`Order ID: ${active.id}`} actions={<Stepper current={stepIdx} /> }>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Row label="Product" value={`${active.product.brand} — ${active.product.name}`} />
            <Row label="Options" value={`Size ${active.product.options.size || "—"} / ${active.product.options.color || "—"} / Qty ${active.product.options.quantity}`} />
            <Row label="Link" value={<a className="text-emerald-700 underline" href={active.product.link} target="_blank" rel="noreferrer">Open product page</a>} />
            <Row label="Source price" value={`${active.pricing.sourceCurrency} ${active.pricing.sourcePriceRaw}`} />
          </div>
          <div className="rounded-2xl border border-slate-200 p-5 bg-white">
            <h4 className="font-semibold text-slate-800">Breakdown</h4>
            <div className="divide-y mt-2">
              <Line label="Item" amount={pricing.itemPriceNGN} />
              <Line label="Shipping + Customs" amount={pricing.shipping} />
              <Line label={`Service Fee (${Math.round((DEFAULTS.serviceFeePct)*100)}%)`} amount={pricing.fee} />
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <div className="font-semibold text-slate-800">Total</div>
              <div className="font-extrabold text-slate-900 text-lg">{formatNGN(pricing.total)}</div>
            </div>
            <button onClick={onAccept} className="mt-4 w-full px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold">Accept & Pay (Escrow)</button>
            <p className="text-[11px] text-slate-500 mt-2">Escrow via {DEFAULTS.escrowProvider}. Funds are released after delivery & verification.</p>
          </div>
        </div>
      </Section>
    </div>
  );
}

function OrdersPage({ items, setItems }) {
  function setStatus(id, status) {
    setItems((prev) => prev.map((r) => r.id === id ? { ...r, status, timeline: [...r.timeline, { at: new Date().toISOString(), status }] } : r));
  }

  return (
    <div className="space-y-6">
      <Section title="My Orders" desc="Track your requests and deliveries">
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2">Order</th>
                  <th className="py-2">Product</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3">
                      <div className="font-medium text-slate-800">{r.id}</div>
                      <div className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleString()}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-800">{r.product.brand} — {r.product.name}</div>
                      <div className="text-xs text-slate-500">{r.product.options.size || "—"} / {r.product.options.color || "—"} × {r.product.options.quantity}</div>
                    </td>
                    <td className="py-3 font-semibold">{formatNGN(r.pricing.total)}</td>
                    <td className="py-3"><Badge tone={r.status === "Delivered" ? "emerald" : r.status === "In Transit" ? "blue" : "slate"}>{r.status}</Badge></td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        {r.status === "Purchased" && <Button onClick={() => setStatus(r.id, "In Transit")}>Mark In Transit</Button>}
                        {r.status === "In Transit" && <Button onClick={() => setStatus(r.id, "Delivered")}>Confirm Delivered</Button>}
                        {r.status === "Quoted" && <span className="text-xs text-slate-500">Awaiting escrow payment…</span>}
                        {r.status === "Delivered" && <span className="text-xs text-emerald-700">Completed</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Receipts & Certificates" desc="View purchase proof and authenticity verification">
        <EmptyState title="Coming soon" subtitle="Upload receipts and verification cards per order (see Admin)." />
      </Section>
    </div>
  );
}

function VerificationPage({ items }) {
  const [id, setId] = useState("");
  const [result, setResult] = useState(null);
  function lookup() {
    const found = items.find((r) => r.id.toLowerCase() === id.trim().toLowerCase());
    setResult(found || null);
  }
  return (
    <div className="space-y-6">
      <Section title="Verify Authenticity" desc="Enter your QR/Order ID (e.g., ORD-xxxxxx-XXXXX)">
        <div className="grid md:grid-cols-3 gap-3 items-end">
          <Input label="Order / QR ID" value={id} onChange={(e) => setId(e.target.value)} placeholder="ORD-…" />
          <div className="md:col-span-2 flex gap-2">
            <Button onClick={lookup}>Check</Button>
            <p className="text-xs text-slate-500 self-center">We’ll show the inspection result and inspector signature if available.</p>
          </div>
        </div>
        {result ? (
          <div className="mt-4 rounded-2xl border border-slate-200 p-5 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-800">{result.product.brand} — {result.product.name}</div>
                <div className="text-xs text-slate-500">ID: {result.id}</div>
              </div>
              <Badge tone={result.status === "Delivered" ? "emerald" : "blue"}>{result.status}</Badge>
            </div>
            <div className="mt-3 grid md:grid-cols-2 gap-4">
              <div className="space-y-1 text-sm">
                <Row label="Inspector" value={result?.verification?.inspector || "—"} />
                <Row label="Outcome" value={result?.verification?.result || "—"} />
                <Row label="Note" value={result?.verification?.note || "—"} />
              </div>
              <div className="rounded-xl border border-dashed p-4 text-center text-slate-500 text-sm">Verification Card / QR preview (attach in Admin)</div>
            </div>
          </div>
        ) : (
          <div className="mt-4"><EmptyState title="No match yet" subtitle="Check the ID and try again." /></div>
        )}
      </Section>
    </div>
  );
}

function AboutPage() {
  return (
    <div className="space-y-6">
      <Section title="Our Mission" desc="We make authentic global brands accessible to Nigerians with trust, transparency, and protection.">
        <p className="text-slate-700 text-sm leading-6">
          We only buy from official brand stores or verified retailers. Every order is escrow-protected, inspected for authenticity, and delivered with a digital certificate. Transparent quotes show item, shipping, customs, and our service fee — no surprises.
        </p>
      </Section>

      <Section title="FAQs" desc="Quick answers">
        <div className="grid md:grid-cols-2 gap-4">
          {[
            ["How long does delivery take?", "Typically 7–14 business days after purchase, depending on stock and flight schedules."],
            ["What if the item is fake?", "We refund in full if proven counterfeit within 48 hours of delivery."],
            ["Which payments are supported?", "Paystack/Flutterwave escrow (Visa, Mastercard, Verve, bank transfer)."],
            ["Can I request anything?", "Yes, if it’s legal to import. Luxury items may require extra ID checks."],
          ].map(([q,a]) => (
            <div key={q} className="rounded-2xl border border-slate-200 p-5 bg-white">
              <div className="font-semibold text-slate-800">{q}</div>
              <p className="text-sm text-slate-600 mt-1">{a}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Contact & Support" desc="We’re here to help">
        <div className="flex flex-wrap gap-3">
          <a className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold" href="#">WhatsApp Chat</a>
          <a className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800" href="mailto:support@authentik.ng">support@authentik.ng</a>
        </div>
      </Section>
    </div>
  );
}

function AdminPage({ items, setItems, setFlash }) {
  const [selected, setSelected] = useState(items[0]?.id || "");
  const active = useMemo(() => items.find((r) => r.id === selected), [selected, items]);

  function update(updates) {
    if (!active) return;
    setItems((prev) => prev.map((r) => r.id === active.id ? { ...r, ...updates } : r));
  }

  function setStatus(status) {
    if (!active) return;
    setItems((prev) => prev.map((r) => r.id === active.id ? { ...r, status, timeline: [...r.timeline, { at: new Date().toISOString(), status }] } : r));
    setFlash(`Status for ${active.id} → ${status}`);
  }

  function attachVerification() {
    if (!active) return;
    const newVer = { inspector: "Ade A.", result: "Verified Original", note: "Packaging, labels, batch code matched. Receipt attached.", qr: newId("QR") };
    setItems((prev) => prev.map((r) => r.id === active.id ? { ...r, verification: newVer } : r));
    setFlash(`Verification attached to ${active.id}.`);
  }

  return (
    <div className="space-y-6">
      <Section title="Admin — Orders" desc="Internal tools: quote edits, status updates, documents">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-3">
            <Select label="Select Order" value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">—</option>
              {items.map((r) => (
                <option key={r.id} value={r.id}>{r.id} — {r.product.brand} {r.product.name}</option>
              ))}
            </Select>

            {active ? (
              <div className="rounded-2xl border border-slate-200 p-4 bg-white space-y-2 text-sm">
                <Row label="Customer" value={`${active.customer.name} (${active.customer.email})`} />
                <Row label="Product" value={`${active.product.brand} — ${active.product.name}`} />
                <Row label="Status" value={<Badge>{active.status}</Badge>} />
                <Row label="Total" value={formatNGN(active.pricing.total)} />
              </div>
            ) : (
              <EmptyState title="No order selected" subtitle="Choose an order to manage." />
            )}
          </div>

          <div className="md:col-span-2 space-y-4">
            <Section title="Status Updates">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setStatus("Quoted")}>Set Quoted</Button>
                <Button onClick={() => setStatus("Purchased")}>Set Purchased</Button>
                <Button onClick={() => setStatus("In Transit")}>Set In Transit</Button>
                <Button onClick={() => setStatus("Delivered")}>Set Delivered</Button>
              </div>
            </Section>

            <Section title="Pricing / Quote Editor" desc="Adjust totals and fees (manual override)">
              {active ? <QuoteEditor item={active} setItems={setItems} /> : <EmptyState />}
            </Section>

            <Section title="Verification Documents">
              <div className="flex gap-2">
                <Button onClick={attachVerification}>Attach Verification</Button>
                <Button onClick={() => setFlash("Use real file uploads in production (receipts, photos)")}>Upload Files (demo)</Button>
              </div>
            </Section>
          </div>
        </div>
      </Section>
    </div>
  );
}

function QuoteEditor({ item, setItems }) {
  const [itemNGN, setItemNGN] = useState(item.pricing.itemPriceNGN);
  const [ship, setShip] = useState(item.pricing.shipping);
  const [fee, setFee] = useState(item.pricing.fee);
  const total = itemNGN + ship + fee;

  function apply() {
    setItems((prev) => prev.map((r) => r.id === item.id ? { ...r, pricing: { ...r.pricing, itemPriceNGN: itemNGN, shipping: ship, fee, total } } : r));
  }

  return (
    <div className="grid md:grid-cols-4 gap-3 items-end">
      <Number label="Item (NGN)" value={itemNGN} onChange={setItemNGN} />
      <Number label="Shipping + Customs (NGN)" value={ship} onChange={setShip} />
      <Number label="Service Fee (NGN)" value={fee} onChange={setFee} />
      <div>
        <div className="text-xs text-slate-500 mb-1">Total</div>
        <div className="font-extrabold text-slate-900">{formatNGN(total)}</div>
        <Button className="mt-2" onClick={apply}>Apply</Button>
      </div>
    </div>
  );
}

// ---- Small UI elements -----------------------------------------------------
const Row = ({ label, value }) => (
  <div className="flex items-center justify-between py-1">
    <div className="text-slate-500 text-xs uppercase tracking-wide">{label}</div>
    <div className="text-sm text-slate-800">{value}</div>
  </div>
);

const Line = ({ label, amount }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm text-slate-600">{label}</span>
    <span className="text-sm font-semibold">{formatNGN(amount)}</span>
  </div>
);

const Input = ({ label, className, ...props }) => (
  <label className="block">
    <div className="text-xs text-slate-500 mb-1">{label}</div>
    <input {...props} className={classNames("w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-300", className)} />
  </label>
);

const TextArea = ({ label, className, ...props }) => (
  <label className="block">
    <div className="text-xs text-slate-500 mb-1">{label}</div>
    <textarea {...props} rows={4} className={classNames("w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-300", className)} />
  </label>
);

const Select = ({ label, children, className, ...props }) => (
  <label className="block">
    <div className="text-xs text-slate-500 mb-1">{label}</div>
    <select {...props} className={classNames("w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-300", className)}>
      {children}
    </select>
  </label>
);

const Number = ({ label, value, onChange }) => (
  <label className="block">
    <div className="text-xs text-slate-500 mb-1">{label}</div>
    <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-300" />
  </label>
);

const Button = ({ className, ...props }) => (
  <button {...props} className={classNames("px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm font-medium hover:border-slate-400", className)} />
);

function Footer() {
  return (
    <footer className="mt-10 border-t border-slate-200">
      <div className="max-w-6xl mx-auto px-4 py-6 text-xs text-slate-500 flex flex-wrap gap-3 items-center justify-between">
        <div>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</div>
        <div className="flex gap-3">
          <a href="#" className="underline">Privacy</a>
          <a href="#" className="underline">Terms</a>
        </div>
      </div>
    </footer>
  );
}

