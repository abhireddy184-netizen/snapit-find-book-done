/**
 * Hand-off for a photo captured from the home composer's camera button so
 * /snap can pick it up and run the same diagnosis flow it uses for its own
 * camera input. Module-level (not sessionStorage) because a File/Blob can't
 * be serialized, and the navigation to /snap happens in the same tab.
 */
let pendingFile: File | null = null;

export function setPendingPhoto(file: File): void {
  pendingFile = file;
}

/** Consumes (and clears) the pending photo, if any. */
export function takePendingPhoto(): File | null {
  const file = pendingFile;
  pendingFile = null;
  return file;
}
