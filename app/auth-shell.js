import Link from "next/link";
import StadiumScene from "@/components/StadiumScene";

export default function AuthShell({ title, subtitle, children }) {
  return (
    <main className="vt-auth-page">
      <div className="vt-auth-frame">
        <section className="vt-auth-art" aria-label="Velocity Turf matchday">
          <StadiumScene className="vt-auth-art-scene" />
          <Link href="/" className="vt-auth-brand" aria-label="Velocity Turf home">
            <span className="vt-auth-brand-mark" aria-hidden="true">⚡</span>
            <span>VELOCITY <b>TURF</b></span>
          </Link>
          <div className="vt-auth-art-copy">
            <span className="vt-auth-eyebrow"><span /> THE GAME STARTS HERE</span>
            <p className="vt-auth-art-title">Your next<br /><em>great game.</em></p>
            <p className="vt-auth-art-description">Find the pitch. Bring your people. Make it a night worth remembering.</p>
          </div>
          <div className="vt-auth-art-footer">
            <span>01 — FIND YOUR PITCH</span>
            <span>02 — GET IN THE GAME</span>
          </div>
        </section>

        <section className="vt-auth-panel">
          <div className="vt-auth-mobile-brand">
            <span className="vt-auth-brand-mark" aria-hidden="true">⚡</span>
            <span>VELOCITY <b>TURF</b></span>
          </div>
          <header className="vt-auth-heading">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </header>
          <div className="vt-auth-content">{children}</div>
          <div className="vt-auth-panel-footer">MADE FOR THE LOVE OF THE GAME</div>
        </section>
      </div>
    </main>
  );
}