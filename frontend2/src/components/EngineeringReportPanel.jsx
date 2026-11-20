export default function EngineeringReportPanel({ report }) {
  if (!report) return null;
  const stages = report.stages || [];
  const issues = report.issues || [];
  const matrix = report.capabilityMatrix || [];
  const statusIcon = (status) => ({ passed: '✓', failed: '✕', warning: '!', pending_runtime: '…', not_applicable: '–' }[status] || '•');
  return (
    <section className="engineering-report-card" aria-label="Engineering quality report">
      <div className="engineering-report-head">
        <div>
          <p className="eyebrow">Engineering Readiness</p>
          <h3>{report.score}/100 · {report.grade}</h3>
        </div>
        <span className={`engineering-score-badge score-${Math.floor((report.score || 0) / 10)}`}>{report.score}</span>
      </div>

      <div className="engineering-metrics">
        <span>{report.metrics?.entityCount || 1} entities</span>
        <span>{report.metrics?.fieldCount || 0} fields</span>
        <span>{report.metrics?.roleCount || 0} roles</span>
        <span>{report.metrics?.uiPreset || 'modern'} UI</span>
        <span>{report.metrics?.storageMode || 'local'} storage</span>
      </div>

      <div className="engineering-stage-grid">
        {stages.map((stage) => (
          <div key={stage.id} className={`engineering-stage status-${stage.status}`}>
            <span className="engineering-stage-icon">{statusIcon(stage.status)}</span>
            <span>{stage.label}</span>
          </div>
        ))}
      </div>

      {issues.length > 0 && (
        <div className="engineering-issues">
          <strong>Review before release</strong>
          {issues.slice(0, 5).map((issue, index) => (
            <p key={`${issue.area}-${index}`}><b>{issue.area}:</b> {issue.message}</p>
          ))}
        </div>
      )}

      <details className="engineering-capabilities">
        <summary>Capability matrix</summary>
        <div className="engineering-capability-list">
          {matrix.map((item) => (
            <div key={item.name}>
              <span>{item.name}</span>
              <strong>{item.status === true ? 'Supported' : item.status === false ? 'Unsupported' : String(item.status)}</strong>
            </div>
          ))}
        </div>
      </details>

      {(report.recommendations || []).length > 0 && (
        <details className="engineering-capabilities">
          <summary>Release recommendations</summary>
          <ul>
            {report.recommendations.map((item, index) => <li key={index}>{item}</li>)}
          </ul>
        </details>
      )}
    </section>
  );
}
