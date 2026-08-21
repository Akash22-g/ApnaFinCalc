export default function CompareTable({ title, data }) {
  return (
    <div className="compare-wrapper">
      <h3>{title || "Best Offers - Compare & Apply"}</h3>
      <p className="muted">Rates are sourced from official bank websites. Approval is subject to bank policy.</p>
      <div className="compare-grid">
        {data?.map((o,i) => (
          <div key={i} className="compare-card">
            <div className="bank-head">
              <h4>{o.name || o.bank}</h4>
              <span className="tag">{o.rating || o.tag || "Top Rated"}</span>
            </div>
            <div className="rate">{o.offer || o.rate}</div>
            <p className="feat">{o.features || ""}</p>
            <a href={o.link} target="_blank" rel="noreferrer" className="cta-btn">{o.cta || "Apply Now"} →</a>
            <p className="aff-disc">*Affiliate link - we may earn commission</p>
          </div>
        ))}
      </div>
    </div>
  )
}