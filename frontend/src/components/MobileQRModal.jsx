import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import "./MobileQRModal.css";

export default function MobileQRModal({ url, candidates = [], open, onClose }) {
  const options = useMemo(() => {
    const all = [{ url, address: "Recommended", interfaceName: "" }, ...(candidates || [])]
      .filter((item) => item?.url);
    const seen = new Set();
    return all.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  }, [url, candidates]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !options.length) return null;
  const selected = options[Math.min(selectedIndex, options.length - 1)] || options[0];
  const selectedUrl = selected.url;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(selectedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  };

  return (
    <div className="qr-overlay" onClick={onClose}>
      <div className="qr-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="qr-modal-title">
        <div className="qr-header">
          <div>
            <p className="eyebrow">Live Flutter Preview</p>
            <h2 id="qr-modal-title" className="qr-title">Scan to open this preview</h2>
          </div>
          <button type="button" className="qr-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="qr-wifi-notice">
          <span className="qr-wifi-dot" />
          <p>
            Your phone must be on the <strong>same Wi-Fi</strong> as this computer for a local URL.
          </p>
        </div>

        {options.length > 1 && (
          <div className="qr-network-options">
            <p className="qr-hint">
              If the first QR does not open, choose the Wi-Fi/LAN address that matches this computer.
            </p>
            <div className="qr-network-pills">
              {options.map((item, index) => (
                <button
                  key={item.url}
                  type="button"
                  className={`qr-network-pill ${index === selectedIndex ? "is-active" : ""}`}
                  onClick={() => setSelectedIndex(index)}
                >
                  {item.interfaceName || item.address || `Network ${index + 1}`}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="qr-box">
          <div className="qr-canvas-wrap">
            <QRCodeCanvas
              value={selectedUrl}
              size={196}
              level="H"
              includeMargin={false}
              fgColor="#17221f"
              bgColor="#ffffff"
            />
          </div>
        </div>

        <p className="qr-hint">
          Scan with your phone camera. The QR opens the exact built Flutter Web artifact.
        </p>
        <code className="qr-preview-url" title={selectedUrl}>
          {selectedUrl}
        </code>

        <div className="qr-actions">
          <button
            type="button"
            className={`qr-btn-copy ${copied ? "is-copied" : ""}`}
            onClick={copyLink}
          >
            {copied ? "✓ Copied!" : "⎘ Copy Link"}
          </button>
          <a className="qr-btn-open" href={selectedUrl} target="_blank" rel="noopener noreferrer">
            ↗ Open Link
          </a>
        </div>
      </div>
    </div>
  );
}