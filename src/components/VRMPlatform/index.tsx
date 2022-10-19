import React from "react";
import { useContext, useEffect, useRef, useState } from "react";
import ReactPlayer from "react-player";
import { Link } from "react-router-dom";

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
   TextureLoader,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VRMSchema } from "@pixiv/three-vrm";
import { VRM } from "@pixiv/three-vrm";
import { VRMUtils } from "@pixiv/three-vrm";
import {
   Holistic,
   POSE_CONNECTIONS,
   FACEMESH_TESSELATION,
   HAND_CONNECTIONS,
} from "@mediapipe/holistic";
import { drawLandmarks, drawConnectors } from "@mediapipe/drawing_utils";
import { Camera } from "@mediapipe/camera_utils";

import CircleIcon from "@mui/icons-material/Circle";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

import { AppContext } from "../../context/AppContext";
import { Button } from "@mui/material";

export default function VRMPlatform() {
   const videoRef = useRef(null);
   const skeletonRef = useRef(null);
   const vrmRef = useRef(null);

   const { bgPath, musicPath, vrmPath, windowSize } = useContext(AppContext);
   let size;
   if (windowSize == "large"){
      size = 480;
   }else{
      size = 240;
   }
   console.log("Window size: "+windowSize)

   const [webCam, setWebCam] = useState<Camera>();
   const [isRecording, setIsRecording] = useState<boolean>(false);
   const [vrmMediaRecorder, setVrmMediaRecorder] = useState();
   const [webCamMediaRecorder, setWebCamMediaRecorder] = useState();
   const [windowWidth, setWindowWidth] = useState(480)
   // let [windowHeight, setWindowHeight] = useState(360)

   let vrmVideoChunk = [];
   let webCamVideoChunk = [];
   let currentVrm: VRM;

   const largerWin = () => {
      // setWindowHeight(Math.ceil(windowHeight * 1.1))
      setWindowWidth(Math.ceil(windowWidth * 1.1))
      console.log(windowWidth)
   };

   const smallerWin = () => {
      // setWindowHeight(Math.ceil(windowHeight / 1.1))
      setWindowWidth(Math.ceil(windowWidth / 1.1))
      console.log(windowWidth)
   };

   const saveVrmVideo = () => {
      let vrmBlob = new Blob(vrmVideoChunk, { type: "video/mp4" });

      vrmVideoChunk = [];

      const vrmUrl = URL.createObjectURL(vrmBlob);

      const vrmLink = document.createElement("a");

      vrmLink.setAttribute("download", "VrmCapture.mp4");

      vrmLink.href = vrmUrl;

      document.body.appendChild(vrmLink);

      vrmLink.click();
   };
   const saveWebCamVideo = () => {
      let webCamBlob = new Blob(webCamVideoChunk, { type: "video/mp4" });
      webCamVideoChunk = [];
      const webCamUrl = URL.createObjectURL(webCamBlob);
      const webCamLink = document.createElement("a");
      webCamLink.setAttribute("download", "WebCamCapture.mp4");
      webCamLink.href = webCamUrl;
      document.body.appendChild(webCamLink);
      webCamLink.click();
   };
   const recordVrmData = (e) => {
      vrmVideoChunk.push(e.data);
   };
   const recordWebCamData = (e) => {
      webCamVideoChunk.push(e.data);
   };
   const controlRecording = (): void => {
      if (isRecording) {
         vrmMediaRecorder.stop();
         webCamMediaRecorder.stop();
         setIsRecording(false);
         return;
      }
      vrmMediaRecorder.start();
      webCamMediaRecorder.start();
      setIsRecording(true);
      return;
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
         canvas: vrmRef.current,
      }); // html body becomes background
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);

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
      const texture = textureLoader.load("");
      scene.background = texture;

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

      const drawResults = (results) => {
         guideCanvas.width = videoElement.videoWidth;
         guideCanvas.height = videoElement.videoHeight;
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

      const onResults = (results) => {
         drawResults(results);
         animateVRM(currentVrm, results);
      };

      const holistic = new Holistic({
         locateFile: (file) => {
            return `../../../node_modules/@mediapipe/holistic/${file}`;
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
      let guideCanvas = skeletonRef.current;
      let webCamera: Camera;

      if (videoElement) {
         webCamera = new Camera(videoElement, {
            onFrame: async () => {
               await holistic.send({ image: videoElement });
            },
            width: size,
            height: size * 0.75,
         });

         setWebCam(webCamera);
      }

      return () => {
         webCamera.stop();
      };
   }, []);

   useEffect(() => {
      webCam?.start();
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
         <div className="absolute top-8 left-8">
            <Link to="/">
               <Button variant="contained">
                  <ArrowBackIosNewIcon />
               </Button>
            </Link>
         </div>

         <video
            ref={videoRef}
            className={`absolute rounded shadow -scale-x-100 top-8 right-8 z-1 w-[${windowWidth}px]`}
            // className={`absolute rounded shadow -scale-x-100 top-8 right-8 z-1 w-[${windowWidth}px] h-[${windowHeight}px]`}
         />
         <canvas
            ref={skeletonRef}
            className={`absolute rounded shadow -scale-x-100 top-8 right-8 z-1 w-[${windowWidth}px]`}
            // className={`absolute rounded shadow -scale-x-100 top-8 right-8 z-1 w-[${windowWidth}px] h-[${windowHeight}px]`}
         />
      {/* <Button
            variant="contained"
            color="primary"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    
            startIcon={ <AddIcon/>}
            onClick={largerWin}
         >
         </Button>
         <Button
            variant="contained"
            color="primary"
            startIcon={ <RemoveIcon/>}
            onClick={smallerWin}
         >
         </Button> */}

         <div className="absolute bottom-8 right-8">
            <Button
               variant="contained"
               color="error"
               startIcon={isRecording ? <PauseCircleIcon /> : <CircleIcon />}
               onClick={controlRecording}
            >
               Rec
            </Button>
         </div>

         <canvas
            ref={vrmRef}
            className={`absolute bg-cover bg-no-repeat ${bgPath} z-[-1]`}
         />

         <ReactPlayer url={musicPath} playing loop controls={false} hidden />
      </>
   );
}
