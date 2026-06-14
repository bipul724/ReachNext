import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
    const nameIndex = headers.indexOf("name");
    const phoneIndex = headers.indexOf("phone");
    const cityIndex = headers.indexOf("city");
    const tagsIndex = headers.indexOf("tags");

    if (emailIndex === -1 || nameIndex === -1) {
      return NextResponse.json(
        { error: "CSV must contain at least 'email' and 'name' columns." },
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
      const name = row[nameIndex];
      const phone = phoneIndex !== -1 ? row[phoneIndex] : null;
      const city = cityIndex !== -1 ? row[cityIndex] : null;
      
      // Parse tags by splitting semicolon or space
      let tags: string[] = [];
      if (tagsIndex !== -1 && row[tagsIndex]) {
        tags = row[tagsIndex]
          .split(/[\s;|\n]+/)
          .map((t) => t.trim())
          .filter((t) => t.length > 0);
      }

      if (!email || !name) {
        errors.push(`Row ${i + 1}: Missing email or name.`);
        continue;
      }

      try {
        await prisma.customer.upsert({
          where: { email },
          update: {
            name,
            phone: phone || undefined,
            city: city || undefined,
            tags: tags.length > 0 ? tags : undefined,
          },
          create: {
            name,
            email,
            phone,
            city,
            tags,
          },
        });
        successCount++;
      } catch (err: any) {
        errors.push(`Row ${i + 1} (${email}): ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${successCount} customers.`,
      errors,
    });
  } catch (error: unknown) {
    console.error("POST /api/customers/upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
