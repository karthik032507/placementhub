const mongoose = require("mongoose");

// The actual bytes of an uploaded PDF.
//
// Why the database and not the server's disk?
// Free hosting platforms give you an ephemeral filesystem: it is wiped on every
// restart and redeploy. A resume uploaded today would 404 next week. Keeping the
// bytes in MongoDB means uploads survive restarts and the app works on one server
// or ten. Documents are capped at 16 MB and uploads at 5 MB, so a PDF always fits.
// At real scale the right answer is object storage such as S3, with only the URL here.
const storedFileSchema = new mongoose.Schema(
  {
    // select:false so listing files never drags megabytes of binary into memory.
    data: { type: Buffer, required: true, select: false },
    contentType: { type: String, default: "application/pdf" },
    originalName: { type: String, required: true },
    size: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: "uploadedAt", updatedAt: false } }
);

const StoredFile = mongoose.model("StoredFile", storedFileSchema);
module.exports = StoredFile;
