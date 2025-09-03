export default function AloaLogo({ className = "h-12 w-12" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Black circle background */}
      <circle cx="200" cy="200" r="200" fill="#0A0A0A" />
      
      {/* Moth/butterfly body */}
      <ellipse cx="200" cy="260" rx="12" ry="35" fill="#FFFFFF" />
      <ellipse cx="200" cy="295" rx="16" ry="20" fill="#FFFFFF" />
      
      {/* Head */}
      <circle cx="200" cy="170" r="18" fill="#FFFFFF" />
      
      {/* Antennae */}
      <path
        d="M190 170 L160 140 M210 170 L240 140"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="160" cy="140" r="4" fill="#FFFFFF" />
      <circle cx="240" cy="140" r="4" fill="#FFFFFF" />
      
      {/* Left wing - gradient effect */}
      <ellipse
        cx="140"
        cy="210"
        rx="70"
        ry="35"
        fill="url(#leftWingGradient)"
        transform="rotate(-15 140 210)"
      />
      <ellipse
        cx="150"
        cy="260"
        rx="50"
        ry="30"
        fill="url(#leftWingLowerGradient)"
        transform="rotate(-25 150 260)"
      />
      
      {/* Right wing - gradient effect */}
      <ellipse
        cx="260"
        cy="210"
        rx="70"
        ry="35"
        fill="url(#rightWingGradient)"
        transform="rotate(15 260 210)"
      />
      <ellipse
        cx="250"
        cy="260"
        rx="50"
        ry="30"
        fill="url(#rightWingLowerGradient)"
        transform="rotate(25 250 260)"
      />
      
      {/* Wing details/patterns */}
      <path
        d="M170 190 Q140 200 120 220"
        stroke="#0A0A0A"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M230 190 Q260 200 280 220"
        stroke="#0A0A0A"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Gradient definitions */}
      <defs>
        <linearGradient id="leftWingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C4E86B" />
          <stop offset="100%" stopColor="#A2D5E8" />
        </linearGradient>
        <linearGradient id="leftWingLowerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A2D5E8" />
          <stop offset="100%" stopColor="#8DC8E3" />
        </linearGradient>
        <linearGradient id="rightWingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A2D5E8" />
          <stop offset="100%" stopColor="#8DC8E3" />
        </linearGradient>
        <linearGradient id="rightWingLowerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8DC8E3" />
          <stop offset="100%" stopColor="#7DBFE0" />
        </linearGradient>
      </defs>
    </svg>
  );
}