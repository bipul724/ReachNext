import React from "react";

type LogoProps = React.SVGProps<SVGSVGElement>;

export default function FaviconLogo({
  className = "w-8 h-8",
  ...props
}: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <rect x="5" y="5" width="90" height="90" rx="24" fill="#121212" />

      <g
        stroke="#ffffff"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {/* Simplified Module */}
        <rect x="20" y="30" width="60" height="50" rx="12" />

        {/* Eyes */}
        <circle cx="35" cy="50" r="5" fill="#ffffff" stroke="none" />
        <circle cx="65" cy="50" r="5" fill="#ffffff" stroke="none" />

        {/* Smile */}
        <path d="M40 65 Q50 72 60 65" />

        {/* Intelligence Node */}
        <path d="M50 30 V16" />
        <circle cx="50" cy="16" r="4" fill="#ffffff" stroke="none" />
      </g>
    </svg>
  );
}
