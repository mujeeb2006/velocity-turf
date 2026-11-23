"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, MoreVertical, Edit, Settings, Bell, Shield, HelpCircle, LogOut, ChevronRight } from "@/components/ui/icons";
import { Modal, Btn } from "@/components/dashboard/kit";

export default function MobileProfileSection({
  profile,
  roleLabel = "Turf Owner",
  onSignOut,
  onNotifications,
  unreadCount = 0,
}) {
  const router = useRouter();
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);

  const fullName = profile?.full_name || profile?.name || "User";
  const email = profile?.email || "";
  const avatarLetter = (fullName || email || "U").trim().charAt(0).toUpperCase();

  return (
    <div className="vt-mobile-profile-screen">
      {/* Top Bar */}
      <div className="vt-profile-topbar">
        <h1 className="vt-profile-topbar-title">Profile</h1>
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

      {/* Profile Header Card */}
      <div className="vt-profile-header-card">
        <div className="vt-profile-avatar-wrap">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={fullName}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : null}
          <span>{avatarLetter}</span>
        </div>
        <h2 className="vt-profile-name">{fullName}</h2>
        {email && <div className="vt-profile-email">{email}</div>}
        <div style={{ marginTop: 4 }}>
          <span className="vt-profile-role-pill">{roleLabel.toUpperCase()}</span>
        </div>
      </div>

      {/* Menu List Card */}
      <div className="vt-profile-menu-card">
        <button
          type="button"
          className="vt-profile-menu-row"
          onClick={() => router.push("/settings")}
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
          onClick={() => router.push("/settings")}
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
          onClick={() => {
            if (onNotifications) {
              onNotifications();
            } else {
              router.push("/settings");
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
          onClick={() => router.push("/settings")}
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
          onClick={() => setShowSupportModal(true)}
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

      {/* Logout Row */}
      <div style={{ marginTop: 4, padding: "0 4px" }}>
        <button
          type="button"
          className="vt-profile-logout-btn"
          onClick={() => {
            if (onSignOut) onSignOut();
          }}
        >
          <LogOut size={20} color="#EF4444" />
          <span>Logout</span>
        </button>
      </div>

      {/* Help & Support Modal */}
      {showSupportModal && (
        <Modal
          title="Help & Support"
          subtitle="We are here to help you manage your turfs and bookings."
          onClose={() => setShowSupportModal(false)}
          maxWidth={420}
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
              <div style={{ fontWeight: 800, fontSize: 15, color: "#172B4D", marginBottom: 6 }}>
                Velocity Turf Partner Desk
              </div>
              <div style={{ fontSize: 13, color: "#505F79", lineHeight: 1.5 }}>
                Direct support for venue owners and platform administrators with priority response.
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
                    window.location.href = "mailto:support@velocityturf.com?subject=Support%20Request";
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
