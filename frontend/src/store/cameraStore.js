// src/store/cameraStore.js
import { proxy } from "valtio";

export const cameraState = proxy({
  pos: [0, 2, 8],
  lookAt: [0, 0, 0],
  fov: 60
});

export const moveCameraTo = (pos = [0,2,8], lookAt = [0,0,0]) => {
  cameraState.pos = pos;
  cameraState.lookAt = lookAt;
};
