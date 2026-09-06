import { SITE } from "./config";

export function brandCard() {
  return <div style={{ display:"flex", flexDirection:"column", width:"100%", height:"100%", padding:"58px 76px", background:"#2C4BF0", color:"#ffffff", fontFamily:"sans-serif" }}>
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:26, fontWeight:700 }}><span>{SITE.name}.</span><span style={{ fontSize:17, fontWeight:400 }}>AN INDEPENDENT EDITORIAL FOR AMBITIOUS PEOPLE</span></div>
    <div style={{ display:"flex", flexDirection:"column", marginTop:66, fontSize:104, fontWeight:800, letterSpacing:-5, lineHeight:1.04 }}><span>Celebrating</span><span>greatness.</span></div>
    <div style={{ display:"flex", marginTop:30, fontSize:29, color:"#dfe4ff" }}>Understanding what builds it.</div>
    <div style={{ display:"flex", justifyContent:"space-between", borderTop:"1px solid #7f92ff", paddingTop:22, marginTop:"auto", fontSize:18 }}><span>Performance · Business · Creativity · Growth · Coaching</span><span>coachrank.lol ↗</span></div>
  </div>;
}

export const OG_SIZE = { width: 1200, height: 630 };
