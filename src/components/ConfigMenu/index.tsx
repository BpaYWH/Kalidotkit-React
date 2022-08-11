import { useContext, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Link } from "react-router-dom";
import ReactPlayer from "react-player";
import { Camera } from "@mediapipe/camera_utils";

import { SelectChangeEvent, Typography } from "@mui/material";
import { Select, MenuItem } from "@mui/material";
import Button from "@mui/material/Button";

import { AppContext } from "../../context/AppContext";
import { hotkeyBgMap, hotkeyMusicMap, vrmMap } from "../../utils/constant";

function CongfigMenu(): JSX.Element {
   const { bgPath, setBgPath, musicPath, setMusicPath, setVrmPath } =
      useContext(AppContext);
   const [vrmPreview, setVrmPreview] = useState<string>(
      vrmMap[Object.keys(vrmMap)[0]].previewPath
   );
   const [isTestingWebCam, setIsTestingWebCam] = useState<boolean>(false);
   const [webCam, setWebCam] = useState<Camera>();

   const webCamRef = useRef(null);

   Object.keys(hotkeyBgMap).map((keyName) =>
      useHotkeys(keyName, () => setBgPath(hotkeyBgMap[keyName]))
   );
   Object.keys(hotkeyMusicMap).map((keyName) =>
      useHotkeys(keyName, () => setMusicPath(hotkeyMusicMap[keyName]))
   );

   const onSelectVrmModel = (e: SelectChangeEvent): void => {
      setVrmPath(vrmMap[e.target.value].vrmPath);
      setVrmPreview(vrmMap[e.target.value].previewPath);
   };

   useEffect(() => {
      if (webCam) {
         if (isTestingWebCam) {
            webCam.start();
         } else {
            webCam.stop();
         }
      }
   }, [isTestingWebCam]);

   useEffect(() => {
      const webCamEle = webCamRef.current;
      let camera: Camera;
      if (webCamEle) {
         camera = new Camera(webCamEle, {
            onFrame: () => null,
            width: 360,
            height: 240,
         });
         setWebCam(camera);
      }
      return () => {
         camera.stop();
      };
   }, []);

   return (
      <div className={`w-screen h-screen bg-cover ${bgPath} pt-[10vh]`}>
         <div className="mx-auto w-6/12 bg-slate-100/80 border rounded shadow py-8 px-16 min-w-[600px]">
            <Typography id="title" variant="h4" className="text-center">
               Platform Setting
            </Typography>

            <div id="content" className="mt-16 flex justify-between">
               <div id="vrm-preview-div">
                  <Typography className="text-center" variant="h6">
                     {" "}
                     VRM Image Preview{" "}
                  </Typography>
                  <div
                     className={`w-[240px] h-[360px] mt-8 bg-center bg-no-repeat bg-contain ${vrmPreview} rounded`}
                  />
               </div>

               <div id="config-div" className="flex flex-col gap-y-8">
                  <div id="model-select" className="flex gap-x-4">
                     <Typography variant="h6">Model:</Typography>
                     <Select
                        className="w-[120px]"
                        defaultValue={Object.keys(vrmMap)[0]}
                        onChange={(e) => onSelectVrmModel(e)}
                        size="small"
                     >
                        {Object.keys(vrmMap).map((vrm, index) => (
                           <MenuItem key={`vrmSelect-${index}`} value={vrm}>
                              {vrm}
                           </MenuItem>
                        ))}
                     </Select>
                  </div>

                  <video
                     id="webcam-preview"
                     className="-scale-x-100 rounded"
                     ref={webCamRef}
                  />

                  <Button
                     color={isTestingWebCam ? "error" : "primary"}
                     onClick={() => setIsTestingWebCam(!isTestingWebCam)}
                     variant="contained"
                  >
                     {isTestingWebCam ? "Stop Testing Camera" : "Test Camera"}
                  </Button>

                  <Link to="/platform">
                     <Button className="w-full" variant="contained">
                        Start
                     </Button>
                  </Link>
               </div>
            </div>
         </div>
         <ReactPlayer url={musicPath} playing loop controls={false} hidden />
      </div>
   );
}

export default CongfigMenu;
