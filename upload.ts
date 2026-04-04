import { uploadToServer } from "./uploader.ts";

async function upload() {
  const serverName = process.argv[2] || "main"; // default to main server
  const branch = process.argv[3]; // optional branch override

  try {
    await uploadToServer(serverName, branch);
  } catch (err) {
    console.error("Error uploading:", err);
    process.exit(1);
  }
}

upload();
