import "./styles.css";
import { initUI } from "./ui.js";

const root = document.documentElement;
root.classList.add("js");
initUI();

function webglAvailable() {
  try {
    const probe = document.createElement("canvas");
    return Boolean(probe.getContext("webgl2") || probe.getContext("webgl"));
  } catch {
    return false;
  }
}

// ?3d=1 forces the scene on, ?3d=0 forces the static fallback.
function wants3D() {
  const forced = new URLSearchParams(location.search).get("3d");
  if (forced === "0") return false;
  if (forced === "1") return webglAvailable();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wide = matchMedia("(min-width: 900px)").matches;
  const finePointer = matchMedia("(any-pointer: fine)").matches;
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  return !reduced && wide && finePointer && !saveData && webglAvailable();
}

function fallback() {
  root.classList.remove("has-3d", "scene-ready");
  root.classList.add("no-3d");
}

const canvas = document.querySelector("#stage");
const story = document.querySelector("#how");
const steps = [...document.querySelectorAll(".story-step")];

if (canvas && story && steps.length && wants3D()) {
  root.classList.add("has-3d");
  import("./scene.js")
    .then(({ initScene }) => initScene({ canvas, story, steps, onFail: fallback }))
    .catch(fallback);
} else {
  fallback();
}
