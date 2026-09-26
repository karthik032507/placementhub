import { useState } from "react";
import { Megaphone, AlertCircle, Send } from "lucide-react";
import Modal from "../../components/ui/Modal";
import api, { getErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";

// Admin sends a message to the ACTIVE applicants of one company
// (the backend skips REJECTED and WITHDRAWN applicants).
export default function SendUpdateModal({ company, onClose }) {
  const toast = useToast();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!message.trim()) return setError("Please write a message.");
    setSending(true);
    setError("");
    try {
      const res = await api.post(`/companies/${company._id}/notifications`, { message: message.trim() });
      if (res.data.data.sent === 0) toast.info(res.data.message);
      else toast.success(res.data.message);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Could not send the update."));
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal title="Send Company Update" subtitle={`Notifies active applicants of ${company.name}`} onClose={onClose} locked={sending}>
      <form className="stack gap-4" onSubmit={submit}>
        <div className="alert alert-info">
          <Megaphone size={17} />
          <span>Only students whose application is Applied, Shortlisted or Selected will receive this. Rejected and withdrawn applicants are not notified.</span>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={17} /> {error}
          </div>
        )}

        <div className="field">
          <label className="label" htmlFor="update-message">
            Message
          </label>
          <textarea id="update-message" className="textarea" maxLength={1000} placeholder="e.g. Technical interviews have been moved to 20 September at 10 AM in Seminar Hall 2." value={message} onChange={(e) => setMessage(e.target.value)} autoFocus />
          <span className="field-hint" style={{ textAlign: "right" }}>
            {message.length}/1000
          </span>
        </div>

        <div className="modal-footer" style={{ padding: "4px 0 0" }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={sending}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={sending || !message.trim()}>
            {sending ? <span className="spinner" /> : <Send size={16} />}
            {sending ? "Sending…" : "Send Update"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
