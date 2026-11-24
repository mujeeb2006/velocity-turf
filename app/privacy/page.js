import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Velocity Turf",
  description:
    "How Velocity Turf collects, uses, shares and protects your personal data.",
};

// ---- Edit these before going live -------------------------------------
const EFFECTIVE_DATE = "24 November 2026";
const LAST_UPDATED = "24 November 2026";
// Anything written as [like this] is shown highlighted so you can spot it.
// ------------------------------------------------------------------------

const sections = [
  {
    id: "data-we-collect",
    title: "Data we collect",
    blocks: [
      {
        list: [
          { label: "Account data", text: "name, email, password (stored as a secure hash, never in plain text), your role (Player, Turf Owner or Admin), and phone number [if you collect it]." },
          { label: "Booking data", text: "turf, date, time slot, number of players, match participation, favorites and QR check-in status." },
          { label: "Turf Owner data", text: "turf name, location, pricing, availability and [payout details, if applicable]." },
          { label: "Payment data", text: "payments are handled by [payment provider]. We receive only the payment status and a transaction reference, never your card or UPI credentials." },
          { label: "Technical data", text: "session cookies that keep you logged in, and basic logs (IP address, device and browser type) used for security and debugging." },
        ],
      },
    ],
  },
  {
    id: "why-we-use-it",
    title: "Why we use your data",
    blocks: [
      {
        list: [
          "Create and manage your account, and log you in.",
          "Process bookings, confirm slots and verify attendance with QR codes.",
          "Let players and turf owners coordinate about a booking.",
          "Send booking-related notifications.",
          "Prevent fraud and misuse, and improve the platform.",
        ],
      },
      { p: "We process your data based on your consent and only for these purposes." },
    ],
  },
  {
    id: "who-sees-your-data",
    title: "Who can see your data",
    blocks: [
      {
        list: [
          { label: "Turf Owners", text: "see the name and booking details of players who book their turf. Players see turf details and, for matches they join, other participants' display names." },
          { label: "Admins", text: "access data only as needed to run and secure the platform." },
          { label: "Service providers", text: "process data on our behalf: Supabase (database and authentication), Vercel (hosting), [payment provider] and [email/SMS provider]. They may use it only to provide their service to us." },
          { label: "Legal requests", text: "we may disclose data if required by law or a valid legal order." },
        ],
      },
      { callout: "We do not sell your personal data." },
    ],
  },
  {
    id: "security",
    title: "Security",
    blocks: [
      { p: "We use role-based access control, database-level row security, encrypted connections (HTTPS) and hashed passwords. If a breach affects your data, we will notify you and the authorities as required by law." },
      { p: "No online service is completely secure. Keep your login details confidential and tell us straight away if you suspect someone has accessed your account." },
    ],
  },
  {
    id: "retention",
    title: "How long we keep data",
    blocks: [
      {
        list: [
          { label: "Account and booking data", text: "while your account is active, then up to [12 months] after deletion or inactivity, unless the law requires longer." },
          { label: "Payment records", text: "[8 years], as required by tax and accounting law." },
          { label: "Logs", text: "up to [90 days]." },
        ],
      },
    ],
  },
  {
    id: "your-rights",
    title: "Your rights",
    blocks: [
      { p: "You can ask us to access, correct, update or erase your personal data, withdraw your consent, or nominate someone to exercise your rights on your behalf if you cannot. Email [contact email]. We aim to respond within [30 days], and always within 90 days." },
      { p: "Withdrawing consent or deleting your data may mean we can no longer provide the service to you." },
    ],
  },
  {
    id: "children",
    title: "Children",
    blocks: [
      { p: "Velocity Turf is for users aged 18 and above. [Alternative: users under 18 need verifiable consent from a parent or guardian.] We do not knowingly collect data from children without that consent." },
    ],
  },
  {
    id: "cookies",
    title: "Cookies",
    blocks: [
      { p: "We use only essential cookies and local storage for login and session management. We do not use advertising cookies." },
    ],
  },
  {
    id: "contact",
    title: "Grievance and contact",
    blocks: [
      { p: "Grievance / data protection contact: [name], [contact email], [address]." },
      { p: "If we do not resolve your concern, you may approach the Data Protection Board of India." },
    ],
  },
  {
    id: "changes",
    title: "Changes to this policy",
    blocks: [
      { p: "If we make significant changes, we will tell you in the app or by email before they take effect. The \"last updated\" date at the top of this page always shows the current version." },
    ],
  },
];

// Highlights anything written as [placeholder]
function Rich({ text }) {
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((part, i) =>
    /^\[[^\]]+\]$/.test(part) ? (
      <span key={i} className="ph">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function Block({ block }) {
  if (block.p) return <p><Rich text={block.p} /></p>;
  if (block.callout) return <div className="callout">{block.callout}</div>;
  if (block.list)
    return (
      <ul>
        {block.list.map((item, i) =>
          typeof item === "string" ? (
            <li key={i}><Rich text={item} /></li>
          ) : (
            <li key={i}>
              <strong>{item.label}:</strong> <Rich text={item.text} />
            </li>
          )
        )}
      </ul>
    );
  return null;
}

export default function PrivacyPage() {
  return (
    <main className="vt-privacy">
      <style>{css}</style>

      <div className="wrap">
        <Link href="/" className="back">&larr; Back to Velocity Turf</Link>

        <header className="head">
          <h1>Privacy Policy</h1>
          <p className="meta">
            Effective {EFFECTIVE_DATE}. Last updated {LAST_UPDATED}.
          </p>
          <p className="intro">
            Velocity Turf (&quot;we&quot;, &quot;us&quot;) is operated by{" "}
            <span className="ph">[your name / entity]</span>, India. This
            policy explains what personal data we collect, why, who can see
            it, and how you can control it.
          </p>
        </header>

        <div className="layout">
          <nav className="toc" aria-label="On this page">
            <p className="toc-title">On this page</p>
            <ul>
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>{s.title}</a>
                </li>
              ))}
            </ul>
          </nav>

          <article className="card">
            {sections.map((s) => (
              <section key={s.id} id={s.id}>
                <h2>{s.title}</h2>
                {s.blocks.map((b, i) => (
                  <Block key={i} block={b} />
                ))}
              </section>
            ))}
          </article>
        </div>
      </div>
    </main>
  );
}

const css = `
.vt-privacy {
  --bg: #070b14;
  --blue: #0ea5e9;
  --green: #22c55e;
  --orange: #f97316;
  --text: #e6edf6;
  --muted: #9aa8bc;
  min-height: 100vh;
  background:
    radial-gradient(900px 420px at 12% -8%, rgba(14,165,233,.16), transparent 60%),
    radial-gradient(700px 380px at 100% 0%, rgba(34,197,94,.08), transparent 60%),
    var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  line-height: 1.7;
  padding: 40px 20px 80px;
}
.vt-privacy .wrap { max-width: 1040px; margin: 0 auto; }
.vt-privacy .back {
  color: var(--blue); text-decoration: none; font-size: 15px;
  display: inline-block; margin-bottom: 28px;
}
.vt-privacy .back:hover { text-decoration: underline; }
.vt-privacy .head { margin-bottom: 36px; max-width: 680px; }
.vt-privacy h1 {
  font-size: clamp(34px, 6vw, 52px); line-height: 1.1;
  margin: 0 0 12px; font-weight: 700; letter-spacing: -0.01em;
}
.vt-privacy .meta {
  font-family: var(--font-mono);
  font-size: 13px; color: var(--muted); margin: 0 0 18px;
}
.vt-privacy .intro { color: var(--text); margin: 0; font-size: 17px; }

.vt-privacy .layout {
  display: grid; grid-template-columns: 220px minmax(0, 1fr);
  gap: 32px; align-items: start;
}
.vt-privacy .toc {
  position: sticky; top: 24px;
  padding: 18px 16px;
  background: rgba(255,255,255,.035);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 14px;
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
}
.vt-privacy .toc-title { margin: 0 0 10px; font-size: 14px; color: var(--muted); }
.vt-privacy .toc ul { list-style: none; margin: 0; padding: 0; }
.vt-privacy .toc li { margin: 0; }
.vt-privacy .toc a {
  display: block; padding: 6px 8px; border-radius: 8px;
  color: var(--text); text-decoration: none; font-size: 14px;
}
.vt-privacy .toc a:hover { background: rgba(14,165,233,.12); color: #fff; }

.vt-privacy .card {
  padding: 12px 36px 28px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.09);
  border-radius: 20px;
  backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
  box-shadow: 0 20px 60px rgba(0,0,0,.35);
}
.vt-privacy section { padding: 22px 0; scroll-margin-top: 24px; }
.vt-privacy section + section { border-top: 1px solid rgba(255,255,255,.07); }
.vt-privacy h2 {
  font-size: 22px; margin: 0 0 12px; font-weight: 600;
  padding-left: 12px; border-left: 3px solid var(--blue);
}
.vt-privacy p { margin: 0 0 12px; color: #cfd9e6; max-width: 70ch; }
.vt-privacy ul { margin: 0 0 12px; padding-left: 20px; max-width: 70ch; }
.vt-privacy .card li { margin-bottom: 8px; color: #cfd9e6; }
.vt-privacy li::marker { color: var(--blue); }
.vt-privacy strong { color: #fff; font-weight: 600; }

.vt-privacy .callout {
  margin: 14px 0 4px; padding: 14px 16px; max-width: 70ch;
  border: 1px solid rgba(34,197,94,.4);
  background: rgba(34,197,94,.09);
  border-radius: 12px; color: #d9f7e4; font-weight: 600;
}
.vt-privacy .ph {
  background: rgba(249,115,22,.16); color: #fdba74;
  border-radius: 4px; padding: 0 4px;
}

.vt-privacy a:focus-visible {
  outline: 2px solid var(--blue); outline-offset: 2px; border-radius: 6px;
}

@media (max-width: 820px) {
  .vt-privacy .layout { grid-template-columns: 1fr; }
  .vt-privacy .toc { display: none; }
  .vt-privacy .card { padding: 8px 20px 20px; }
}
`;
