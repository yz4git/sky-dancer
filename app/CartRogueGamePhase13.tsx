"use client";

import { Fragment, useEffect, useState } from "react";
import "../src/cart/CartRogueRuntime";
import "../src/cart/CartGameMenuRuntime";
import "../src/sky/SkyDancerTurboInputIsolation";
import { setCartRunDifficulty, type CartRunDifficulty } from "../src/cart/CartRunDifficulty";
import CartRogueGame from "./CartRogueGame";
import CartTurboHuntHudOverlay from "./CartTurboHuntHudOverlay";
import CartCombatReadabilityPass from "./CartCombatReadabilityPass";
import CartGameMenu from "./CartGameMenu";
import SkyDancerHudQualityPass from "./SkyDancerHudQualityPass";
import SkyDancerShotControl from "./SkyDancerShotControl";
import SkyDancerCombatPolish from "./SkyDancerCombatPolish";
import SkyDancerHudV34 from "./SkyDancerHudV34";
import SkyDancerHudV35 from "./SkyDancerHudV35";
import SkyDancerHudV39 from "./SkyDancerHudV39";
import SkyDancerHudV40 from "./SkyDancerHudV40";
import SkyDancerHudV44 from "./SkyDancerHudV44";
import SkyDancerHudV45 from "./SkyDancerHudV45";
import SkyDancerHudV49 from "./SkyDancerHudV49";
import SkyDancerHudV54 from "./SkyDancerHudV54";
import SkyDancerArcadeMode from "./SkyDancerArcadeMode";
import type { SkyDancerStartRequest } from "../src/sky/arcade/SkyDancerArcadeData";

export default function CartRogueGamePhase13() {
  const [activeRequest, setActiveRequest] = useState<SkyDancerStartRequest | null>(null);
  const [runKey, setRunKey] = useState(0);

  const startRun = (request: SkyDancerStartRequest) => {
    setCartRunDifficulty(request.difficulty as CartRunDifficulty);
    setRunKey((value) => value + 1);
    setActiveRequest(request);
  };

  useEffect(() => {
    if (!navigator.webdriver || new URLSearchParams(location.search).has("menu")) return undefined;
    const timer = window.setTimeout(() => {
      setCartRunDifficulty("normal");
      setActiveRequest({ mode: "turbo-hunt", difficulty: "normal" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.skyDancerMode = activeRequest?.mode ?? "title";
    return () => { delete document.documentElement.dataset.skyDancerMode; };
  }, [activeRequest?.mode]);

  return <>
    {activeRequest?.mode === "turbo-hunt" && (
      <Fragment key={runKey}>
        <CartRogueGame />
        <CartTurboHuntHudOverlay />
        <CartCombatReadabilityPass />
        <SkyDancerHudQualityPass />
        <SkyDancerShotControl />
        <SkyDancerCombatPolish />
        <SkyDancerHudV34 />
        <SkyDancerHudV35 />
        <SkyDancerHudV39 />
        <SkyDancerHudV40 />
        <SkyDancerHudV44 />
        <SkyDancerHudV45 />
        <SkyDancerHudV49 />
        <SkyDancerHudV54 />
      </Fragment>
    )}
    {activeRequest && activeRequest.mode !== "turbo-hunt" && (
      <SkyDancerArcadeMode key={runKey} request={activeRequest} onReturnTitle={() => setActiveRequest(null)} />
    )}
    <CartGameMenu
      started={activeRequest !== null}
      activeMode={activeRequest?.mode ?? null}
      onStart={startRun}
      onReturnTitle={() => setActiveRequest(null)}
    />
  </>;
}
