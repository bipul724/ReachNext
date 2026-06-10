import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderService } from "@/services/order.service";
import { parseCSVRow } from "@/lib/csv-parser";

export async function POST(request: Request) {
  try {
    const { csvText } = await request.json();

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

    if (emailIndex === -1 || amountIndex === -1) {
      return NextResponse.json(
        { error: "CSV must contain at least 'email' and 'totalAmount' columns." },
        { status: 400 }
      );
    }

    let successCount = 0;
    const errors: string[] = [];

    // Parse Data Rows
    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVRow(lines[i]);
      if (row.length < headers.length) continue; // skip incomplete rows

      const email = row[emailIndex];
      const amountStr = row[amountIndex];
      const itemsStr = itemsIndex !== -1 ? row[itemsIndex] : "";
      const location = locationIndex !== -1 ? row[locationIndex] : "online";

      const totalAmount = parseFloat(amountStr);

      if (!email || isNaN(totalAmount)) {
        errors.push(`Row ${i + 1}: Missing email or invalid totalAmount.`);
        continue;
      }

      // 1. Look up customer by email to find customerId
      const customer = await prisma.customer.findUnique({
        where: { email },
        select: { id: true },
      });

      if (!customer) {
        errors.push(`Row ${i + 1} (${email}): Customer not found in database. Create the customer profile first.`);
        continue;
      }

      // Parse items JSON safely or set default
      let items = [];
      try {
        if (itemsStr) {
          items = JSON.parse(itemsStr);
        } else {
          items = [{ name: "Coffee purchase", qty: 1, price: totalAmount, category: "Coffee" }];
        }
      } catch {
        items = [{ name: "Coffee purchase", qty: 1, price: totalAmount, category: "Coffee" }];
      }

      try {
        // Use OrderService.create to handle transaction-based campaign attribution, customer stat updates, and campaign revenue aggregates automatically!
        await OrderService.create({
          customerId: customer.id,
          orderDate: new Date(),
          totalAmount,
          items,
          storeLocation: location,
        });
        successCount++;
      } catch (err: any) {
        errors.push(`Row ${i + 1} (${email}): Failed to save order - ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${successCount} orders.`,
      errors,
    });
  } catch (error: any) {
    console.error("POST /api/orders/upload error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
