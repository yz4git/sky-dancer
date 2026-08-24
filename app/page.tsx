import CartRogueGame from "./CartRogueGamePhase13";
import ServiceWorkerRegistration from "./ServiceWorkerRegistration";
import SkyDancerHudV30 from "./SkyDancerHudV30";

export default function Page() {
  return <>
    <ServiceWorkerRegistration />
    <CartRogueGame />
    <SkyDancerHudV30 />
  </>;
}
