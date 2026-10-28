"use client";

import { useState, useEffect } from "react";
import { COLORS as V } from "@/lib/design-tokens";
import {
  Btn,
  Card,
  EmptyBlock,
  Modal,
  StatCard,
  StatGrid,
  StatusPill,
  font,
  inputStyle,
  labelStyle,
} from "@/components/dashboard/kit";
import {
  STAFF_ROLES,
  ALL_STAFF_PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
} from "@/lib/staff/policy";

const STATUS_TONES = {
  active: "live",
  invited: "pending",
  revoked: "danger",
  expired: "info",
};

export function StaffSection({ turfs = [], showToast }) {
  const [staffList, setStaffList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("members"); // "members" or "audit"

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [inviteResult, setInviteResult] = useState(null);

  async function fetchStaff() {
    setLoading(true);
    try {
      const res = await fetch("/api/owner/staff");
      const data = await res.json();
      if (res.ok) {
        setStaffList(data.staff || []);
      } else {
        showToast(data.error || "Failed to load staff list.", { type: "error" });
      }
    } catch (err) {
      console.error(err);
      showToast("Network error loading staff.", { type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function fetchAuditLogs() {
    try {
      const res = await fetch("/api/owner/staff/audit");
      const data = await res.json();
      if (res.ok) {
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    fetchStaff();
    fetchAuditLogs();
  }, []);

  async function handleRemoveStaff(staffId) {
    if (!confirm("Are you sure you want to remove this staff member? Their access will be revoked immediately.")) return;

    try {
      const res = await fetch(`/api/owner/staff/${staffId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to remove staff member.", { type: "error" });
        return;
      }
      showToast("Staff member removed.", { type: "success" });
      fetchStaff();
      fetchAuditLogs();
    } catch (err) {
      console.error(err);
      showToast("Network error removing staff.", { type: "error" });
    }
  }

  async function handleRevokeOrReactivate(staffId, newStatus) {
    try {
      const res = await fetch(`/api/owner/staff/${staffId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to update staff status.", { type: "error" });
        return;
      }
      showToast(`Staff member ${newStatus === "revoked" ? "access revoked" : "reactivated"}.`, { type: "success" });
      fetchStaff();
      fetchAuditLogs();
    } catch (err) {
      console.error(err);
      showToast("Network error.", { type: "error" });
    }
  }

  const activeCount = staffList.filter((s) => s.status === "active").length;
  const pendingCount = staffList.filter((s) => s.status === "invited").length;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: V.chalk, margin: 0 }}>Venue Staff & Access Control</h2>
          <p style={{ color: V.chalkDim, fontSize: 13.5, margin: "4px 0 0" }}>
            Invite receptionists and venue managers with granular role-based permissions. Sensitive settings, payment credentials, and payouts are kept strictly isolated.
          </p>
        </div>
        <Btn variant="primary" icon="plus" onClick={() => setShowInviteModal(true)}>
          Invite Staff Member
        </Btn>
      </div>

      {/* Stats */}
      <StatGrid>
        <StatCard label="Active Staff Members" value={activeCount} icon="users" color={V.flood} />
        <StatCard label="Pending Invitations" value={pendingCount} icon="clock" color={V.pending} />
        <StatCard label="Staff Actions Logged" value={auditLogs.length} icon="shield" color={V.aqua || V.flood} />
      </StatGrid>

      {/* Security notice */}
      <div
        style={{
          background: "rgba(16, 185, 129, 0.08)",
          border: `1px solid ${V.flood}44`,
          borderRadius: 12,
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 13,
          color: V.chalk,
        }}
      >
        <div style={{ fontSize: 20 }}>🔒</div>
        <div style={{ lineHeight: 1.5 }}>
          <strong>Controlled Security Architecture:</strong> Staff members never share owner credentials and log in with their own accounts. Supabase Row-Level Security policies and server guards prevent staff from accessing another owner's venue, payout records, banking info, or sensitive account settings.
        </div>
      </div>

      {/* View Tabs */}
      <Card>
        <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${V.line}`, paddingBottom: 14 }}>
          <button
            type="button"
            onClick={() => setActiveTab("members")}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: activeTab === "members" ? 700 : 500,
              background: activeTab === "members" ? V.floodDim : "transparent",
              color: activeTab === "members" ? V.flood : V.chalkDim,
              border: `1px solid ${activeTab === "members" ? V.flood : "transparent"}`,
              cursor: "pointer",
              fontFamily: font,
            }}
          >
            Staff Directory ({staffList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: activeTab === "audit" ? 700 : 500,
              background: activeTab === "audit" ? V.floodDim : "transparent",
              color: activeTab === "audit" ? V.flood : V.chalkDim,
              border: `1px solid ${activeTab === "audit" ? V.flood : "transparent"}`,
              cursor: "pointer",
              fontFamily: font,
            }}
          >
            Staff Audit Log ({auditLogs.length})
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          {activeTab === "members" ? (
            loading ? (
              <div style={{ padding: "32px 0", textAlign: "center", color: V.chalkDim }}>Loading staff members…</div>
            ) : staffList.length === 0 ? (
              <EmptyBlock
                emoji="👥"
                title="No staff members yet"
                subtitle="Invite receptionists to check in arriving players, or venue managers to coordinate schedules."
                action={
                  <Btn variant="primary" size="sm" onClick={() => setShowInviteModal(true)}>
                    Invite your first staff member
                  </Btn>
                }
              />
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {staffList.map((member) => {
                  const roleObj = STAFF_ROLES.find((r) => r.id === member.role);
                  const roleLabel = roleObj?.label || member.role;

                  return (
                    <div
                      key={member.id}
                      style={{
                        background: "rgba(255, 255, 255, 0.02)",
                        border: `1px solid ${V.line}`,
                        borderRadius: 12,
                        padding: "16px 18px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: 14,
                      }}
                    >
                      <div style={{ display: "grid", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: V.chalk }}>
                            {member.full_name || member.email}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              padding: "2px 8px",
                              borderRadius: 6,
                              background: V.floodDim,
                              color: V.flood,
                              textTransform: "uppercase",
                            }}
                          >
                            {roleLabel}
                          </span>
                          <StatusPill status={STATUS_TONES[member.status] || "info"} label={member.status.toUpperCase()} />
                        </div>

                        <div style={{ fontSize: 13, color: V.chalkDim }}>
                          {member.email} · {member.turf?.name ? `Assigned to: ${member.turf.name}` : "All Venues"}
                        </div>

                        {/* Permissions pills */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                          {(member.permissions || []).map((permId) => {
                            const pObj = ALL_STAFF_PERMISSIONS.find((p) => p.id === permId);
                            return (
                              <span
                                key={permId}
                                style={{
                                  fontSize: 11,
                                  background: "rgba(255,255,255,0.05)",
                                  padding: "2px 7px",
                                  borderRadius: 5,
                                  color: V.chalkDim,
                                  border: `1px solid ${V.line}`,
                                }}
                              >
                                ✓ {pObj?.label || permId}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Btn size="sm" onClick={() => setEditingStaff(member)}>
                          Edit Permissions
                        </Btn>

                        {member.status === "invited" && (
                          <Btn
                            size="sm"
                            onClick={() => {
                              const link = `${window.location.origin}/auth/setup-password?token=${member.invite_token}&type=staff`;
                              navigator.clipboard.writeText(link);
                              showToast("Invite link copied to clipboard!", { type: "success" });
                            }}
                          >
                            Copy Invite Link
                          </Btn>
                        )}

                        {member.status === "active" && (
                          <Btn
                            variant="danger"
                            size="sm"
                            onClick={() => handleRevokeOrReactivate(member.id, "revoked")}
                          >
                            Revoke Access
                          </Btn>
                        )}

                        {member.status === "revoked" && (
                          <Btn
                            size="sm"
                            onClick={() => handleRevokeOrReactivate(member.id, "active")}
                          >
                            Reactivate
                          </Btn>
                        )}

                        <Btn
                          variant="danger"
                          size="sm"
                          onClick={() => handleRemoveStaff(member.id)}
                        >
                          Remove
                        </Btn>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Audit Log View */
            auditLogs.length === 0 ? (
              <EmptyBlock emoji="📜" title="No staff actions recorded yet" subtitle="Player check-ins, maintenance updates, and permission changes will be audited here." />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: `1px solid ${V.line}`,
                      borderRadius: 10,
                      padding: "12px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      fontSize: 13,
                    }}
                  >
                    <div>
                      <div style={{ color: V.chalk, fontWeight: 600 }}>
                        <span style={{ color: V.flood }}>{log.actor?.full_name || log.actor?.email || "Staff"}</span>{" "}
                        performed <strong style={{ color: V.aqua || V.flood }}>{log.action.replace(/_/g, " ")}</strong>
                        {log.turf?.name ? ` on ${log.turf.name}` : ""}
                      </div>
                      {log.details && (
                        <div style={{ fontSize: 11.5, color: V.chalkDim, marginTop: 2 }}>
                          {JSON.stringify(log.details)}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: V.chalkFaint, whiteSpace: "nowrap" }}>
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </Card>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteStaffModal
          turfs={turfs}
          onClose={() => setShowInviteModal(false)}
          onSuccess={(result) => {
            setShowInviteModal(false);
            setInviteResult(result);
            fetchStaff();
            fetchAuditLogs();
          }}
          showToast={showToast}
        />
      )}

      {/* Edit Permissions Modal */}
      {editingStaff && (
        <EditPermissionsModal
          staff={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSuccess={() => {
            setEditingStaff(null);
            fetchStaff();
            fetchAuditLogs();
          }}
          showToast={showToast}
        />
      )}

      {/* Invite Success Dialog with Link */}
      {inviteResult && (
        <Modal
          title="Staff Member Invited"
          subtitle={`Invitation created for ${inviteResult.staff?.email}`}
          onClose={() => setInviteResult(null)}
          maxWidth={480}
          footer={<Btn variant="primary" onClick={() => setInviteResult(null)}>Done</Btn>}
        >
          <div style={{ display: "grid", gap: 14 }}>
            <p style={{ fontSize: 13.5, color: V.chalkDim, margin: 0 }}>
              An invitation has been generated. The staff member can activate their account using their personal credentials.
            </p>
            {inviteResult.inviteLink && (
              <div style={{ display: "grid", gap: 6 }}>
                <span style={labelStyle}>Direct Activation Link</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}${inviteResult.inviteLink}`}
                    style={{ ...inputStyle, fontSize: 12, flex: 1 }}
                  />
                  <Btn
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}${inviteResult.inviteLink}`);
                      showToast("Activation link copied!", { type: "success" });
                    }}
                  >
                    Copy
                  </Btn>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function InviteStaffModal({ turfs = [], onClose, onSuccess, showToast }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [turfId, setTurfId] = useState(turfs[0]?.id || "");
  const [role, setRole] = useState("receptionist");
  const [permissions, setPermissions] = useState(ROLE_DEFAULT_PERMISSIONS.receptionist);
  const [submitting, setSubmitting] = useState(false);

  function handleRoleChange(newRole) {
    setRole(newRole);
    setPermissions(ROLE_DEFAULT_PERMISSIONS[newRole] || []);
  }

  function togglePermission(permId) {
    setPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  }

  async function handleSubmit() {
    if (!email.trim()) {
      showToast("Email address is required.", { type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/owner/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          full_name: fullName.trim(),
          role,
          permissions,
          turf_id: turfId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to invite staff member.", { type: "error" });
        setSubmitting(false);
        return;
      }

      showToast("Staff invitation sent successfully.", { type: "success" });
      onSuccess(data);
    } catch (err) {
      console.error(err);
      showToast("Network error inviting staff.", { type: "error" });
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Invite Staff Member"
      subtitle="Grant granular venue operational permissions"
      onClose={onClose}
      maxWidth={520}
      footer={
        <>
          <Btn onClick={onClose} disabled={submitting}>Cancel</Btn>
          <Btn variant="primary" busy={submitting} onClick={handleSubmit}>
            Send Invitation
          </Btn>
        </>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        <label>
          <span style={labelStyle}>Staff Email Address *</span>
          <input
            type="email"
            placeholder="colleague@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label>
          <span style={labelStyle}>Full Name</span>
          <input
            type="text"
            placeholder="Staff member full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={inputStyle}
          />
        </label>

        {turfs.length > 1 && (
          <label>
            <span style={labelStyle}>Venue Assignment</span>
            <select
              value={turfId}
              onChange={(e) => setTurfId(e.target.value)}
              style={inputStyle}
            >
              <option value="">All Owner's Venues</option>
              {turfs.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
        )}

        <label>
          <span style={labelStyle}>Staff Role Preset</span>
          <select
            value={role}
            onChange={(e) => handleRoleChange(e.target.value)}
            style={inputStyle}
          >
            {STAFF_ROLES.map((r) => (
              <option key={r.id} value={r.id}>{r.label} — {r.description}</option>
            ))}
          </select>
        </label>

        <div>
          <span style={labelStyle}>Granular Permissions</span>
          <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
            {ALL_STAFF_PERMISSIONS.map((perm) => {
              const checked = permissions.includes(perm.id);
              return (
                <label
                  key={perm.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: checked ? V.floodDim : "rgba(255,255,255,0.02)",
                    border: `1px solid ${checked ? V.flood + "55" : V.line}`,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePermission(perm.id)}
                    style={{ marginTop: 2 }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: V.chalk }}>{perm.label}</div>
                    <div style={{ fontSize: 11.5, color: V.chalkDim }}>{perm.description}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function EditPermissionsModal({ staff, onClose, onSuccess, showToast }) {
  const [role, setRole] = useState(staff.role || "receptionist");
  const [permissions, setPermissions] = useState(staff.permissions || []);
  const [submitting, setSubmitting] = useState(false);

  function togglePermission(permId) {
    setPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  }

  async function handleSave() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/owner/staff/${staff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, permissions }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to update permissions.", { type: "error" });
        setSubmitting(false);
        return;
      }

      showToast("Staff permissions updated.", { type: "success" });
      onSuccess();
    } catch (err) {
      console.error(err);
      showToast("Network error.", { type: "error" });
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Edit Staff Permissions"
      subtitle={`${staff.full_name || staff.email}`}
      onClose={onClose}
      maxWidth={500}
      footer={
        <>
          <Btn onClick={onClose} disabled={submitting}>Cancel</Btn>
          <Btn variant="primary" busy={submitting} onClick={handleSave}>
            Save Changes
          </Btn>
        </>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        <label>
          <span style={labelStyle}>Staff Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={inputStyle}
          >
            {STAFF_ROLES.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </label>

        <div>
          <span style={labelStyle}>Granular Permissions</span>
          <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
            {ALL_STAFF_PERMISSIONS.map((perm) => {
              const checked = permissions.includes(perm.id);
              return (
                <label
                  key={perm.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: checked ? V.floodDim : "rgba(255,255,255,0.02)",
                    border: `1px solid ${checked ? V.flood + "55" : V.line}`,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePermission(perm.id)}
                    style={{ marginTop: 2 }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: V.chalk }}>{perm.label}</div>
                    <div style={{ fontSize: 11.5, color: V.chalkDim }}>{perm.description}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}

