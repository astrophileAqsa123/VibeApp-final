import "./shared.css";
import "./RemixToast.css";

export default function RemixToast({ message }) {
  if (!message) return null;

  return (
    <div className="remix-toast">
      <span className="remix-spinner" />
      <span>{message}</span>
    </div>
  );
}
