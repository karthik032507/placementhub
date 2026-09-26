import { AlertTriangle } from "lucide-react";
import Modal from "./Modal";

// Confirmation for irreversible actions (withdraw, close company, deactivate admin).
export default function ConfirmDialog({ title, message, confirmText = "Confirm", danger = false, loading = false, onConfirm, onClose }) {
  return (
    <Modal
      onClose={onClose}
      locked={loading}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="button" className={`btn ${danger ? "btn-danger-solid" : "btn-accent"}`} onClick={onConfirm} disabled={loading}>
            {loading && <span className="spinner" />}
            {confirmText}
          </button>
        </>
      }
    >
      <div className="row gap-4" style={{ alignItems: "flex-start" }}>
        <div className="empty-icon" style={{ width: 48, height: 48, margin: 0, background: danger ? "var(--danger-soft)" : "var(--warning-soft)", color: danger ? "var(--danger)" : "var(--warning)", borderColor: "transparent" }}>
          <AlertTriangle size={22} />
        </div>
        <div>
          <h3 className="modal-title" style={{ fontSize: 17 }}>
            {title}
          </h3>
          <p className="text-2 mt-2" style={{ lineHeight: 1.55 }}>
            {message}
          </p>
        </div>
      </div>
    </Modal>
  );
}
