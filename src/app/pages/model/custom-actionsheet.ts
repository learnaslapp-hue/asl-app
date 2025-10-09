export class CustomActionSheetButton {
  text: string;
  cssClass?: string;
  handler?: () => Promise<void> | void;
}
