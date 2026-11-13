import { useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { FiDownload, FiExternalLink, FiShield, FiX, FiSmartphone } from "react-icons/fi";

export default function ApkDownloadModal({
  open,
  onClose,
  pageUrl,
  qrUrl,
  qrCandidates = [],
  fileUrl,
  expiresAt,
  releaseSigned,
  mobileReachable,
  onInstall,
  installState,
}) {
  const [copied, setCopied] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const options = useMemo(() => {
    const all = [{ url: qrUrl || pageUrl, fileUrl, address: "Recommended" }, ...(qrCandidates || [])]
      .filter((item) => item?.url);
    const seen = new Set();
    return all.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  }, [qrUrl, pageUrl, fileUrl, qrCandidates]);

  if (!open || !pageUrl) return null;
  const selected = options[Math.min(selectedIndex, options.length - 1)] || { url: pageUrl, fileUrl };
  const mobileLink = selected.url;
  const expiryLabel = expiresAt ? new Date(expiresAt).toLocaleString() : "Soon";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(mobileLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard may be blocked */
    }
  };

  return (
    <div className="apk-modal-overlay" onClick={onClose}>
      <div className="apk-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="apk-modal-header">
          <div><p className="eyebrow">Android release</p><h2>Download / Install APK</h2></div>
          <button className="apk-modal-close" type="button" onClick={onClose} aria-label="Close"><FiX /></button>
        </div>

        <div className={`apk-signing-badge ${releaseSigned ? "secure" : "warning"}`}>
          <FiShield />
          <span>{releaseSigned ? "Signed with configured release keystore" : "Development signing — installable for testing; configure a release keystore before public distribution"}</span>
        </div>

        <div className="apk-modal-grid">
          <div className="apk-qr-panel">
            <div className="apk-qr-code">
              <QRCodeCanvas value={mobileLink} size={190} level="H" includeMargin={false} fgColor="#17221f" bgColor="#ffffff" />
            </div>
            <strong>Scan on Android</strong>
            <p>{mobileReachable === false ? "No phone-reachable backend address was detected. Set APK_PUBLIC_BASE_URL or use the same Wi-Fi." : "Scan to open the temporary APK download page on Android."}</p>
            {options.length > 1 && (
              <select value={selectedIndex} onChange={(e) => setSelectedIndex(Number(e.target.value))}>
                {options.map((item, index) => (
                  <option value={index} key={item.url}>{item.interfaceName || item.address || `Network ${index + 1}`}</option>
                ))}
              </select>
            )}
          </div>

          <div className="apk-download-panel">
            <div className="apk-download-meta">
              <div><span>Build</span><strong>Release APK</strong></div>
              <div><span>Link expires</span><strong>{expiryLabel}</strong></div>
              <div><span>Access</span><strong>Temporary secure link</strong></div>
            </div>

            <a className="apk-primary-download" href={selected.fileUrl || fileUrl || pageUrl}>
              <FiDownload /> Download APK
            </a>
            <a className="apk-secondary-open" href={mobileLink} target="_blank" rel="noopener noreferrer">
              <FiExternalLink /> Open download page
            </a>
            {onInstall && (
              <button className="apk-secondary-open" type="button" onClick={onInstall} disabled={installState?.busy}>
                <FiSmartphone /> {installState?.busy ? "Installing via ADB…" : "Install on USB/ADB device"}
              </button>
            )}
            {installState?.message && <p className="apk-security-note">{installState.message}</p>}
            <button className="apk-copy-link" type="button" onClick={copyLink}>{copied ? "✓ Link copied" : "Copy temporary link"}</button>
          </div>
        </div>

        <p className="apk-security-note">Android browsers cannot silently install APKs. After download, Android may ask you to allow installs from that browser. The ADB button can install directly only when USB debugging/emulator access is available to the backend.</p>
      </div>
    </div>
  );
}
