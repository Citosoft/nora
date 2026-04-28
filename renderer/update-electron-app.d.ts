declare module "update-electron-app" {
  export enum UpdateSourceType {
    ElectronPublicUpdateService = "ElectronPublicUpdateService"
  }

  export function updateElectronApp(options: {
    updateSource: {
      type: UpdateSourceType;
      repo: string;
    };
    updateInterval?: string;
    logger?: {
      log?(message: string): void;
      info?(message: string): void;
      warn?(message: string): void;
      error?(message: string): void;
    };
    notifyUser?: boolean;
  }): void;
}
