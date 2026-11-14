// lib/turf/pricing.js
// Advanced pricing engine for Velocity Turf.
// Handles time bands, weekend/weekday rates, custom dates, holiday overrides, and demand insights.

export const DEFAULT_TIME_BANDS = [
  { id: "morning", label: "Morning", startTime: "06:00", endTime: "12:00", defaultModifier: 0.9 },
  { id: "afternoon", label: "Afternoon", startTime: "12:00", endTime: "16:00", defaultModifier: 0.85 },
  { id: "evening", label: "Evening Peak", startTime: "16:00", endTime: "21:00", defaultModifier: 1.25 },
  { id: "night", label: "Night", startTime: "21:00", endTime: "06:00", defaultModifier: 1.1 },
];

/**
 * Checks whether a given HH:mm time falls within [startTime, endTime).
 * Handles overnight wraps (e.g., 21:00 - 06:00).
 */
export function isTimeInBand(time, startTime, endTime) {
  const norm = (t) => {
    const parts = String(t || "").slice(0, 5).split(":");
    return parseInt(parts[0] || 0, 10) * 60 + parseInt(parts[1] || 0, 10);
  };

  const tMin = norm(time);
  const sMin = norm(startTime);
  const eMin = norm(endTime);

  if (sMin <= eMin) {
    return tMin >= sMin && tMin < eMin;
  }
  // Crosses midnight (e.g., 21:00 to 06:00)
  return tMin >= sMin || tMin < eMin;
}

/**
 * Calculate the authoritative price for a given turf slot.
 * Follows a strict precedence order:
 *  1. Custom slot override (date + time)
 *  2. Custom date / holiday override
 *  3. Time band pricing (Morning, Afternoon, Evening, Night)
 *  4. Weekend price (Sat / Sun)
 *  5. Weekday price (Mon - Fri)
 *  6. Occupancy surge (> 70% occupied -> peak_price)
 *  7. Base hourly price fallback
 *  8. Active promotional discount application
 */
export function calculateSlotPrice(turf = {}, dateStr, timeStr, occupancy = 0) {
  const basePrice = Math.max(0, Number(turf.base_price) || 0);
  const peakPrice = Math.max(basePrice, Number(turf.peak_price) || basePrice);
  const rules = turf.pricing_rules || {};

  const cleanTime = String(timeStr || "00:00").slice(0, 5);
  const [y, m, d] = String(dateStr || "").split("-").map(Number);
  const dateObj = y && m && d ? new Date(y, m - 1, d) : new Date();
  const dayOfWeek = dateObj.getDay(); // 0 is Sunday, 6 is Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  let calculatedPrice = basePrice;
  let ruleApplied = "Base Price";
  let isPeak = false;
  let appliedBand = null;

  // 1. Exact Custom Slot Override (Highest precedence)
  const slotKey = `${dateStr}_${cleanTime}`;
  if (rules.customSlots && rules.customSlots[slotKey] !== undefined) {
    const customSlotPrice = Number(rules.customSlots[slotKey]);
    if (!isNaN(customSlotPrice) && customSlotPrice >= 0) {
      calculatedPrice = customSlotPrice;
      ruleApplied = `Custom Slot Override (${cleanTime})`;
      isPeak = calculatedPrice > basePrice;
    }
  }
  // 2. Custom Date / Holiday Override
  else if (Array.isArray(rules.customDates)) {
    const holiday = rules.customDates.find((cd) => cd.date === dateStr);
    if (holiday && Number(holiday.price) >= 0) {
      calculatedPrice = Number(holiday.price);
      ruleApplied = `Holiday / Special Date (${holiday.label || dateStr})`;
      isPeak = calculatedPrice > basePrice;
    }
  }

  // If no date/slot override applied, evaluate time-bands and day-of-week rules:
  if (ruleApplied === "Base Price") {
    // 3. Time Bands (Morning, Afternoon, Evening, Night)
    if (Array.isArray(rules.timeBands) && rules.timeBands.length > 0) {
      const matchingBand = rules.timeBands.find((b) =>
        isTimeInBand(cleanTime, b.startTime, b.endTime) && Number(b.price) >= 0
      );
      if (matchingBand) {
        calculatedPrice = Number(matchingBand.price);
        ruleApplied = matchingBand.label || "Time Band Price";
        appliedBand = matchingBand.label;
        isPeak = matchingBand.id === "evening" || calculatedPrice > basePrice;
      }
    }

    // 4. Weekend pricing override (if not overridden by time-band with higher priority)
    if (ruleApplied === "Base Price" && isWeekend && Number(rules.weekendPrice) > 0) {
      calculatedPrice = Number(rules.weekendPrice);
      ruleApplied = "Weekend Rate";
      isPeak = true;
    }

    // 5. Weekday pricing override
    if (ruleApplied === "Base Price" && !isWeekend && Number(rules.weekdayPrice) > 0) {
      calculatedPrice = Number(rules.weekdayPrice);
      ruleApplied = "Weekday Standard";
    }

    // 6. Dynamic Occupancy Peak (> 70% occupancy)
    if (ruleApplied === "Base Price" && occupancy > 70 && peakPrice > basePrice) {
      calculatedPrice = peakPrice;
      ruleApplied = "High Demand Surge (70%+ Occupancy)";
      isPeak = true;
    }
  }

  // 8. Promotional Discounts (applied on top of the calculated price)
  let discountAmount = 0;
  let activeDiscountLabel = null;

  if (Array.isArray(rules.discountRules)) {
    const matchedDiscount = rules.discountRules.find(
      (r) =>
        r.active &&
        (!r.startTime || !r.endTime || isTimeInBand(cleanTime, r.startTime, r.endTime))
    );

    if (matchedDiscount) {
      if (matchedDiscount.discountPercent && matchedDiscount.discountPercent > 0) {
        const pct = Math.min(100, Math.max(0, Number(matchedDiscount.discountPercent)));
        discountAmount = Math.round((calculatedPrice * pct) / 100);
        activeDiscountLabel = `${matchedDiscount.label || "Special Promo"} (-${pct}%)`;
      } else if (matchedDiscount.fixedDiscount && matchedDiscount.fixedDiscount > 0) {
        discountAmount = Math.min(calculatedPrice, Number(matchedDiscount.fixedDiscount));
        activeDiscountLabel = `${matchedDiscount.label || "Special Promo"} (-₹${discountAmount})`;
      }
    }
  }

  const finalPrice = Math.max(0, calculatedPrice - discountAmount);

  return {
    price: finalPrice,
    originalPrice: calculatedPrice,
    discountAmount,
    discountLabel: activeDiscountLabel,
    ruleApplied,
    isPeak,
    appliedBand,
    isWeekend,
  };
}

/**
 * Validates a pricing configuration object before saving to database.
 */
export function validatePricingRules(rules = {}, basePrice = 0) {
  const errors = [];
  const parsed = {
    basePrice: Math.max(0, Number(rules.basePrice ?? basePrice)),
    peakPrice: Math.max(0, Number(rules.peakPrice ?? basePrice)),
    timeBands: [],
    weekendPrice: rules.weekendPrice !== "" && rules.weekendPrice != null ? Math.max(0, Number(rules.weekendPrice)) : null,
    weekdayPrice: rules.weekdayPrice !== "" && rules.weekdayPrice != null ? Math.max(0, Number(rules.weekdayPrice)) : null,
    customDates: [],
    customSlots: {},
    discountRules: [],
  };

  if (parsed.peakPrice < parsed.basePrice) {
    errors.push("Peak price cannot be lower than the base price.");
  }

  if (Array.isArray(rules.timeBands)) {
    for (const band of rules.timeBands) {
      const p = Number(band.price);
      if (isNaN(p) || p < 0) {
        errors.push(`Price for ${band.label || "time band"} must be a positive number.`);
      }
      parsed.timeBands.push({
        id: band.id || "custom",
        label: band.label || "Band",
        startTime: String(band.startTime || "06:00").slice(0, 5),
        endTime: String(band.endTime || "22:00").slice(0, 5),
        price: Math.max(0, p || 0),
      });
    }
  }

  if (Array.isArray(rules.customDates)) {
    for (const cd of rules.customDates) {
      if (!cd.date || !/^\d{4}-\d{2}-\d{2}$/.test(cd.date)) {
        errors.push("Invalid date format in custom dates. Use YYYY-MM-DD.");
      }
      const p = Number(cd.price);
      if (isNaN(p) || p < 0) {
        errors.push(`Price for custom date ${cd.date} must be a positive number.`);
      }
      parsed.customDates.push({
        date: cd.date,
        label: cd.label || "Special Date",
        price: Math.max(0, p || 0),
      });
    }
  }

  if (rules.customSlots && typeof rules.customSlots === "object") {
    for (const [key, val] of Object.entries(rules.customSlots)) {
      const p = Number(val);
      if (!isNaN(p) && p >= 0) {
        parsed.customSlots[key] = p;
      }
    }
  }

  if (Array.isArray(rules.discountRules)) {
    for (const dr of rules.discountRules) {
      parsed.discountRules.push({
        id: dr.id || `promo_${Date.now()}`,
        label: dr.label || "Promotional Discount",
        discountPercent: Number(dr.discountPercent) || 0,
        fixedDiscount: Number(dr.fixedDiscount) || 0,
        startTime: dr.startTime ? String(dr.startTime).slice(0, 5) : null,
        endTime: dr.endTime ? String(dr.endTime).slice(0, 5) : null,
        active: Boolean(dr.active),
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    rules: parsed,
  };
}

/**
 * Generate smart business recommendations and demand insights from historical bookings.
 */
export function generateDemandInsights(bookings = [], turf = {}) {
  const confirmed = bookings.filter((b) => ["confirmed", "completed"].includes(b.status));
  const total = confirmed.length;

  if (total === 0) {
    return {
      peakHours: "6:00 PM – 9:00 PM",
      slowHours: "12:00 PM – 4:00 PM",
      weekendRatio: "50%",
      recommendations: [
        {
          type: "peak_pricing",
          title: "Prime Time Evening Pricing",
          description: "Evening slots (6 PM – 9 PM) are historically in highest demand. Consider setting a 15–25% higher rate for prime evening games.",
          actionText: "Configure Evening Peak",
          targetBand: "evening",
        },
        {
          type: "discount",
          title: "Afternoon Happy Hour Promo",
          description: "Afternoon slots (12 PM – 4 PM) usually experience lower footfall. Offer a 15% discount to attract students and casual players.",
          actionText: "Enable Afternoon Promo",
          targetBand: "afternoon",
        },
      ],
    };
  }

  // Hour counts
  const hourCounts = {};
  let weekendCount = 0;
  for (const b of confirmed) {
    const hr = parseInt(String(b.start_time || "").slice(0, 2), 10);
    if (!isNaN(hr)) {
      hourCounts[hr] = (hourCounts[hr] || 0) + 1;
    }
    const [y, m, d] = String(b.booking_date || "").split("-").map(Number);
    if (y && m && d) {
      const day = new Date(y, m - 1, d).getDay();
      if (day === 0 || day === 6) weekendCount += 1;
    }
  }

  // Find top 3 hours and bottom 3 daylight hours (between 6 and 22)
  const hoursSorted = Object.entries(hourCounts)
    .map(([h, c]) => ({ hour: Number(h), count: c }))
    .sort((a, b) => b.count - a.count);

  const topHour = hoursSorted[0]?.hour ?? 19;
  const weekendPct = Math.round((weekendCount / total) * 100);

  const recommendations = [];

  // Insight 1: Evening peak
  recommendations.push({
    type: "peak_pricing",
    title: `Strong Demand around ${topHour > 12 ? `${topHour - 12} PM` : `${topHour} AM`}`,
    description: `Bookings concentrate heavily between ${topHour > 12 ? `${topHour - 12} PM` : `${topHour} AM`} and ${((topHour + 3) % 12) || 12} PM. Adding a targeted peak rate can increase weekly revenue by 10–20%.`,
    actionText: "Set Evening Peak Rate",
    targetBand: "evening",
  });

  // Insight 2: Weekend premium
  if (weekendPct >= 45) {
    recommendations.push({
      type: "weekend_pricing",
      title: "Weekend Demand Surge",
      description: `${weekendPct}% of your bookings happen on Saturdays and Sundays. Setting a dedicated weekend rate maximizes yield during high demand.`,
      actionText: "Set Weekend Rate",
      targetField: "weekendPrice",
    });
  }

  // Insight 3: Low demand fill
  recommendations.push({
    type: "discount",
    title: "Off-Peak Midday Fill",
    description: "Afternoon slots (12 PM – 4 PM) average low occupancy. An 'Early Bird' or 'Afternoon Saver' 10–15% discount helps fill open turf capacity.",
    actionText: "Configure Off-Peak Promo",
    targetBand: "afternoon",
  });

  return {
    peakHours: `${topHour > 12 ? `${topHour - 12}:00 PM` : `${topHour}:00 AM`} – ${((topHour + 3) % 12) || 12}:00 PM`,
    slowHours: "12:00 PM – 4:00 PM",
    weekendRatio: `${weekendPct}%`,
    recommendations,
  };
}
