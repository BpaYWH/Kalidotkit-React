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
   "1": "bg-[url('/src/asset/background/bg1.JPG')]",
   "2": "bg-[url('/src/asset/background/bg2.JPG')]",
   "3": "bg-[url('/src/asset/background/bg3.JPG')]",
   "4": "bg-[url('/src/asset/background/bg4.JPG')]",
   "5": "bg-[url('/src/asset/background/bg5.JPG')]",
   "6": "bg-[url('/src/asset/background/bg6.JPG')]",
   "7": "bg-[url('/src/asset/background/bg7.JPG')]",
   "8": "bg-[url('/src/asset/background/bg8.JPG')]",
   "9": "",
};

export const hotkeyMusicMap: IHotkeyMap = {
   "a": "",
   "s": "",
   "d": "",
};

export const vrmMap: IVrmMap = {
   Anya: {
      vrmPath: "/src/asset/model/anya.vrm",
      previewPath: "bg-[url('/src/asset/modelPreview/vrmPreview-anya.PNG')]",
   },
   Ashtra: {
      vrmPath:
         "/src/asset/model/ashtra.vrm",
      previewPath: "bg-[url('/src/asset/modelPreview/vrmPreview-ashtra.PNG')]",
   },
   student: {
      vrmPath:
         "/src/asset/model/AvatarSampleCstudent.vrm",
      previewPath: "bg-[url('/src/asset/modelPreview/AvatarSampleCstudent.png')]",
   },
   camome: {
      vrmPath:
         "/src/asset/model/camome.vrm",
      previewPath: "bg-[url('/src/asset/modelPreview/vrmPreview-camome.png')]",
   },
   VRoidVRM: {
      vrmPath:
         "/src/asset/model/VRoidVRM.vrm",
      previewPath: "bg-[url('/src/asset/modelPreview/VRoidVRM.png')]",
   },
};