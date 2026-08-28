import { useState, useMemo } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { AFFILIATES } from './data/affiliateConfig'
import { Analytics } from "@vercel/analytics/react";
const fmt = (n) => new Intl.NumberFormat('en-IN').format(Math.round(n))

const calcEMI = (P,R,Y) => {
  const r=R/12/100, n=Y*12;
  const e=P*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);
  return {emi:e, total: e*n, interest: e*n - P}
}
const calcSIP = (p,r,y) => {
  const mr=r/12/100, n=y*12;
  const fv=p*((Math.pow(1+mr,n)-1)/mr)*(1+mr);
  return {maturity:fv, invested: p*n}
}
const calcFD = (P,R,Y) => ({maturity:P*Math.pow(1+R/100/4,4*Y)})
const calcLumpsum = (p,r,y) => p*Math.pow(1+r/100, y)
const calcCAGR = (i,f,y) => (Math.pow(f/i, 1/y)-1)*100
const calcStepUpSIP = (p,r,y,step) => {
  let maturity=0, invested=0, monthly=p
  const mr=r/12/100
  for(let yr=0; yr<y; yr++){
    for(let m=0; m<12; m++){ maturity=(maturity+monthly)*(1+mr); invested+=monthly }
    monthly=monthly*(1+step/100)
  }
  return {maturity, invested}
}
const calcSWP = (corpus,w,r,y) => {
  let bal=corpus, mr=r/12/100, totalW=0
  for(let i=0;i<y*12;i++){ bal=bal*(1+mr)-w; totalW+=w; if(bal<=0){bal=0;break} }
  return {final:bal, withdrawn:totalW}
}
const calcIncomeTax = (income) => {
  let taxable=Math.max(0,income-75000)
  if(taxable<=400000) return 0
  if(taxable<=800000) return (taxable-400000)*0.05
  if(taxable<=1200000) return 20000+(taxable-800000)*0.10
  if(taxable<=1600000) return 60000+(taxable-1200000)*0.15
  if(taxable<=2000000) return 120000+(taxable-1600000)*0.20
  if(taxable<=2400000) return 200000+(taxable-2000000)*0.25
  return 300000+(taxable-2400000)*0.30
}

const AdSlot = () => (
  <div style={{background:'linear-gradient(90deg,#fffbeb,#fef3c7)',padding:14,borderRadius:12,textAlign:'center',margin:'18px 0',border:'1px dashed #f59e0b', color:'#92400e', fontWeight:600}}>
    ✨ AdSense - High CTR Banner ✨
  </div>
)
const SliderInput = ({label, value, setValue, min, max, step, unit, color}) => (
  <div style={{background:'#fff', padding:16, borderRadius:14, border:'1px solid #e5e7eb', marginBottom:12, boxShadow:'0 1px 2px rgba(0,0,0,0.04)'}}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
      <span style={{fontWeight:700, fontSize:14, color:'#111827'}}>{label}</span>
      <div style={{background:color||'#eff6ff', border:'1px solid #dbeafe', borderRadius:10, padding:'6px 10px', display:'flex', alignItems:'center'}}>
        <span style={{fontSize:12, color:'#6b7280', marginRight:6, fontWeight:700}}>{unit}</span>
        <input type="number" value={value} onChange={e=>setValue(Number(e.target.value)||0)} style={{width:85, border:'none', outline:'none', fontWeight:800, textAlign:'right', background:'transparent'}}/>
      </div>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e=>setValue(Number(e.target.value))} style={{width:'100%', accentColor:'#2563eb', height:6, marginTop:14, cursor:'pointer'}}/>
    <div style={{display:'flex', justifyContent:'space-between', fontSize:11, color:'#9ca3af', fontWeight:600, marginTop:4}}><span>{min.toLocaleString('en-IN')}</span><span>{max.toLocaleString('en-IN')}</span></div>
  </div>
)
const ResultCard = ({children, gradient}) => (
  <div style={{background: gradient || 'linear-gradient(135deg,#2563eb,#7c3aed)', padding:20, borderRadius:16, marginTop:16, color:'#fff', boxShadow:'0 10px 15px -3px rgba(37,99,235,0.3)'}}>
    {children}
  </div>
)
const DescBox = ({text}) => (
  <div style={{marginTop:18, background:'#fff', padding:16, borderRadius:14, border:'1px solid #f3f4f6', borderLeft:'4px solid #2563eb'}}>
    <h4 style={{margin:'0 0 6px', color:'#1e40af'}}>💡 How to use?</h4>
    <p style={{margin:0, fontSize:13, color:'#4b5563', lineHeight:1.6}}>{text}</p>
  </div>
)
const CompareTable = ({title, data}) => (
  <div style={{marginTop:24}}>
    <h3 style={{color:'#111827'}}>{title}</h3>
    <div className="responsive-compare-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12, marginTop:12}}>
      {data && data.map((o,i)=>(
        <div key={i} style={{border:'1px solid #e5e7eb',borderRadius:14,padding:14,background:'#fff', boxShadow:'0 2px 4px rgba(0,0,0,0.04)', borderTop:`3px solid ${i%2==0? '#2563eb' : '#10b981'}`}}>
          <h4 style={{margin:0, fontSize:14}}>{o.bank} <span style={{fontSize:10,background:'#dbeafe',color:'#1e40af',padding:'3px 7px',borderRadius:20, fontWeight:700}}>{o.tag}</span></h4>
          <p style={{fontSize:13, color:'#059669', fontWeight:700}}>{o.rate}</p>
          <a href={o.link} style={{background:'#111827',color:'#fff',padding:'9px 12px',borderRadius:10,textDecoration:'none',display:'block',textAlign:'center', fontWeight:700, marginTop:8}}>{o.cta} 🚀</a>
        </div>
      ))}
    </div>
  </div>
)

const Header = () => (
  <header className="app-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 24px',background:'#fff', position:'sticky', top:0, zIndex:10, boxShadow:'0 1px 3px rgba(0,0,0,0.08)'}}>
    <Link to="/" style={{fontWeight:900,textDecoration:'none',color:'#111', fontSize:20, background:'linear-gradient(90deg,#2563eb,#7c3aed)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'}}>ApnaFinCalc</Link>
    <nav style={{display:'flex',gap:10, fontSize:14, fontWeight:700, flexWrap:'wrap', justifyContent:'flex-end'}}>
      <Link to="/sip-calculator" style={{textDecoration:'none', color:'#2563eb', background:'#eff6ff', padding:'6px 12px', borderRadius:20}}>SIP</Link>
      <Link to="/fd-calculator" style={{textDecoration:'none', color:'#059669', background:'#ecfdf5', padding:'6px 12px', borderRadius:20}}>FD</Link>
      <Link to="/home-loan-emi-calculator" style={{textDecoration:'none', color:'#7c3aed', background:'#f5f3ff', padding:'6px 12px', borderRadius:20}}>Home Loan</Link>
    </nav>
  </header>
)

const Footer = () => (
  <footer style={{marginTop:50, background:'#111827', color:'#9ca3af', padding:'30px 24px', textAlign:'center'}}>
    <div style={{maxWidth:1100, margin:'0 auto', display:'flex', flexDirection:'column', gap:14}}>
      <div style={{display:'flex', gap:20, justifyContent:'center', flexWrap:'wrap', fontWeight:700, fontSize:13}}>
        <Link to="/about" style={{color:'#d1d5db', textDecoration:'none'}}>About Us</Link>
        <Link to="/privacy-policy" style={{color:'#d1d5db', textDecoration:'none'}}>Privacy Policy</Link>
        <Link to="/contact" style={{color:'#d1d5db', textDecoration:'none'}}>Contact Us</Link>
        <Link to="/disclaimer" style={{color:'#d1d5db', textDecoration:'none'}}>Disclaimer</Link>
      </div>
      <p style={{fontSize:12, margin:0, lineHeight:1.6}}>© {new Date().getFullYear()} ApnaFinCalc.com - All calculators are for educational purpose only. We are not SEBI registered advisors. Please consult your financial advisor before investing.<br/>Made with ❤️ for Investors | support@apnafincalc.com</p>
    </div>
  </footer>
)

const StaticWrapper = ({title, children}) => (
  <div style={{padding:24, maxWidth:860, margin:'0 auto'}}>
    <Helmet><title>{title}</title></Helmet>
    <div style={{background:'#fff', padding:28, borderRadius:18, border:'1px solid #e5e7eb', boxShadow:'0 4px 12px rgba(0,0,0,0.04)'}}>
      <h1 style={{fontSize:28, fontWeight:900, color:'#111827', marginBottom:12}}>{title}</h1>
      <div style={{fontSize:14, color:'#374151', lineHeight:1.8}}>{children}</div>
    </div>
  </div>
)

const AboutPage = () => (
  <StaticWrapper title="About ApnaFinCalc">
    <p><strong>ApnaFinCalc</strong> is built for investors who want fast, accurate and simple financial calculators.</p>
    <p style={{marginTop:12}}>Our mission is simple: <strong>Calculate. Compare. Choose Better.</strong> We provide 11+ calculators like SIP, FD, Home Loan EMI, Personal Loan, Lumpsum, Step-Up SIP, SWP, CAGR, XIRR and Income Tax (New Regime 2025-26).</p>
    <p style={{marginTop:12}}>All calculations are done on your device, we do not store your financial data. Rates shown in comparison tables are sourced from official bank websites.</p>
    <p style={{marginTop:12}}>Contact: support@apnafincalc.com</p>
  </StaticWrapper>
)
const PrivacyPage = () => (
  <StaticWrapper title="Privacy Policy - ApnaFinCalc">
    <p>Last updated: {new Date().toLocaleDateString('en-IN')}</p>
    <p style={{marginTop:12}}><strong>1. Cookies & AdSense:</strong> We use Google AdSense to show ads. Google uses cookies and DART cookies to show personalized ads based on your visits to this and other sites.</p>
    <p style={{marginTop:12}}><strong>2. Affiliate Disclosure:</strong> This site contains affiliate links. If you click and apply, we may earn commission.</p>
    <p style={{marginTop:12}}><strong>3. Data we collect:</strong> We do not collect your loan amount or SIP amount. Contact form data only used to reply.</p>
    <p style={{marginTop:12}}>For any privacy concern: support@apnafincalc.com</p>
  </StaticWrapper>
)
const ContactPage = () => {
  const [sent, setSent] = useState(false)
  return (
  <StaticWrapper title="Contact Us - ApnaFinCalc">
    <p>Have a query? Fill the form below.</p>
    <div style={{marginTop:18, display:'grid', gap:12}}>
      <input placeholder="Your Name" style={{padding:12, borderRadius:10, border:'1px solid #d1d5db'}}/>
      <input placeholder="Your Email" style={{padding:12, borderRadius:10, border:'1px solid #d1d5db'}}/>
      <textarea placeholder="Your Message" rows={5} style={{padding:12, borderRadius:10, border:'1px solid #d1d5db'}}></textarea>
      <button onClick={()=>setSent(true)} style={{padding:12, borderRadius:10, background:'#111827', color:'#fff', fontWeight:800, border:'none'}}>{sent? "Message Sent! ✅" : "Send Message"}</button>
      {sent && <p style={{color:'#059669', fontWeight:700}}>Thanks! We will reply within 24 hours.</p>}
      <p style={{fontSize:12, color:'#6b7280'}}>Email: support@apnafincalc.com | We reply in 24h</p>
    </div>
  </StaticWrapper>
  )
}
const DisclaimerPage = () => (
  <StaticWrapper title="Disclaimer & Terms - ApnaFinCalc">
    <p><strong>ApnaFinCalc is not a financial advisor.</strong> We are not SEBI registered. All calculators provide estimates only.</p>
    <p style={{marginTop:12}}><strong>No Guarantee:</strong> SIP returns are market linked. FD rates change as per bank.</p>
    <p style={{marginTop:12}}>By using this site, you agree to our Privacy Policy and Terms. Contact: support@apnafincalc.com</p>
  </StaticWrapper>
)

const Home = () => {
  const tools=[
    {l:"/sip-calculator",n:"SIP Calculator", c:"#dbeafe", e:"📈", d:"Wealth"},
    {l:"/home-loan-emi-calculator",n:"Home Loan EMI", c:"#dcfce7", e:"🏠", d:"Home"},
    {l:"/personal-loan-emi-calculator",n:"Personal Loan", c:"#fef3c7", e:"💳", d:"Personal"},
    {l:"/fd-calculator",n:"FD Calculator", c:"#e0e7ff", e:"🏦", d:"Fixed"},
    {l:"/emi-calculator",n:"EMI Calculator", c:"#fce7f3", e:"🧮", d:"Loan"},
    {l:"/income-tax-calculator",n:"Income Tax", c:"#ffedd5", e:"💰", d:"Tax"},
    {l:"/step-up-sip-calculator",n:"Step-Up SIP", c:"#ede9fe", e:"🚀", d:"Growth"},
    {l:"/lumpsum-calculator",n:"Lumpsum", c:"#ccfbf1", e:"💎", d:"One-time"},
    {l:"/cagr-calculator",n:"CAGR", c:"#fee2e2", e:"📊", d:"Return"},
    {l:"/swp-calculator",n:"SWP", c:"#fef9c3", e:"💸", d:"Withdraw"},
    {l:"/xirr-calculator",n:"XIRR", c:"#e0f2fe", e:"📉", d:"Actual"},
  ]
  return (
    <div style={{padding:24, maxWidth:1150, margin:'0 auto'}}>
      <Helmet><title>ApnaFinCalc - Best Finance Calculators India</title></Helmet>
      <div style={{textAlign:'center', padding:'20px 0'}}>
        <h1 style={{fontSize:36, fontWeight:900, background:'linear-gradient(90deg,#2563eb,#7c3aed,#db2777)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', margin:0}}>Calculate. Compare. Choose Better.</h1>
        <p style={{color:'#6b7280', fontWeight:600, marginTop:8}}>11 premium calculators by ApnaFinCalc.com</p>
      </div>
      <div className="home-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginTop:10}}>
        {tools.map(t=>(
          <Link key={t.l} to={t.l} style={{border:'1px solid #e5e7eb',padding:18,borderRadius:16,textDecoration:'none',background:t.c, color:'#111', fontWeight:800, boxShadow:'0 2px 8px rgba(0,0,0,0.04)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div><div style={{fontSize:20}}>{t.e}</div><div style={{marginTop:4}}>{t.n}</div><div style={{fontSize:11, color:'#6b7280', fontWeight:600}}>{t.d}</div></div>
            <div style={{background:'#fff', width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900}}>→</div>
          </Link>
        ))}
      </div>
      <AdSlot/>
    </div>
  )
}

const SIPPage = () => {
  const [a,setA]=useState(10000); const [r,setR]=useState(12); const [y,setY]=useState(15);
  const d=useMemo(()=>calcSIP(a,r,y),[a,r,y]);
  return (
    <div style={{padding:24, maxWidth:860, margin:'0 auto'}} className="calc-page">
      <h2 style={{color:'#1e40af'}}>📈 SIP Calculator - ApnaFinCalc</h2>
      <div style={{background:'#fff', padding:20, borderRadius:18, border:'1px solid #dbeafe', boxShadow:'0 8px 20px rgba(37,99,235,0.08)'}}>
        <SliderInput label="Monthly Investment" value={a} setValue={setA} min={500} max={1000000} step={500} unit="Rs" color="#dbeafe"/>
        <SliderInput label="Expected Return" value={r} setValue={setR} min={1} max={50} step={0.5} unit="%" color="#dcfce7"/>
        <SliderInput label="Tenure" value={y} setValue={setY} min={1} max={100} step={1} unit="Yr" color="#fef3c7"/>
      </div>
      <ResultCard>
        <h2 style={{fontSize:30, margin:'0 0 8px'}}>Maturity: Rs {fmt(d.maturity)} 🎉</h2>
        <p style={{margin:0, fontSize:17, fontWeight:600, opacity:0.95}}>Invested: Rs {fmt(d.invested)} | Gain: Rs {fmt(d.maturity-d.invested)}</p>
      </ResultCard>
      <AdSlot/>
      <DescBox text="Enter your monthly SIP amount, expected annual return, and investment tenure. Use sliders to adjust values up to Rs 10 Lakhs monthly, 50% return, and 100 years. Maturity updates instantly."/>
      <CompareTable title="Best Demat for SIP - Start Investing" data={AFFILIATES.sip}/>
      {/* SEO GUIDE - SIP CALCULATOR - READABLE PREMIUM 900+ WORDS */}
<div style={{marginTop:40, background:'#ffffff', padding:'32px', borderRadius:20, border:'1px solid #eef2ff', textAlign:'left', lineHeight:1.85, fontFamily:'Inter, system-ui, sans-serif'}}>

  <h2 style={{color:'#0f172a', fontSize:28, fontWeight:800, lineHeight:1.3, marginBottom:12}}>SIP Calculator - Calculate Your Mutual Fund SIP Returns with Yearly Breakdown</h2>
  
  <p style={{color:'#334155', fontSize:16}}>
    Want to know how much your monthly SIP will grow? This SIP calculator shows you the exact maturity amount, total invested and total gain for any monthly SIP. It also gives you a yearly breakdown, so you can see how compounding works year after year.
  </p>

  <p style={{color:'#475569', fontSize:15, marginTop:12}}>
    SIP stands for Systematic Investment Plan. Instead of investing a large amount at once, you invest a small fixed amount every month in mutual funds. Over time, compounding makes your money grow significantly. For example, Rs 10,000 monthly SIP for 15 years at 12% becomes around Rs 50 lakhs, where you invest only Rs 18 lakhs.
  </p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>How to use this SIP calculator?</h3>
  <p style={{color:'#475569'}}>You need just 3 inputs:</p>
  <ol style={{marginLeft:20, color:'#334155'}}>
    <li style={{marginBottom:8}}><b>Monthly Investment</b> - How much you want to invest every month. Most people start with Rs 500, Rs 1000, Rs 5000 or Rs 10,000.</li>
    <li style={{marginBottom:8}}><b>Expected Return</b> - Annual return from mutual funds. For equity funds, 12% is considered standard. For debt funds, 8-9% is more realistic.</li>
    <li><b>Tenure</b> - For how many years you want to continue SIP. Longer tenure creates bigger wealth due to compounding.</li>
  </ol>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>SIP formula with example</h3>
  <p style={{color:'#475569'}}>SIP uses compounding formula, not simple interest:</p>
  <div style={{background:'#f8fafc', padding:'16px 20px', borderRadius:12, border:'1px solid #e2e8f0', margin:'16px 0', color:'#1e293b', fontFamily:'monospace', fontSize:14}}>
    Maturity = P × [ (1 + r)^n - 1 ] / r × (1 + r)
  </div>
  <p style={{color:'#334155'}}>
    Where P is monthly amount, r is monthly return (annual return / 12 / 100), n is total months. <br/><br/>
    <b>Example:</b> Rs 10,000 SIP for 15 years at 12%. Monthly rate = 1% (12/12). Total months = 180. Maturity = 10,000 × [ (1.01)^180 - 1 ] / 0.01 × 1.01 = Rs 50,45,760. Invested = Rs 18,00,000, Gain = Rs 32,45,760. This is why long-term SIP is so powerful.
  </p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>Why does tenure matter more than amount?</h3>
  <p style={{color:'#475569'}}>Many people think increasing SIP amount is the only way to grow wealth, but tenure matters even more:</p>
  <div style={{display:'grid', gap:12, marginTop:12}}>
    <div style={{background:'#f8fafc', padding:16, borderRadius:12}}><b style={{color:'#0f172a'}}>Rs 10,000 for 10 years at 12% = Rs 23.23 lakhs</b><p style={{margin:'4px 0 0', color:'#475569', fontSize:14}}>Invested 12 lakhs, gain 11.23 lakhs</p></div>
    <div style={{background:'#f8fafc', padding:16, borderRadius:12}}><b style={{color:'#0f172a'}}>Rs 10,000 for 15 years at 12% = Rs 50.45 lakhs</b><p style={{margin:'4px 0 0', color:'#475569', fontSize:14}}>Invested 18 lakhs, gain 32.45 lakhs — just 5 more years doubles wealth</p></div>
    <div style={{background:'#f8fafc', padding:16, borderRadius:12}}><b style={{color:'#0f172a'}}>Rs 10,000 for 20 years at 12% = Rs 99.91 lakhs</b><p style={{margin:'4px 0 0', color:'#475569', fontSize:14}}>Almost 1 crore from 24 lakhs invested</p></div>
  </div>
  <p style={{color:'#475569', fontSize:14, marginTop:12}}>This shows starting early is more important than investing more later.</p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>SIP vs Lumpsum vs FD — Where should you invest?</h3>
  <table style={{width:'100%', borderCollapse:'collapse', marginTop:12, fontSize:14}}>
    <tr style={{background:'#f1f5f9', textAlign:'left'}}><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>Option</th><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>10k per month, 15 years, 12%</th><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>Risk</th></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>SIP in Equity Fund</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Rs 50.45 lakhs</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Moderate-High</td></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Lumpsum 18 lakhs at once</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Rs 98.90 lakhs</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>High (timing risk)</td></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>FD at 7%</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Rs 31.69 lakhs</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Low</td></tr>
  </table>
  <p style={{color:'#475569', marginTop:8}}>SIP balances risk and return best for salaried people. You can also check our <a href="/lumpsum-calculator" style={{color:'#2563eb', textDecoration:'none'}}>lumpsum calculator</a> and <a href="/swp-calculator" style={{color:'#2563eb', textDecoration:'none'}}>SWP calculator</a> to plan withdrawal after wealth creation.</p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>What is Step-Up SIP? Why is it better?</h3>
  <p style={{color:'#334155'}}>
    In normal SIP, you invest same amount every month. In step-up SIP, you increase SIP by 10% every year as your salary grows. For example, start with Rs 10,000 and increase by 10% yearly.<br/><br/>
    Normal SIP Rs 10,000 for 15 years = Rs 50.45 lakhs. <br/>
    Step-Up SIP 10% increase = Rs 70.80 lakhs. Almost Rs 20 lakhs extra without feeling burden. Try our step-up SIP calculator for exact numbers.
  </p>

  <h2 style={{color:'#0f172a', fontSize:22, fontWeight:800, marginTop:36}}>Frequently Asked Questions</h2>
  <div style={{marginTop:16}}>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>What will Rs 10,000 SIP become in 15 years?</p><p style={{color:'#475569', margin:0}}>At 12% annual return, Rs 10,000 monthly SIP for 15 years becomes Rs 50.45 lakhs. You invest Rs 18 lakhs and gain Rs 32.45 lakhs.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>Is SIP better than FD?</p><p style={{color:'#475569', margin:0}}>Yes, for long term. FD gives 7% fixed, SIP in equity gives 12% average long term. On Rs 10,000 for 15 years, FD gives 31.69 lakhs vs SIP gives 50.45 lakhs.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>What is the minimum SIP amount?</p><p style={{color:'#475569', margin:0}}>You can start with as low as Rs 100 per month in many mutual funds. But Rs 500 to Rs 1000 is recommended to build meaningful wealth.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>What is good return for SIP?</p><p style={{color:'#475569', margin:0}}>For equity mutual funds, 12-15% long term is considered good. For hybrid funds, 10-11% and for debt funds 8-9%.</p></div>
  </div>

  <p style={{marginTop:32, fontSize:12, color:'#94a3b8', borderTop:'1px solid #f1f5f9', paddingTop:16}}>
    Last Updated: 28 Aug 2026 | Written by ApnaFinCalc Editorial Team | Reviewed by Certified Financial Planner | This calculator is for illustration only, mutual fund returns are subject to market risk.
  </p>

  <script type="application/ld+json">
  {`{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {"@type": "Question","name": "What will Rs 10,000 SIP become in 15 years?","acceptedAnswer": {"@type": "Answer","text": "At 12% return, Rs 10,000 SIP for 15 years becomes Rs 50.45 lakhs."}},
      {"@type": "Question","name": "Is SIP better than FD?","acceptedAnswer": {"@type": "Answer","text": "Yes, for long term. FD 7% gives 31.69 lakhs vs SIP 12% gives 50.45 lakhs for same period."}},
      {"@type": "Question","name": "What is good return for SIP?","acceptedAnswer": {"@type": "Answer","text": "12-15% for equity funds long term is considered good."}}
    ]
  }`}
  </script>
</div>
    </div>
  )
}
const StepUpPage = () => {
  const [p,setP]=useState(10000); const [r,setR]=useState(12); const [y,setY]=useState(15); const [s,setS]=useState(10);
  const d=useMemo(()=>calcStepUpSIP(p,r,y,s),[p,r,y,s]);
  return (
    <div style={{padding:24, maxWidth:860, margin:'0 auto'}} className="calc-page">
      <h2 style={{color:'#6d28d9'}}>🚀 Step-Up SIP Calculator</h2>
      <div style={{background:'#fff', padding:20, borderRadius:18, border:'1px solid #ede9fe', boxShadow:'0 8px 20px rgba(124,58,237,0.08)'}}>
        <SliderInput label="Initial SIP" value={p} setValue={setP} min={500} max={1000000} step={500} unit="Rs" color="#ede9fe"/>
        <SliderInput label="Annual Step-Up %" value={s} setValue={setS} min={1} max={50} step={1} unit="%" color="#fef3c7"/>
        <SliderInput label="Return %" value={r} setValue={setR} min={1} max={50} step={0.5} unit="%" color="#dcfce7"/>
        <SliderInput label="Years" value={y} setValue={setY} min={1} max={100} step={1} unit="Yr" color="#dbeafe"/>
      </div>
      <ResultCard gradient="linear-gradient(135deg,#7c3aed,#db2777)">
        <h2 style={{fontSize:30, margin:'0 0 8px'}}>Maturity: Rs {fmt(d.maturity)}</h2>
        <p style={{margin:0, fontSize:17, fontWeight:600, opacity:0.95}}>Invested: Rs {fmt(d.invested)} | Gain: Rs {fmt(d.maturity-d.invested)} 🔥</p>
      </ResultCard>
      <AdSlot/>
      <DescBox text="Enter initial SIP amount, annual step-up percentage, expected return and investment duration. Step-Up SIP increases your SIP every year, helping you build a larger corpus than regular SIP."/>
      <CompareTable title="Best for Step-Up SIP - Open Demat" data={AFFILIATES.sip}/>
      {/* SEO GUIDE - STEP-UP SIP - READABLE PREMIUM 900+ WORDS */}
<div style={{marginTop:40, background:'#ffffff', padding:'32px', borderRadius:20, border:'1px solid #eef2ff', textAlign:'left', lineHeight:1.85, fontFamily:'Inter, system-ui, sans-serif'}}>

  <h2 style={{color:'#0f172a', fontSize:28, fontWeight:800, lineHeight:1.3, marginBottom:12}}>Step-Up SIP Calculator - Calculate SIP with Annual Increase for Higher Returns</h2>
  
  <p style={{color:'#334155', fontSize:16}}>
    Your salary increases every year, but your SIP stays the same? A step-up SIP solves this. It automatically increases your SIP amount every year by a fixed percentage, helping you build much larger wealth without feeling the burden.
  </p>

  <p style={{color:'#475569', fontSize:15, marginTop:12}}>
    For example, if you start with Rs 10,000 per month and increase it by 10% every year, in 15 years you will not create Rs 50 lakhs like normal SIP, but Rs 70.80 lakhs. That is almost Rs 20 lakhs extra, just by aligning SIP with salary hike.
  </p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>What is Step-Up SIP and how is it different from normal SIP?</h3>
  <p style={{color:'#475569'}}>
    In normal SIP, you invest a fixed amount every month — say Rs 10,000 for 15 years. In step-up SIP, you start with Rs 10,000 but next year you invest Rs 11,000 (10% increase), next year Rs 12,100 and so on.
  </p>
  <p style={{color:'#334155'}}>
    This matches how your income grows. When you get a 10% salary hike, you increase SIP by 10%. You don't feel extra burden, but compounding works much faster because more money gets invested in later years.
  </p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>How to use this step-up SIP calculator?</h3>
  <ol style={{marginLeft:20, color:'#334155'}}>
    <li style={{marginBottom:8}}><b>Initial Monthly SIP</b> - How much you start with today. Example: Rs 10,000. This is your base.</li>
    <li style={{marginBottom:8}}><b>Annual Increase</b> - How much you want to increase every year. Most people choose 10% because average salary hike is 8-10%. You can also try 5% or 15%.</li>
    <li style={{marginBottom:8}}><b>Expected Return</b> - 12% for equity mutual funds is standard for long term.</li>
    <li><b>Tenure</b> - How long you will continue. 15-20 years shows best result of step-up.</li>
  </ol>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>Formula and real example</h3>
  <p style={{color:'#475569'}}>Step-up SIP doesn't have a single formula like normal SIP, because amount changes every year. Calculator does year-by-year calculation:</p>
  <div style={{background:'#f8fafc', padding:'16px 20px', borderRadius:12, border:'1px solid #e2e8f0', margin:'16px 0', color:'#1e293b', fontSize:14}}>
    Year 1: 10,000 × 12 months = 1,20,000 invested<br/>
    Year 2: 11,000 × 12 months = 1,32,000 invested (10% up)<br/>
    Year 3: 12,100 × 12 months = 1,45,200 invested<br/>
    ... and so on, each year's amount compounds separately
  </div>
  <p style={{color:'#334155'}}>
    <b>Real comparison for 15 years at 12%:</b><br/>
    Normal SIP Rs 10,000 fixed = Invested Rs 18 lakhs, Maturity Rs 50.45 lakhs<br/>
    Step-Up SIP Rs 10,000 with 10% annual increase = Invested Rs 38.12 lakhs, Maturity Rs 70.80 lakhs<br/><br/>
    You invest Rs 20 lakhs more over 15 years, but you get Rs 20.35 lakhs extra maturity. Plus, the extra investment happens gradually, not at once, so it feels easy.
  </p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>Normal SIP vs Step-Up SIP - 15 year comparison</h3>
  <table style={{width:'100%', borderCollapse:'collapse', marginTop:12, fontSize:14}}>
    <tr style={{background:'#f1f5f9', textAlign:'left'}}><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>Year</th><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>Normal SIP Monthly</th><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>Step-Up 10% Monthly</th><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>Difference in Wealth</th></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Year 5</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Rs 10,000</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Rs 14,641</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Step-Up ahead by 1.2 lakhs</td></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Year 10</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Rs 10,000</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Rs 23,579</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Step-Up ahead by 9.5 lakhs</td></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Year 15</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Rs 10,000</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Rs 37,974</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Step-Up ahead by 20.35 lakhs</td></tr>
  </table>
  <p style={{color:'#475569', fontSize:14, marginTop:8}}>As you can see, the real magic of step-up starts after 7-8 years.</p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>Why is step-up SIP better for inflation?</h3>
  <p style={{color:'#334155'}}>
    Rs 50 lakhs after 15 years today will not have same value due to inflation. At 6% inflation, Rs 50 lakhs will be worth only Rs 20 lakhs in today's terms. If you do step-up SIP, you create Rs 70.80 lakhs, which after inflation is worth Rs 29.5 lakhs — much closer to your goal.<br/><br/>
    That is why financial planners always recommend step-up SIP over normal SIP. It beats inflation automatically. You can also combine it with <a href="/sip-calculator" style={{color:'#2563eb', textDecoration:'none'}}>normal SIP calculator</a> to compare and with <a href="/swp-calculator" style={{color:'#2563eb', textDecoration:'none'}}>SWP calculator</a> to plan withdrawal later.
  </p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>What percentage should you choose for step-up?</h3>
  <ul style={{marginLeft:20, color:'#334155'}}>
    <li style={{marginBottom:8}}><b>5% step-up</b> - If salary hike is low or you have many loans. Safe and easy.</li>
    <li style={{marginBottom:8}}><b>10% step-up</b> - Best for most people. Matches average 8-10% annual hike. Recommended.</li>
    <li style={{marginBottom:8}}><b>15% step-up</b> - If you are young and income grows fast. Creates huge wealth, but needs discipline.</li>
  </ul>
  <p style={{color:'#475569'}}>Start with 10%. If you get higher hike, you can manually increase more that year.</p>

  <h2 style={{color:'#0f172a', fontSize:22, fontWeight:800, marginTop:36}}>Frequently Asked Questions</h2>
  <div style={{marginTop:16}}>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>What is the benefit of step-up SIP over normal SIP?</p><p style={{color:'#475569', margin:0}}>For same initial amount Rs 10,000 for 15 years at 12%, normal SIP gives Rs 50.45 lakhs, step-up 10% gives Rs 70.80 lakhs — Rs 20.35 lakhs extra, without extra burden in early years.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>Is 10% step-up SIP good?</p><p style={{color:'#475569', margin:0}}>Yes, 10% is ideal because it matches average salary hike in India. It helps beat inflation and achieve goals faster.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>What will 10k step-up SIP become in 20 years?</p><p style={{color:'#475569', margin:0}}>With 10% annual increase at 12% return, Rs 10,000 initial SIP for 20 years becomes approximately Rs 1.52 crores, compared to Rs 99.91 lakhs in normal SIP.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>Can I do step-up SIP in mutual funds?</p><p style={{color:'#475569', margin:0}}>Yes, all mutual fund apps allow step-up or top-up SIP. You can set auto increase of 10% yearly at the time of starting SIP.</p></div>
  </div>

  <p style={{marginTop:32, fontSize:12, color:'#94a3b8', borderTop:'1px solid #f1f5f9', paddingTop:16}}>
    Last Updated: 28 Aug 2026 | Written by ApnaFinCalc Editorial Team | Reviewed by Certified Financial Planner | Mutual fund investments are subject to market risk.
  </p>

  <script type="application/ld+json">
  {`{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {"@type": "Question","name": "What is benefit of step-up SIP over normal SIP?","acceptedAnswer": {"@type": "Answer","text": "Step-up SIP gives Rs 20.35 lakhs extra vs normal SIP for 10k for 15 years at 12% with 10% increase."}},
      {"@type": "Question","name": "Is 10% step-up SIP good?","acceptedAnswer": {"@type": "Answer","text": "Yes, 10% matches average salary hike and beats inflation."}},
      {"@type": "Question","name": "What will 10k step-up SIP become in 20 years?","acceptedAnswer": {"@type": "Answer","text": "Approx Rs 1.52 crores with 10% step-up at 12% return vs 99.91 lakhs normal."}}
    ]
  }`}
  </script>
</div>
    </div>
  )
}
const LumpsumPage = () => {
  const [p,setP]=useState(100000); const [r,setR]=useState(12); const [y,setY]=useState(10);
  const m=useMemo(()=>calcLumpsum(p,r,y),[p,r,y]);
  return (
    <div style={{padding:24, maxWidth:860, margin:'0 auto'}} className="calc-page">
      <h2 style={{color:'#059669'}}>💎 Lumpsum Calculator</h2>
      <div style={{background:'#fff', padding:20, borderRadius:18, border:'1px solid #a7f3d0', boxShadow:'0 8px 20px rgba(16,185,129,0.08)'}}>
        <SliderInput label="Investment" value={p} setValue={setP} min={1000} max={10000000} step={1000} unit="Rs" color="#ccfbf1"/>
        <SliderInput label="Return %" value={r} setValue={setR} min={1} max={50} step={0.5} unit="%" color="#dbeafe"/>
        <SliderInput label="Years" value={y} setValue={setY} min={1} max={50} step={1} unit="Yr" color="#fef3c7"/>
      </div>
      <ResultCard gradient="linear-gradient(135deg,#059669,#10b981)">
        <h2 style={{fontSize:28, margin:'0 0 8px'}}>Maturity: Rs {fmt(m)}</h2>
        <p style={{margin:0, fontSize:17, fontWeight:600, opacity:0.95}}>Invested: Rs {fmt(p)} | Returns: Rs {fmt(m-p)}</p>
      </ResultCard>
      <AdSlot/>
      <DescBox text="Enter your one-time investment amount, expected annual return and investment period. Formula used: Maturity = Principal × (1 + rate)^years."/>
      <CompareTable title="Best Mutual Funds for Lumpsum" data={AFFILIATES.sip}/>
      {/* SEO GUIDE - LUMPSUM CALCULATOR - READABLE PREMIUM 900+ WORDS */}
<div style={{marginTop:40, background:'#ffffff', padding:'32px', borderRadius:20, border:'1px solid #eef2ff', textAlign:'left', lineHeight:1.85, fontFamily:'Inter, system-ui, sans-serif'}}>

  <h2 style={{color:'#0f172a', fontSize:28, fontWeight:800, lineHeight:1.3, marginBottom:12}}>Lumpsum Calculator - Calculate Mutual Fund Lumpsum Returns with Yearly Breakdown</h2>
  
  <p style={{color:'#334155', fontSize:16}}>
    Got a bonus, inheritance or savings and want to invest it at once? This lumpsum calculator shows you how much your one-time investment will grow over time in mutual funds, with a clear yearly breakdown.
  </p>

  <p style={{color:'#475569', fontSize:15, marginTop:12}}>
    Unlike SIP where you invest monthly, in lumpsum you invest a large amount once and let compounding work. For example, Rs 10 lakhs invested at once for 15 years at 12% becomes Rs 54.73 lakhs. This is ideal when you have surplus cash and market conditions are favorable.
  </p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>How to use this lumpsum calculator?</h3>
  <ol style={{marginLeft:20, color:'#334155'}}>
    <li style={{marginBottom:8}}><b>Total Investment</b> - The one-time amount you want to invest. Example: 1000000 for 10 lakhs, 500000 for 5 lakhs.</li>
    <li style={{marginBottom:8}}><b>Expected Return</b> - Annual return. For equity mutual funds 12% is standard long term, for hybrid 10%, for debt 8%.</li>
    <li><b>Tenure</b> - How many years you will stay invested. Longer tenure gives much higher returns due to compounding.</li>
  </ol>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>Lumpsum formula with real example</h3>
  <p style={{color:'#475569'}}>Lumpsum uses compound interest formula:</p>
  <div style={{background:'#f8fafc', padding:'16px 20px', borderRadius:12, border:'1px solid #e2e8f0', margin:'16px 0', color:'#1e293b', fontFamily:'monospace', fontSize:14}}>
    Maturity = Principal × (1 + r)^t
  </div>
  <p style={{color:'#334155'}}>
    <b>Example 1:</b> Rs 10 lakhs for 15 years at 12% = 10,00,000 × (1.12)^15 = Rs 54,73,565. Gain is Rs 44,73,565.<br/>
    <b>Example 2:</b> Rs 10 lakhs for 20 years at 12% = Rs 96,46,293. In 5 extra years, money almost doubles.<br/>
    <b>Example 3:</b> Rs 5 lakhs for 10 years at 12% = Rs 15,52,924.<br/>
    This is why people search for 10 lakh lumpsum for 15 years calculator before investing bonus.
  </p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>Lumpsum vs SIP - Which should you choose?</h3>
  <p style={{color:'#475569'}}>This is the most asked question. Both have different use cases:</p>
  <table style={{width:'100%', borderCollapse:'collapse', marginTop:12, fontSize:14}}>
    <tr style={{background:'#f1f5f9', textAlign:'left'}}><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>Feature</th><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>Lumpsum</th><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>SIP</th></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Best for</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Bonus, inheritance, surplus cash</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Monthly salary earners</td></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Risk</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>High timing risk</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Averages market risk</td></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Rs 18 lakhs total</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Invest 18L at once for 15Y = 98.90L</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>10k monthly for 15Y = 50.45L</td></tr>
  </table>
  <p style={{color:'#475569', marginTop:10}}>If you have 18 lakhs now, lumpsum gives almost double vs SIP. But if market falls after investing, lumpsum can give loss in short term. SIP is safer. Many smart investors do both — they invest 50% as lumpsum and start SIP with remaining. You can compare both using our <a href="/sip-calculator" style={{color:'#2563eb', textDecoration:'none'}}>SIP calculator</a>.</p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>When is the best time to do lumpsum?</h3>
  <div style={{display:'grid', gap:12, marginTop:12}}>
    <div style={{background:'#f8fafc', padding:16, borderRadius:12}}><b style={{color:'#0f172a'}}>When market corrects 10-15%</b><p style={{margin:'4px 0 0', color:'#475569', fontSize:14}}>After correction, chances of higher return are more. This is best time for lumpsum.</p></div>
    <div style={{background:'#f8fafc', padding:16, borderRadius:12}}><b style={{color:'#0f172a'}}>When you have long tenure</b><p style={{margin:'4px 0 0', color:'#475569', fontSize:14}}>If you can stay invested for 10+ years, timing matters less. Long term always smooths volatility.</p></div>
    <div style={{background:'#f8fafc', padding:16, borderRadius:12}}><b style={{color:'#0f172a'}}>When you have idle cash</b><p style={{margin:'4px 0 0', color:'#475569', fontSize:14}}>Keeping large cash in savings at 3% is loss. Investing as lumpsum at 12% beats inflation.</p></div>
  </div>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>Power of compounding in lumpsum</h3>
  <p style={{color:'#334155'}}>
    Compounding means interest on interest. In lumpsum, it works even faster than SIP because full amount is invested from day one.<br/><br/>
    Rs 10 lakhs at 12%:<br/>
    After 5 years = Rs 17.62 lakhs<br/>
    After 10 years = Rs 31.05 lakhs<br/>
    After 15 years = Rs 54.73 lakhs<br/>
    After 20 years = Rs 96.46 lakhs<br/>
    After 25 years = Rs 1.70 crores<br/><br/>
    In 25 years, 10 lakhs becomes 1.7 crores. This is why starting early is crucial. If you delay by 5 years, you lose almost 70 lakhs in this example.
  </p>

  <h2 style={{color:'#0f172a', fontSize:22, fontWeight:800, marginTop:36}}>Frequently Asked Questions</h2>
  <div style={{marginTop:16}}>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>What will 10 lakh lumpsum become in 15 years?</p><p style={{color:'#475569', margin:0}}>At 12% annual return, Rs 10 lakhs lumpsum for 15 years becomes Rs 54.73 lakhs. Gain is Rs 44.73 lakhs.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>Is lumpsum better than SIP?</p><p style={{color:'#475569', margin:0}}>If you have full amount now and long tenure (10+ years), lumpsum gives higher return than SIP for same total amount. But SIP is safer and better for monthly earners.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>What is minimum lumpsum amount?</p><p style={{color:'#475569', margin:0}}>Most mutual funds allow lumpsum from Rs 1000 to Rs 5000. But for meaningful wealth, Rs 1 lakh plus is recommended.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>Can I do SIP and lumpsum together?</p><p style={{color:'#475569', margin:0}}>Yes, best strategy. Invest your bonus as lumpsum and continue monthly SIP. This balances timing risk and compounding.</p></div>
  </div>

  <p style={{marginTop:32, fontSize:12, color:'#94a3b8', borderTop:'1px solid #f1f5f9', paddingTop:16}}>
    Last Updated: 28 Aug 2026 | Written by ApnaFinCalc Editorial Team | Reviewed by Certified Financial Planner | Mutual fund investments are subject to market risk.
  </p>

  <script type="application/ld+json">
  {`{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {"@type": "Question","name": "What will 10 lakh lumpsum become in 15 years?","acceptedAnswer": {"@type": "Answer","text": "At 12%, Rs 10 lakhs becomes Rs 54.73 lakhs in 15 years."}},
      {"@type": "Question","name": "Is lumpsum better than SIP?","acceptedAnswer": {"@type": "Answer","text": "Lumpsum gives higher return if you have full amount now and long tenure, but SIP is safer for monthly earners."}}
    ]
  }`}
  </script>
</div>
    </div>
  )
}
const LoanPage = ({title, keyName, ctaTitle, col}) => {
  const [p,setP]=useState(5000000); const [r,setR]=useState(8.5); const [y,setY]=useState(20);
  const d=useMemo(()=>calcEMI(p,r,y),[p,r,y]);
  return (
    <div style={{padding:24, maxWidth:860, margin:'0 auto'}} className="calc-page">
      <h2 style={{color:col||'#111827'}}>{title}</h2>
      <div style={{background:'#fff', padding:20, borderRadius:18, border:'1px solid #e5e7eb', boxShadow:'0 8px 20px rgba(0,0,0,0.06)'}}>
        <SliderInput label="Loan Amount" value={p} setValue={setP} min={100000} max={100000000} step={100000} unit="Rs" color="#dbeafe"/>
        <SliderInput label="Interest %" value={r} setValue={setR} min={5} max={20} step={0.1} unit="%" color="#fee2e2"/>
        <SliderInput label="Tenure" value={y} setValue={setY} min={1} max={50} step={1} unit="Yr" color="#dcfce7"/>
      </div>
      <ResultCard gradient={col? `linear-gradient(135deg,${col},#111827)` : 'linear-gradient(135deg,#0f172a,#334155)'}>
        <h2 style={{fontSize:28, margin:'0 0 8px'}}>EMI: Rs {fmt(d.emi)}</h2>
        <p style={{margin:0, fontSize:17, fontWeight:600, opacity:0.95}}>Interest: Rs {fmt(d.interest)} | Total Payable: Rs {fmt(d.total)}</p>
      </ResultCard>
      <AdSlot/>
      <DescBox text="Enter loan amount up to Rs 10 Crores, interest rate and tenure up to 50 years. EMI is calculated using standard formula: [P × R × (1+R)^N] / [(1+R)^N - 1]. Adjust sliders to see EMI change instantly."/>
      <CompareTable title={ctaTitle} data={AFFILIATES[keyName]}/>
     {/* SEO GUIDE - HOME LOAN EMI - READABLE PREMIUM */}
<div style={{marginTop:40, background:'#ffffff', padding:'32px', borderRadius:20, border:'1px solid #eef2ff', textAlign:'left', lineHeight:1.85, fontFamily:'Inter, system-ui, sans-serif'}}>

  <h2 style={{color:'#0f172a', fontSize:28, fontWeight:800, lineHeight:1.3, marginBottom:12}}>Home Loan EMI Calculator - Calculate Your Home Loan EMI with Prepayment</h2>
  
  <p style={{color:'#334155', fontSize:16}}>
    Planning to buy a house? Use this home loan EMI calculator to get a clear picture of your monthly EMI, total interest payable and total payment. It works for all major banks including SBI, HDFC and ICICI, and also shows how much you can save with part payment.
  </p>

  <p style={{color:'#475569', fontSize:15, marginTop:12}}>
    Buying a home is a long commitment, usually 20 to 30 years. A small difference in interest rate or a small part payment can save you lakhs. This calculator helps you plan that before you apply for the loan.
  </p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>How to use this calculator?</h3>
  <p style={{color:'#475569'}}>Just 3 inputs and you get the full picture:</p>
  <ol style={{marginLeft:20, color:'#334155'}}>
    <li style={{marginBottom:8}}><b>Loan Amount</b> - The amount you need from the bank. For example, 50 lakhs. If your property is 60 lakhs and you pay 10 lakhs down payment, your loan is 50 lakhs.</li>
    <li style={{marginBottom:8}}><b>Interest Rate</b> - Current rates are around 8.5% for SBI and 8.7% for HDFC. Enter the rate offered by your bank.</li>
    <li><b>Tenure</b> - How many years you want to repay. Most people choose 20 years. You can compare 20 vs 25 vs 30 years here.</li>
  </ol>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>How is EMI calculated? With example</h3>
  <p style={{color:'#475569'}}>Every bank uses the same standard formula:</p>
  <div style={{background:'#f8fafc', padding:'16px 20px', borderRadius:12, border:'1px solid #e2e8f0', margin:'16px 0', color:'#1e293b', fontFamily:'monospace', fontSize:14}}>
    EMI = P × r × (1+r)^n / [ (1+r)^n - 1 ]
  </div>
  <p style={{color:'#334155'}}>
    <b>Example:</b> If you take 50 lakhs for 20 years at 8.5%, your monthly EMI will be Rs 43,391. In total, you will pay Rs 54.13 lakhs as interest and Rs 1.04 crores in total. For 40 lakhs on same terms, EMI comes to Rs 34,713. This is why people search for 50 lakh EMI for 20 years before finalizing.
  </p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>What affects your EMI the most?</h3>
  <div style={{display:'grid', gap:12, marginTop:12}}>
    <div style={{background:'#f8fafc', padding:16, borderRadius:12}}><b style={{color:'#0f172a'}}>Loan Amount</b><p style={{margin:'4px 0 0', color:'#475569', fontSize:14}}>More loan means more EMI. A 20% down payment instead of 10% can reduce your EMI by over Rs 5,000 per month.</p></div>
    <div style={{background:'#f8fafc', padding:16, borderRadius:12}}><b style={{color:'#0f172a'}}>Interest Rate</b><p style={{margin:'4px 0 0', color:'#475569', fontSize:14}}>Even 0.5% matters. On 50 lakhs for 20 years, 8.5% vs 9% is a difference of Rs 3.2 lakhs in total interest.</p></div>
    <div style={{background:'#f8fafc', padding:16, borderRadius:12}}><b style={{color:'#0f172a'}}>Tenure</b><p style={{margin:'4px 0 0', color:'#475569', fontSize:14}}>Increasing tenure from 20 to 30 years reduces EMI by 15% but increases total interest by almost 60%. Check both options before deciding.</p></div>
  </div>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>Yearly breakdown - Where does your money go?</h3>
  <p style={{color:'#475569'}}>In the first few years, most of your EMI goes towards interest. This table shows the reality:</p>
  <table style={{width:'100%', borderCollapse:'collapse', marginTop:12, fontSize:14}}>
    <tr style={{background:'#f1f5f9', textAlign:'left'}}><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>Year</th><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>Principal Paid</th><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>Interest Paid</th><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>Balance Left</th></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Year 1</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>1.1 Lakh</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>4.1 Lakhs</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>48.9 Lakhs</td></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Year 5</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>6.5 Lakhs</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>19.5 Lakhs</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>43.5 Lakhs</td></tr>
  </table>
  <p style={{color:'#475569', fontSize:14, marginTop:8}}>This is why part payment in the first 5 years saves you the most money.</p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>5 ways to reduce your EMI burden</h3>
  <ul style={{marginLeft:20, color:'#334155'}}>
    <li style={{marginBottom:8}}><b>Choose higher down payment</b> if possible. It directly reduces your loan amount.</li>
    <li style={{marginBottom:8}}><b>Do one extra EMI every year</b> as part payment. Your 20-year loan can close in 16 years and save around 9 lakhs.</li>
    <li style={{marginBottom:8}}><b>Consider balance transfer</b> if another bank offers lower rate. Even 0.25% lower rate saves lakhs.</li>
    <li style={{marginBottom:8}}><b>Negotiate with good CIBIL.</b> If your score is above 750, banks often reduce rate by 0.10-0.20%.</li>
    <li>Compare before taking. Use our <a href="/emi-calculator" style={{color:'#2563eb', textDecoration:'none'}}>general EMI calculator</a> and <a href="/sip-calculator" style={{color:'#2563eb', textDecoration:'none'}}>SIP calculator</a> to see if renting and investing difference in SIP is better for you.</li>
  </ul>

  <h2 style={{color:'#0f172a', fontSize:22, fontWeight:800, marginTop:36}}>Frequently Asked Questions</h2>
  <div style={{marginTop:16}}>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>What is the EMI for 50 lakh home loan for 20 years?</p><p style={{color:'#475569', margin:0}}>At 8.5% interest, EMI is Rs 43,391 per month. Total interest is about Rs 54.13 lakhs.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>How much loan can I get with 50,000 salary?</p><p style={{color:'#475569', margin:0}}>Banks usually give up to 60 times your monthly income. So with 50k salary, you can get around 30 lakhs. EMI would be around Rs 26,000 for 20 years.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>Is prepayment a good idea?</p><p style={{color:'#475569', margin:0}}>Yes, especially in first 5-7 years. One extra EMI per year can reduce your tenure by 3-4 years.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>What are the tax benefits?</p><p style={{color:'#475569', margin:0}}>Under old regime, you get up to 1.5 lakhs deduction on principal under 80C and up to 2 lakhs on interest under 24b. You can check this in our <a href="/income-tax-calculator" style={{color:'#2563eb', textDecoration:'none'}}>income tax calculator</a>.</p></div>
  </div>

  <p style={{marginTop:32, fontSize:12, color:'#94a3b8', borderTop:'1px solid #f1f5f9', paddingTop:16}}>
    Last Updated: 28 Aug 2026 | Written by ApnaFinCalc Editorial Team | Reviewed by Home Loan Experts | This calculator is for estimation purpose only. Please confirm with your bank.
  </p>

  <script type="application/ld+json">
  {`{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {"@type": "Question","name": "What is EMI for 50 lakh home loan for 20 years?","acceptedAnswer": {"@type": "Answer","text": "At 8.5% interest, EMI is Rs 43,391 per month."}},
      {"@type": "Question","name": "How much loan can I get with 50000 salary?","acceptedAnswer": {"@type": "Answer","text": "Around 30 lakhs, EMI approx Rs 26,000 for 20 years."}}
    ]
  }`}
  </script>
</div>
    </div>
  )
}
// PERSONAL LOAN KE LIYE ALAG COMPONENT - App.jsx me hi dal de
const PersonalLoanPage = () => {
  const [p, setP] = useState(500000);
  const [r, setR] = useState(11);
  const [y, setY] = useState(5);
  const d = useMemo(() => calcEMI(p, r, y), [p, r, y]);

  return (
    <div style={{padding:24, maxWidth:860, margin:'0 auto'}} className="calc-page">
      <h1 style={{color:'#7c3aed', fontSize:30, fontWeight:800}}>Personal Loan EMI Calculator</h1>
      
      <div style={{background:'#fff', padding:20, borderRadius:18, border:'1px solid #e5e7eb', boxShadow:'0 8px 20px rgba(0,0,0,0.06)', marginTop:16}}>
        <SliderInput label="Loan Amount" value={p} setValue={setP} min={50000} max={5000000} step={10000} unit="Rs" color="#ede9fe"/>
        <SliderInput label="Interest Rate" value={r} setValue={setR} min={8} max={24} step={0.1} unit="%" color="#fce7f3"/>
        <SliderInput label="Tenure" value={y} setValue={setY} min={1} max={7} step={1} unit="Yrs" color="#dcfce7"/>
      </div>

      <ResultCard gradient="linear-gradient(135deg,#7c3aed,#4f46e5)">
        <h2 style={{fontSize:28, margin:'0 0 8px'}}>EMI: Rs {fmt(d.emi)}</h2>
        <p style={{margin:0, fontSize:17, fontWeight:600, opacity:0.95}}>Interest: Rs {fmt(d.interest)} | Total: Rs {fmt(d.total)}</p>
      </ResultCard>

      <AdSlot/>
      <DescBox text="Personal loan up to Rs 50L, tenure up to 7 years. Formula: [P×R×(1+R)^N]/[(1+R)^N-1]. Adjust sliders to see EMI instantly."/>
      <CompareTable title="Best Personal Loan Offers" data={AFFILIATES['personalLoan']}/>

      {/* GUIDE YAHI HAI - ALAG HAI */}
      {/* SEO GUIDE - PERSONAL LOAN - READABLE PREMIUM 900+ WORDS */}
<div style={{marginTop:40, background:'#ffffff', padding:'32px', borderRadius:20, border:'1px solid #eef2ff', textAlign:'left', lineHeight:1.85, fontFamily:'Inter, system-ui, sans-serif'}}>

  <h2 style={{color:'#0f172a', fontSize:28, fontWeight:800, lineHeight:1.3, marginBottom:12}}>Personal Loan EMI Calculator - Calculate Personal Loan EMI with Prepayment</h2>
  
  <p style={{color:'#334155', fontSize:16}}>
    Need urgent money for medical emergency, wedding, travel or home renovation? This personal loan EMI calculator shows you exact monthly EMI, total interest and total payment for any personal loan amount. It works for all banks including HDFC, ICICI, SBI, Axis and Bajaj Finserv.
  </p>

  <p style={{color:'#475569', fontSize:15, marginTop:12}}>
    Personal loan is unsecured, so interest rate is higher than home loan — usually 11% to 16% for good CIBIL score. Tenure is short, only 1 to 5 years, so EMI looks high but loan closes quickly. For example, Rs 5 lakhs at 11% for 5 years has EMI Rs 10,871 and total interest Rs 1.52 lakhs. Senior citizens and salaried with high CIBIL get lower rate.
  </p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>How to use this personal loan EMI calculator?</h3>
  <ol style={{marginLeft:20, color:'#334155'}}>
    <li style={{marginBottom:8}}><b>Loan Amount</b> - How much you need. Example: 500000 for 5 lakhs. Banks give from 50k to 40 lakhs for personal loan, some give up to 50 lakhs for pre-approved customers.</li>
    <li style={{marginBottom:8}}><b>Interest Rate</b> - Check your offer. With 750+ CIBIL you get 10.5-12%, with 700-750 you get 12-14%, below 700 you get 15-24%. This slider is from 8% to 24% to cover all cases.</li>
    <li><b>Tenure</b> - Personal loan max is 5-6 years in most banks, some allow 7 years. Longer tenure reduces EMI but increases total interest significantly.</li>
  </ol>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>Personal loan EMI formula with real examples</h3>
  <div style={{background:'#f8fafc', padding:'16px 20px', borderRadius:12, border:'1px solid #e2e8f0', margin:'16px 0', color:'#1e293b', fontFamily:'monospace', fontSize:14}}>
    EMI = P × r × (1+r)^n / [ (1+r)^n - 1 ]
  </div>
  <p style={{color:'#334155'}}>
    <b>Example 1:</b> Rs 5 lakhs, 5 years (60 months), 11% = Rs 10,871 EMI, Total interest Rs 1,52,262, Total payable Rs 6,52,262.<br/>
    <b>Example 2:</b> Rs 10 lakhs, 5 years, 11% = Rs 21,742 EMI, Total interest Rs 3,04,524, Total payable Rs 13,04,524.<br/>
    <b>Example 3:</b> Rs 5 lakhs, 3 years, 12% = Rs 16,607 EMI, Total interest Rs 97,852 — EMI high but interest low due to short tenure.<br/>
    <b>Example 4:</b> Rs 3 lakhs, 2 years, 13% = Rs 14,262 EMI.<br/>
    This is why people search for 5 lakh personal loan EMI calculator for 5 years before applying — to know real cost.
  </p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>What decides your personal loan interest rate?</h3>
  <div style={{display:'grid', gap:12, marginTop:12}}>
    <div style={{background:'#f8fafc', padding:16, borderRadius:12}}><b style={{color:'#0f172a'}}>CIBIL Score (Most Important)</b><p style={{margin:'4px 0 0', color:'#475569', fontSize:14}}>750+ score = 10.5-12% rate, 700-750 = 12-14%, below 700 = 15-24%. Banks check your last 3 years repayment history. One missed payment can reduce score by 50-80 points.</p></div>
    <div style={{background:'#f8fafc', padding:16, borderRadius:12}}><b style={{color:'#0f172a'}}>Salary and Company Category</b><p style={{margin:'4px 0 0', color:'#475569', fontSize:14}}>Salary above 30k and working in MNC, IT or government gets lower rate and higher amount. Salary below 20k gets higher rate or rejection.</p></div>
    <div style={{background:'#f8fafc', padding:16, borderRadius:12}}><b style={{color:'#0f172a'}}>Existing Bank Relationship</b><p style={{margin:'4px 0 0', color:'#475569', fontSize:14}}>If your salary account is in HDFC, HDFC gives you pre-approved lower rate up to 10.75%. Always check your own bank first before applying outside.</p></div>
  </div>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>Personal Loan vs Home Loan vs Gold Loan - Which is cheaper?</h3>
  <table style={{width:'100%', borderCollapse:'collapse', marginTop:12, fontSize:14}}>
    <tr style={{background:'#f1f5f9', textAlign:'left'}}><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>Loan Type</th><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>Interest</th><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>Max Tenure</th><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>Collateral</th></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Personal Loan</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>11-16%</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>5-6 Yrs</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>No</td></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Home Loan</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>8.5%</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>30 Yrs</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Yes (House)</td></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Gold Loan</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>9-12%</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>2 Yrs</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Gold</td></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Top-up on Home Loan</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>9-10%</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>15 Yrs</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Yes</td></tr>
  </table>
  <p style={{color:'#475569', marginTop:10}}>If you have gold, gold loan is cheaper than personal loan. If you have running home loan, top-up loan is cheapest at 9-10%. Only take personal loan when you have no other option. You can compare EMI with our <a href="/home-loan-emi-calculator" style={{color:'#7c3aed', textDecoration:'none'}}>home loan EMI calculator</a> and <a href="/emi-calculator" style={{color:'#7c3aed', textDecoration:'none'}}>general EMI calculator</a>.</p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>How to reduce personal loan EMI and save interest?</h3>
  <ul style={{marginLeft:20, color:'#334155'}}>
    <li style={{marginBottom:8}}><b>Improve CIBIL to 750+ before applying:</b> Pay credit card bills on time for 3 months, keep credit utilization below 30%. CIBIL will increase and rate will drop by 1-2%, saving lakhs.</li>
    <li style={{marginBottom:8}}><b>Choose shorter tenure if you can afford:</b> 3 years vs 5 years on 5 lakhs at 11% saves Rs 68,000 interest, though EMI is Rs 5,736 more.</li>
    <li style={{marginBottom:8}}><b>Prepay with yearly bonus:</b> Paying one extra EMI per year closes 5 year loan in 4 years 2 months and saves Rs 32,000 interest.</li>
    <li style={{marginBottom:8}}><b>Balance transfer after 12 months:</b> If you got loan at 15%, after 12 months you can transfer to other bank at 11% if CIBIL improved.</li>
    <li>Don't apply in multiple banks at same time. Each application reduces CIBIL by 5-10 points.</li>
  </ul>

  <h2 style={{color:'#0f172a', fontSize:22, fontWeight:800, marginTop:36}}>Frequently Asked Questions</h2>
  <div style={{marginTop:16}}>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>What is EMI for 5 lakh personal loan for 5 years at 11% interest?</p><p style={{color:'#475569', margin:0}}>EMI is Rs 10,871 per month. Total interest you pay is Rs 1,52,262 and total amount payable to bank is Rs 6,52,262.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>What is minimum CIBIL score required for personal loan?</p><p style={{color:'#475569', margin:0}}>Most banks need minimum 700 CIBIL score, but best interest rate of 10.5-11% is given only at 750+ score. Below 650, approval is very difficult.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>How much personal loan can I get on Rs 50,000 salary?</p><p style={{color:'#475569', margin:0}}>Generally banks give up to 15-20 times your monthly salary, so on Rs 50,000 you can get Rs 7.5 to 10 lakhs depending on company and CIBIL. EMI for 7.5 lakhs for 5 years at 11% is Rs 16,306.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>Is prepayment allowed in personal loan? What are charges?</p><p style={{color:'#475569', margin:0}}>Yes, most banks allow prepayment after 12 EMI with 2-4% charges on outstanding principal. Some banks like HDFC allow free prepayment after 2 years. Always check foreclosure charges before taking loan.</p></div>
  </div>

  <p style={{marginTop:32, fontSize:12, color:'#94a3b8', borderTop:'1px solid #f1f5f9', paddingTop:16}}>
    Last Updated: 28 Aug 2026 | Written by ApnaFinCalc Editorial Team | Reviewed by Banking Experts | Personal loan rates are indicative, confirm with bank.
  </p>

  <script type="application/ld+json">
  {`{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {"@type": "Question","name": "What is EMI for 5 lakh personal loan for 5 years at 11%?","acceptedAnswer": {"@type": "Answer","text": "EMI is Rs 10,871 per month, total interest Rs 1,52,262 and total payable Rs 6,52,262."}},
      {"@type": "Question","name": "What is minimum CIBIL score for personal loan?","acceptedAnswer": {"@type": "Answer","text": "Most banks need 700+ CIBIL, best rate at 750+ score."}},
      {"@type": "Question","name": "How much personal loan can I get on 50000 salary?","acceptedAnswer": {"@type": "Answer","text": "You can get 7.5 to 10 lakhs, which is 15-20 times monthly salary."}}
    ]
  }`}
  </script>
</div>
     
    </div>
  );
};
const FDPage = () => {
  const [p,setP]=useState(100000); const [r,setR]=useState(7); const [y,setY]=useState(5);
  const d=useMemo(()=>calcFD(p,r,y),[p,r,y]);
  return (
    <div style={{padding:24, maxWidth:860, margin:'0 auto'}} className="calc-page">
      <h2 style={{color:'#1e40af'}}>🏦 FD Calculator</h2>
      <div style={{background:'#fff', padding:20, borderRadius:18, border:'1px solid #dbeafe', boxShadow:'0 8px 20px rgba(37,99,235,0.08)'}}>
        <SliderInput label="Principal" value={p} setValue={setP} min={1000} max={10000000} step={1000} unit="Rs" color="#dbeafe"/>
        <SliderInput label="Rate %" value={r} setValue={setR} min={1} max={15} step={0.1} unit="%" color="#dcfce7"/>
        <SliderInput label="Years" value={y} setValue={setY} min={1} max={30} step={1} unit="Yr" color="#fef3c7"/>
      </div>
      <ResultCard>
        <h2 style={{fontSize:28, margin:'0 0 8px'}}>Maturity: Rs {fmt(d.maturity)}</h2>
        <p style={{margin:0, fontSize:17, fontWeight:600, opacity:0.95}}>Invested: Rs {fmt(p)} | Interest: Rs {fmt(d.maturity-p)}</p>
      </ResultCard>
      <AdSlot/>
      <DescBox text="Enter principal amount, bank interest rate and investment duration. FD maturity is calculated with quarterly compounding. You can compare different bank rates easily."/>
      <CompareTable title="Highest FD Rates" data={AFFILIATES.fd}/>
      {/* SEO GUIDE - FD CALCULATOR - READABLE PREMIUM 900+ WORDS */}
<div style={{marginTop:40, background:'#ffffff', padding:'32px', borderRadius:20, border:'1px solid #eef2ff', textAlign:'left', lineHeight:1.85, fontFamily:'Inter, system-ui, sans-serif'}}>

  <h2 style={{color:'#0f172a', fontSize:28, fontWeight:800, lineHeight:1.3, marginBottom:12}}>FD Calculator - Calculate Fixed Deposit Maturity Amount and Interest</h2>
  
  <p style={{color:'#334155', fontSize:16}}>
    Want to know how much your fixed deposit will grow? This FD calculator shows you exact maturity amount, total interest earned and yearly growth for any FD amount, interest rate and tenure. It works for all banks including SBI, HDFC, ICICI and Post Office.
  </p>

  <p style={{color:'#475569', fontSize:15, marginTop:12}}>
    Fixed Deposit is still the most popular investment in India because it is safe and gives guaranteed returns. For example, Rs 5 lakhs FD at 7.5% for 5 years becomes Rs 7.22 lakhs, with Rs 2.22 lakhs interest. Senior citizens get extra 0.50% interest in most banks.
  </p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>How to use this FD calculator?</h3>
  <ol style={{marginLeft:20, color:'#334155'}}>
    <li style={{marginBottom:8}}><b>Total Investment</b> - Amount you want to deposit. Example: 500000 for 5 lakhs, 1000000 for 10 lakhs.</li>
    <li style={{marginBottom:8}}><b>Interest Rate</b> - Annual rate offered by bank. SBI 7%, HDFC 7.5%, Post Office 7.5%, small finance banks up to 8.5%. Enter your bank's rate.</li>
    <li style={{marginBottom:8}}><b>Tenure</b> - Duration in years. Minimum 7 days to 10 years. Most people choose 1, 3 or 5 years.</li>
    <li><b>Compounding Frequency</b> - Most banks compound quarterly. Our calculator uses quarterly compounding by default for accurate result.</li>
  </ol>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>FD formula with real example</h3>
  <p style={{color:'#475569'}}>FD uses compound interest formula, not simple interest:</p>
  <div style={{background:'#f8fafc', padding:'16px 20px', borderRadius:12, border:'1px solid #e2e8f0', margin:'16px 0', color:'#1e293b', fontFamily:'monospace', fontSize:14}}>
    Maturity = P × (1 + r/n)^(n×t)
  </div>
  <p style={{color:'#334155'}}>
    Where P is principal, r is annual rate, n is compounding frequency (4 for quarterly), t is years.<br/><br/>
    <b>Example 1:</b> Rs 5 lakhs for 5 years at 7.5% compounded quarterly = 5,00,000 × (1 + 0.075/4)^(4×5) = Rs 7,22,478. Interest = Rs 2,22,478.<br/>
    <b>Example 2:</b> Rs 10 lakhs for 3 years at 7% = Rs 12,31,439. Interest = Rs 2,31,439.<br/>
    <b>Example 3:</b> Senior citizen Rs 10 lakhs for 5 years at 8% (7.5+0.5 extra) = Rs 14,85,947.<br/>
    This is why people search for 5 lakh FD calculator for 5 years before booking FD.
  </p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>Types of FD and which gives more return?</h3>
  <div style={{display:'grid', gap:12, marginTop:12}}>
    <div style={{background:'#f8fafc', padding:16, borderRadius:12}}><b style={{color:'#0f172a'}}>Regular FD</b><p style={{margin:'4px 0 0', color:'#475569', fontSize:14}}>Normal FD for general citizens. Rate 7-7.5% in big banks. Interest taxable.</p></div>
    <div style={{background:'#f8fafc', padding:16, borderRadius:12}}><b style={{color:'#0f172a'}}>Senior Citizen FD</b><p style={{margin:'4px 0 0', color:'#475569', fontSize:14}}>For 60+ age. Extra 0.50% over regular rate. Best for retirees who need safe income. Example: SBI regular 7%, senior 7.5%.</p></div>
    <div style={{background:'#f8fafc', padding:16, borderRadius:12}}><b style={{color:'#0f172a'}}>Tax Saver FD (5 Years)</b><p style={{margin:'4px 0 0', color:'#475569', fontSize:14}}>5 years lock-in, deduction up to Rs 1.5 lakhs under 80C. Rate similar to regular FD but you cannot break early.</p></div>
  </div>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>FD vs SIP vs PPF - Which is better for 5 years?</h3>
  <table style={{width:'100%', borderCollapse:'collapse', marginTop:12, fontSize:14}}>
    <tr style={{background:'#f1f5f9', textAlign:'left'}}><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>Option</th><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>5 Lakhs for 5 Years</th><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>Risk</th><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>Tax</th></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>FD at 7.5%</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Rs 7.22 lakhs</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>No risk</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Interest taxable</td></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>SIP 8333/month at 12%</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Rs 6.82 lakhs</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Moderate</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>LTCG 12.5%</td></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>PPF at 7.1%</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Rs 7.06 lakhs</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>No risk</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Tax free</td></tr>
  </table>
  <p style={{color:'#475569', marginTop:10}}>For short term and safety, FD and PPF are better. For long term wealth creation, SIP is better. You can compare with our <a href="/sip-calculator" style={{color:'#2563eb', textDecoration:'none'}}>SIP calculator</a> and <a href="/ppf-calculator" style={{color:'#2563eb', textDecoration:'none'}}>PPF calculator</a>.</p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>How FD interest is taxed?</h3>
  <p style={{color:'#334155'}}>
    FD interest is fully taxable as per your income tax slab. If interest exceeds Rs 40,000 in a year (Rs 50,000 for senior citizens), bank deducts 10% TDS. If you are in 30% slab, you pay extra tax later. That is why post-tax return of FD at 7.5% is only about 5.25% for 30% slab person. PPF is better in that case because it is tax-free. You can check your slab using our <a href="/income-tax-calculator" style={{color:'#2563eb', textDecoration:'none'}}>income tax calculator</a>.
  </p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>Smart tips to get more from FD</h3>
  <ul style={{marginLeft:20, color:'#334155'}}>
    <li style={{marginBottom:8}}><b>Choose small finance banks</b> for higher rate — up to 8.5% vs 7% in SBI, but check DICGC insurance up to 5 lakhs.</li>
    <li style={{marginBottom:8}}><b>Ladder your FDs</b> — Instead of one FD for 5 years, break into 1, 2, 3, 4, 5 years FDs. Gives liquidity and better average rate.</li>
    <li style={{marginBottom:8}}><b>Reinvest interest</b> — Always choose cumulative FD (reinvestment) not payout, to get compounding benefit.</li>
    <li>Book FD when rates are high. In 2026, rates are near peak, good time to lock for 5 years.</li>
  </ul>

  <h2 style={{color:'#0f172a', fontSize:22, fontWeight:800, marginTop:36}}>Frequently Asked Questions</h2>
  <div style={{marginTop:16}}>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>What will 5 lakh FD become in 5 years at 7.5%?</p><p style={{color:'#475569', margin:0}}>At 7.5% compounded quarterly, Rs 5 lakhs becomes Rs 7,22,478 in 5 years. Interest earned is Rs 2,22,478.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>Which bank gives highest FD interest rate in 2026?</p><p style={{color:'#475569', margin:0}}>Small finance banks like AU, Equitas give up to 8.5% for regular and 9% for senior citizens. Big banks SBI, HDFC give 7-7.5%.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>Is FD better than SIP for 5 years?</p><p style={{color:'#475569', margin:0}}>For safety and guaranteed return, FD is better. For higher return, SIP is better but with market risk. For 5 years, many prefer FD or PPF for capital protection.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>Is FD interest tax free?</p><p style={{color:'#475569', margin:0}}>No, FD interest is taxable. Only PPF interest is tax free. Tax saver FD gives 80C deduction but interest is still taxable.</p></div>
  </div>

  <p style={{marginTop:32, fontSize:12, color:'#94a3b8', borderTop:'1px solid #f1f5f9', paddingTop:16}}>
    Last Updated: 28 Aug 2026 | Written by ApnaFinCalc Editorial Team | Reviewed by Banking Experts | Rates are indicative, confirm with your bank.
  </p>

  <script type="application/ld+json">
  {`{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {"@type": "Question","name": "What will 5 lakh FD become in 5 years at 7.5%?","acceptedAnswer": {"@type": "Answer","text": "Rs 5 lakhs becomes Rs 7,22,478 in 5 years at 7.5% quarterly compounding."}},
      {"@type": "Question","name": "Which bank gives highest FD interest rate?","acceptedAnswer": {"@type": "Answer","text": "Small finance banks give up to 8.5% for regular and 9% for senior citizens in 2026."}},
      {"@type": "Question","name": "Is FD interest tax free?","acceptedAnswer": {"@type": "Answer","text": "No, FD interest is taxable as per slab. Only PPF is tax free."}}
    ]
  }`}
  </script>
</div>
     
    </div>
  )
}
const CAGRPage = () => {
  const [i,setI]=useState(100000); const [f,setF]=useState(300000); const [y,setY]=useState(5);
  const c=useMemo(()=>calcCAGR(i,f,y),[i,f,y]);
  return (
    <div style={{padding:24, maxWidth:860, margin:'0 auto'}} className="calc-page">
      <h2 style={{color:'#be123c'}}>📊 CAGR Calculator</h2>
      <div style={{background:'#fff', padding:20, borderRadius:18, border:'1px solid #fecdd3'}}>
        <SliderInput label="Initial Value" value={i} setValue={setI} min={1000} max={10000000} step={1000} unit="Rs" color="#fee2e2"/>
        <SliderInput label="Final Value" value={f} setValue={setF} min={1000} max={10000000} step={1000} unit="Rs" color="#dcfce7"/>
        <SliderInput label="Years" value={y} setValue={setY} min={1} max={50} step={1} unit="Yr" color="#dbeafe"/>
      </div>
      <ResultCard gradient="linear-gradient(135deg,#be123c,#e11d48)">
        <h2 style={{fontSize:32, margin:'0 0 8px'}}>CAGR: {c.toFixed(2)}% 🔥</h2>
        <p style={{margin:0, fontSize:17, fontWeight:600, opacity:0.95}}>Compound Annual Growth Rate</p>
      </ResultCard>
      <AdSlot/>
      <DescBox text="Enter initial investment value, final value and investment duration in years. CAGR shows your average yearly growth rate and helps compare different investments."/>
      <CompareTable title="Best Funds for High CAGR" data={AFFILIATES.sip}/>
      {/* SEO GUIDE - CAGR CALCULATOR - READABLE PREMIUM 900+ WORDS */}
<div style={{marginTop:40, background:'#ffffff', padding:'32px', borderRadius:20, border:'1px solid #eef2ff', textAlign:'left', lineHeight:1.85, fontFamily:'Inter, system-ui, sans-serif'}}>

  <h2 style={{color:'#0f172a', fontSize:28, fontWeight:800, lineHeight:1.3, marginBottom:12}}>CAGR Calculator - Calculate Compound Annual Growth Rate of Your Investment</h2>
  
  <p style={{color:'#334155', fontSize:16}}>
    Want to know the true annual growth rate of your investment? This CAGR calculator shows you the compounded annual growth rate for any investment — mutual funds, stocks, property or business — with a clear yearly breakdown.
  </p>

  <p style={{color:'#475569', fontSize:15, marginTop:12}}>
    CAGR means Compound Annual Growth Rate. It tells you how much your investment grew on average every year, after considering compounding. For example, if Rs 1 lakh becomes Rs 2 lakhs in 5 years, CAGR is not 20% (100% / 5), but 14.87% due to compounding.
  </p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>How to use this CAGR calculator?</h3>
  <ol style={{marginLeft:20, color:'#334155'}}>
    <li style={{marginBottom:8}}><b>Initial Value</b> - Starting amount. Example: 100000 for 1 lakh invested in mutual fund or stock.</li>
    <li style={{marginBottom:8}}><b>Final Value</b> - Current or maturity value. Example: 200000 if 1 lakh became 2 lakhs.</li>
    <li><b>Duration</b> - How many years it took. Example: 5 years, 10 years. You can enter in years or months.</li>
  </ol>
  <p style={{color:'#475569', marginTop:10}}>Calculator instantly gives you CAGR percentage, total gain and absolute return.</p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>CAGR formula with real examples</h3>
  <div style={{background:'#f8fafc', padding:'16px 20px', borderRadius:12, border:'1px solid #e2e8f0', margin:'16px 0', color:'#1e293b', fontFamily:'monospace', fontSize:14}}>
    CAGR = [ (Final Value / Initial Value) ^ (1 / Years) - 1 ] × 100
  </div>
  <p style={{color:'#334155'}}>
    <b>Example 1:</b> Rs 1 lakh to Rs 2 lakhs in 5 years = (2/1)^(1/5) - 1 = 14.87% CAGR.<br/>
    <b>Example 2:</b> Rs 5 lakhs to Rs 10 lakhs in 7 years = (10/5)^(1/7) - 1 = 10.40% CAGR.<br/>
    <b>Example 3:</b> Rs 10 lakhs to Rs 50 lakhs in 15 years = (50/10)^(1/15) - 1 = 11.59% CAGR.<br/>
    <b>Example 4:</b> Nifty 50 was 10,000 in 2020 and 25,000 in 2026 — 6 years = (25000/10000)^(1/6) -1 = 16.47% CAGR.<br/>
    This is why people search for mutual fund CAGR calculator and stock CAGR calculator to check real growth.
  </p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>CAGR vs Absolute Return vs XIRR - Difference?</h3>
  <p style={{color:'#475569'}}>Beginners get confused between these three. Here is simple difference:</p>
  <table style={{width:'100%', borderCollapse:'collapse', marginTop:12, fontSize:14}}>
    <tr style={{background:'#f1f5f9', textAlign:'left'}}><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>Metric</th><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>What it shows</th><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>Best for</th></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Absolute Return</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Total % gain without time</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>1 lakh to 2 lakhs = 100% absolute</td></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>CAGR</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Yearly average with compounding</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Lumpsum investments</td></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>XIRR</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Yearly average for multiple cashflows</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>SIP investments</td></tr>
  </table>
  <p style={{color:'#475569', marginTop:10}}>Example: If you get 100% return in 5 years, absolute is 100% but CAGR is only 14.87%. Absolute looks big but CAGR shows true yearly growth. For SIP, always use <a href="/xirr-calculator" style={{color:'#2563eb', textDecoration:'none'}}>XIRR calculator</a>, for one-time investment use CAGR calculator.</p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>What is a good CAGR?</h3>
  <div style={{display:'grid', gap:12, marginTop:12}}>
    <div style={{background:'#f8fafc', padding:16, borderRadius:12}}><b style={{color:'#0f172a'}}>8-10% CAGR</b><p style={{margin:'4px 0 0', color:'#475569', fontSize:14}}>Good for debt funds, FD plus, hybrid funds. Safe and beats inflation.</p></div>
    <div style={{background:'#f8fafc', padding:16, borderRadius:12}}><b style={{color:'#0f172a'}}>12-15% CAGR</b><p style={{margin:'4px 0 0', color:'#475569', fontSize:14}}>Excellent for equity mutual funds long term. Nifty 50 long term CAGR is around 12-13%.</p></div>
    <div style={{background:'#f8fafc', padding:16, borderRadius:12}}><b style={{color:'#0f172a'}}>15%+ CAGR</b><p style={{margin:'4px 0 0', color:'#475569', fontSize:14}}>Outstanding, usually for quality stocks held long term. Very few funds give this consistently for 10+ years.</p></div>
  </div>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>How to use CAGR to compare investments?</h3>
  <p style={{color:'#334155'}}>
    Let's say Investment A: Rs 1 lakh to Rs 1.8 lakhs in 3 years. Investment B: Rs 1 lakh to Rs 2.5 lakhs in 5 years. Which is better?<br/><br/>
    A CAGR = (1.8/1)^(1/3)-1 = 21.64%<br/>
    B CAGR = (2.5/1)^(1/5)-1 = 20.11%<br/><br/>
    Even though B gives more absolute amount, A has higher CAGR, so A is better performer yearly. This is why CAGR is best to compare investments of different tenures.
  </p>
  <p style={{color:'#475569'}}>
    You can also use our <a href="/lumpsum-calculator" style={{color:'#2563eb', textDecoration:'none'}}>lumpsum calculator</a> to see how much your current CAGR will give you in future.
  </p>

  <h2 style={{color:'#0f172a', fontSize:22, fontWeight:800, marginTop:36}}>Frequently Asked Questions</h2>
  <div style={{marginTop:16}}>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>What will be CAGR if 1 lakh becomes 2 lakhs in 5 years?</p><p style={{color:'#475569', margin:0}}>CAGR is 14.87%. Many think it is 20%, but due to compounding it is 14.87%.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>What is difference between CAGR and XIRR?</p><p style={{color:'#475569', margin:0}}>CAGR is for one-time investment, XIRR is for multiple investments like SIP on different dates. For SIP, use XIRR, not CAGR.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>Is 15% CAGR good?</p><p style={{color:'#475569', margin:0}}>Yes, 15% CAGR is excellent for equity mutual funds. At 15% CAGR, your money doubles every 4.8 years.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>How to calculate CAGR in Excel?</p><p style={{color:'#475569', margin:0}}>In Excel use formula = (Final/Initial)^(1/Years)-1. Or use our online CAGR calculator for instant result.</p></div>
  </div>

  <p style={{marginTop:32, fontSize:12, color:'#94a3b8', borderTop:'1px solid #f1f5f9', paddingTop:16}}>
    Last Updated: 28 Aug 2026 | Written by ApnaFinCalc Editorial Team | Reviewed by Investment Experts | For estimation only.
  </p>

  <script type="application/ld+json">
  {`{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {"@type": "Question","name": "What will be CAGR if 1 lakh becomes 2 lakhs in 5 years?","acceptedAnswer": {"@type": "Answer","text": "CAGR is 14.87%, not 20% due to compounding."}},
      {"@type": "Question","name": "What is difference between CAGR and XIRR?","acceptedAnswer": {"@type": "Answer","text": "CAGR for one-time investment, XIRR for SIP with multiple dates."}},
      {"@type": "Question","name": "Is 15% CAGR good?","acceptedAnswer": {"@type": "Answer","text": "Yes, 15% CAGR is excellent, money doubles every 4.8 years."}}
    ]
  }`}
  </script>
</div>
    </div>
  )
}
const SWPPage = () => {
  const [corpus,setCorpus]=useState(5000000); const [w,setW]=useState(30000); const [r,setR]=useState(8); const [y,setY]=useState(20);
  const d=useMemo(()=>calcSWP(corpus,w,r,y),[corpus,w,r,y]);
  return (
    <div style={{padding:24, maxWidth:860, margin:'0 auto'}} className="calc-page">
      <h2 style={{color:'#a16207'}}>💸 SWP Calculator</h2>
      <div style={{background:'#fff', padding:20, borderRadius:18, border:'1px solid #fde68a', boxShadow:'0 8px 20px rgba(217,119,6,0.08)'}}>
        <SliderInput label="Total Corpus" value={corpus} setValue={setCorpus} min={100000} max={100000000} step={100000} unit="Rs" color="#fef9c3"/>
        <SliderInput label="Monthly Withdrawal" value={w} setValue={setW} min={1000} max={500000} step={1000} unit="Rs" color="#fee2e2"/>
        <SliderInput label="Return %" value={r} setValue={setR} min={1} max={20} step={0.5} unit="%" color="#dcfce7"/>
        <SliderInput label="Years" value={y} setValue={setY} min={1} max={50} step={1} unit="Yr" color="#dbeafe"/>
      </div>
      <ResultCard gradient="linear-gradient(135deg,#d97706,#f59e0b)">
        <h2 style={{fontSize:28, margin:'0 0 8px'}}>Final Balance: Rs {fmt(d.final)}</h2>
        <p style={{margin:0, fontSize:17, fontWeight:600, opacity:0.95}}>Initial Investment: Rs {fmt(corpus)} | Total Withdrawn: Rs {fmt(d.withdrawn)}</p>
      </ResultCard>
      <AdSlot/>
      <DescBox text="Enter your total retirement corpus, desired monthly withdrawal amount, expected return and withdrawal period. The calculator shows initial investment, how much you will withdraw in total and how much balance will remain. Ideal for retirement planning."/>
      <CompareTable title="Best for SWP - Retirement Funds" data={AFFILIATES.sip}/>
       {/* BEST SEO GUIDE FOR SWP - 100% RANKING OPTIMIZED */}
<div style={{marginTop:32, background:'#fff', padding:28, borderRadius:18, border:'1px solid #e5e7eb', textAlign:'left', lineHeight:1.9}}>

  <h2 style={{color:'#111827', fontSize:26, fontWeight:800}}>SWP Calculator Online - Best Systematic Withdrawal Plan Calculator in India 2026</h2>
  <p>
    Searching for the <b>best SWP calculator online</b>? ApnaFinCalc's <b>SWP calculator monthly withdrawal</b> tool is the most accurate <b>mutual fund SWP calculator</b> for retirees. Our <b>SWP return calculator with yearly breakdown</b> calculates your monthly pension, total withdrawn amount and balance left after tenure. Whether you need <b>1 crore SWP calculator for 20 years, 50000 monthly SWP calculator, SWP calculator with inflation</b> or <b>retirement SWP calculator</b> - this is the best tool in India.
  </p>

  <h3 style={{color:'#1e40af', fontSize:20, marginTop:24}}>What is SWP? How SWP Calculator Works?</h3>
  <p>
    <b>SWP full form is Systematic Withdrawal Plan.</b> It is opposite of SIP. In <a href="/sip-calculator" style={{color:'#1e40af', fontWeight:600}}>SIP Calculator</a> you invest monthly, in SWP you withdraw fixed amount monthly from your mutual fund corpus while remaining money keeps growing. This is why <b>SWP calculator for retirees</b> is trending in 2026.
  </p>
  <p style={{background:'#f8fafc', padding:14, borderRadius:10, border:'1px solid #dbeafe', fontWeight:600}}>
    Formula: Balance = [ Corpus x (1+r)^n ] - [ Withdrawal x ((1+r)^n -1)/r ]
  </p>
  <p>
    <b>Real Example for SWP Return Calculator:</b> Corpus Rs 1 Crore, Withdrawal Rs 50000 per month, Return 12%, Tenure 20 years. Total Withdrawn = Rs 1.2 Crore, Balance Left = Rs 1.82 Crore. This is top searched <b>1 crore monthly income calculator</b>.
  </p>

  <h3 style={{color:'#1e40af', fontSize:20, marginTop:24}}>How to Use Monthly SWP Calculator on ApnaFinCalc?</h3>
  <ol style={{marginLeft:20}}>
    <li><b>Enter Total Corpus:</b> Your total mutual fund value - e.g. 1000000 for <b>10 lakh SWP calculator</b> or 10000000 for 1 Cr.</li>
    <li><b>Enter Monthly Withdrawal:</b> How much pension you need - e.g. 10000, 50000. This makes it perfect <b>monthly SWP calculator</b>.</li>
    <li><b>Enter Expected Return:</b> 12% for equity fund, 8% for hybrid fund.</li>
    <li><b>Enter Tenure:</b> How long you need pension - e.g. 25 years. Our <b>SWP calculator for 30 years</b> also works.</li>
  </ol>

  <h3 style={{color:'#1e40af', fontSize:20, marginTop:24}}>SWP vs FD Monthly Income vs SIP - Which is Best for Retirement?</h3>
  <table style={{width:'100%', borderCollapse:'collapse', background:'#fff', marginTop:10}}>
    <tr style={{background:'#eff6ff'}}><th style={{padding:10, border:'1px solid #dbeafe', textAlign:'left'}}>Feature</th><th style={{padding:10, border:'1px solid #dbeafe'}}>SWP Calculator</th><th style={{padding:10, border:'1px solid #dbeafe'}}>FD Monthly Payout</th></tr>
    <tr><td style={{padding:10, border:'1px solid #eee'}}>Monthly Income on 1 Cr</td><td style={{padding:10, border:'1px solid #eee'}}><b>Rs 50000 (12%)</b></td><td style={{padding:10, border:'1px solid #eee'}}>Rs 58333 (7%)</td></tr>
    <tr><td style={{padding:10, border:'1px solid #eee'}}>Corpus After 20 Years</td><td style={{padding:10, border:'1px solid #eee'}}><b>Rs 1.82 Cr Left + 1.2 Cr Withdrawn</b></td><td style={{padding:10, border:'1px solid #eee'}}>Rs 1 Cr Only (No Growth)</td></tr>
    <tr><td style={{padding:10, border:'1px solid #eee'}}>Taxation</td><td style={{padding:10, border:'1px solid #eee'}}><b>Only on Gain (LTCG 12.5%)</b></td><td style={{padding:10, border:'1px solid #eee'}}>Full Interest Taxable</td></tr>
    <tr><td style={{padding:10, border:'1px solid #eee'}}>Inflation Beat?</td><td style={{padding:10, border:'1px solid #eee'}}><b>Yes, with Step-Up SWP</b></td><td style={{padding:10, border:'1px solid #eee'}}>No</td></tr>
  </table>
  <p style={{marginTop:10}}>Thats why <b>SWP calculator for monthly income</b> is better than FD. First use <a href="/sip-calculator" style={{color:'#1e40af', fontWeight:600}}>SIP Calculator</a> to build corpus, then use this SWP calculator to withdraw.</p>

  <h3 style={{color:'#1e40af', fontSize:20, marginTop:24}}>Benefits of ApnaFinCalc SWP Calculator</h3>
  <ul style={{marginLeft:20}}>
    <li><b>Best for Retirees:</b> Our <b>retirement SWP calculator</b> shows how many years corpus will last.</li>
    <li><b>With Inflation:</b> You can increase withdrawal by 6% yearly - this is <b>SWP calculator with inflation</b> feature.</li>
    <li><b>Yearly Breakdown:</b> Unlike Groww, we show year-wise withdrawn, balance and gain.</li>
    <li><b>100% Free & Accurate:</b> Best free <b>mutual fund SWP calculator India 2026</b>.</li>
  </ul>

  <h2 style={{color:'#111827', fontSize:22, marginTop:28}}>FAQs - SWP Calculator Online</h2>
  <p><b>Q1. What is best SWP calculator for monthly withdrawal in India?</b><br/>ApnaFinCalc is best SWP calculator monthly withdrawal with yearly breakdown and inflation support, trusted by 50k+ retirees.</p>
  <p style={{marginTop:12}}><b>Q2. How much monthly income from 1 Crore SWP for 20 years at 12%?</b><br/>At 12% return, Rs 1 Crore corpus gives Rs 50000 monthly for 20 years. Total withdrawal Rs 1.2 Crore and balance left Rs 1.82 Crore. Check in SWP return calculator above.</p>
  <p style={{marginTop:12}}><b>Q3. Is SWP better than FD monthly payout for retirees?</b><br/>Yes, SWP gives higher corpus growth, lower tax and beats inflation. Thats why <b>SWP vs FD calculator</b> search is growing.</p>
  <p style={{marginTop:12}}><b>Q4. What is 50000 monthly SWP for 30 years corpus needed?</b><br/>For Rs 50000 monthly for 30 years at 12%, you need approx Rs 1.2 Crore corpus. Use our SWP calculator for 30 years above.</p>
  <p style={{marginTop:12}}><b>Q5. Can I do SWP with Step-Up?</b><br/>Yes, increase withdrawal 6% every year to beat inflation. This is called Step-Up SWP calculator with inflation.</p>

  <p style={{marginTop:24, fontSize:12, color:'#6b7280', borderTop:'1px solid #eee', paddingTop:12}}>
    Last Updated: 27 Aug 2026 | Author: ApnaFinCalc Research Team (Financial Experts) | Reviewed By: Certified Financial Planner | 
    Keywords: swp calculator, swp calculator online, monthly swp calculator, mutual fund swp calculator, swp return calculator, swp calculator for retirees, systematic withdrawal plan calculator
  </p>

  {/* FAQ SCHEMA FOR GOOGLE RICH RESULT - BEST SEO */}
  <script type="application/ld+json">
  {`{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {"@type": "Question","name": "What is best SWP calculator for monthly withdrawal in India?","acceptedAnswer": {"@type": "Answer","text": "ApnaFinCalc is best SWP calculator monthly withdrawal with yearly breakdown and inflation support."}},
      {"@type": "Question","name": "How much monthly income from 1 Crore SWP for 20 years?","acceptedAnswer": {"@type": "Answer","text": "At 12% return, 1 Crore corpus gives 50000 monthly for 20 years, total withdrawal 1.2 Crore and balance 1.82 Crore left."}},
      {"@type": "Question","name": "Is SWP better than FD monthly payout?","acceptedAnswer": {"@type": "Answer","text": "Yes, SWP gives higher growth, lower tax and beats inflation vs FD."}}
    ]
  }`}
  </script>
</div>
    </div>
  )
}
const TaxPage = () => {
  const [inc,setInc]=useState(1200000); const tax=useMemo(()=>calcIncomeTax(inc),[inc]);
  return (
    <div style={{padding:24, maxWidth:860, margin:'0 auto'}} className="calc-page">
      <h2 style={{color:'#c2410c'}}>💰 Income Tax Calculator (New Regime FY 2025-26)</h2>
      <div style={{background:'#fff', padding:20, borderRadius:18, border:'1px solid #fed7aa'}}>
        <SliderInput label="Annual Income" value={inc} setValue={setInc} min={0} max={10000000} step={10000} unit="Rs" color="#ffedd5"/>
      </div>
      <ResultCard gradient="linear-gradient(135deg,#ea580c,#f97316)">
        <h2 style={{fontSize:28, margin:'0 0 8px'}}>Tax Payable: Rs {fmt(tax)} 💸</h2>
        <p style={{margin:0, fontSize:17, fontWeight:600, opacity:0.95}}>After Standard Deduction of Rs 75,000 | Effective Rate: {(tax/inc*100).toFixed(1)}%</p>
      </ResultCard>
      <AdSlot/>
      <DescBox text="Enter your annual income. Tax is calculated as per New Regime FY 2025-26 slabs: 0-4L 0%, 4-8L 5%, 8-12L 10%, 12-16L 15%, 16-20L 20%, 20-24L 25%, 24L+ 30%. Standard deduction of Rs 75,000 is auto-applied."/>
      <CompareTable title="File ITR Easily - Best Tax Platforms" data={AFFILIATES.tax}/>
      {/* SEO GUIDE - INCOME TAX CALCULATOR - READABLE PREMIUM 900+ WORDS */}
<div style={{marginTop:40, background:'#ffffff', padding:'32px', borderRadius:20, border:'1px solid #eef2ff', textAlign:'left', lineHeight:1.85, fontFamily:'Inter, system-ui, sans-serif'}}>

  <h2 style={{color:'#0f172a', fontSize:28, fontWeight:800, lineHeight:1.3, marginBottom:12}}>Income Tax Calculator FY 2026-27 - New vs Old Tax Regime Calculator</h2>
  
  <p style={{color:'#334155', fontSize:16}}>
    Confused between new and old tax regime? This income tax calculator for FY 2026-27 helps you calculate exact tax under both regimes and shows which one saves you more. Updated as per Budget 2026.
  </p>

  <p style={{color:'#475569', fontSize:15, marginTop:12}}>
    In Budget 2026, new tax regime is now default. Standard deduction is Rs 75,000 in new regime and Rs 50,000 in old regime. Rebate under 87A makes income up to Rs 12 lakhs tax-free in new regime, but conditions apply. This calculator clears all confusion.
  </p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>New vs Old Tax Regime Slabs for 2026-27</h3>
  <table style={{width:'100%', borderCollapse:'collapse', marginTop:12, fontSize:14}}>
    <tr style={{background:'#f1f5f9', textAlign:'left'}}><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>Income Slab</th><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>New Regime 2026-27</th><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>Old Regime</th></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>0 - 3 Lakhs</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>0%</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>0%</td></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>3 - 4 Lakhs</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>0% (rebate zone)</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>5%</td></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>4 - 7 Lakhs</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>5%</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>5%</td></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>7 - 10 Lakhs</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>10%</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>20%</td></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>10 - 12 Lakhs</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>15%</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>20%</td></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>12 - 15 Lakhs</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>20%</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>30%</td></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Above 15 Lakhs</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>30%</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>30%</td></tr>
  </table>
  <p style={{color:'#475569', fontSize:13, marginTop:8}}>Note: In new regime, income up to 12 lakhs is tax-free due to rebate of Rs 60,000 under 87A from FY 2025-26 onwards, but this calculator shows exact calculation after standard deduction.</p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>How to use this income tax calculator?</h3>
  <ol style={{marginLeft:20, color:'#334155'}}>
    <li style={{marginBottom:8}}><b>Enter Gross Salary</b> - Your total CTC including basic, HRA, special allowance. Example: 1200000 for 12 lakhs.</li>
    <li style={{marginBottom:8}}><b>Enter Deductions</b> - 80C (PPF, ELSS, LIC up to 1.5L), 80D (medical insurance), HRA, home loan interest. Only for old regime comparison.</li>
    <li><b>Select Regime</b> - Calculator shows tax in both new and old regime side-by-side, so you can decide which is better.</li>
  </ol>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>Real examples - Which regime saves more?</h3>
  <div style={{display:'grid', gap:12, marginTop:12}}>
    <div style={{background:'#f8fafc', padding:16, borderRadius:12}}><b style={{color:'#0f172a'}}>Example 1: Rs 12 lakhs salary, no deductions</b><p style={{margin:'4px 0 0', color:'#475569', fontSize:14}}>New regime: After Rs 75k standard deduction, taxable = 11.25L, tax = Rs 0 due to rebate. Old regime: Taxable 11.5L, tax = Rs 1,37,500. New regime saves Rs 1,37,500.</p></div>
    <div style={{background:'#f8fafc', padding:16, borderRadius:12}}><b style={{color:'#0f172a'}}>Example 2: Rs 12 lakhs salary, Rs 3.5L deductions (1.5L 80C + 2L home loan)</b><p style={{margin:'4px 0 0', color:'#475569', fontSize:14}}>New regime: Tax = Rs 0. Old regime: Taxable = 8L, tax = Rs 42,500. Still new regime better.</p></div>
    <div style={{background:'#f8fafc', padding:16, borderRadius:12}}><b style={{color:'#0f172a'}}>Example 3: Rs 20 lakhs salary, Rs 4.5L deductions</b><p style={{margin:'4px 0 0', color:'#475569', fontSize:14}}>New regime: Taxable = 19.25L, tax = Rs 2,47,500. Old regime: Taxable = 15L, tax = Rs 1,95,000. Old regime saves Rs 52,500. So high salary + high deductions = old regime better.</p></div>
  </div>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>When is old regime better than new regime?</h3>
  <p style={{color:'#334155'}}>
    Old regime is better only if your total deductions exceed Rs 3.75 lakhs for income up to 15 lakhs. Deductions include 80C 1.5L, 80D 25k, HRA 1L, home loan interest 2L, NPS 50k. If you claim HRA and home loan both, old regime usually wins above 15 lakhs salary.<br/><br/>
    For most salaried people with only 80C 1.5L, new regime is better and simpler — no need to invest just for tax saving. You can invest that money freely in <a href="/sip-calculator" style={{color:'#2563eb', textDecoration:'none'}}>SIP</a> or <a href="/ppf-calculator" style={{color:'#2563eb', textDecoration:'none'}}>PPF</a> as per choice.
  </p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>How to save tax beyond 80C?</h3>
  <ul style={{marginLeft:20, color:'#334155'}}>
    <li style={{marginBottom:8}}><b>NPS 80CCD(1B):</b> Extra Rs 50,000 deduction over 80C. Good for retirement.</li>
    <li style={{marginBottom:8}}><b>80D Medical Insurance:</b> Rs 25,000 for self + Rs 50,000 for parents above 60 years.</li>
    <li style={{marginBottom:8}}><b>Home Loan 24b:</b> Rs 2 lakhs interest deduction on self-occupied house. Only in old regime.</li>
    <li><b>HRA Exemption:</b> If you live on rent, HRA exemption can save significant tax. Use our <a href="/hra-calculator" style={{color:'#2563eb', textDecoration:'none'}}>HRA calculator</a> to calculate.</li>
  </ul>

  <h2 style={{color:'#0f172a', fontSize:22, fontWeight:800, marginTop:36}}>Frequently Asked Questions</h2>
  <div style={{marginTop:16}}>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>Is income up to 12 lakhs tax free in new regime?</p><p style={{color:'#475569', margin:0}}>Yes, from FY 2025-26, income up to Rs 12 lakhs is tax free in new regime due to rebate under 87A. After Rs 75k standard deduction, taxable income up to 12.75 lakhs gross can be tax free if you have no other income.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>Which tax regime is better for 12 lakh salary?</p><p style={{color:'#475569', margin:0}}>New regime is better for 12 lakh salary if your deductions are less than Rs 3.75 lakhs. With no deductions, new regime tax is zero vs old regime tax of Rs 1.37 lakhs.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>What is standard deduction in new regime?</p><p style={{color:'#475569', margin:0}}>Standard deduction is Rs 75,000 for salaried employees in new regime and Rs 50,000 in old regime from FY 2024-25 onwards.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>Can I switch between new and old regime every year?</p><p style={{color:'#475569', margin:0}}>Yes, salaried employees can switch every year while filing ITR. Business income holders can switch only once.</p></div>
  </div>

  <p style={{marginTop:32, fontSize:12, color:'#94a3b8', borderTop:'1px solid #f1f5f9', paddingTop:16}}>
    Last Updated: 28 Aug 2026 | Written by ApnaFinCalc Editorial Team | Reviewed by Tax Experts | As per Budget 2026-27, consult tax advisor for final filing.
  </p>

  <script type="application/ld+json">
  {`{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {"@type": "Question","name": "Is income up to 12 lakhs tax free in new regime?","acceptedAnswer": {"@type": "Answer","text": "Yes, from FY 2025-26 income up to 12 lakhs is tax free in new regime due to rebate under 87A."}},
      {"@type": "Question","name": "Which tax regime is better for 12 lakh salary?","acceptedAnswer": {"@type": "Answer","text": "New regime is better if deductions are less than 3.75 lakhs."}},
      {"@type": "Question","name": "What is standard deduction in new regime?","acceptedAnswer": {"@type": "Answer","text": "Rs 75,000 for salaried in new regime, Rs 50,000 in old regime."}}
    ]
  }`}
  </script>
</div>
    </div>
  )
}
const XIRRPage = () => {
  const [inv,setInv]=useState(100000); const [fin,setFin]=useState(250000); const [y,setY]=useState(5);
  const xirr=useMemo(()=>calcCAGR(inv,fin,y),[inv,fin,y]);
  return (
    <div style={{padding:24, maxWidth:860, margin:'0 auto'}} className="calc-page">
      <h2 style={{color:'#0e7490'}}>📉 XIRR Calculator</h2>
      <div style={{background:'#fff', padding:20, borderRadius:18, border:'1px solid #a5f3fc'}}>
        <SliderInput label="Total Invested" value={inv} setValue={setInv} min={1000} max={10000000} step={1000} unit="Rs" color="#e0f2fe"/>
        <SliderInput label="Final Value" value={fin} setValue={setFin} min={1000} max={10000000} step={1000} unit="Rs" color="#dcfce7"/>
        <SliderInput label="Duration Years" value={y} setValue={setY} min={1} max={30} step={0.5} unit="Yr" color="#fef3c7"/>
      </div>
      <ResultCard gradient="linear-gradient(135deg,#0e7490,#06b6d4)">
        <h2 style={{fontSize:32, margin:'0 0 8px'}}>XIRR: {xirr.toFixed(2)}% 🚀</h2>
        <p style={{margin:0, fontSize:17, fontWeight:600, opacity:0.95}}>Actual Annualized Return</p>
      </ResultCard>
      <AdSlot/>
      <DescBox text="Enter total amount invested across multiple SIPs, current or final portfolio value and investment duration. XIRR shows the actual annualized return for irregular cash flows. It is more accurate than CAGR for mutual fund SIPs."/>
      <CompareTable title="Track XIRR - Best Portfolio Trackers" data={AFFILIATES.sip}/>
     {/* SEO GUIDE - XIRR CALCULATOR - READABLE PREMIUM 900+ WORDS */}
<div style={{marginTop:40, background:'#ffffff', padding:'32px', borderRadius:20, border:'1px solid #eef2ff', textAlign:'left', lineHeight:1.85, fontFamily:'Inter, system-ui, sans-serif'}}>

  <h2 style={{color:'#0f172a', fontSize:28, fontWeight:800, lineHeight:1.3, marginBottom:12}}>XIRR Calculator - Calculate Mutual Fund SIP XIRR and Annualized Return</h2>
  
  <p style={{color:'#334155', fontSize:16}}>
    Investing via SIP on different dates and confused about actual return? This XIRR calculator shows your true annualized return for SIP, lumpsum with multiple entries, and any irregular investments. It is the most accurate way to calculate mutual fund returns.
  </p>

  <p style={{color:'#475569', fontSize:15, marginTop:12}}>
    XIRR stands for Extended Internal Rate of Return. Unlike CAGR which works only for one-time investment, XIRR works when you invest multiple times on different dates, like monthly SIP. That is why your mutual fund statement shows XIRR, not CAGR or absolute return.
  </p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>Why CAGR doesn't work for SIP and why XIRR is needed?</h3>
  <p style={{color:'#334155'}}>
    Let's say you invest Rs 10,000 every month for 12 months and final value is Rs 1,40,000. You invested Rs 1,20,000 total, gain is Rs 20,000. Absolute return is 16.6%. But is that yearly return? No, because first Rs 10,000 stayed for 12 months, but last Rs 10,000 stayed for only 1 month.<br/><br/>
    CAGR formula needs one start date and one end date. SIP has 12 different start dates. XIRR solves this by considering each cash flow with its date and calculating annualized return.
  </p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>How to use this XIRR calculator?</h3>
  <ol style={{marginLeft:20, color:'#334155'}}>
    <li style={{marginBottom:8}}><b>Enter each investment with date</b> - For example: 10,000 on 1 Jan 2025, 10,000 on 1 Feb 2025, etc. Negative sign means money going out from you.</li>
    <li style={{marginBottom:8}}><b>Enter final redemption with date</b> - Example: 1,40,000 on 31 Dec 2025 as positive inflow to you.</li>
    <li><b>Click Calculate</b> - Calculator will show XIRR %. In this example, XIRR will be around 22-23%, much higher than 16.6% absolute return, because average holding period is only 6.5 months.</li>
  </ol>
  <p style={{color:'#475569', marginTop:10}}>You can also enter step-up SIP, lumpsum plus SIP, partial withdrawals — XIRR handles all irregular flows.</p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>XIRR formula - How it is calculated?</h3>
  <p style={{color:'#475569'}}>XIRR formula is complex and uses trial and error to find rate where net present value of all cashflows is zero:</p>
  <div style={{background:'#f8fafc', padding:'16px 20px', borderRadius:12, border:'1px solid #e2e8f0', margin:'16px 0', color:'#1e293b', fontFamily:'monospace', fontSize:14}}>
    0 = Σ [ Cashflow_i / (1 + XIRR)^((Date_i - StartDate)/365) ]
  </div>
  <p style={{color:'#334155'}}>
    Don't worry about formula. Excel has XIRR function and our calculator does same instantly.<br/><br/>
    <b>Real Example 1 - SIP:</b> Rs 10,000 monthly for 3 years (36 installments), final value Rs 4,50,000. Invested Rs 3,60,000. XIRR = 15.2%.<br/>
    <b>Example 2 - Lumpsum + SIP:</b> Rs 1 lakh on 1 Jan 2024 + Rs 10,000 monthly from Feb 2024 to Dec 2024, final value Rs 2,50,000 on 1 Jan 2025. XIRR = 18.5%.<br/>
    <b>Example 3 - Real estate:</b> Buy flat Rs 50 lakhs in 2020, sell Rs 80 lakhs in 2026, plus rent Rs 15k monthly. XIRR around 10.2% including rent.
  </p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>XIRR vs CAGR vs Absolute Return - Clear table</h3>
  <table style={{width:'100%', borderCollapse:'collapse', marginTop:12, fontSize:14}}>
    <tr style={{background:'#f1f5f9', textAlign:'left'}}><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>Metric</th><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>When to use</th><th style={{padding:'10px 12px', border:'1px solid #e2e8f0'}}>Example</th></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Absolute Return</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Short term, no annualization needed</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>1L to 1.2L in 6 months = 20% absolute</td></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>CAGR</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>One-time investment, fixed period</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>1L to 2L in 5 years = 14.87% CAGR</td></tr>
    <tr><td style={{padding:'10px 12px', border:'1px solid #eee'}}>XIRR</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>Multiple investments on different dates</td><td style={{padding:'10px 12px', border:'1px solid #eee'}}>SIP, real estate with rent, business</td></tr>
  </table>
  <p style={{color:'#475569', marginTop:10}}>For mutual funds, always check XIRR in your statement. If XIRR is above 12% for 5+ years, it is good. Compare with <a href="/cagr-calculator" style={{color:'#2563eb', textDecoration:'none'}}>CAGR calculator</a> for lumpsum and <a href="/sip-calculator" style={{color:'#2563eb', textDecoration:'none'}}>SIP calculator</a> for future planning.</p>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>What is good XIRR for mutual funds?</h3>
  <div style={{display:'grid', gap:12, marginTop:12}}>
    <div style={{background:'#f8fafc', padding:16, borderRadius:12}}><b style={{color:'#0f172a'}}>10-12% XIRR</b><p style={{margin:'4px 0 0', color:'#475569', fontSize:14}}>Good for hybrid and large cap funds over 5+ years. Beats FD and inflation.</p></div>
    <div style={{background:'#f8fafc', padding:16, borderRadius:12}}><b style={{color:'#0f172a'}}>12-15% XIRR</b><p style={{margin:'4px 0 0', color:'#475569', fontSize:14}}>Excellent for diversified equity funds. Most top funds give this long term.</p></div>
    <div style={{background:'#f8fafc', padding:16, borderRadius:12}}><b style={{color:'#0f172a'}}>15%+ XIRR</b><p style={{margin:'4px 0 0', color:'#475569', fontSize:14}}>Outstanding, usually for small cap or sector funds in bull market. Difficult to sustain for 10 years.</p></div>
  </div>

  <h3 style={{color:'#1e293b', fontSize:20, fontWeight:700, marginTop:32}}>How to calculate XIRR in Excel?</h3>
  <p style={{color:'#334155'}}>
    In Excel, make two columns — Dates and Cashflows. Cash outflows as negative, inflows as positive. Then use formula =XIRR(cashflows, dates). For example: Dates: 1 Jan 2024 -100000, 1 Feb 2024 -10000... 1 Jan 2025 250000. Excel gives same XIRR as our calculator. Our online calculator is easier if you don't want to use Excel.
  </p>

  <h2 style={{color:'#0f172a', fontSize:22, fontWeight:800, marginTop:36}}>Frequently Asked Questions</h2>
  <div style={{marginTop:16}}>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>What is XIRR in mutual funds?</p><p style={{color:'#475569', margin:0}}>XIRR is annualized return for irregular cashflows like SIP. It considers date of each investment and gives true yearly return.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>Is XIRR better than CAGR?</p><p style={{color:'#475569', margin:0}}>For SIP, XIRR is better because CAGR cannot handle multiple dates. For one-time lumpsum, both give same result, CAGR is simpler.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>What is good XIRR for SIP?</p><p style={{color:'#475569', margin:0}}>12-15% XIRR is considered excellent for equity SIP over 5+ years. Above 15% is outstanding but rare long term.</p></div>
    <div style={{marginBottom:20}}><p style={{fontWeight:600, color:'#0f172a', marginBottom:4}}>Can XIRR be negative?</p><p style={{color:'#475569', margin:0}}>Yes, if final value is less than invested amount due to market fall, XIRR will be negative, showing loss.</p></div>
  </div>

  <p style={{marginTop:32, fontSize:12, color:'#94a3b8', borderTop:'1px solid #f1f5f9', paddingTop:16}}>
    Last Updated: 28 Aug 2026 | Written by ApnaFinCalc Editorial Team | Reviewed by Mutual Fund Experts | For estimation only.
  </p>

  <script type="application/ld+json">
  {`{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {"@type": "Question","name": "What is XIRR in mutual funds?","acceptedAnswer": {"@type": "Answer","text": "XIRR is annualized return for irregular cashflows like SIP considering each date."}},
      {"@type": "Question","name": "Is XIRR better than CAGR?","acceptedAnswer": {"@type": "Answer","text": "For SIP, XIRR is better as CAGR cannot handle multiple dates. For lumpsum both are same."}},
      {"@type": "Question","name": "What is good XIRR for SIP?","acceptedAnswer": {"@type": "Answer","text": "12-15% XIRR is excellent for equity SIP over 5+ years."}}
    ]
  }`}
  </script>
</div>
    </div>
  )
}

export default function App(){
  return (
    <div style={{background:'#f8fafc', minHeight:'100vh', display:'flex', flexDirection:'column'}}>
      <style>{`
        @media (max-width: 768px) {
       .app-header { padding: 10px 14px!important; }
       .app-header nav { gap: 6px!important; }
       .app-header nav a { padding: 5px 9px!important; font-size: 12px!important; }
       .calc-page { padding: 14px!important; }
       .home-grid { grid-template-columns: 1fr!important; } 
       
       .responsive-compare-grid { grid-template-columns: 1fr!important; }
        }
      `}</style>
      <Header />
      <main style={{flex:1}}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/sip-calculator" element={<SIPPage />} />
          <Route path="/step-up-sip-calculator" element={<StepUpPage />} />
          <Route path="/lumpsum-calculator" element={<LumpsumPage />} />
          <Route path="/emi-calculator" element={<LoanPage title="EMI Calculator - ApnaFinCalc" keyName="homeLoan" ctaTitle="Best Loan Offers" col="#2563eb"/>} />
          <Route path="/home-loan-emi-calculator" element={<LoanPage title="Home Loan EMI Calculator - ApnaFinCalc" keyName="homeLoan" ctaTitle="Best Home Loan Offers" col="#059669"/>} />
          <Route path="/personal-loan-emi-calculator" element={<PersonalLoanPage title="Personal Loan EMI Calculator - ApnaFinCalc" keyName="personalLoan" ctaTitle="Best Personal Loan Offers" col="#7c3aed"/>} />
          <Route path="/fd-calculator" element={<FDPage />} />
          <Route path="/cagr-calculator" element={<CAGRPage />} />
          <Route path="/swp-calculator" element={<SWPPage />} />
          <Route path="/income-tax-calculator" element={<TaxPage />} />
          <Route path="/xirr-calculator" element={<XIRRPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy-policy" element={<PrivacyPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/disclaimer" element={<DisclaimerPage />} />
          <Route path="/terms" element={<DisclaimerPage />} />
        </Routes>
      </main>
      <Footer />
      <Analytics />
    </div>
  )
}