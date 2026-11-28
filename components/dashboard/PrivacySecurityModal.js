"use client";

import React, { useState } from "react";
import {
  Shield,
  Lock,
  User,
  FileText,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  AlertCircle,
} from "@/components/ui/icons";
import { Modal, Btn } from "@/components/dashboard/kit";
import { COLORS as V } from "@/lib/design-tokens";

const SECTIONS = [
  {
    id: "privacy",
    title: "Privacy Policy",
    badge: "Data Collection & Use",
    icon: Shield,
    color: "#1769E8",
    bg: "#EAF7FF",
    summary: "How user information is collected, used, stored, and protected across Velocity Turf.",
    points: [
      {
        subtitle: "Information We Collect",
        body: "We collect account details (name, email address, contact numbers, user roles), booking records (turf, slot times, match participations, attendance status), and necessary technical diagnostics (session identifiers, device characteristics) needed to facilitate smooth turf booking operations.",
      },
      {
        subtitle: "Purpose of Processing",
        body: "Your information is used strictly to process bookings, coordinate with venue operators, verify identity via QR check-in, issue game confirmation alerts, prevent fraudulent double-bookings, and support dispute resolutions.",
      },
      {
        subtitle: "Third-Party & Vendor Sharing",
        body: "We never sell, rent, or trade your personal information. Data is shared exclusively with verified cloud database providers (Supabase with SSL), hosting infrastructure, and venue operators fulfilling your confirmed reservations.",
      },
    ],
  },
  {
    id: "protection",
    title: "Data Protection",
    badge: "Storage & Encryption",
    icon: Lock,
    color: "#10B981",
    bg: "#ECFDF5",
    summary: "Advanced cryptographic security, row-level database access control, and zero-exposure policies.",
    points: [
      {
        subtitle: "256-Bit Cryptographic Encryption",
        body: "All transmissions between your browser, mobile app, and Velocity Turf servers are protected using Transport Layer Security (TLS/HTTPS 1.3). Database records at rest are secured with AES-256 standard encryption.",
      },
      {
        subtitle: "Database Row-Level Security (RLS)",
        body: "Our PostgreSQL database enforces granular Row-Level Security policies. Venue owners can only access bookings belonging to their venues; players can only access their personal bookings, profiles, and team details.",
      },
      {
        subtitle: "Secure Credential Storage",
        body: "User passwords are treated with one-way salted hashing algorithms (bcrypt/Argon2) before database insertion. Plain-text credentials are never written to server logs, storage volumes, or admin interfaces.",
      },
    ],
  },
  {
    id: "security",
    title: "Account Security",
    badge: "Authentication & Safety",
    icon: AlertCircle,
    color: "#6366F1",
    bg: "#EEF2FF",
    summary: "Active session management, authenticated authorization guards, and role protection.",
    points: [
      {
        subtitle: "Secure JWT Authentication",
        body: "User sessions utilize short-lived cryptographically signed JSON Web Tokens (JWT) stored in HTTP-only, secure cookies to defend against Cross-Site Scripting (XSS) and token hijacking.",
      },
      {
        subtitle: "Role-Based Access Enforcement",
        body: "Administrative actions, owner payouts, and slot modifications require verified role authorization claims. Unauthorized attempts trigger automatic session invalidation and audit logging.",
      },
      {
        subtitle: "Account Safety Best Practices",
        body: "To keep your account secure, use a strong and unique password of at least 8 characters, never share your session verification codes, and immediately update your password under Account Settings if suspicious activity occurs.",
      },
    ],
  },
  {
    id: "terms",
    title: "Terms & Conditions",
    badge: "Usage & Booking Rules",
    icon: FileText,
    color: "#F59E0B",
    bg: "#FFFBEB",
    summary: "Platform rules, fair play guidelines, booking policies, cancellations, and venue liabilities.",
    points: [
      {
        subtitle: "Platform Usage & Fair Play",
        body: "Users agree to provide accurate registration details, respect venue staff and fellow players, and refrain from malicious automated scraping or disruptive behavior during community matches.",
      },
      {
        subtitle: "Booking & Cancellation Policies",
        body: "Confirmed slots are reserved exclusively for the booking party. Cancellation and refund windows are governed by individual venue policies and admin dispute guidelines. Walk-in and online slots are updated in real-time.",
      },
      {
        subtitle: "Facility Liability & Safety",
        body: "Velocity Turf acts as a scheduling and coordination platform. Players must adhere to venue footwear, safety, and equipment rules. Venue owners maintain operational oversight and pitch maintenance standards.",
      },
    ],
  },
  {
    id: "rights",
    title: "User Rights & Controls",
    badge: "Control & Export",
    icon: User,
    color: "#EC4899",
    bg: "#FDF2F8",
    summary: "Your rights to review personal data, request corrections, export histories, or erase accounts.",
    points: [
      {
        subtitle: "Right to Access & Rectify",
        body: "You can view and modify your display name, email, profile photo, and security credentials directly inside your dashboard at any time.",
      },
      {
        subtitle: "Data Portability & Export",
        body: "Users can review comprehensive booking histories, payment receipts, and download transactional logs directly from the dashboard export modules.",
      },
      {
        subtitle: "Account Deletion & Data Erasure",
        body: "If you wish to close your Velocity Turf account or request full erasure of personal information, you may submit a request through the Help & Support Desk. We honor all requests within statutory timeframes.",
      },
    ],
  },
];

export default function PrivacySecurityModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("all");
  const [expandedSection, setExpandedSection] = useState("privacy");

  if (!isOpen) return null;

  return (
    <Modal
      title="Privacy, Security & Terms"
      subtitle="Comprehensive data policies, security architecture, and platform terms."
      onClose={onClose}
      maxWidth={720}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 12, color: "#718096" }}>
            Effective November 2026 · Velocity Turf Platform Standards
          </div>
          <Btn variant="primary" size="sm" onClick={onClose}>
            Close & Return
          </Btn>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Quick Summary Pill Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, #F0F7FF 0%, #E6F0FA 100%)",
            border: "1px solid #D2E7FF",
            borderRadius: 14,
            padding: "14px 16px",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#1769E8",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Shield size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#172B4D" }}>
              Your Data & Venue Protection Guaranteed
            </div>
            <div style={{ fontSize: 12.5, color: "#505F79", marginTop: 2, lineHeight: 1.5 }}>
              Velocity Turf safeguards player information, booking credentials, and venue operations with strict 256-bit encryption, role isolation, and transparent terms.
            </div>
          </div>
        </div>

        {/* Section Accordions / Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {SECTIONS.map((sec) => {
            const IconComponent = sec.icon;
            const isExpanded = expandedSection === sec.id;

            return (
              <div
                key={sec.id}
                style={{
                  border: isExpanded ? `1.5px solid ${sec.color}` : "1px solid #E5EDF5",
                  borderRadius: 12,
                  background: isExpanded ? "#FFFFFF" : "#FAFCFE",
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                  boxShadow: isExpanded ? "0 4px 14px rgba(23, 105, 232, 0.08)" : "none",
                }}
              >
                {/* Header (Clickable Accordion) */}
                <button
                  type="button"
                  onClick={() => setExpandedSection(isExpanded ? null : sec.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 16px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    gap: 12,
                  }}
                  aria-expanded={isExpanded}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        background: sec.bg,
                        color: sec.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconComponent size={18} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 800, fontSize: 14.5, color: "#172B4D" }}>
                          {sec.title}
                        </span>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: sec.bg,
                            color: sec.color,
                            border: `1px solid ${sec.color}33`,
                          }}
                        >
                          {sec.badge}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#718096",
                          marginTop: 3,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {sec.summary}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: isExpanded ? sec.bg : "#EDF2F7",
                      color: isExpanded ? sec.color : "#718096",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "transform 0.2s ease",
                    }}
                  >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </button>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div
                    style={{
                      padding: "0 16px 16px 16px",
                      borderTop: "1px solid #F0F4F8",
                      marginTop: 4,
                      paddingTop: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    {sec.points.map((pt, pIdx) => (
                      <div
                        key={pIdx}
                        style={{
                          background: "#F8FAFD",
                          borderRadius: 8,
                          padding: "10px 14px",
                          border: "1px solid #E5EDF5",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 12.5,
                            color: "#172B4D",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginBottom: 4,
                          }}
                        >
                          <CheckCircle size={14} color={sec.color} />
                          {pt.subtitle}
                        </div>
                        <div style={{ fontSize: 12, color: "#4A5568", lineHeight: 1.6 }}>
                          {pt.body}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Note regarding Password Changes */}
        <div
          style={{
            background: "#FAFCFE",
            border: "1px dashed #CBD5E0",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 12,
            color: "#718096",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span>
            Looking to update your account login credentials? Password changes are managed safely under{" "}
            <strong style={{ color: "#172B4D" }}>Account Settings → Change Password</strong>.
          </span>
        </div>
      </div>
    </Modal>
  );
}
