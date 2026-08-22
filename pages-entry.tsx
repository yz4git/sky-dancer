import "./app/globals.css";
import { createRoot } from "react-dom/client";
import SkyDancerGame from "./app/SkyDancerGame";

const mount = document.getElementById("root");
if (!mount) throw new Error("Sky Dancer mount element is missing");
createRoot(mount).render(<SkyDancerGame />);
