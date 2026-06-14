import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderService } from "@/services/order.service";
import { parseCSVRow } from "@/lib/csv-parser";

export async function POST(request: Request) {
  try {
    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
    const { csvText } = payload || {};

    if (!csvText || typeof csvText !== "string") {
      return NextResponse.json(
        { error: "csvText is required." },
        { status: 400 }
      );
    }

    const lines = csvText.split(/\r?\n/).filter((line) => line.trim() !== "");
    if (lines.length <= 1) {
      return NextResponse.json(
        { error: "CSV is empty or missing data rows." },
        { status: 400 }
      );
    }

    // Parse Headers
    const headers = parseCSVRow(lines[0]).map((h) => h.toLowerCase());
    const emailIndex = headers.indexOf("email");
    const amountIndex = headers.indexOf("totalamount");
    const itemsIndex = headers.indexOf("items");
    const locationIndex = headers.indexOf("storelocation");
    
    // Extract orderdate or date if provided in the CSV
    const dateIndex =
      headers.indexOf("orderdate") !== -1
        ? headers.indexOf("orderdate")
        : headers.indexOf("date");

    if (emailIndex === -1 || amountIndex === -1) {
      return NextResponse.json(
        { error: "CSV must contain at least 'email' and 'totalAmount' columns." },
        { status: 400 }
      );
    }

    // Step 1: Parse rows and extract data
    const rawData = [];
    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVRow(lines[i]);
      if (row.length < headers.length) continue;

      const email = row[emailIndex];
      const amountStr = row[amountIndex];
      const itemsStr = itemsIndex !== -1 ? row[itemsIndex] : "";
      const location = locationIndex !== -1 ? row[locationIndex] : "online";
      const dateStr = dateIndex !== -1 ? row[dateIndex] : "";
      
      const totalAmount = parseFloat(amountStr);

      if (email && !isNaN(totalAmount)) {
        rawData.push({ email, totalAmount, itemsStr, location, dateStr });
      }
    }

    // Step 2: Preload Customers Once
    const emails = [...new Set(rawData.map((r) => r.email))];

    const customers = await prisma.customer.findMany({
      where: {
        email: {
          in: emails,
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    const customerMap = new Map(
      customers.map((c) => [c.email, c.id])
    );

    // Step 3: Build the Full Order Payload
    const orderData = rawData.map((row) => {
      let items = [];
      try {
        if (row.itemsStr) {
          items = JSON.parse(row.itemsStr);
        } else {
          items = [{ name: "Coffee purchase", qty: 1, price: row.totalAmount, category: "Coffee" }];
        }
      } catch {
        items = [{ name: "Coffee purchase", qty: 1, price: row.totalAmount, category: "Coffee" }];
      }

      // Parse the actual CSV order date field
      let parsedDate = new Date();
      if (row.dateStr) {
        const d = new Date(row.dateStr);
        if (!isNaN(d.getTime())) {
          parsedDate = d;
        }
      }

      return {
        customerId: customerMap.get(row.email) as string,
        orderDate: parsedDate,
        totalAmount: row.totalAmount,
        items,
        storeLocation: row.location,
      };
    }).filter((order) => order.customerId !== undefined); // Drop rows whose customers cannot be resolved

    if (orderData.length === 0) {
      return NextResponse.json(
        { error: "No valid orders found or no matching customers." },
        { status: 400 }
      );
    }

    // Step 4: Replace Per-Row Inserts with chunked bulk inserts
    const CHUNK_SIZE = 1000;
    for (let i = 0; i < orderData.length; i += CHUNK_SIZE) {
      const chunk = orderData.slice(i, i + CHUNK_SIZE);

      await prisma.order.createMany({
        data: chunk,
      });
    }

    // Step 6: Recompute Customer Stats Once
    const affectedCustomerIds = [
      ...new Set(orderData.map((o) => o.customerId)),
    ];

    await OrderService.recomputeCustomerStats(affectedCustomerIds);

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${orderData.length} orders.`,
      errors: [], 
    });
  } catch (error: unknown) {
    console.error("POST /api/orders/upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
