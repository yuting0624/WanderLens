interface ImageCaptureOptions {
  imageWidth?: number;
  imageHeight?: number;
}

declare class ImageCapture {
  constructor(videoTrack: MediaStreamTrack);
  takePhoto(options?: ImageCaptureOptions): Promise<Blob>;
  grabFrame(): Promise<ImageBitmap>;
  getPhotoCapabilities(): Promise<PhotoCapabilities>;
  getPhotoSettings(): Promise<PhotoSettings>;
}

interface PhotoCapabilities {
  redEyeReduction: RedEyeReduction;
  imageHeight: MediaSettingsRange;
  imageWidth: MediaSettingsRange;
  fillLightMode: FillLightMode[];
}

interface PhotoSettings {
  fillLightMode: FillLightMode;
  imageHeight: number;
  imageWidth: number;
  redEyeReduction: boolean;
}

interface MediaSettingsRange {
  max: number;
  min: number;
  step: number;
}

type RedEyeReduction = "never" | "always" | "controllable";
type FillLightMode = "auto" | "off" | "flash"; 