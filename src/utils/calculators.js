// Saare 12 tools ke formulas yahin rahenge - automation easy
export const calcEMI = (P, R, Y) => {
  const r = R/12/100; const n = Y*12;
  if(r===0) return { emi: P/n, total: P, interest: 0 };
  const emi = P * r * Math.pow(1+r, n) / (Math.pow(1+r, n)-1);
  return { emi, total: emi*n, interest: emi*n - P };
}

export const calcSIP = (p, r, y) => {
  const mr = r/12/100; const n = y*12;
  const fv = p * ((Math.pow(1+mr, n)-1)/mr) * (1+mr);
  return { invested: p*n, maturity: fv, gain: fv - p*n };
}

export const getTenureComparison = (P, R) => {
  return [20, 25, 30].map(Y => {
    const d = calcEMI(P, R, Y);
    return { years: Y, emi: d.emi, interest: d.interest, total: d.total };
  });
}

// --- Global ke liye jo missing the, wo add kiye ---
export const calcSWP = (corpus, w, r, y) => {
  let bal = corpus; const mi = r/12/100; const n = y*12
  let withdrawn = 0
  for(let j=0;j<n;j++){ bal = bal*(1+mi) - w; withdrawn+=w }
  return { withdrawn, final: Math.max(0,bal) }
}
export const calcLumpsum = (p,r,y) => p * Math.pow(1+r/100,y)
export const calcFD = (p,r,y) => p * Math.pow(1+r/100,y)
export const calcRD = (m,r,y) => calcSIP(m,r,y).maturity
export const calcPPF = (m,r,y) => calcSIP(m,r,y)
export const calcCAGR = (s,e,y) => (Math.pow(e/s,1/y)-1)*100
export const calcIncomeTax = (inc) => inc*0.1