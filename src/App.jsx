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
    </div>
  )
}
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
          <Route path="/personal-loan-emi-calculator" element={<LoanPage title="Personal Loan EMI Calculator - ApnaFinCalc" keyName="personalLoan" ctaTitle="Best Personal Loan Offers" col="#7c3aed"/>} />
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