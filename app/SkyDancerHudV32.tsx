"use client";

/**
 * V32 keeps the inherited live controls/state authoritative and only reduces
 * visual mass to match the supplied flight-combat reference: thin cyan rules,
 * lighter translucent status blocks, and smaller touch controls.
 */
export default function SkyDancerHudV32() {
  return <style>{`
    [data-sd-gas-card="true"] {
      width: min(166px, 24vw) !important;
      padding: 2px 4px 5px !important;
      background: linear-gradient(90deg, rgba(3,31,52,.22), rgba(3,31,52,0)) !important;
      box-shadow: inset 0 -1px 0 rgba(117,225,255,.36) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    [data-sd-gas-card="true"] > div:first-child > strong {
      font-size: 13px !important;
      text-shadow: 0 1px 5px rgba(0,34,60,.42) !important;
    }
    [data-sd-gas-card="true"] > div:nth-child(2) {
      height: 4px !important;
      background: rgba(4,30,47,.34) !important;
    }

    [data-sd-turbo-card="true"] {
      width: min(138px, 21vw) !important;
      padding: 3px 4px 4px !important;
      bottom: max(28px, calc(env(safe-area-inset-bottom) + 18px)) !important;
      background: linear-gradient(90deg, rgba(3,31,52,.20), rgba(3,31,52,0)) !important;
      border-left: 0 !important;
      box-shadow: inset 0 -1px 0 rgba(95,219,255,.30) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }

    [aria-label="Turbo Hunt status"] {
      top: max(45px, calc(env(safe-area-inset-top) + 38px)) !important;
      width: min(55vw, 500px) !important;
      gap: 9px !important;
    }
    [data-sd-hunt-objective="true"] {
      padding: 3px 8px 5px !important;
      background: linear-gradient(90deg, transparent, rgba(5,38,61,.32) 22%, rgba(5,38,61,.32) 78%, transparent) !important;
      box-shadow: inset 0 -1px 0 rgba(139,232,255,.34) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    [data-sd-hunt-heat="true"] {
      padding: 3px 6px 5px !important;
      background: rgba(5,35,55,.18) !important;
      box-shadow: inset 0 -1px 0 rgba(255,218,105,.28) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }

    button[aria-label="Fire missile"] {
      width: 54px !important;
      height: 54px !important;
      border-radius: 8px 12px 8px 12px !important;
      background: linear-gradient(155deg, rgba(5,66,100,.78), rgba(3,25,43,.82)) !important;
      box-shadow: 0 3px 10px rgba(0,35,58,.24), inset 0 1px 0 rgba(255,255,255,.18) !important;
    }
    [data-sd-turbo-button="true"] {
      width: 66px !important;
      height: 66px !important;
      border-radius: 14px !important;
      background: linear-gradient(160deg, rgba(54,196,239,.88), rgba(8,106,175,.88)) !important;
      box-shadow: 0 4px 12px rgba(0,67,109,.22), inset 0 1px 0 rgba(255,255,255,.26) !important;
    }

    @media(max-height:390px) {
      [data-sd-turbo-card="true"] { bottom: max(20px, calc(env(safe-area-inset-bottom) + 12px)) !important; }
      button[aria-label="Fire missile"] { width: 50px !important; height: 50px !important; }
      [data-sd-turbo-button="true"] { width: 62px !important; height: 62px !important; }
    }
  `}</style>;
}
