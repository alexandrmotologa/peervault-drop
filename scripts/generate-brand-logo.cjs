const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

function buildLogoSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <clipPath id="squircle-clip">
      <rect x="24" y="24" width="976" height="976" rx="220" />
    </clipPath>

    <!-- Gradients -->
    <linearGradient id="cyan-glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f5ff"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>

    <linearGradient id="emerald-glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>

    <linearGradient id="shackle-metal" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#94a3b8"/>
      <stop offset="100%" stop-color="#475569"/>
    </linearGradient>

    <filter id="subtle-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.12" />
    </filter>
  </defs>

  <!-- Luxury White Squircle Container -->
  <rect x="24" y="24" width="976" height="976" rx="220" fill="#ffffff" stroke="#e2e8f0" stroke-width="6" />

  <g clip-path="url(#squircle-clip)">
    <g transform="translate(512, 512)" filter="url(#subtle-shadow)">

      <!-- Hexagonal Architectural Gateway Frame -->
      <polygon points="
        0,-410
        355,-205
        355,205
        0,410
        -355,205
        -355,-205
      " fill="none" stroke="#0f172a" stroke-width="36" stroke-linejoin="round" />

      <polygon points="
        0,-375
        324,-187
        324,187
        0,375
        -324,187
        -324,-187
      " fill="none" stroke="#00f5ff" stroke-width="4" opacity="0.4" stroke-dasharray="16, 12" />

      <!-- ==============================================
           THE STEALTH FALCON MASCOT (The PeerVault Drop)
           Symmetrical across vertical center (x=0)
           ============================================== -->

      <!-- 1. Watertight Base Silhouette (Zero-Leak Obsidian Shield) -->
      <path d="
        M 0 -290
        C 70 -290 140 -250 180 -180
        L 240 -60
        L 260 90
        L 220 230
        L 140 310
        L 0 350
        L -140 310
        L -220 230
        L -260 90
        L -240 -60
        L -180 -180
        C -140 -250 -70 -290 0 -290 Z
      " fill="#0b0f19" />

      <!-- 2. Integrated Vault Padlock Shackle (Crowning the Falcon Head) -->
      <path d="
        M -80 -180
        A 80 80 0 0 1 80 -180
        L 80 -120
        L 52 -120
        L 52 -180
        A 52 52 0 0 0 -52 -180
        L -52 -120
        L -80 -120 Z
      " fill="url(#shackle-metal)" stroke="#334155" stroke-width="2" />

      <!-- 3. Aerodynamic Wing / Shoulder Outer Armor Plates -->
      <!-- Left Outer Wing Facets -->
      <polygon points="-240,-60 -180,-180 -110,-130 -150,-20" fill="#1e293b" />
      <polygon points="-240,-60 -150,-20 -170,110 -260,90" fill="#0f172a" />
      <polygon points="-260,90 -170,110 -130,220 -220,230" fill="#1e293b" />
      <polygon points="-220,230 -130,220 -90,290 -140,310" fill="#0f172a" />
      <polygon points="-140,310 -90,290 0,350" fill="#1e293b" />

      <!-- Right Outer Wing Facets (Mirrored) -->
      <polygon points="240,-60 180,-180 110,-130 150,-20" fill="#334155" />
      <polygon points="240,-60 150,-20 170,110 260,90" fill="#1e293b" />
      <polygon points="260,90 170,110 130,220 220,230" fill="#334155" />
      <polygon points="220,230 130,220 90,290 140,310" fill="#1e293b" />
      <polygon points="140,310 90,290 0,350" fill="#334155" />

      <!-- 4. Falcon Head Structure -->
      <!-- Forehead & Crown -->
      <polygon points="0,-270 -60,-200 0,-175" fill="#1e293b" />
      <polygon points="0,-270 60,-200 0,-175" fill="#334155" />

      <!-- Brow & Temple Facets -->
      <polygon points="-60,-200 -110,-130 -40,-130 0,-175" fill="#0f172a" />
      <polygon points="60,-200 110,-130 40,-130 0,-175" fill="#1e293b" />

      <!-- Alert Predator Optics (Electric Cyan Almond Geometry) -->
      <!-- Left Eye -->
      <polygon points="-75,-145 -35,-140 -50,-125 -85,-130" fill="url(#cyan-glow)" />
      <circle cx="-58" cy="-136" r="3.5" fill="#020617" />

      <!-- Right Eye -->
      <polygon points="75,-145 35,-140 50,-125 85,-130" fill="url(#cyan-glow)" />
      <circle cx="58" cy="-136" r="3.5" fill="#020617" />

      <!-- Aerodynamic Raptor Beak -->
      <polygon points="0,-175 -25,-120 0,-90" fill="#475569" />
      <polygon points="0,-175 25,-120 0,-90" fill="#64748b" />
      <polygon points="0,-90 -16,-105 0,-60" fill="#1e293b" />
      <polygon points="0,-90 16,-105 0,-60" fill="#334155" />

      <!-- 5. Central Vault Chest Core (The Ephemeral Vault Key) -->
      <!-- Left Chest Shielding -->
      <polygon points="0,-60 -110,-130 -150,-20 -70,50 0,20" fill="#0f172a" />
      <polygon points="0,20 -70,50 -90,160 0,140" fill="#1e293b" />
      <polygon points="0,140 -90,160 -90,290 0,270" fill="#0f172a" />

      <!-- Right Chest Shielding -->
      <polygon points="0,-60 110,-130 150,-20 70,50 0,20" fill="#1e293b" />
      <polygon points="0,20 70,50 90,160 0,140" fill="#334155" />
      <polygon points="0,140 90,160 90,290 0,270" fill="#1e293b" />

      <!-- Central Cryptographic Core Shield Emblem (Geometric Padlock) -->
      <polygon points="0,50 -45,85 -35,175 0,205" fill="#10b981" opacity="0.95" />
      <polygon points="0,50 45,85 35,175 0,205" fill="#06b6d4" opacity="0.95" />

      <!-- Vault Keyhole Negative Space -->
      <circle cx="0" cy="115" r="9" fill="#0b0f19" />
      <polygon points="-5,120 5,120 7,155 -7,155" fill="#0b0f19" />

      <!-- Lower Wing Base Vectors -->
      <polygon points="0,270 -90,290 0,350" fill="#0b0f19" />
      <polygon points="0,270 90,290 0,350" fill="#1e293b" />

    </g>
  </g>
</svg>`;
}

async function main() {
  const imagesDir = path.resolve(__dirname, '../docs/images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const svg = buildLogoSvg();
  const svgPath = path.join(imagesDir, 'logo.svg');
  const pngPath = path.join(imagesDir, 'logo.png');

  fs.writeFileSync(svgPath, svg, 'utf8');
  console.log('✓ Wrote docs/images/logo.svg');

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1024 }
  });
  const pngData = resvg.render().asPng();
  fs.writeFileSync(pngPath, pngData);
  console.log('✓ Rendered docs/images/logo.png at 1024x1024');

  // Also copy to web/public/logo.svg so Mini App has the brand emblem
  const webPublicLogo = path.resolve(__dirname, '../web/public/logo.svg');
  fs.writeFileSync(webPublicLogo, svg, 'utf8');
  console.log('✓ Updated web/public/logo.svg');
}

main().catch(console.error);
