"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { COLORS as V, FONT_DISPLAY, FONT_BODY, panel, buttonStyle } from "@/lib/design-tokens";

const inputStyle = {
  width: "100%", padding: "11px 12px", borderRadius: 8, background: V.pitchCardRaised,
  border: `1px solid ${V.line}`, color: V.chalk, fontSize: 14, fontFamily: FONT_BODY,
};

function Field({ label, ...props }) {
  return (
    <label style={{ display: "grid", gap: 7, color: V.chalkDim, fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY }}>
      {label}
      <input {...props} style={inputStyle} />
    </label>
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

  const homePath = profile.role === "admin" ? "/admin" : profile.role === "owner" ? "/owner" : "/player";

  return (
    <main style={{ minHeight: "100vh", background: V.pitch, color: V.chalk, padding: "32px 20px", fontFamily: FONT_BODY }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <button onClick={() => router.push(homePath)} style={{ ...buttonStyle("secondary", "sm"), marginBottom: 28 }}>
          Back to dashboard
        </button>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 38, fontWeight: 400, margin: "0 0 6px" }}>Account settings</h1>
        <p style={{ color: V.chalkDim, fontSize: 14, margin: "0 0 24px" }}>Manage your profile and sign-in details.</p>

        <section style={{ ...panel(), padding: 22, marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, margin: "0 0 18px" }}>Profile</h2>
          <form onSubmit={saveName} style={{ display: "grid", gap: 16 }}>
            <Field label="Full name" autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} />
            <div><button type="submit" disabled={saving} style={buttonStyle("primary", "sm")}>{saving ? "Saving..." : "Save name"}</button></div>
          </form>
        </section>

        <section style={{ ...panel(), padding: 22, marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, margin: "0 0 8px" }}>Email address</h2>
          <p style={{ color: V.chalkFaint, fontSize: 12.5, margin: "0 0 16px" }}>Supabase will email a confirmation link before the new address takes effect.</p>
          <form onSubmit={changeEmail} style={{ display: "grid", gap: 16 }}>
            <Field label="Email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
            <div><button type="submit" disabled={saving || email.trim() === profile.email} style={buttonStyle("secondary", "sm")}>{saving ? "Saving..." : "Change email"}</button></div>
          </form>
        </section>

        <section style={{ ...panel(), padding: 22 }}>
          <h2 style={{ fontSize: 17, margin: "0 0 18px" }}>Password</h2>
          <form onSubmit={changePassword} style={{ display: "grid", gap: 16 }}>
            <Field label="New password" type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
            <Field label="Confirm new password" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            <div><button type="submit" disabled={saving} style={buttonStyle("primary", "sm")}>{saving ? "Saving..." : "Update password"}</button></div>
          </form>
        </section>
      </div>
    </main>
  );
}