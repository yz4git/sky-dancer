import "./app/globals.css";
import "./app/cart-rogue-mobile-fix.css";
import { createRoot } from "react-dom/client";
import CartRogueGamePhase13 from "./app/CartRogueGamePhase13";
import SkyDancerHudV30 from "./app/SkyDancerHudV30";

const mount = document.getElementById("root");
if (!mount) throw new Error("Sky Dancer mount element is missing");
createRoot(mount).render(<>
  <CartRogueGamePhase13 />
  <SkyDancerHudV30 />
</>);
