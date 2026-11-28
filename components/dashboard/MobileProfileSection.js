"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Icon,
  MoreVertical,
  Edit,
  Settings,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Camera,
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  Phone,
  Check,
  ArrowLeft,
} from "@/components/ui/icons";
import { Modal, Btn, TopBar } from "@/components/dashboard/kit";
import { PwaInstallButton } from "@/components/PwaInstallButton";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import PrivacySecurityModal from "@/components/dashboard/PrivacySecurityModal";

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80",
];

export default function MobileProfileSection({
  profile,
  roleLabel = "Turf Owner",
  onSignOut,
  onNotifications,
  unreadCount = 0,
  onBack,
}) {
  const router = useRouter();
  const supabase = createClient();
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  // Modals state: "edit-profile", "account", "password", "security", "support", null
  const [activeModal, setActiveModal] = useState(null);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);

  // Form states
  const [fullName, setFullName] = useState(profile?.full_name || profile?.name || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const initial = (fullName || email || "U").trim().charAt(0).toUpperCase();

  // Handlers
  async function handleSaveProfile(e) {
    if (e?.preventDefault) e.preventDefault();
    const nextName = fullName.trim();
    if (!nextName) {
      showToast("Please enter your name.", { type: "error" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: nextName, avatar_url: avatarUrl })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      showToast("Couldn't update profile. Please try again.", { type: "error" });
      return;
    }
    showToast("Profile details updated successfully!", { type: "success" });
    setActiveModal(null);
    router.refresh();
  }

  async function handlePhotoFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("Photo must be under 5MB.", { type: "error" });
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setAvatarUrl(dataUrl);
      // Auto-save photo to profile
      if (profile?.id) {
        await supabase.from("profiles").update({ avatar_url: dataUrl }).eq("id", profile.id);
        showToast("Profile photo updated!", { type: "success" });
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleChangeEmail(e) {
    if (e?.preventDefault) e.preventDefault();
    const nextEmail = email.trim();
    if (!nextEmail || nextEmail === profile.email) {
      setActiveModal(null);
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: nextEmail });
    setSaving(false);
    if (error) {
      showToast(error.message, { type: "error" });
      return;
    }
    showToast("Confirmation link sent to your new email.", { type: "success" });
    setActiveModal(null);
  }

  async function handleChangePassword(e) {
    if (e?.preventDefault) e.preventDefault();
    if (newPassword.length < 8) {
      showToast("Password must be at least 8 characters.", { type: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match.", { type: "error" });
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
    showToast("Password updated securely.", { type: "success" });
    setActiveModal(null);
  }

  return (
    <div className="vt-profile-container">
      {/* Hidden file input for PFP upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handlePhotoFileChange}
      />

      {/* DESKTOP TOP BAR */}
      <div className="vt-desktop-only" style={{ marginBottom: 20 }}>
        <TopBar
          title="Profile & Settings"
          sub="Manage your personal profile, photo, security, notifications and support."
          onBack={onBack}
          action={
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Btn
                icon="user"
                size="sm"
                variant="primary"
                onClick={() => setActiveModal("edit-profile")}
              >
                Edit Profile & PFP
              </Btn>
              <Btn
                icon="logout"
                size="sm"
                variant="secondary"
                onClick={onSignOut}
              >
                Sign out
              </Btn>
            </div>
          }
        />
      </div>

      {/* MOBILE TOP BAR */}
      <div className="vt-mobile-only">
        <div className="vt-profile-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="vt-mobile-back-circle-btn"
                aria-label="Back"
              >
                <ArrowLeft size={18} color="#172B4D" />
              </button>
            )}
            <h1 className="vt-profile-topbar-title">Profile</h1>
          </div>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="vt-profile-dots-btn"
              onClick={() => setShowMenuDropdown((prev) => !prev)}
              aria-label="More options"
            >
              <MoreVertical size={22} color="#172B4D" />
            </button>

            {showMenuDropdown && (
              <>
                <div
                  onClick={() => setShowMenuDropdown(false)}
                  style={{ position: "fixed", inset: 0, zIndex: 998 }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: 6,
                    background: "#FFFFFF",
                    border: "1px solid #E5EDF5",
                    borderRadius: 14,
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.12)",
                    padding: "6px",
                    minWidth: 140,
                    zIndex: 999,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenuDropdown(false);
                      if (onSignOut) onSignOut();
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "10px 14px",
                      border: "none",
                      background: "transparent",
                      borderRadius: 10,
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: "#EF4444",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <LogOut size={16} color="#EF4444" />
                    <span>Sign out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* DESKTOP RESPONSIVE LAYOUT (2-column layout on desktop) */}
      <div className="vt-profile-desktop-layout">
        {/* Left Column: Profile Card & Quick Info */}
        <div className="vt-profile-left-col">
          <div className="vt-profile-card-box">
            {/* Avatar Wrap with Camera Edit Button */}
            <div style={{ position: "relative", display: "inline-block" }}>
              <div className="vt-profile-avatar-wrap">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : null}
                <span>{initial}</span>
              </div>
              <button
                type="button"
                className="vt-profile-camera-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Change Profile Photo (PFP)"
                aria-label="Change Profile Photo"
              >
                <Camera size={16} color="#FFFFFF" />
              </button>
            </div>

            <h2 className="vt-profile-name">{fullName}</h2>
            {email && <div className="vt-profile-email">{email}</div>}
            <div>
              <span className="vt-profile-role-pill">{roleLabel.toUpperCase()}</span>
            </div>

            <div className="vt-desktop-only" style={{ height: 1, background: "#F0F4F8", width: "100%", margin: "18px 0" }} />

            <div className="vt-desktop-only" style={{ display: "grid", gap: 10, width: "100%" }}>
              <button
                type="button"
                className="vt-profile-action-btn"
                onClick={() => setActiveModal("edit-profile")}
              >
                <Edit size={16} color="#1769E8" />
                <span>Edit Profile & PFP</span>
              </button>
              <button
                type="button"
                className="vt-profile-action-btn"
                onClick={() => setActiveModal("security")}
              >
                <Shield size={16} color="#1769E8" />
                <span>Privacy & Security</span>
              </button>
              <button
                type="button"
                className="vt-profile-action-btn"
                onClick={() => setActiveModal("support")}
              >
                <HelpCircle size={16} color="#1769E8" />
                <span>Help & Support</span>
              </button>
            </div>

            <div className="vt-desktop-only" style={{ marginTop: 18, width: "100%" }}>
              <button
                type="button"
                className="vt-profile-logout-full-btn"
                onClick={onSignOut}
              >
                <LogOut size={16} color="#EF4444" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Desktop Install App Card */}
          <div className="vt-desktop-only" style={{ marginTop: 14 }}>
            <PwaInstallButton
              role={roleLabel.toLowerCase().includes("admin") ? "admin" : "owner"}
              variant="card"
            />
          </div>
        </div>

        {/* Right Column: 4 Detailed Section Cards (Desktop) */}
        <div className="vt-profile-right-col vt-desktop-only">
          {/* Section 1: Edit Profile / Edit PFP */}
          <div className="vt-profile-section-card">
            <div className="vt-profile-section-header">
              <div className="vt-profile-section-icon" style={{ background: "#EAF7FF", color: "#1769E8" }}>
                <User size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 className="vt-profile-section-title">Edit Profile</h3>
                <p className="vt-profile-section-sub">
                  Update your display name, personal bio, and profile photo.
                </p>
              </div>
              <Btn size="sm" variant="secondary" onClick={() => setActiveModal("edit-profile")}>
                Edit Details
              </Btn>
            </div>
            <div className="vt-profile-meta-grid">
              <div className="vt-profile-meta-item">
                <span className="vt-profile-meta-label">Display Name</span>
                <span className="vt-profile-meta-value">{fullName || "Not set"}</span>
              </div>
              <div className="vt-profile-meta-item">
                <span className="vt-profile-meta-label">Profile Photo (PFP)</span>
                <span className="vt-profile-meta-value">
                  {avatarUrl ? "Custom photo set" : "Using initial avatar"}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Account Settings */}
          <div className="vt-profile-section-card">
            <div className="vt-profile-section-header">
              <div className="vt-profile-section-icon" style={{ background: "#EEF2FF", color: "#4F46E5" }}>
                <Settings size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 className="vt-profile-section-title">Account Settings</h3>
                <p className="vt-profile-section-sub">
                  Manage your primary email address, password, and venue credentials.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Btn size="sm" variant="secondary" onClick={() => setActiveModal("password")}>
                  Change Password
                </Btn>
                <Btn size="sm" variant="secondary" onClick={() => setActiveModal("account")}>
                  Manage Email
                </Btn>
              </div>
            </div>
            <div className="vt-profile-meta-grid">
              <div className="vt-profile-meta-item">
                <span className="vt-profile-meta-label">Primary Email</span>
                <span className="vt-profile-meta-value">{email}</span>
              </div>
              <div className="vt-profile-meta-item">
                <span className="vt-profile-meta-label">Account Password</span>
                <span className="vt-profile-meta-value">••••••••••••</span>
              </div>
            </div>
          </div>

          {/* Section 3: Privacy & Security */}
          <div className="vt-profile-section-card">
            <div className="vt-profile-section-header">
              <div className="vt-profile-section-icon" style={{ background: "#FFF1F2", color: "#E11D48" }}>
                <Shield size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 className="vt-profile-section-title">Privacy & Security</h3>
                <p className="vt-profile-section-sub">
                  Privacy policy, data protection, account safety, and platform terms.
                </p>
              </div>
              <Btn size="sm" variant="secondary" onClick={() => setActiveModal("security")}>
                View Policy & Terms
              </Btn>
            </div>
            <div className="vt-profile-meta-grid">
              <div className="vt-profile-meta-item">
                <span className="vt-profile-meta-label">Security & Protection</span>
                <span className="vt-profile-meta-value" style={{ color: "#10B981", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Check size={14} /> 256-Bit SSL Encrypted
                </span>
              </div>
              <div className="vt-profile-meta-item">
                <span className="vt-profile-meta-label">Platform Terms</span>
                <span className="vt-profile-meta-value">Fair Play & Booking Rules</span>
              </div>
            </div>
          </div>

          {/* Section 4: Help & Support */}
          <div className="vt-profile-section-card">
            <div className="vt-profile-section-header">
              <div className="vt-profile-section-icon" style={{ background: "#FAF5FF", color: "#9333EA" }}>
                <HelpCircle size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 className="vt-profile-section-title">Help & Support</h3>
                <p className="vt-profile-section-sub">
                  Direct partner helpline, priority email desk, and live operational support.
                </p>
              </div>
              <Btn size="sm" variant="primary" onClick={() => setActiveModal("support")}>
                Contact Desk
              </Btn>
            </div>
            <div className="vt-profile-meta-grid">
              <div className="vt-profile-meta-item">
                <span className="vt-profile-meta-label">Support Email</span>
                <span className="vt-profile-meta-value">support@velocityturf.com</span>
              </div>
              <div className="vt-profile-meta-item">
                <span className="vt-profile-meta-label">Phone Hotline</span>
                <span className="vt-profile-meta-value">+91 98765 43210</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE LIST CARD VIEW (matches mobile native app UI) */}
      <div className="vt-mobile-only" style={{ marginTop: 14 }}>
        <div className="vt-profile-menu-card">
          <button
            type="button"
            className="vt-profile-menu-row"
            onClick={() => setActiveModal("edit-profile")}
          >
            <div className="vt-profile-menu-left">
              <span className="vt-profile-row-icon">
                <Edit size={19} color="#4A5568" />
              </span>
              <span className="vt-profile-row-label">Edit Profile</span>
            </div>
            <span className="vt-profile-row-chevron">
              <ChevronRight size={18} />
            </span>
          </button>

          <button
            type="button"
            className="vt-profile-menu-row"
            onClick={() => setActiveModal("account")}
          >
            <div className="vt-profile-menu-left">
              <span className="vt-profile-row-icon">
                <Settings size={19} color="#4A5568" />
              </span>
              <span className="vt-profile-row-label">Account Settings</span>
            </div>
            <span className="vt-profile-row-chevron">
              <ChevronRight size={18} />
            </span>
          </button>

          <button
            type="button"
            className="vt-profile-menu-row"
            onClick={() => setActiveModal("password")}
          >
            <div className="vt-profile-menu-left">
              <span className="vt-profile-row-icon">
                <Lock size={19} color="#4A5568" />
              </span>
              <span className="vt-profile-row-label">Change Password</span>
            </div>
            <span className="vt-profile-row-chevron">
              <ChevronRight size={18} />
            </span>
          </button>

          <button
            type="button"
            className="vt-profile-menu-row"
            onClick={() => {
              if (onNotifications) {
                onNotifications();
              } else {
                setActiveModal("account");
              }
            }}
          >
            <div className="vt-profile-menu-left">
              <span className="vt-profile-row-icon" style={{ position: "relative" }}>
                <Bell size={19} color="#4A5568" />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -2,
                      right: -3,
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#1769E8",
                    }}
                  />
                )}
              </span>
              <span className="vt-profile-row-label">Notification Preferences</span>
            </div>
            <span className="vt-profile-row-chevron">
              <ChevronRight size={18} />
            </span>
          </button>

          <button
            type="button"
            className="vt-profile-menu-row"
            onClick={() => setActiveModal("security")}
          >
            <div className="vt-profile-menu-left">
              <span className="vt-profile-row-icon">
                <Shield size={19} color="#4A5568" />
              </span>
              <span className="vt-profile-row-label">Privacy & Security</span>
            </div>
            <span className="vt-profile-row-chevron">
              <ChevronRight size={18} />
            </span>
          </button>

          <button
            type="button"
            className="vt-profile-menu-row"
            onClick={() => setActiveModal("support")}
          >
            <div className="vt-profile-menu-left">
              <span className="vt-profile-row-icon">
                <HelpCircle size={19} color="#4A5568" />
              </span>
              <span className="vt-profile-row-label">Help & Support</span>
            </div>
            <span className="vt-profile-row-chevron">
              <ChevronRight size={18} />
            </span>
          </button>
        </div>

        {/* Mobile Install App Card */}
        <div style={{ margin: "14px 4px 6px" }}>
          <PwaInstallButton
            role={roleLabel.toLowerCase().includes("admin") ? "admin" : "owner"}
            variant="card"
          />
        </div>

        {/* Mobile Logout Row */}
        <div style={{ marginTop: 4, padding: "0 4px" }}>
          <button
            type="button"
            className="vt-profile-logout-btn"
            onClick={onSignOut}
          >
            <LogOut size={20} color="#EF4444" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          INTERACTIVE IN-PLACE MODALS (Accessible seamlessly on Mobile & Desktop)
          ========================================================================= */}

      {/* 1. EDIT PROFILE & EDIT PFP MODAL */}
      {activeModal === "edit-profile" && (
        <Modal
          title="Edit Profile & Photo"
          subtitle="Update your full name and select or upload a profile picture."
          onClose={() => setActiveModal(null)}
          maxWidth={460}
        >
          <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* PFP Photo Picker */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#172B4D", marginBottom: 8 }}>
                Profile Photo (PFP)
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "2px solid #1769E8",
                    background: "linear-gradient(135deg, #18A8E0 0%, #1769E8 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#FFFFFF",
                    fontWeight: 900,
                    fontSize: 24,
                    flexShrink: 0,
                  }}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    initial
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <Btn
                    type="button"
                    size="sm"
                    variant="primary"
                    icon="camera"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload Photo
                  </Btn>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl("")}
                      style={{ background: "none", border: "none", color: "#EF4444", fontSize: 12, cursor: "pointer", textAlign: "left", padding: 0 }}
                    >
                      Remove custom photo
                    </button>
                  )}
                </div>
              </div>

              {/* Preset Avatars Selection */}
              <div style={{ marginTop: 12 }}>
                <span style={{ fontSize: 11.5, color: "#718096", fontWeight: 600 }}>Or choose a preset photo:</span>
                <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  {PRESET_AVATARS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatarUrl(url)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        overflow: "hidden",
                        border: avatarUrl === url ? "2px solid #1769E8" : "1px solid #E5EDF5",
                        cursor: "pointer",
                        padding: 0,
                        transform: avatarUrl === url ? "scale(1.1)" : "none",
                        transition: "transform 0.15s ease",
                      }}
                    >
                      <img src={url} alt={`Preset ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#172B4D", marginBottom: 6 }}>
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your name"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #E5EDF5",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#172B4D",
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <Btn type="button" variant="secondary" onClick={() => setActiveModal(null)}>
                Cancel
              </Btn>
              <Btn type="submit" variant="primary" disabled={saving}>
                {saving ? "Saving..." : "Save Profile"}
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* 2. ACCOUNT SETTINGS MODAL */}
      {activeModal === "account" && (
        <Modal
          title="Account Settings"
          subtitle="Manage your primary email address and account credentials."
          onClose={() => setActiveModal(null)}
          maxWidth={460}
        >
          <form onSubmit={handleChangeEmail} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#172B4D", marginBottom: 6 }}>
                Registered Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #E5EDF5",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#172B4D",
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
              <span style={{ fontSize: 11.5, color: "#718096", marginTop: 4, display: "block" }}>
                A confirmation link will be sent if you update your address.
              </span>
            </div>

            <div style={{ background: "#F8FAFD", padding: "12px 14px", borderRadius: 10, border: "1px solid #E5EDF5" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#172B4D" }}>Role & Account ID</div>
              <div style={{ fontSize: 13, color: "#718096", marginTop: 2 }}>{roleLabel} · {profile?.id?.slice(0, 8)}...</div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <Btn type="button" variant="secondary" onClick={() => setActiveModal(null)}>
                Cancel
              </Btn>
              <Btn type="submit" variant="primary" disabled={saving || email.trim() === profile.email}>
                {saving ? "Saving..." : "Update Email"}
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* 2B. CHANGE PASSWORD MODAL (Under Account Settings) */}
      {activeModal === "password" && (
        <Modal
          title="Change Password"
          subtitle="Choose a secure password with at least 8 characters."
          onClose={() => setActiveModal(null)}
          maxWidth={460}
        >
          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* New Password */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#172B4D", marginBottom: 6 }}>
                New Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 42px 10px 14px",
                    borderRadius: 10,
                    border: "1px solid #E5EDF5",
                    fontSize: 14,
                    color: "#172B4D",
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                    color: "#718096",
                    display: "flex",
                    alignItems: "center",
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#172B4D", marginBottom: 6 }}>
                Confirm New Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  minLength={8}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 42px 10px 14px",
                    borderRadius: 10,
                    border: "1px solid #E5EDF5",
                    fontSize: 14,
                    color: "#172B4D",
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ color: "#166534", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <Shield size={14} color="#166534" /> 256-bit encrypted credential storage
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <Btn type="button" variant="secondary" onClick={() => setActiveModal(null)}>
                Cancel
              </Btn>
              <Btn type="submit" variant="primary" disabled={saving}>
                {saving ? "Updating..." : "Update Password"}
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* 3. PRIVACY & SECURITY MODAL */}
      <PrivacySecurityModal
        isOpen={activeModal === "security"}
        onClose={() => setActiveModal(null)}
      />

      {/* 4. HELP & SUPPORT MODAL */}
      {activeModal === "support" && (
        <Modal
          title="Help & Support Desk"
          subtitle="Direct assistance for venue owners, operators, and platform managers."
          onClose={() => setActiveModal(null)}
          maxWidth={460}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                background: "#F4F9FF",
                border: "1px solid #D2E7FF",
                borderRadius: 14,
                padding: "16px",
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 15, color: "#172B4D", marginBottom: 4 }}>
                Velocity Turf Partner Desk
              </div>
              <div style={{ fontSize: 13, color: "#505F79", lineHeight: 1.5 }}>
                Priority response for bookings, venue management, scanner verification, and payouts.
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  background: "#FAFCFE",
                  borderRadius: 10,
                  border: "1px solid #E5EDF5",
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: "#718096", fontWeight: 700, textTransform: "uppercase" }}>
                    Email Support
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#172B4D", marginTop: 2 }}>
                    support@velocityturf.com
                  </div>
                </div>
                <Btn
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    window.location.href = "mailto:support@velocityturf.com?subject=Velocity%20Turf%20Support%20Request";
                  }}
                >
                  Email Us
                </Btn>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  background: "#FAFCFE",
                  borderRadius: 10,
                  border: "1px solid #E5EDF5",
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: "#718096", fontWeight: 700, textTransform: "uppercase" }}>
                    Phone Hotline
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#172B4D", marginTop: 2 }}>
                    +91 98765 43210
                  </div>
                </div>
                <Btn
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    window.location.href = "tel:+919876543210";
                  }}
                >
                  Call Now
                </Btn>
              </div>
            </div>

            <div style={{ fontSize: 12, color: "#718096", textAlign: "center", marginTop: 4 }}>
              Available 7 days a week · 6:00 AM – 11:00 PM IST
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
