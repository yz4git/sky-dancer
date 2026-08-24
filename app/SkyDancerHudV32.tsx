"use client";

/**
 * V32 keeps the live controls/state authoritative and only reduces visual mass
 * to match the supplied arcade-flight reference.
 */
export default function SkyDancerHudV32() {
  return <style>{`
    [data-sd-gas-card="true"] {
      width: min(158px, 23vw) !important;
      padding: 2px 4px 4px !important;
      background: linear-gradient(90deg, rgba(3,31,52,.20), rgba(3,31,52,0)) !important;
      box-shadow: inset 0 -1px 0 rgba(117,225,255,.34) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    [data-sd-gas-card="true"] > div:first-child > strong {
      font-size: 13px !important;
      text-shadow: 0 1px 5px rgba(0,34,60,.42) !important;
    }
    [data-sd-gas-card="true"] > div:nth-child(2) {
      height: 4px !important;
      background: rgba(4,30,47,.30) !important;
    }

    [data-sd-turbo-card="true"] {
      position: fixed !important;
      left: max(18px, env(safe-area-inset-left)) !important;
      right: auto !important;
      bottom: max(28px, calc(env(safe-area-inset-bottom) + 18px)) !important;
      transform: none !important;
      width: min(112px, 18vw) !important;
      min-width: 0 !important;
      padding: 2px 4px 3px !important;
      gap: 2px !important;
      background: linear-gradient(90deg, rgba(3,31,52,.18), rgba(3,31,52,0)) !important;
      border-left: 0 !important;
      box-shadow: inset 0 -1px 0 rgba(95,219,255,.28) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      z-index: 38 !important;
    }
    [data-sd-turbo-card="true"] * {
      font-size: 9px !important;
      line-height: 1.05 !important;
    }
    [data-sd-turbo-card="true"] strong {
      font-size: 12px !important;
    }

    [aria-label="Turbo Hunt status"] {
      top: max(43px, calc(env(safe-area-inset-top) + 36px)) !important;
      width: min(54vw, 500px) !important;
      gap: 7px !important;
    }
    [data-sd-hunt-objective="true"] {
      padding: 2px 8px 4px !important;
      background: linear-gradient(90deg, transparent, rgba(5,38,61,.27) 22%, rgba(5,38,61,.27) 78%, transparent) !important;
      box-shadow: inset 0 -1px 0 rgba(139,232,255,.31) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    [data-sd-hunt-heat="true"] {
      padding: 2px 6px 4px !important;
      background: rgba(5,35,55,.16) !important;
      box-shadow: inset 0 -1px 0 rgba(255,218,105,.24) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }

    button[aria-label="Fire missile"] {
      width: 52px !important;
      height: 52px !important;
      border-radius: 8px 12px 8px 12px !important;
      background: linear-gradient(155deg, rgba(5,66,100,.75), rgba(3,25,43,.80)) !important;
      box-shadow: 0 3px 10px rgba(0,35,58,.22), inset 0 1px 0 rgba(255,255,255,.17) !important;
    }
    [data-sd-turbo-button="true"] {
      width: 62px !important;
      height: 62px !important;
      border-radius: 14px !important;
      background: linear-gradient(160deg, rgba(54,196,239,.86), rgba(8,106,175,.86)) !important;
      box-shadow: 0 4px 12px rgba(0,67,109,.20), inset 0 1px 0 rgba(255,255,255,.24) !important;
    }

    button[aria-label="Pause"] {
      opacity: .68 !important;
      transform: scale(.84) !important;
      transform-origin: top right !important;
    }

    @media(max-height:390px) {
      [data-sd-turbo-card="true"] {
        left: max(14px, env(safe-area-inset-left)) !important;
        bottom: max(18px, calc(env(safe-area-inset-bottom) + 10px)) !important;
        width: min(104px, 17vw) !important;
      }
      button[aria-label="Fire missile"] { width: 48px !important; height: 48px !important; }
      [data-sd-turbo-button="true"] { width: 58px !important; height: 58px !important; }
    }
  `}</style>;
}
