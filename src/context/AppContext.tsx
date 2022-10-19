import React, { createContext, useReducer } from "react";
import AppReducer from "./AppReducer";

import { vrmMap } from "../utils/constant";

export const AppContext = createContext<any>({});

interface AppProviderProp {
   children: React.ReactNode;
}

function AppProvider({ children }: AppProviderProp): JSX.Element {
   const initialState = {
      bgPath: "bg-[url('/src/asset/background/hkuMB.jpg')]",
      musicPath: "",
      windowSize: "large",
      vrmPath: vrmMap[Object.keys(vrmMap)[0]].vrmPath
   };

   const [state, dispatch] = useReducer(AppReducer, initialState);
   const { bgPath, musicPath, vrmPath, windowSize } = state;

   const setBgPath = (path: string): void => dispatch({
      type: "SET_BG_PATH",
      payload: path
   });

   const setMusicPath = (path: string): void => dispatch({
      type: "SET_MUSIC_PATH",
      payload: path
   });

   const setVrmPath = (path: string): void => dispatch({
      type: "SET_VRM_PATH",
      payload: path
   });

   const setWindowSize = (size: string): void => dispatch({
      type: "SET_WINDOW_SIZE",
      payload: size
   });

   const context = {
      bgPath: bgPath,
      setBgPath: setBgPath,
      musicPath: musicPath,
      setMusicPath: setMusicPath,
      vrmPath: vrmPath,
      setVrmPath: setVrmPath,
      windowSize: windowSize,
      setWindowSize: setWindowSize
   }

   return <AppContext.Provider value={context}>{children}</AppContext.Provider>;
}

export default AppProvider;
