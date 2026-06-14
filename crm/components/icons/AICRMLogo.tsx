import React from "react";

type LogoProps = React.SVGProps<SVGSVGElement>;

export default function AICRMLogo({
  className = "w-16 h-16",
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
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {/* Central CRM Module */}
        <rect x="25" y="35" width="50" height="40" rx="10" />

        {/* Robot Eyes */}
        <circle cx="38" cy="50" r="4" fill="#ffffff" stroke="none" />
        <circle cx="62" cy="50" r="4" fill="#ffffff" stroke="none" />

        {/* Professional Smile */}
        <path d="M43 60 Q50 64 57 60" />

        {/* Intelligence Crown */}
        <path d="M50 35 V28" />
        <path d="M50 28 L38 18" />
        <path d="M50 28 L62 18" />
        <path d="M50 28 V15" />

        {/* Crown Nodes */}
        <circle cx="38" cy="18" r="3" fill="#ffffff" stroke="none" />
        <circle cx="62" cy="18" r="3" fill="#ffffff" stroke="none" />
        <circle cx="50" cy="15" r="3" fill="#ffffff" stroke="none" />

        {/* Left Data Ingestion */}
        <path d="M25 55 H12" />
        <circle cx="12" cy="55" r="3" fill="#ffffff" stroke="none" />

        {/* Right Campaign Output */}
        <path d="M75 55 H88" />
        <circle cx="88" cy="55" r="3" fill="#ffffff" stroke="none" />
      </g>
    </svg>
  );
}
