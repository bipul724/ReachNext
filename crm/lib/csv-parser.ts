/**
 * Parse a single CSV row into an array of field values.
 * Handles quoted fields that may contain commas (e.g., "New York, NY").
 * Strips surrounding quotes from each field.
 */
export function parseCSVRow(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // Escaped quote inside a quoted field: ""
        current += '"';
        i++; // skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // Push the last field
  fields.push(current.trim());

  return fields;
}
