"use client";
import {useEffect} from "react";
import {usePathname} from "next/navigation";
import {captureJourneyPage} from "@/lib/journey-client";
export function BuyingJourneyBeacon(){const path=usePathname();useEffect(()=>{void captureJourneyPage();},[path]);return null;}
