import api from "../api/axios";

// Protected files need the JWT, so a plain <a href> would not work.
// We fetch the file with Axios (which adds the Authorization header) and hand the blob to the browser.
export async function downloadFile(url, fileName = "file.pdf") {
  const res = await api.get(url, { responseType: "blob" });
  const blobUrl = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
}

// The resume attached to a submitted application
export function downloadResume(application) {
  return downloadFile(`/applications/${application._id}/resume`, application.resume?.originalName || "resume.pdf");
}

// A resume saved in the student's profile
export function downloadSavedResume(resume) {
  return downloadFile(`/users/resumes/${resume.id}/download`, resume.originalName || "resume.pdf");
}

// A company's job description PDF
export function downloadJobDescription(company) {
  return downloadFile(`/companies/${company._id}/job-description`, company.jobDescriptionFile?.originalName || "job-description.pdf");
}
