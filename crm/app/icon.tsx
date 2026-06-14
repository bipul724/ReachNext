import { ImageResponse } from "next/og";
import FaviconLogo from "../components/icons/FaviconLogo";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyItems: "center" }}>
        <FaviconLogo style={{ width: "100%", height: "100%" }} />
      </div>
    ),
    { ...size }
  );
}
