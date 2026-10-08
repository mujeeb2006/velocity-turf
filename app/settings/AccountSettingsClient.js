"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizeUserRole } from "@/lib/auth/validation";
import { useToast } from "@/components/ui/toast";
import { COLORS as V, FONT_BODY, buttonStyle } from "@/lib/design-tokens";
import BrandLockup from "@/components/brand-lockup";

const inputStyle = {
  width: "100%", minHeight: 46, padding: "11px 13px", borderRadius: 9, background: V.pitchCardRaised,
  border: `1px solid ${V.lineStrong}`, color: V.chalk, fontSize: 14, fontFamily: FONT_BODY,
};

function Field({ label, ...props }) {
  return (
    <label className="vt-settings-field">
      {label}
      <input {...props} style={inputStyle} />
    </label>
  );
}

function SettingIcon({ name }) {
  const icons = {
    profile: <><circle cx="12" cy="8" r="3.4" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></>,
    email: <><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="m4.5 7 7.5 6 7.5-6" /></>,
    password: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" /></>,
    shield: <><path d="M12 3 19 6v5c0 5-3.5 8.3-7 10-3.5-1.7-7-5-7-10V6z" /><path d="m9 12 2 2 4-4" /></>,
  };
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

export default function AccountSettingsClient({ profile }) {
  const router = useRouter();
  const supabase = createClient();
  const { showToast } = useToast();
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [email, setEmail] = useState(profile.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveName(event) {
    event.preventDefault();
    const nextName = fullName.trim();
    if (!nextName) {
      showToast("Enter your name before saving.", { type: "error" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: nextName }).eq("id", profile.id);
    setSaving(false);
    if (error) {
      showToast("Couldn't update your name. Try again.", { type: "error" });
      return;
    }
    showToast("Name updated.", { type: "success" });
    router.refresh();
  }

  async function changeEmail(event) {
    event.preventDefault();
    const nextEmail = email.trim();
    if (!nextEmail || nextEmail === profile.email) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: nextEmail });
    setSaving(false);
    if (error) {
      showToast(error.message, { type: "error" });
      return;
    }
    showToast("Check your new email to confirm the change.", { type: "success" });
  }

  async function changePassword(event) {
    event.preventDefault();
    if (newPassword.length < 8) {
      showToast("Use a password with at least 8 characters.", { type: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Those passwords don't match.", { type: "error" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) {
      showToast(error.message, { type: "error" });
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    showToast("Password updated.", { type: "success" });
  }

  const normalizedRole = normalizeUserRole(profile.role);
  const homePath = normalizedRole === "admin" ? "/admin" : normalizedRole === "owner" ? "/owner" : "/player";
  const roleLabels = { admin: "Administrator", owner: "Turf owner", player: "Player" };
  const displayName = profile.full_name || profile.email?.split("@")[0] || "Velocity player";
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <main className="vt-settings-page">
      <header className="vt-settings-topbar">
        <a className="vt-settings-brand" href={homePath}>
          <BrandLockup markSize={36} compact />
        </a>
        <button onClick={() => router.push(homePath)} className="vt-settings-back" style={buttonStyle("secondary", "sm")}>
          <span aria-hidden="true">←</span> Back to dashboard
        </button>
      </header>

      <div className="vt-settings-layout">
        <aside className="vt-settings-aside">
          <div className="vt-settings-identity">
            <div className="vt-settings-avatar">{initial}</div>
            <div className="vt-settings-identity-copy">
              <span className="vt-settings-overline">SIGNED-IN ACCOUNT</span>
              <strong>{displayName}</strong>
              <span>{profile.email}</span>
            </div>
            <div className="vt-settings-role"><SettingIcon name="shield" />{roleLabels[normalizedRole] || "Account"}</div>
          </div>

          <nav className="vt-settings-nav" aria-label="Settings sections">
            <span className="vt-settings-overline">YOUR ACCOUNT</span>
            <a href="#profile"><SettingIcon name="profile" /><span>Profile details</span><i /></a>
            <a href="#email"><SettingIcon name="email" /><span>Email address</span><i /></a>
            <a href="#password"><SettingIcon name="password" /><span>Password</span><i /></a>
          </nav>

          <div className="vt-settings-private-note">
            <SettingIcon name="shield" />
            <span><strong>Your account, protected.</strong> Your sign-in details are managed securely.</span>
          </div>
        </aside>

        <div className="vt-settings-content">
          <div className="vt-settings-page-heading">
            <span className="vt-settings-overline">ACCOUNT CONTROL</span>
            <h1>Account settings</h1>
            <p>Manage your profile and sign-in details.</p>
          </div>

          <div className="vt-settings-sections">
            <section className="vt-settings-card" id="profile" style={{ "--settings-accent": V.aqua }}>
              <div className="vt-settings-card-heading">
                <span className="vt-settings-icon"><SettingIcon name="profile" /></span>
                <div><h2>Profile details</h2><p>How your name appears across Velocity Turf.</p></div>
              </div>
              <form onSubmit={saveName} className="vt-settings-form">
                <Field label="Full name" autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} />
                <div className="vt-settings-form-action"><button type="submit" disabled={saving} style={buttonStyle("primary", "sm")}>{saving ? "Saving..." : "Save changes"}</button></div>
              </form>
            </section>

            <section className="vt-settings-card" id="email" style={{ "--settings-accent": V.sky }}>
              <div className="vt-settings-card-heading">
                <span className="vt-settings-icon"><SettingIcon name="email" /></span>
                <div><h2>Email address</h2><p>A confirmation link is sent before a new address takes effect.</p></div>
              </div>
              <form onSubmit={changeEmail} className="vt-settings-form">
                <Field label="Email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
                <div className="vt-settings-form-action"><button type="submit" disabled={saving || email.trim() === profile.email} style={buttonStyle("secondary", "sm")}>{saving ? "Saving..." : "Update email"}</button></div>
              </form>
            </section>

            <section className="vt-settings-card" id="password" style={{ "--settings-accent": V.coral }}>
              <div className="vt-settings-card-heading">
                <span className="vt-settings-icon"><SettingIcon name="password" /></span>
                <div><h2>Password</h2><p>Choose a strong password with at least 8 characters.</p></div>
              </div>
              <form onSubmit={changePassword} className="vt-settings-form vt-settings-password-form">
                <Field label="New password" type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                <Field label="Confirm new password" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                <div className="vt-settings-form-action"><button type="submit" disabled={saving} style={buttonStyle("primary", "sm")}>{saving ? "Saving..." : "Update password"}</button></div>
              </form>
            </section>
          </div>
          <footer className="vt-settings-footer">VELOCITY TURF <span>·</span> ACCOUNT SECURITY</footer>
        </div>
      </div>
    </main>
  );
}