"use client";
import {useState} from "react";
export function MeasurementPreference(){
 const [message,setMessage]=useState("");
 return <div><button type="button" className="tool-text-link" onClick={async()=>{try{const r=await fetch("/api/journey",{method:"DELETE"});setMessage(r.ok?"Buying journey measurement is off in this browser.":"Please try again.");}catch{setMessage("Please try again.");}}}>Turn off buying journey measurement in this browser</button><p role="status">{message}</p></div>;
}
