export interface ComplyCubeWindow {
  ComplyCube?: {
    mount: (config: any) => any;
    unmount: () => void;
  };
}
