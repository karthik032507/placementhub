const path = require("path");
const multer = require("multer");
const StoredFile = require("../models/StoredFile");
const httpError = require("../utils/httpError");

const MAX_PDF_SIZE = 5 * 1024 * 1024; // 5 MB

// Accept only PDFs: the browser-reported MIME type AND the file extension must match.
function pdfFilter(req, file, cb) {
  const extension = path.extname(file.originalname).toLowerCase();
  const isPdf = file.mimetype === "application/pdf" && extension === ".pdf";
  if (!isPdf) return cb(httpError(400, "Only PDF files are allowed."));
  cb(null, true);
}

// memoryStorage keeps the upload in RAM as req.file.buffer and writes nothing to disk.
// Because nothing is persisted until a controller explicitly saves it, a request that
// fails validation leaves no orphan file behind.
const uploadPdf = multer({
  storage: multer.memoryStorage(),
  fileFilter: pdfFilter,
  limits: { fileSize: MAX_PDF_SIZE },
});

// Stores a Multer file and returns the descriptor to embed in the parent document.
async function saveUploadedFile(file) {
  const stored = await StoredFile.create({
    data: file.buffer,
    contentType: file.mimetype,
    originalName: file.originalname,
    size: file.size,
  });
  return { file: stored._id, originalName: file.originalname, size: file.size };
}

// Duplicates an existing stored file. Applying to a company copies the PDF so that
// deleting the resume from a profile later cannot break a submitted application.
async function copyStoredFile(fileId) {
  const source = await StoredFile.findById(fileId).select("+data");
  if (!source) throw httpError(404, "The stored file is no longer available.");
  const copy = await StoredFile.create({
    data: source.data,
    contentType: source.contentType,
    originalName: source.originalName,
    size: source.size,
  });
  return { file: copy._id, originalName: source.originalName, size: source.size };
}

// Best-effort delete; a missing file is not an error worth failing a request over.
async function deleteStoredFile(fileId) {
  if (!fileId) return;
  await StoredFile.deleteOne({ _id: fileId }).catch(() => {});
}

// Streams a stored PDF back to the browser as a download.
async function sendStoredFile(res, fileId, downloadName) {
  const stored = await StoredFile.findById(fileId).select("+data");
  if (!stored) throw httpError(404, "File is no longer available on the server.");

  res.setHeader("Content-Type", stored.contentType || "application/pdf");
  res.setHeader("Content-Length", stored.data.length);
  // Quotes and backslashes in a filename would break the header, so strip them.
  const safeName = String(downloadName || stored.originalName || "file.pdf").replace(/["\\]/g, "");
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
  res.send(stored.data);
}

module.exports = { uploadPdf, saveUploadedFile, copyStoredFile, deleteStoredFile, sendStoredFile, MAX_PDF_SIZE };
