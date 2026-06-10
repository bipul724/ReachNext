import { prisma } from "../lib/prisma";


// ─── Brew & Co. Product Catalog ───
const PRODUCTS = [
  { name: "Ethiopian Yirgacheffe Beans", price: 850, category: "beans" },
  { name: "Colombian Supremo Beans", price: 750, category: "beans" },
  { name: "Sumatra Mandheling Beans", price: 900, category: "beans" },
  { name: "Brazilian Santos Beans", price: 650, category: "beans" },
  { name: "Kenya AA Beans", price: 950, category: "beans" },
  { name: "Classic Cold Brew Pack (6)", price: 540, category: "cold-brew" },
  { name: "Vanilla Cold Brew Pack (6)", price: 600, category: "cold-brew" },
  { name: "Nitro Cold Brew Can", price: 150, category: "cold-brew" },
  { name: "Hazelnut Cold Brew Pack (6)", price: 600, category: "cold-brew" },
  { name: "Brew & Co. Ceramic Mug", price: 450, category: "merchandise" },
  { name: "Pour Over Dripper Kit", price: 1200, category: "equipment" },
  { name: "French Press (350ml)", price: 980, category: "equipment" },
  { name: "Brew & Co. Tote Bag", price: 350, category: "merchandise" },
  { name: "Coffee Subscription (Monthly)", price: 1500, category: "subscription" },
  { name: "Coffee Subscription (Quarterly)", price: 3900, category: "subscription" },
  { name: "Espresso Blend Beans", price: 800, category: "beans" },
  { name: "Decaf House Blend", price: 700, category: "beans" },
  { name: "Mocha Cold Brew Pack (6)", price: 620, category: "cold-brew" },
  { name: "Brew & Co. Cap", price: 500, category: "merchandise" },
  { name: "Aeropress Kit", price: 2200, category: "equipment" },
];

// ─── Indian Names ───
const FIRST_NAMES = [
  "Aarav", "Aditi", "Aisha", "Amit", "Ananya", "Arjun", "Bhavya", "Chirag",
  "Deepika", "Dev", "Diya", "Gaurav", "Ishaan", "Isha", "Kabir", "Kavya",
  "Krish", "Lavanya", "Manav", "Meera", "Nandini", "Neha", "Nikhil", "Nisha",
  "Omkar", "Pooja", "Priya", "Rahul", "Ravi", "Rhea", "Rohan", "Roshni",
  "Saanvi", "Sahil", "Sakshi", "Samar", "Shreya", "Siddharth", "Simran",
  "Sneha", "Sonia", "Tanvi", "Tarun", "Trisha", "Varun", "Vedika", "Vihaan",
  "Yash", "Zara", "Zubin", "Aman", "Bharat", "Chetan", "Daksh", "Esha",
  "Farhan", "Gauri", "Harsh", "Ishan", "Jaya", "Karan", "Lakshmi", "Mihir",
  "Namrata", "Ojas", "Pallavi", "Raghav", "Saumya", "Tara", "Uday", "Vidya",
];

const LAST_NAMES = [
  "Agarwal", "Banerjee", "Chadha", "Desai", "Fernandes", "Gupta", "Hegde",
  "Iyer", "Jain", "Kapoor", "Lal", "Malhotra", "Nair", "Oberoi", "Patel",
  "Rao", "Sharma", "Thakur", "Verma", "Wadia", "Yadav", "Chopra", "Menon",
  "Reddy", "Singh", "Kumar", "Mehta", "Shah", "Pillai", "Bhat", "Saxena",
  "Pandey", "Chauhan", "Das", "Mishra", "Ghosh", "Mukherjee", "Tiwari",
  "Srinivasan", "Kulkarni", "Joshi", "Dutta", "Nayak", "Rathore", "Ahuja",
];

const CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Pune",
  "Chennai", "Kolkata", "Jaipur", "Ahmedabad", "Lucknow",
  "Chandigarh", "Goa", "Kochi", "Indore", "Nagpur",
];

const STORE_LOCATIONS = ["online", "online", "online", "Bandra Cafe", "Koramangala Cafe", "Hauz Khas Cafe", "Jubilee Hills Cafe", "Koregaon Park Cafe"];

const TAGS_POOL = ["coffee-lover", "subscriber", "gift-buyer", "bulk-buyer", "new-customer", "vip", "deal-seeker", "weekend-visitor"];

// ─── Helpers ───
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateEmail(firstName: string, lastName: string, index: number): string {
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com"];
  const variants = [
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}-${index}`,
    `${firstName.toLowerCase()}${lastName.toLowerCase()}-${index}`,
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 99)}-${index}`,
    `${firstName.toLowerCase()}${index}`,
  ];
  return `${pick(variants)}@${pick(domains)}`;
}

function generatePhone(): string {
  const prefixes = ["98", "97", "96", "95", "94", "93", "91", "90", "89", "88", "87", "86", "85"];
  return `+91${pick(prefixes)}${randomInt(10000000, 99999999)}`;
}

// ─── Main Seed ───
async function main() {
  console.log("🌱 Seeding Brew & Co. data...\n");

  // Clear existing data
  await prisma.communication.deleteMany();
  await prisma.order.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.segment.deleteMany();
  await prisma.customer.deleteMany();

  console.log("🗑️  Cleared existing data");

  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());

  // ── Create 500 Customers ──
  const customers = [];

  for (let i = 0; i < 500; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    const email = generateEmail(firstName, lastName, i);
    const phone = generatePhone();
    const city = pick(CITIES);

    // Assign customer profile type
    let createdAt: Date;
    let tags: string[] = [];

    if (i < 50) {
      // 10% VIP — joined early, high spend
      createdAt = randomDate(oneYearAgo, threeMonthsAgo);
      tags = ["vip", ...pickN(TAGS_POOL.filter((t) => t !== "vip" && t !== "new-customer"), randomInt(1, 2))];
    } else if (i < 150) {
      // 20% Churning — haven't ordered recently
      createdAt = randomDate(oneYearAgo, twoMonthsAgo);
      tags = pickN(TAGS_POOL.filter((t) => t !== "new-customer" && t !== "vip"), randomInt(0, 2));
    } else if (i < 300) {
      // 30% New — joined in last 30 days
      createdAt = randomDate(oneMonthAgo, now);
      tags = ["new-customer", ...pickN(TAGS_POOL.filter((t) => t !== "new-customer" && t !== "vip"), randomInt(0, 1))];
    } else if (i < 375) {
      // 15% One-time buyers
      createdAt = randomDate(oneYearAgo, oneMonthAgo);
      tags = pickN(TAGS_POOL.filter((t) => t !== "vip"), randomInt(0, 1));
    } else {
      // 25% Regular
      createdAt = randomDate(oneYearAgo, oneMonthAgo);
      tags = pickN(TAGS_POOL.filter((t) => t !== "new-customer"), randomInt(1, 3));
    }

    customers.push({
      name,
      email,
      phone,
      city,
      tags,
      createdAt,
      totalOrders: 0,
      totalSpent: 0,
    });
  }

  const createdCustomers = await Promise.all(
    customers.map((c) => prisma.customer.create({ data: c }))
  );

  console.log(`👥 Created ${createdCustomers.length} customers`);

  // ── Create 2000+ Orders ──
  const orders = [];

  for (let i = 0; i < createdCustomers.length; i++) {
    const customer = createdCustomers[i];
    let orderCount: number;

    if (i < 50) {
      // VIP: 8-20 orders
      orderCount = randomInt(8, 20);
    } else if (i < 150) {
      // Churning: 3-8 orders (but old)
      orderCount = randomInt(3, 8);
    } else if (i < 300) {
      // New: 1-3 orders
      orderCount = randomInt(1, 3);
    } else if (i < 375) {
      // One-time: exactly 1
      orderCount = 1;
    } else {
      // Regular: 2-6 orders
      orderCount = randomInt(2, 6);
    }

    for (let j = 0; j < orderCount; j++) {
      // Order date based on customer type
      let orderDate: Date;
      if (i < 50) {
        // VIP: orders spread over the year, including recent
        orderDate = randomDate(customer.createdAt, now);
      } else if (i < 150) {
        // Churning: last order at least 60 days ago
        const sixtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60);
        orderDate = randomDate(customer.createdAt, sixtyDaysAgo);
      } else if (i < 300) {
        // New: orders after joining
        orderDate = randomDate(customer.createdAt, now);
      } else {
        orderDate = randomDate(customer.createdAt, now);
      }

      // Pick 1-4 items per order
      const itemCount = randomInt(1, 4);
      const selectedProducts = pickN(PRODUCTS, itemCount);
      const items = selectedProducts.map((p) => ({
        name: p.name,
        qty: randomInt(1, 3),
        price: p.price,
        category: p.category,
      }));

      const totalAmount = items.reduce((sum, item) => sum + item.price * item.qty, 0);

      orders.push({
        customerId: customer.id,
        orderDate,
        totalAmount,
        items,
        storeLocation: pick(STORE_LOCATIONS),
        createdAt: orderDate,
      });
    }
  }

  // Batch create orders
  let createdOrderCount = 0;
  const BATCH_SIZE = 100;
  for (let i = 0; i < orders.length; i += BATCH_SIZE) {
    const batch = orders.slice(i, i + BATCH_SIZE);
    await prisma.order.createMany({ data: batch });
    createdOrderCount += batch.length;
  }

  console.log(`📦 Created ${createdOrderCount} orders`);

  // ── Update denormalized fields on customers ──
  for (const customer of createdCustomers) {
    const customerOrders = orders.filter((o) => o.customerId === customer.id);
    const totalOrders = customerOrders.length;
    const totalSpent = customerOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const lastOrderAt = customerOrders.length > 0
      ? customerOrders.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime())[0].orderDate
      : null;

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        totalOrders,
        totalSpent: Math.round(totalSpent * 100) / 100,
        lastOrderAt,
      },
    });
  }

  console.log("📊 Updated customer denormalized fields");

  // ── Create a few sample segments ──
  const segments = [
    {
      name: "High-Value Customers",
      description: "Customers who have spent more than ₹5,000 in total",
      rules: { and: [{ field: "totalSpent", op: "gt", value: 5000 }] },
      naturalLanguageQuery: "customers who spent more than 5000 rupees",
      createdBy: "system",
    },
    {
      name: "Inactive Customers",
      description: "Customers who haven't ordered in the last 60 days",
      rules: { and: [{ field: "daysSinceLastOrder", op: "gt", value: 60 }] },
      naturalLanguageQuery: "customers who haven't ordered in 60 days",
      createdBy: "system",
    },
    {
      name: "New Customers (Last 30 Days)",
      description: "Customers who joined in the last 30 days",
      rules: { and: [{ field: "createdAt", op: "gte", value: "30_days_ago" }] },
      naturalLanguageQuery: "customers who joined in the last month",
      createdBy: "system",
    },
    {
      name: "Mumbai Coffee Lovers",
      description: "Customers in Mumbai who have ordered beans or cold brew",
      rules: { and: [{ field: "city", op: "eq", value: "Mumbai" }, { field: "totalOrders", op: "gte", value: 2 }] },
      naturalLanguageQuery: "repeat customers from Mumbai",
      createdBy: "system",
    },
  ];

  for (const seg of segments) {
    // Count matching customers for each segment (simplified)
    let customerCount = 0;
    if (seg.name === "High-Value Customers") {
      customerCount = await prisma.customer.count({ where: { totalSpent: { gt: 5000 } } });
    } else if (seg.name === "Inactive Customers") {
      const sixtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60);
      customerCount = await prisma.customer.count({ where: { lastOrderAt: { lt: sixtyDaysAgo } } });
    } else if (seg.name === "New Customers (Last 30 Days)") {
      customerCount = await prisma.customer.count({ where: { createdAt: { gte: oneMonthAgo } } });
    } else if (seg.name === "Mumbai Coffee Lovers") {
      customerCount = await prisma.customer.count({ where: { city: "Mumbai", totalOrders: { gte: 2 } } });
    }

    await prisma.segment.create({
      data: { ...seg, customerCount },
    });
  }

  console.log(`🎯 Created ${segments.length} sample segments`);

  // ── Summary ──
  const totalCustomers = await prisma.customer.count();
  const totalOrders = await prisma.order.count();
  const totalSegments = await prisma.segment.count();

  const vipCount = await prisma.customer.count({ where: { totalSpent: { gt: 10000 } } });
  const avgSpend = await prisma.customer.aggregate({ _avg: { totalSpent: true } });

  console.log("\n✅ Seed complete!\n");
  console.log("┌─────────────────────────────────────┐");
  console.log(`│  ☕ Brew & Co. CRM Data              │`);
  console.log("├─────────────────────────────────────┤");
  console.log(`│  Customers:     ${String(totalCustomers).padStart(18)} │`);
  console.log(`│  Orders:        ${String(totalOrders).padStart(18)} │`);
  console.log(`│  Segments:      ${String(totalSegments).padStart(18)} │`);
  console.log(`│  VIP (>₹10K):   ${String(vipCount).padStart(18)} │`);
  console.log(`│  Avg Spend:   ₹${String(Math.round(avgSpend._avg.totalSpent || 0)).padStart(17)} │`);
  console.log("└─────────────────────────────────────┘");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
