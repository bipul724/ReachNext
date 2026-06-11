import { SegmentRule } from "../types";

export interface LocalParsedResult {
  segmentName: string;
  description: string;
  rules: {
    and: SegmentRule[];
  };
  explainAudience: string;
  
  channel: "email" | "sms";
  offer: string;
  timing: string;
  explainChannel: string;
  explainOffer: string;
  explainTiming: string;
  
  subject: string;
  body: string;
  explainContent: string;
}

export function localParseGoal(goal: string): LocalParsedResult {
  const cleanGoal = goal.trim();
  const rules: any[] = [];
  const explanations: string[] = [];
  
  let segmentName = "Custom Segment";
  let description = "Locally parsed customer segment";
  
  // 1. Parse City
  const cities = ["Delhi", "Mumbai", "Pune", "Bangalore", "Bengaluru", "Kolkata", "Chennai", "Hyderabad"];
  let matchedCity = "";
  for (const city of cities) {
    const regex = new RegExp(`\\b${city}\\b`, "i");
    if (regex.test(cleanGoal)) {
      matchedCity = city;
      break;
    }
  }
  
  if (matchedCity) {
    rules.push({ field: "city", op: "eq", value: matchedCity });
    explanations.push(`living in ${matchedCity}`);
  }

  // 2. Parse Dormancy / Inactivity
  const daysRegex = /(?:inactive|no orders|last ordered|haven't ordered)?\s*(?:for|in|since)?\s*(\d+)\s*days?/i;
  const monthRegex = /(\d+)\s*months?/i;
  let dormancyDays = 0;
  
  const daysMatch = cleanGoal.match(daysRegex);
  if (daysMatch) {
    dormancyDays = parseInt(daysMatch[1], 10);
  } else {
    const monthMatch = cleanGoal.match(monthRegex);
    if (monthMatch) {
      dormancyDays = parseInt(monthMatch[1], 10) * 30;
    }
  }

  if (dormancyDays > 0) {
    rules.push({ field: "daysSinceLastOrder", op: "gt", value: dormancyDays });
    explanations.push(`who haven't placed an order in the last ${dormancyDays} days`);
  }

  // 3. Parse Spend / Lifetime Value
  const spendRegex = /(?:spent|spend|value|ltv)\s*(?:more than|greater than|above|>|>=)?\s*(?:₹|Rs\.?|\$)?\s*(\d+)/i;
  let spendAmount = 0;
  const spendMatch = cleanGoal.match(spendRegex);
  if (spendMatch) {
    spendAmount = parseInt(spendMatch[1], 10);
    rules.push({ field: "totalSpent", op: "gt", value: spendAmount });
    explanations.push(`with a total lifetime spend of more than ₹${spendAmount}`);
  }

  // 4. Parse Order Counts
  const ordersRegex = /(?:more than|>|>=)?\s*(\d+)\s*(?:orders|purchases|bills)/i;
  let orderCount = 0;
  const ordersMatch = cleanGoal.match(ordersRegex);
  if (ordersMatch) {
    orderCount = parseInt(ordersMatch[1], 10);
    rules.push({ field: "totalOrders", op: "gt", value: orderCount });
    explanations.push(`who have placed more than ${orderCount} orders`);
  } else if (/VIP/i.test(cleanGoal)) {
    if (spendAmount === 0) {
      rules.push({ field: "totalSpent", op: "gt", value: 3000 });
      explanations.push("with total lifetime spend above ₹3,000");
    }
    if (orderCount === 0) {
      rules.push({ field: "totalOrders", op: "gte", value: 3 });
      explanations.push("who have placed at least 3 orders");
    }
  }

  // Formulate Segment Details
  if (rules.length === 0) {
    rules.push({ field: "totalOrders", op: "gte", value: 1 });
    explanations.push("who have made at least one order");
    segmentName = "Active Customers (Local Mock)";
    description = "Active customers targeted by default";
  } else {
    const segmentNames = [];
    if (matchedCity) segmentNames.push(matchedCity);
    if (dormancyDays) segmentNames.push("Dormant");
    if (spendAmount || /VIP/i.test(cleanGoal)) segmentNames.push("High-Value");
    segmentNames.push("Audience");
    segmentName = `${segmentNames.join(" ")} (Local Mock)`;
    description = `Targeting customers ${explanations.join(" and ")}.`;
  }

  const explainAudience = `Filtered the database for customers ${explanations.join(", and ")} based on your goal "${cleanGoal}".`;

  // 5. Strategy Recommendation
  let channel: "email" | "sms" = "email";
  if (/\bsms\b/i.test(cleanGoal) || /\btext\b/i.test(cleanGoal)) {
    channel = "sms";
  } else if (/\bemail\b/i.test(cleanGoal) || /\bmail\b/i.test(cleanGoal)) {
    channel = "email";
  } else if (dormancyDays >= 60) {
    channel = "sms";
  }

  let offer = "None";
  if (dormancyDays > 0) {
    offer = dormancyDays >= 60 ? "20% off on next order" : "15% off coupon";
  } else if (/VIP/i.test(cleanGoal) || spendAmount > 5000) {
    offer = "Complimentary Coffee Voucher";
  } else if (/discount|offer|deal/i.test(cleanGoal)) {
    offer = "10% off coupon";
  }

  const timing = dormancyDays >= 60 ? "Send immediately" : "Send during afternoon peak (1 PM - 3 PM)";
  
  const explainChannel = channel === "sms" 
    ? "SMS has a 98% open rate, which is ideal for re-engaging highly dormant customers."
    : "Email is selected to provide a detailed, premium visual update of our latest menu.";
    
  const explainOffer = offer !== "None"
    ? `An incentive of ${offer} is offered to encourage checkout conversion.`
    : "No financial discount is needed for this active engagement segment.";
    
  const explainTiming = "Sent during high-conversion windows matching peak customer activity.";

  // 6. Content Copywriting
  let subject = "";
  let body = "";
  const numMatch = offer.match(/\d+/);
  const offerCoupon = numMatch ? `CRM${numMatch[0]}` : "CRMLOVE";

  if (channel === "email") {
    if (dormancyDays >= 30) {
      subject = `We miss you at CRM! ❤️`;
      body = `Hey [Name], we've missed seeing you around! Your favorite products are waiting for you. Come back this week and enjoy ${offer} on us. Just use coupon code ${offerCoupon} at checkout. See you soon!`;
    } else if (/VIP/i.test(cleanGoal) || spendAmount > 5000) {
      subject = `A special thanks from CRM 🌟`;
      body = `Hey [Name], you're one of our most valued customers! As a token of our appreciation, here is a ${offer} for your next visit. We can't wait to serve you again soon!`;
    } else {
      subject = `Fresh news from CRM ☕`;
      body = `Hey [Name], we've got some delicious new products in stock! Drop by or order online today to try them out. Thank you for being a part of our family!`;
    }
  } else {
    if (dormancyDays >= 30) {
      body = `Hey [Name], we miss you! Enjoy ${offer} on your next order at CRM. Use code ${offerCoupon}. Order now: crm.co`;
    } else if (/VIP/i.test(cleanGoal) || spendAmount > 5000) {
      body = `Hey [Name], thanks for being a VIP at CRM! Enjoy your ${offer} on us. Code: ${offerCoupon}. crm.co`;
    } else {
      body = `Hey [Name], fresh products are waiting for you at CRM! Try our new seasonal items today. crm.co`;
    }
  }

  const explainContent = `Crafted a personalized message using customer attributes (Name, City) with a clear call-to-action and coupon code for the ${offer} offer.`;

  return {
    segmentName,
    description,
    rules: { and: rules },
    explainAudience,
    channel,
    offer,
    timing,
    explainChannel,
    explainOffer,
    explainTiming,
    subject,
    body,
    explainContent
  };
}
