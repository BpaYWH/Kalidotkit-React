import React, { createContext, useReducer } from "react";
import AppReducer from "./AppReducer";

export const AppContext = createContext<any>({});

interface AppProviderProp {
   children: React.ReactNode;
}

function AppProvider({ children }: AppProviderProp): JSX.Element {
   const initialState = {
      bgPath: "",
      musicPath: "",
      vrmPath: ""
   };

   const [state, dispatch] = useReducer(AppReducer, initialState);
   const { bgPath, musicPath, vrmPath } = state;

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

   const context = {
      bgPath: bgPath,
      setBgPath: setBgPath,
      musicPath: musicPath,
      setMusicPath: setMusicPath,
      vrmPath: vrmPath,
      setVrmPath: setVrmPath
   }

   return <AppContext.Provider value={context}>{children}</AppContext.Provider>;
}

export default AppProvider;
