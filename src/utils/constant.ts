interface IHotkeyMap {
   [keyName: string]: string;
}

interface IVrmAsset {
   vrmPath: string;
   previewPath: string;
}
interface IVrmMap {
   [vrmName: string]: IVrmAsset;
}

export const hotkeyBgMap: IHotkeyMap = {
   "1": "bg-[url('/src/asset/background/bg1.jpg')]",
   "2": "bg-[url('/src/asset/background/bg2.jpg')]",
   "3": "bg-[url('/src/asset/background/bg3.jpeg')]",
   "4": "bg-[url('/src/asset/background/bg4.jpeg')]",
   "5": "",
};

export const hotkeyMusicMap: IHotkeyMap = {
   "6": "/src/asset/bgm/bgm1.mp3",
   "7": "/src/asset/bgm/bgm2.mp3",
   "0": "",
};

export const vrmMap: IVrmMap = {
   Anya: {
      vrmPath: "/src/asset/model/anya.vrm",
      previewPath: "bg-[url('/src/asset/modelPreview/vrmPreview-anya.PNG')]",
   },
   Ashtra: {
      vrmPath:
         "https://cdn.glitch.com/29e07830-2317-4b15-a044-135e73c7f840%2FAshtra.vrm?v=1630342336981",
      previewPath: "bg-[url('/src/asset/modelPreview/vrmPreview-ashtra.PNG')]",
   },
};