// test/demo-data.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  DEMO_DOMAIN,
  DEMO_TAG,
  DEMO_OWNERS,
  DEMO_PLAYERS,
  DEMO_TURFS,
  DEMO_TEAMS,
  DEMO_COMMUNITY_MATCHES,
  DEMO_TOURNAMENTS,
  isDemoEmail,
  isDemoRecord,
  formatDemoName,
} from "../lib/demo-data/dataset.js";

test("Demo Dataset integrity: domain and tag standards", () => {
  assert.equal(DEMO_DOMAIN, "demo.velocityturf.internal");
  assert.equal(DEMO_TAG, "[DEMO]");

  for (const owner of DEMO_OWNERS) {
    assert.ok(isDemoEmail(owner.email), `Owner email ${owner.email} must match demo domain`);
    assert.ok(owner.full_name.includes(DEMO_TAG), `Owner ${owner.full_name} must include [DEMO] tag`);
    assert.ok(owner.phone.startsWith("+91"), `Owner phone ${owner.phone} must be Indian format`);
  }

  for (const player of DEMO_PLAYERS) {
    assert.ok(isDemoEmail(player.email), `Player email ${player.email} must match demo domain`);
    assert.ok(player.full_name.includes(DEMO_TAG), `Player ${player.full_name} must include [DEMO] tag`);
  }
});

test("Real data protection: isDemoEmail and isDemoRecord isolate production data", () => {
  // Real emails must NEVER be treated as demo
  assert.equal(isDemoEmail("syed.ae018@gmail.com"), false);
  assert.equal(isDemoEmail("tarannum122275@gmail.com"), false);
  assert.equal(isDemoEmail("owner@bangalorevenues.in"), false);
  assert.equal(isDemoEmail(null), false);
  assert.equal(isDemoEmail(undefined), false);

  // Demo emails must return true
  assert.equal(isDemoEmail("demo.player.rahul@demo.velocityturf.internal"), true);
  assert.equal(isDemoEmail("demo.owner.vikram@demo.velocityturf.internal"), true);

  // Real records without [DEMO] tag must NOT be flagged
  const realTurf = { id: "123", name: "FaMous Turf", owner_id: "u1" };
  const realBooking = { id: "b1", note: "Standard online booking", turf_id: "t1" };
  const realDispute = { id: "d1", ticket_number: "VT-9923AF", issue: "Lights issue" };
  const realPayout = { id: "p1", payout_number: "PO-202610-001", amount: 15000 };

  assert.equal(isDemoRecord(realTurf), false);
  assert.equal(isDemoRecord(realBooking), false);
  assert.equal(isDemoRecord(realDispute), false);
  assert.equal(isDemoRecord(realPayout), false);

  // Demo records must be flagged
  const demoTurf = { id: "124", name: "Dribble Arena HSR Layout [DEMO]" };
  const demoBooking = { id: "b2", note: "[DEMO] Weekend match" };
  const demoDispute = { id: "d2", ticket_number: "DEMO-VT-JP9901" };
  const demoPayout = { id: "p2", payout_number: "DEMO-PO-202610-001" };

  assert.equal(isDemoRecord(demoTurf), true);
  assert.equal(isDemoRecord(demoBooking), true);
  assert.equal(isDemoRecord(demoDispute), true);
  assert.equal(isDemoRecord(demoPayout), true);
});

test("Bengaluru Turfs data: realistic pricing, sports, amenities and locations", () => {
  assert.ok(DEMO_TURFS.length >= 12, "Should provide at least 12 realistic venues across Bengaluru");

  const validSports = new Set(["Football", "Cricket", "Badminton", "Basketball", "Swimming", "Tennis", "Volleyball", "Hockey", "Pickleball", "Table Tennis", "Squash"]);

  for (const turf of DEMO_TURFS) {
    assert.equal(turf.city, "Bengaluru");
    assert.ok(turf.address.length > 15, `Address for ${turf.name} must be realistic`);
    assert.ok(turf.base_price >= 500 && turf.base_price <= 5000, "Base price in ₹ should be realistic");
    assert.ok(turf.peak_price >= turf.base_price, "Peak price should be >= base price");
    assert.ok(turf.image.startsWith("https://"), "Image must be secure HTTPS URL");
    assert.ok(turf.amenities.includes("Demo"), "Amenities should include Demo marker");

    for (const sport of turf.sports) {
      assert.ok(validSports.has(sport), `Sport ${sport} must be an application supported sport`);
    }
  }
});

test("Format demo name utility cleanly extracts names and badges", () => {
  const result1 = formatDemoName("Dribble Arena HSR Layout [DEMO]");
  assert.equal(result1.clean, "Dribble Arena HSR Layout");
  assert.equal(result1.isDemo, true);

  const result2 = formatDemoName("[DEMO] Vikram Malhotra");
  assert.equal(result2.clean, "Vikram Malhotra");
  assert.equal(result2.isDemo, true);

  const result3 = formatDemoName("Standard Real Turf");
  assert.equal(result3.clean, "Standard Real Turf");
  assert.equal(result3.isDemo, false);
});
