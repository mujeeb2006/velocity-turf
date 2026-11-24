"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizeUserRole } from "@/lib/auth/validation";
import { useToast } from "@/components/ui/toast";
import { COLORS as V, FONT_BODY, buttonStyle } from "@/lib/design-tokens";
import BrandLockup from "@/components/brand-lockup";
import { ArrowLeft, User, Mail, Lock, ChevronRight, Eye, EyeOff } from "@/components/ui/icons";
import { Modal, Btn } from "@/components/dashboard/kit";

const inputStyle = {
  width: "100%",
  minHeight: 46,
  padding: "11px 13px",
  borderRadius: 9,
  background: "#FFFFFF",
  border: "1px solid #E5EDF5",
  color: "#172B4D",
  fontSize: 14,
  fontFamily: FONT_BODY,
};

function Field({ label, type, value, onChange, ...props }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const hasValue = typeof value === "string" && value.length > 0;
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <label className="vt-settings-field">
      {label}
      <div style={{ position: "relative", width: "100%" }}>
        <input
          {...props}
          type={inputType}
          value={value}
          onChange={onChange}
          style={{
            ...inputStyle,
            paddingRight: isPassword && hasValue ? 44 : 13,
            width: "100%",
            boxSizing: "border-box",
          }}
        />
        {isPassword && hasValue && (
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 8,
              color: "#718096",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 6,
            }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
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
  const [activeEditModal, setActiveEditModal] = useState(null);

  async function saveName(event) {
    if (event?.preventDefault) event.preventDefault();
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
    setActiveEditModal(null);
    router.refresh();
  }

  async function changeEmail(event) {
    if (event?.preventDefault) event.preventDefault();
    const nextEmail = email.trim();
    if (!nextEmail || nextEmail === profile.email) {
      setActiveEditModal(null);
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: nextEmail });
    setSaving(false);
    if (error) {
      showToast(error.message, { type: "error" });
      return;
    }
    showToast("Check your new email to confirm the change.", { type: "success" });
    setActiveEditModal(null);
  }

  async function changePassword(event) {
    if (event?.preventDefault) event.preventDefault();
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
    setActiveEditModal(null);
  }

  const normalizedRole = normalizeUserRole(profile.role);
  const homePath = normalizedRole === "admin" ? "/admin" : normalizedRole === "owner" ? "/owner" : "/player";
  const roleBadgeLabels = {
    admin: "ADMINISTRATOR",
    owner: "TURF OWNER",
    player: "PLAYER",
  };
  const roleBadgeText = roleBadgeLabels[normalizedRole] || "PLAYER";
  const roleLabels = { admin: "Administrator", owner: "Turf owner", player: "Player" };
  const displayName = profile.full_name || profile.email?.split("@")[0] || "Velocity user";
  const initial = (fullName || displayName || profile.email || "U").trim().charAt(0).toUpperCase();

  return (
    <main className="vt-settings-page">
      {/* MOBILE VIEW (only on max-width: 767px - matches reference screenshot) */}
      <div className="vt-settings-mobile-view">
        {/* Top Header */}
        <div className="vt-settings-mobile-header">
          <button
            type="button"
            onClick={() => router.push(homePath)}
            className="vt-settings-mobile-back-btn"
            aria-label="Back"
          >
            <ArrowLeft size={18} color="#172B4D" />
          </button>
          <h1 className="vt-settings-mobile-title">ACCOUNT SETTINGS</h1>
          <div style={{ width: 42 }} />
        </div>

        {/* Profile Card Header */}
        <div className="vt-settings-mobile-profile">
          <div className="vt-settings-mobile-avatar">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            ) : null}
            <span>{initial}</span>
          </div>
          <h2 className="vt-settings-mobile-name">{fullName || displayName}</h2>
          <div className="vt-settings-mobile-email">{profile.email}</div>
          <div className="vt-settings-mobile-badge-wrap">
            <span className="vt-settings-mobile-badge">
              {roleBadgeText}
            </span>
          </div>
        </div>

        {/* Profile Details Section */}
        <div className="vt-settings-mobile-section-heading">
          <h2>Profile details</h2>
          <p>Tap a row to edit it.</p>
        </div>

        {/* 3 Interactive Cards */}
        <div className="vt-settings-mobile-cards">
          {/* Name Card */}
          <button
            type="button"
            className="vt-settings-mobile-card"
            onClick={() => setActiveEditModal("name")}
          >
            <div className="vt-settings-card-left">
              <div className="vt-settings-icon-wrap vt-icon-user">
                <User size={20} color="#1769E8" />
              </div>
              <div className="vt-settings-card-texts">
                <span className="vt-settings-card-label">Name</span>
                <span className="vt-settings-card-val">{fullName || "Not set"}</span>
              </div>
            </div>
            <ChevronRight size={18} color="#A0AEC0" />
          </button>

          {/* Email Card */}
          <button
            type="button"
            className="vt-settings-mobile-card"
            onClick={() => setActiveEditModal("email")}
          >
            <div className="vt-settings-card-left">
              <div className="vt-settings-icon-wrap vt-icon-mail">
                <Mail size={20} color="#1769E8" />
              </div>
              <div className="vt-settings-card-texts">
                <span className="vt-settings-card-label">Email address</span>
                <span className="vt-settings-card-val">{profile.email}</span>
              </div>
            </div>
            <ChevronRight size={18} color="#A0AEC0" />
          </button>

          {/* Password Card */}
          <button
            type="button"
            className="vt-settings-mobile-card"
            onClick={() => setActiveEditModal("password")}
          >
            <div className="vt-settings-card-left">
              <div className="vt-settings-icon-wrap vt-icon-lock">
                <Lock size={20} color="#EA580C" />
              </div>
              <div className="vt-settings-card-texts">
                <span className="vt-settings-card-label">Password</span>
                <span className="vt-settings-card-val">••••••••</span>
              </div>
            </div>
            <ChevronRight size={18} color="#A0AEC0" />
          </button>
        </div>

        {/* Footer */}
        <footer className="vt-settings-mobile-footer">
          VELOCITY TURF · ACCOUNT SECURITY
        </footer>
      </div>

      {/* DESKTOP VIEW (only on min-width: 768px - desktop layout preserved) */}
      <div className="vt-settings-desktop-view">
        <header className="vt-settings-topbar">
          <a className="vt-settings-brand" href={homePath}>
            <BrandLockup markSize={36} compact />
          </a>
          <button
            onClick={() => router.push(homePath)}
            className="vt-settings-back"
            style={{ ...buttonStyle("secondary", "sm"), display: "inline-flex", alignItems: "center" }}
          >
            <ArrowLeft size={14} style={{ marginRight: 6 }} />
            {normalizedRole === "player" ? "Back to my games" : "Back to dashboard"}
          </button>
        </header>

        <div className="vt-settings-layout">
          <aside className="vt-settings-aside">
            <div className="vt-settings-identity">
              <div className="vt-settings-avatar">{initial}</div>
              <div className="vt-settings-identity-copy">
                <span className="vt-settings-overline">YOUR PROFILE</span>
                <strong>{displayName}</strong>
                <span>{profile.email}</span>
              </div>
              <div className="vt-settings-role">
                <SettingIcon name="shield" />
                {roleLabels[normalizedRole] || "Account"}
              </div>
            </div>

            <nav className="vt-settings-nav" aria-label="Settings sections">
              <span className="vt-settings-overline">SETTINGS</span>
              <a href="#profile"><SettingIcon name="profile" /><span>Profile details</span><i /></a>
              <a href="#email"><SettingIcon name="email" /><span>Email address</span><i /></a>
              <a href="#password"><SettingIcon name="password" /><span>Password</span><i /></a>
            </nav>

            <div className="vt-settings-private-note">
              <SettingIcon name="shield" />
              <span><strong>Your account is safe.</strong> We keep your login details secure.</span>
            </div>
          </aside>

          <div className="vt-settings-content">
            <div className="vt-settings-page-heading">
              <span className="vt-settings-overline">ACCOUNT</span>
              <h1>Account settings</h1>
              <p>Update your name, email, and password.</p>
            </div>

            <div className="vt-settings-sections">
              <section className="vt-settings-card" id="profile" style={{ "--settings-accent": V.aqua }}>
                <div className="vt-settings-card-heading">
                  <span className="vt-settings-icon"><SettingIcon name="profile" /></span>
                  <div><h2>Profile details</h2><p>This is the name other players see.</p></div>
                </div>
                <form onSubmit={saveName} className="vt-settings-form">
                  <Field label="Name" autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} />
                  <div className="vt-settings-form-action">
                    <button type="submit" disabled={saving} style={buttonStyle("primary", "sm")}>
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </form>
              </section>

              <section className="vt-settings-card" id="email" style={{ "--settings-accent": V.sky }}>
                <div className="vt-settings-card-heading">
                  <span className="vt-settings-icon"><SettingIcon name="email" /></span>
                  <div><h2>Email address</h2><p>We'll email you a link to confirm your new address.</p></div>
                </div>
                <form onSubmit={changeEmail} className="vt-settings-form">
                  <Field label="Email address" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
                  <div className="vt-settings-form-action">
                    <button type="submit" disabled={saving || email.trim() === profile.email} style={buttonStyle("secondary", "sm")}>
                      {saving ? "Saving..." : "Update email"}
                    </button>
                  </div>
                </form>
              </section>

              <section className="vt-settings-card" id="password" style={{ "--settings-accent": V.coral }}>
                <div className="vt-settings-card-heading">
                  <span className="vt-settings-icon"><SettingIcon name="password" /></span>
                  <div><h2>Change password</h2><p>Use at least 8 characters.</p></div>
                </div>
                <form onSubmit={changePassword} className="vt-settings-form vt-settings-password-form">
                  <Field label="New password" type="password" placeholder="Enter new password" autoComplete="new-password" minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                  <Field label="Confirm new password" type="password" placeholder="Re-enter new password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                  <div className="vt-settings-form-action">
                    <button type="submit" disabled={saving} style={buttonStyle("primary", "sm")}>
                      {saving ? "Saving..." : "Update password"}
                    </button>
                  </div>
                </form>
              </section>
            </div>
            <footer className="vt-settings-footer">VELOCITY TURF <span>·</span> ACCOUNT SECURITY</footer>
          </div>
        </div>
      </div>

      {/* EDIT MODALS FOR MOBILE */}
      {activeEditModal === "name" && (
        <Modal
          title="Edit Name"
          subtitle="This is the display name shown across Velocity Turf."
          onClose={() => setActiveEditModal(null)}
          maxWidth={440}
        >
          <form onSubmit={saveName}>
            <Field
              label="Full Name"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoFocus
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <Btn variant="secondary" onClick={() => setActiveEditModal(null)}>Cancel</Btn>
              <Btn variant="primary" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {activeEditModal === "email" && (
        <Modal
          title="Update Email Address"
          subtitle="We'll send a confirmation link to your new email."
          onClose={() => setActiveEditModal(null)}
          maxWidth={440}
        >
          <form onSubmit={changeEmail}>
            <Field
              label="New Email Address"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <Btn variant="secondary" onClick={() => setActiveEditModal(null)}>Cancel</Btn>
              <Btn variant="primary" type="submit" disabled={saving || email.trim() === profile.email}>
                {saving ? "Saving..." : "Update email"}
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {activeEditModal === "password" && (
        <Modal
          title="Change Password"
          subtitle="Choose a secure password with at least 8 characters."
          onClose={() => setActiveEditModal(null)}
          maxWidth={440}
        >
          <form onSubmit={changePassword}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field
                label="New Password"
                type="password"
                placeholder="At least 8 characters"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoFocus
              />
              <Field
                label="Confirm New Password"
                type="password"
                placeholder="Re-enter new password"
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <Btn variant="secondary" onClick={() => setActiveEditModal(null)}>Cancel</Btn>
              <Btn variant="primary" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Update password"}
              </Btn>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}
