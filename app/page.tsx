import CartRogueGame from "./CartRogueGamePhase13";
import ServiceWorkerRegistration from "./ServiceWorkerRegistration";
import SkyDancerColorGradeV31 from "./SkyDancerColorGradeV31";
import SkyDancerHudV30 from "./SkyDancerHudV30";
import SkyDancerHudV31 from "./SkyDancerHudV31";

export default function Page() {
  return <>
    <ServiceWorkerRegistration />
    <CartRogueGame />
    <SkyDancerColorGradeV31 />
    <SkyDancerHudV30 />
    <SkyDancerHudV31 />
  </>;
}
