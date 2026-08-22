import SkyDancerGame from "./SkyDancerGame";
import ServiceWorkerRegistration from "./ServiceWorkerRegistration";

export default function Page() {
  return <>
    <ServiceWorkerRegistration />
    <SkyDancerGame />
  </>;
}
