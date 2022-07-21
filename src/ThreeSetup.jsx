import React from "react";
import { useEffect, useRef, useState } from "react";

import { Utils, Face, Pose, Hand } from "kalidokit";
import { lerp } from "three/src/math/MathUtils";
import {
   Euler,
   Quaternion,
   Vector3,
   WebGLRenderer,
   PerspectiveCamera,
   Scene,
   DirectionalLight,
   Clock,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VRMSchema } from "@pixiv/three-vrm";
import { VRM } from "@pixiv/three-vrm";
import { VRMUtils } from "@pixiv/three-vrm";
import { Holistic } from "@mediapipe/holistic";
import { Camera } from "@mediapipe/camera_utils";

export default function ThreeSetup() {
   const videoRef = useRef(null);
   const vrmRef = useRef(null);

   const [isStart, setIsStart] = useState(false);
   const [webCamera, setWebCamera] = useState(null);

   let currentVrm;

   const setTracking = () => {
      if (!webCamera) {
         console.log(webCamera);
         console.log("Camera is not ready");
         return;
      }

      if (isStart) {
         webCamera.stop();
         setIsStart(false);
      } else {
         webCamera.start();
         setIsStart(true);
      }
   };

   //***************** Three js basic element setup *******************//
   useEffect(() => {
      const clamp = Utils.clamp;
      const scene = new Scene();

      const camera = new PerspectiveCamera(
         35,
         window.innerWidth / window.innerHeight,
         0.1,
         1000
      );
      camera.position.set(0.0, 1.4, 0.7);

      const renderer = new WebGLRenderer({ alpha: true }); // html body becomes background
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);

      vrmRef.current.appendChild(renderer.domElement);

      const orbitControls = new OrbitControls(camera, renderer.domElement);
      orbitControls.screenSpacePaninng = true;
      orbitControls.target.set(0.0, 1.4, 0.0);
      orbitControls.update();

      const light = new DirectionalLight(0xffffff);
      light.position.set(1.0, 1.0, 1.0).normalize();
      scene.add(light);

      const clock = new Clock();

      function animate() {
         requestAnimationFrame(animate);

         if (currentVrm) {
            currentVrm.update(clock.getDelta());
         }
         renderer.render(scene, camera);
      }
      animate();

      //************************ VRM character setup *******************************//
      const loader = new GLTFLoader();
      // loader.crossOrigin = "anonymous";

      loader.load(
         // "https://cdn.glitch.com/29e07830-2317-4b15-a044-135e73c7f840%2FAshtra.vrm?v=1630342336981",
         "./asset/anya.vrm",

         (gltf) => {
            VRMUtils.removeUnnecessaryJoints(gltf.scene);

            VRM.from(gltf).then((vrm) => {
               scene.add(vrm.scene);
               currentVrm = vrm;
               currentVrm.scene.rotation.y = Math.PI;
            });
         },

         (progress) =>
            console.log(
               "Loading model...",
               100.0 * (progress.loaded / progress.total),
               "%"
            ),

         (error) => console.error(error)
      );

      //* VRM helper function
      const rigPosition = (
         name,
         position = { x: 0, y: 0, z: 0 },
         dampener = 1,
         lerpAmount = 0.3
      ) => {
         if (!currentVrm) {
            return;
         }
         const Part = currentVrm.humanoid.getBoneNode(
            VRMSchema.HumanoidBoneName[name]
         );
         if (!Part) {
            return;
         }
         let vector = new Vector3(
            position.x * dampener,
            position.y * dampener,
            position.z * dampener
         );
         Part.position.lerp(vector, lerpAmount);
      };
      const rigRotation = (
         name,
         rotation = { x: 0, y: 0, z: 0 },
         dampener = 1,
         lerpAmount = 0.3
      ) => {
         if (!currentVrm) {
            return;
         }
         const Part = currentVrm.humanoid.getBoneNode(
            VRMSchema.HumanoidBoneName[name]
         );
         if (!Part) {
            return;
         }

         let euler = new Euler(
            rotation.x * dampener,
            rotation.y * dampener,
            rotation.z * dampener,
            rotation.rotationOrder || "XYZ"
         );
         let quaternion = new Quaternion().setFromEuler(euler);
         Part.quaternion.slerp(quaternion, lerpAmount);
      };
      let oldLookTarget = new Euler();
      const rigFace = (riggedFace) => {
         if (!currentVrm) {
            return;
         }
         rigRotation("Neck", riggedFace.head, 0.7);

         const Blendshape = currentVrm.blendShapeProxy;
         const PresetName = VRMSchema.BlendShapePresetName;

         riggedFace.eye.l = lerp(
            clamp(1 - riggedFace.eye.l, 0, 1),
            Blendshape.getValue(PresetName.Blink),
            0.5
         );
         riggedFace.eye.r = lerp(
            clamp(1 - riggedFace.eye.r, 0, 1),
            Blendshape.getValue(PresetName.Blink),
            0.5
         );
         riggedFace.eye = Face.stabilizeBlink(
            riggedFace.eye,
            riggedFace.head.y
         );
         Blendshape.setValue(PresetName.Blink, riggedFace.eye.l);

         Blendshape.setValue(
            PresetName.I,
            lerp(
               riggedFace.mouth.shape.I,
               Blendshape.getValue(PresetName.I),
               0.5
            )
         );
         Blendshape.setValue(
            PresetName.A,
            lerp(
               riggedFace.mouth.shape.A,
               Blendshape.getValue(PresetName.A),
               0.5
            )
         );
         Blendshape.setValue(
            PresetName.E,
            lerp(
               riggedFace.mouth.shape.E,
               Blendshape.getValue(PresetName.E),
               0.5
            )
         );
         Blendshape.setValue(
            PresetName.O,
            lerp(
               riggedFace.mouth.shape.O,
               Blendshape.getValue(PresetName.O),
               0.5
            )
         );
         Blendshape.setValue(
            PresetName.U,
            lerp(
               riggedFace.mouth.shape.U,
               Blendshape.getValue(PresetName.U),
               0.5
            )
         );

         let lookTarget = new Euler(
            lerp(oldLookTarget.x, riggedFace.pupil.y, 0.4),
            lerp(oldLookTarget.y, riggedFace.pupil.x, 0.4),
            0,
            "XYZ"
         );
         oldLookTarget.copy(lookTarget);
         currentVrm.lookAt.applyer.lookAt(lookTarget);
      };

      //*********** VRM Character Animator ***********//
      const animateVRM = (vrm, results) => {
         if (!vrm) return;

         let riggedPose, riggedLeftHand, riggedRightHand, riggedFace;

         const faceLandmarks = results.faceLandmarks;
         const pose3DLandmarks = results.ea;
         const pose2DLandmarks = results.poseLandmarks;
         const leftHandLandmarks = results.rightHandLandmarks;
         const rightHandLandmarks = results.leftHandLandmarks;

         if (faceLandmarks) {
            riggedFace = Face.solve(faceLandmarks, {
               runtime: "mediapipe",
               video: videoElement,
            });
            rigFace(riggedFace);
         }
         if (pose2DLandmarks && pose3DLandmarks) {
            riggedPose = Pose.solve(pose3DLandmarks, pose2DLandmarks, {
               runtime: "mediapipe",
               video: videoElement,
            });
            rigRotation("Hips", riggedPose.Hips.rotation, 0.7);
            rigPosition(
               "Hips",
               {
                  x: riggedPose.Hips.position.x, // Reverse direction
                  y: riggedPose.Hips.position.y + 1, // Add a bit of height
                  z: -riggedPose.Hips.position.z, // Reverse direction
               },
               1,
               0.07
            );

            rigRotation("Chest", riggedPose.Spine, 0.25, 0.3);
            rigRotation("Spine", riggedPose.Spine, 0.45, 0.3);

            rigRotation("RightUpperArm", riggedPose.RightUpperArm, 1, 0.3);
            rigRotation("RightLowerArm", riggedPose.RightLowerArm, 1, 0.3);
            rigRotation("LeftUpperArm", riggedPose.LeftUpperArm, 1, 0.3);
            rigRotation("LeftLowerArm", riggedPose.LeftLowerArm, 1, 0.3);

            rigRotation("LeftUpperLeg", riggedPose.LeftUpperLeg, 1, 0.3);
            rigRotation("LeftLowerLeg", riggedPose.LeftLowerLeg, 1, 0.3);
            rigRotation("RightUpperLeg", riggedPose.RightUpperLeg, 1, 0.3);
            rigRotation("RightLowerLeg", riggedPose.RightLowerLeg, 1, 0.3);
         }
         if (leftHandLandmarks) {
            riggedLeftHand = Hand.solve(leftHandLandmarks, "Left");
            rigRotation("LeftHand", {
               z: riggedPose.LeftHand.z,
               y: riggedLeftHand.LeftWrist.y,
               x: riggedLeftHand.LeftWrist.x,
            });
            rigRotation("LeftRingProximal", riggedLeftHand.LeftRingProximal);
            rigRotation(
               "LeftRingIntermediate",
               riggedLeftHand.LeftRingIntermediate
            );
            rigRotation("LeftRingDistal", riggedLeftHand.LeftRingDistal);
            rigRotation("LeftIndexProximal", riggedLeftHand.LeftIndexProximal);
            rigRotation(
               "LeftIndexIntermediate",
               riggedLeftHand.LeftIndexIntermediate
            );
            rigRotation("LeftIndexDistal", riggedLeftHand.LeftIndexDistal);
            rigRotation(
               "LeftMiddleProximal",
               riggedLeftHand.LeftMiddleProximal
            );
            rigRotation(
               "LeftMiddleIntermediate",
               riggedLeftHand.LeftMiddleIntermediate
            );
            rigRotation("LeftMiddleDistal", riggedLeftHand.LeftMiddleDistal);
            rigRotation("LeftThumbProximal", riggedLeftHand.LeftThumbProximal);
            rigRotation(
               "LeftThumbIntermediate",
               riggedLeftHand.LeftThumbIntermediate
            );
            rigRotation("LeftThumbDistal", riggedLeftHand.LeftThumbDistal);
            rigRotation(
               "LeftLittleProximal",
               riggedLeftHand.LeftLittleProximal
            );
            rigRotation(
               "LeftLittleIntermediate",
               riggedLeftHand.LeftLittleIntermediate
            );
            rigRotation("LeftLittleDistal", riggedLeftHand.LeftLittleDistal);
         }
         if (rightHandLandmarks) {
            riggedRightHand = Hand.solve(rightHandLandmarks, "Right");
            rigRotation("RightHand", {
               z: riggedPose.RightHand.z,
               y: riggedRightHand.RightWrist.y,
               x: riggedRightHand.RightWrist.x,
            });
            rigRotation("RightRingProximal", riggedRightHand.RightRingProximal);
            rigRotation(
               "RightRingIntermediate",
               riggedRightHand.RightRingIntermediate
            );
            rigRotation("RightRingDistal", riggedRightHand.RightRingDistal);
            rigRotation(
               "RightIndexProximal",
               riggedRightHand.RightIndexProximal
            );
            rigRotation(
               "RightIndexIntermediate",
               riggedRightHand.RightIndexIntermediate
            );
            rigRotation("RightIndexDistal", riggedRightHand.RightIndexDistal);
            rigRotation(
               "RightMiddleProximal",
               riggedRightHand.RightMiddleProximal
            );
            rigRotation(
               "RightMiddleIntermediate",
               riggedRightHand.RightMiddleIntermediate
            );
            rigRotation("RightMiddleDistal", riggedRightHand.RightMiddleDistal);
            rigRotation(
               "RightThumbProximal",
               riggedRightHand.RightThumbProximal
            );
            rigRotation(
               "RightThumbIntermediate",
               riggedRightHand.RightThumbIntermediate
            );
            rigRotation("RightThumbDistal", riggedRightHand.RightThumbDistal);
            rigRotation(
               "RightLittleProximal",
               riggedRightHand.RightLittleProximal
            );
            rigRotation(
               "RightLittleIntermediate",
               riggedRightHand.RightLittleIntermediate
            );
            rigRotation("RightLittleDistal", riggedRightHand.RightLittleDistal);
         }
      };

      const onResults = (results) => {
         animateVRM(currentVrm, results);
      };

      const holistic = new Holistic({
         locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1635989137/${file}`;
         },
      });

      holistic.setOptions({
         modelComplexity: 1,
         smoothLandmarks: true,
         minDetectionConfidence: 0.7,
         minTrackingConfidence: 0.7,
         refineFaceLandmarks: true,
      });
      holistic.onResults(onResults);

      let videoElement = videoRef.current;
      setWebCamera(
         new Camera(videoElement, {
            onFrame: async () => {
               await holistic.send({ image: videoElement });
            },
            width: 1024,
            height: 768,
         })
      );

      return () => {
         console.log("cleaning up Scene");
         scene.remove(currentVrm);
      };
   }, []);

   return (
      <>
         <video ref={videoRef} className="input_video" hidden />
         <button onClick={setTracking}>{isStart ? "Stop" : "Start"}</button>
         <div className="absoluteDiv">
            <div ref={vrmRef} className="vrm" />
         </div>
      </>
   );
}
