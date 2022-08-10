import { useContext, useEffect, useRef, useState } from "react";
import ReactPlayer from "react-player";

import { Utils, Face, Pose, Hand, TFace, TPose } from "kalidokit";
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
   TextureLoader,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { GLTFNode, VRMSchema } from "@pixiv/three-vrm";
import { VRM } from "@pixiv/three-vrm";
import { VRMUtils } from "@pixiv/three-vrm";
import {
   Holistic,
   POSE_CONNECTIONS,
   FACEMESH_TESSELATION,
   HAND_CONNECTIONS,
   Results,
} from "@mediapipe/holistic";
import { drawLandmarks, drawConnectors } from "@mediapipe/drawing_utils";
import { Camera } from "@mediapipe/camera_utils";

import { AppContext } from "../../context/AppContext";

function VRMPlatform(): JSX.Element {
   const { bgPath, musicPath, vrmPath } = useContext(AppContext);
   const videoRef = useRef(null);
   const skeletonRef = useRef(null);
   const vrmRef = useRef(null);

   const [webCam, setWebCam] = useState<Camera>();
   const [recordState, setRecordState] = useState<boolean>(false);
   const [vrmMediaRecorder, setVrmMediaRecorder] = useState<MediaRecorder>();
   const [webCamMediaRecorder, setWebCamMediaRecorder] =
      useState<MediaRecorder>();

   let vrmVideoChunk: Blob[] = [];
   let webCamVideoChunk: Blob[] = [];

   let currentVrm: VRM;

   const saveVrmVideo = (): void => {
      const vrmBlob = new Blob(vrmVideoChunk, { type: "video/mp4" });

      vrmVideoChunk = [];

      const vrmUrl = URL.createObjectURL(vrmBlob);

      const vrmLink = document.createElement("a");

      vrmLink.setAttribute("download", "VrmCapture.mp4");

      vrmLink.href = vrmUrl;

      document.body.appendChild(vrmLink);

      vrmLink.click();
   };
   const saveWebCamVideo = (): void => {
      const webCamBlob = new Blob(webCamVideoChunk, { type: "video/mp4" });
      webCamVideoChunk = [];
      const webCamUrl = URL.createObjectURL(webCamBlob);
      const webCamLink = document.createElement("a");
      webCamLink.setAttribute("download", "WebCamCapture.mp4");
      webCamLink.href = webCamUrl;
      document.body.appendChild(webCamLink);
      webCamLink.click();
   };
   const recordVrmData = (e: BlobEvent): void => {
      vrmVideoChunk.push(e.data);
   };
   const recordWebCamData = (e: BlobEvent): void => {
      webCamVideoChunk.push(e.data);
   };
   const startRecord = (): void => {
      vrmMediaRecorder?.start();
      webCamMediaRecorder?.start();
      setRecordState(true);
   };
   const stopRecord = (): void => {
      vrmMediaRecorder?.stop();
      webCamMediaRecorder?.stop();
      setRecordState(false);
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

      const renderer = new WebGLRenderer({
         alpha: true,
         canvas: vrmRef.current || undefined,
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);

      // vrmRef.current.appendChild(renderer.domElement);

      const orbitControls = new OrbitControls(camera, renderer.domElement);
      orbitControls.screenSpacePanning = true;
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
      loader.crossOrigin = "anonymous";

      loader.load(
         vrmPath,

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

      const textureLoader = new TextureLoader();
      const texture = textureLoader.load(bgPath);
      scene.background = texture;

      //* VRM helper function
      const rigPosition = (
         name: VRMSchema.HumanoidBoneName,
         position = { x: 0, y: 0, z: 0 },
         dampener = 1,
         lerpAmount = 0.3
      ): void => {
         if (!currentVrm) {
            return;
         }
         const Part = currentVrm.humanoid?.getBoneNode(
            VRMSchema.HumanoidBoneName[name]
         );
         if (!Part) {
            return;
         }
         const vector = new Vector3(
            position.x * dampener,
            position.y * dampener,
            position.z * dampener
         );
         Part.position.lerp(vector, lerpAmount);
      };
      const rigRotation = (
         name: VRMSchema.HumanoidBoneName,
         rotation = { x: 0, y: 0, z: 0 },
         dampener = 1,
         lerpAmount = 0.3
      ) => {
         if (!currentVrm) {
            return;
         }
         const Part: GLTFNode | null | undefined =
            currentVrm.humanoid?.getBoneNode(VRMSchema.HumanoidBoneName[name]);
         if (!Part) {
            return;
         }

         const euler: Euler = new Euler(
            rotation.x * dampener,
            rotation.y * dampener,
            rotation.z * dampener,
            rotation.rotationOrder || "XYZ"
         );
         const quaternion = new Quaternion().setFromEuler(euler);
         Part.quaternion.slerp(quaternion, lerpAmount);
      };
      const oldLookTarget = new Euler();
      const rigFace = (riggedFace: TFace | undefined): void => {
         if (!currentVrm) {
            return;
         }
         rigRotation(VRMSchema.HumanoidBoneName.Neck, riggedFace?.head, 0.7);

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

         let riggedPose: TPose | undefined,
            riggedLeftHand,
            riggedRightHand,
            riggedFace: TFace | undefined;

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
            rigRotation(
               VRMSchema.HumanoidBoneName.Hips,
               riggedPose?.Hips.rotation,
               0.7
            );
            rigPosition(
               VRMSchema.HumanoidBoneName.Hips,
               {
                  x: riggedPose?.Hips.position.x, // Reverse direction
                  y: riggedPose?.Hips.position.y + 1, // Add a bit of height
                  z: -riggedPose?.Hips.position.z, // Reverse direction
               },
               1,
               0.07
            );

            rigRotation(
               VRMSchema.HumanoidBoneName.Chest,
               riggedPose?.Spine,
               0.25,
               0.3
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.Spine,
               riggedPose?.Spine,
               0.45,
               0.3
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.RightUpperArm,
               riggedPose?.RightUpperArm,
               1,
               0.3
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.RightLowerArm,
               riggedPose?.RightLowerArm,
               1,
               0.3
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.LeftUpperArm,
               riggedPose?.LeftUpperArm,
               1,
               0.3
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.LeftLowerArm,
               riggedPose?.LeftLowerArm,
               1,
               0.3
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.LeftUpperLeg,
               riggedPose?.LeftUpperLeg,
               1,
               0.3
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.LeftLowerLeg,
               riggedPose?.LeftLowerLeg,
               1,
               0.3
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.RightUpperLeg,
               riggedPose?.RightUpperLeg,
               1,
               0.3
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.RightLowerLeg,
               riggedPose?.RightLowerLeg,
               1,
               0.3
            );
         }
         if (leftHandLandmarks) {
            riggedLeftHand = Hand.solve(leftHandLandmarks, "Left");
            rigRotation(VRMSchema.HumanoidBoneName.LeftHand, {
               z: riggedPose?.LeftHand.z,
               y: riggedLeftHand?.LeftWrist.y,
               x: riggedLeftHand?.LeftWrist.x,
            });
            rigRotation(
               VRMSchema.HumanoidBoneName.LeftRingProximal,
               riggedLeftHand?.LeftRingProximal
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.LeftRingIntermediate,
               riggedLeftHand?.LeftRingIntermediate
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.LeftRingDistal,
               riggedLeftHand?.LeftRingDistal
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.LeftIndexProximal,
               riggedLeftHand?.LeftIndexProximal
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.LeftIndexIntermediate,
               riggedLeftHand?.LeftIndexIntermediate
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.LeftIndexDistal,
               riggedLeftHand?.LeftIndexDistal
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.LeftMiddleProximal,
               riggedLeftHand?.LeftMiddleProximal
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.LeftMiddleIntermediate,
               riggedLeftHand?.LeftMiddleIntermediate
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.LeftMiddleDistal,
               riggedLeftHand?.LeftMiddleDistal
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.LeftThumbProximal,
               riggedLeftHand?.LeftThumbProximal
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.LeftThumbIntermediate,
               riggedLeftHand?.LeftThumbIntermediate
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.LeftThumbDistal,
               riggedLeftHand?.LeftThumbDistal
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.LeftLittleProximal,
               riggedLeftHand?.LeftLittleProximal
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.LeftLittleIntermediate,
               riggedLeftHand?.LeftLittleIntermediate
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.LeftLittleDistal,
               riggedLeftHand?.LeftLittleDistal
            );
         }
         if (rightHandLandmarks) {
            riggedRightHand = Hand.solve(rightHandLandmarks, "Right");
            rigRotation(VRMSchema.HumanoidBoneName.RightHand, {
               z: riggedPose.RightHand.z,
               y: riggedRightHand.RightWrist.y,
               x: riggedRightHand.RightWrist.x,
            });
            rigRotation(
               VRMSchema.HumanoidBoneName.RightRingProximal,
               riggedRightHand?.RightRingProximal
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.RightRingIntermediate,
               riggedRightHand?.RightRingIntermediate
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.RightRingDistal,
               riggedRightHand?.RightRingDistal
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.RightIndexProximal,
               riggedRightHand?.RightIndexProximal
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.RightIndexIntermediate,
               riggedRightHand?.RightIndexIntermediate
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.RightIndexDistal,
               riggedRightHand?.RightIndexDistal
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.RightMiddleProximal,
               riggedRightHand?.RightMiddleProximal
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.RightMiddleIntermediate,
               riggedRightHand?.RightMiddleIntermediate
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.RightMiddleDistal,
               riggedRightHand?.RightMiddleDistal
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.RightThumbProximal,
               riggedRightHand?.RightThumbProximal
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.RightThumbIntermediate,
               riggedRightHand?.RightThumbIntermediate
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.RightThumbDistal,
               riggedRightHand?.RightThumbDistal
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.RightLittleProximal,
               riggedRightHand?.RightLittleProximal
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.RightLittleIntermediate,
               riggedRightHand?.RightLittleIntermediate
            );
            rigRotation(
               VRMSchema.HumanoidBoneName.RightLittleDistal,
               riggedRightHand?.RightLittleDistal
            );
         }
      };

      const drawResults = (results: Results) => {
         guideCanvas.width = videoElement?.videoWidth || 0;
         guideCanvas.height = videoElement?.videoHeight || 0;
         let canvasCtx = guideCanvas.getContext("2d");
         canvasCtx.save();
         canvasCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
         // Use `Mediapipe` drawing functions
         drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
            color: "#00cff7",
            lineWidth: 4,
         });
         drawLandmarks(canvasCtx, results.poseLandmarks, {
            color: "#ff0364",
            lineWidth: 2,
         });
         drawConnectors(
            canvasCtx,
            results.faceLandmarks,
            FACEMESH_TESSELATION,
            {
               color: "#C0C0C070",
               lineWidth: 1,
            }
         );
         if (results.faceLandmarks && results.faceLandmarks.length === 478) {
            //draw pupils
            drawLandmarks(
               canvasCtx,
               [results.faceLandmarks[468], results.faceLandmarks[468 + 5]],
               {
                  color: "#ffe603",
                  lineWidth: 2,
               }
            );
         }
         drawConnectors(
            canvasCtx,
            results.leftHandLandmarks,
            HAND_CONNECTIONS,
            {
               color: "#eb1064",
               lineWidth: 5,
            }
         );
         drawLandmarks(canvasCtx, results.leftHandLandmarks, {
            color: "#00cff7",
            lineWidth: 2,
         });
         drawConnectors(
            canvasCtx,
            results.rightHandLandmarks,
            HAND_CONNECTIONS,
            {
               color: "#22c3e3",
               lineWidth: 5,
            }
         );
         drawLandmarks(canvasCtx, results.rightHandLandmarks, {
            color: "#ff0364",
            lineWidth: 2,
         });
      };

      const onResults = (results: Results) => {
         drawResults(results);
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

      const videoElement = videoRef.current;
      const guideCanvas = skeletonRef.current;

      setWebCam(
         new Camera(videoElement, {
            onFrame: async () => {
               await holistic.send({ image: videoElement });
            },
            width: 480,
            height: 320,
         })
      );

      return () => {
         console.log("cleaning up Scene");
      };
   }, []);

   useEffect(() => {
      if (webCam) {
         webCam.start();
      }
   }, [webCam]);

   useEffect(() => {
      if (vrmRef.current) {
         const vrmCanvasStream = vrmRef.current.captureStream(30);
         const vrmRecorder = new MediaRecorder(vrmCanvasStream);
         vrmRecorder.ondataavailable = recordVrmData;
         vrmRecorder.onstop = saveVrmVideo;
         setVrmMediaRecorder(vrmRecorder);
      }
   }, [vrmRef]);
   useEffect(() => {
      if (videoRef.current) {
         const webCamStream = videoRef.current.captureStream(30);
         const webCamRecorder = new MediaRecorder(webCamStream);
         webCamRecorder.ondataavailable = recordWebCamData;
         webCamRecorder.onstop = saveWebCamVideo;
         setWebCamMediaRecorder(webCamRecorder);
      }
   }, [videoRef]);

   return (
      <>
         <video id="webCam" ref={videoRef} className="-scale-x-100 rounded shadow absolute" />
         <canvas ref={skeletonRef} className="-scale-x-100 rounded shadow" />

         <p>{recordState ? "Recording" : "Not recording"}</p>
         <button onClick={startRecord}>Start Record</button>
         <button onClick={stopRecord}>Stop Record</button>

         <div className="absolute">
            <canvas ref={vrmRef} className={`${bgPath}`} />
         </div>

         <ReactPlayer url={musicPath} playing loop controls={false} hidden />
      </>
   );
}

export default VRMPlatform;
