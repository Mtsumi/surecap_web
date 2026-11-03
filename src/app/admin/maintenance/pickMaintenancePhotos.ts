/** Open native file picker outside React's tree (avoids hydration / removeChild bugs). */
export function pickMaintenancePhotos(options: {
  multiple?: boolean;
  capture?: boolean;
  onFiles: (files: File[]) => void;
}): void {
  if (typeof document === "undefined") return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  if (options.multiple) input.multiple = true;
  if (options.capture) input.setAttribute("capture", "environment");
  input.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;height:0;width:0;";
  document.body.appendChild(input);
  input.addEventListener(
    "change",
    () => {
      const list = input.files;
      if (list?.length) options.onFiles(Array.from(list));
      input.remove();
    },
    { once: true }
  );
  input.click();
}
