interface AppState {
   bgPath: string;
   musicPath: string;
   vrmPath: string;
   windowSize: string;
}

interface AppAction {
   type: string;
   payload: string;
}

const AppReducer = (state: AppState, action: AppAction): AppState => {
   switch (action.type) {
      case "SET_BG_PATH":
         return {
            ...state,
            bgPath: action.payload,
         };

      case "SET_MUSIC_PATH":
         return {
            ...state,
            musicPath: action.payload,
         };

      case "SET_VRM_PATH":
         return {
            ...state,
            vrmPath: action.payload
         };

      case "SET_WINDOW_SIZE":
         return {
            ...state,
            windowSize: action.payload
         };
   

      default:
         return state;
   }
};

export default AppReducer;
