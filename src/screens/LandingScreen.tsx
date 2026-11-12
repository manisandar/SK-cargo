import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronRight,
  Globe2,
  Layers,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Scale,
  ShieldCheck
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { landingStrings } from '../strings/landingStrings';
import '../styles/landing.css';

// Reusable 3D Stage with SK Cargo Truck & Orbiting Parcels
const Hero3DStage: React.FC<{
  mouseRot: { rx: number; ry: number };
  content: {
    hero: {
      tagEasy: string;
      tagFast: string;
      tagReliable: string;
    };
  };
}> = ({ mouseRot, content }) => (
  <div className="landing-stage w-full max-w-[320px] sm:max-w-[440px]">
    <div
      className="landing-scene"
      style={{
        transform: `rotateX(${mouseRot.rx}deg) rotateY(${mouseRot.ry}deg)`
      }}
    >
      {/* Orbit Dash Ring */}
      <div className="landing-ringline" />

      {/* Central High-End 3D SK Cargo Truck with Logo */}
      <div className="landing-center-truck-wrapper">
        <img
          src="/images/truck-hero.png"
          alt="SK Cargo Delivery Truck"
          className="w-full h-auto object-contain select-none pointer-events-none drop-shadow-2xl"
          style={{ filter: 'drop-shadow(0 22px 28px rgba(15, 76, 129, 0.28))' }}
        />
      </div>

      {/* 6 Synchronized Orbiting Items: Alternating 3 Paper Boxes & 3 Straight Horizontal Text Badges */}
      {/* Slot 0: Paper Box 1 (0°) */}
      <div className="landing-orbit-slot landing-orbit-slot-0">
        <div className="landing-orbit-paper-box">
          <b /><b /><b /><b /><b /><b />
        </div>
      </div>

      {/* Slot 1: Text Badge 1 - Easy / လွယ်ကူ (60°) */}
      <div className="landing-orbit-slot landing-orbit-slot-1">
        <div className="landing-orbit-straight-badge">
          <span className="landing-orbit-badge-dot" />
          <span>{content.hero.tagEasy}</span>
        </div>
      </div>

      {/* Slot 2: Paper Box 2 (120°) */}
      <div className="landing-orbit-slot landing-orbit-slot-2">
        <div className="landing-orbit-paper-box">
          <b /><b /><b /><b /><b /><b />
        </div>
      </div>

      {/* Slot 3: Text Badge 2 - Fast / မြန်ဆန် (180°) */}
      <div className="landing-orbit-slot landing-orbit-slot-3">
        <div className="landing-orbit-straight-badge">
          <span className="landing-orbit-badge-dot" />
          <span>{content.hero.tagFast}</span>
        </div>
      </div>

      {/* Slot 4: Paper Box 3 (240°) */}
      <div className="landing-orbit-slot landing-orbit-slot-4">
        <div className="landing-orbit-paper-box">
          <b /><b /><b /><b /><b /><b />
        </div>
      </div>

      {/* Slot 5: Text Badge 3 - Reliable / စိတ်ချရ (300°) */}
      <div className="landing-orbit-slot landing-orbit-slot-5">
        <div className="landing-orbit-straight-badge">
          <span className="landing-orbit-badge-dot" />
          <span>{content.hero.tagReliable}</span>
        </div>
      </div>
    </div>
  </div>
);

export const LandingScreen: React.FC = () => {
  const [lang, setLang] = useState<'en' | 'my'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlLang = params.get('lang');
      if (urlLang === 'my' || urlLang === 'en') return urlLang;
      const saved = localStorage.getItem('sk_landing_lang');
      return (saved === 'my' || saved === 'en') ? saved : 'en';
    } catch {
      return 'en';
    }
  });

  const content = landingStrings[lang];

  // Update HTML lang attribute and localStorage
  const handleLangChange = (newLang: 'en' | 'my') => {
    setLang(newLang);
    try {
      localStorage.setItem('sk_landing_lang', newLang);
    } catch { }
    document.documentElement.lang = newLang;
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Window Width for Truck Path Calculation
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  // Scroll Progress for Top Progress Bar
  const [scrollProgress, setScrollProgress] = useState(0);

  // Parallax Truck Journey State
  const journeyRef = useRef<HTMLDivElement>(null);
  const jstickRef = useRef<HTMLDivElement>(null);
  const [journeyProgress, setJourneyProgress] = useState(0);

  // 3D Scene Mouse Movement
  const [mouseRot, setMouseRot] = useState({ rx: 0, ry: 0 });

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(1, Math.max(0, y / docHeight)) : 0;
      setScrollProgress(progress);

      // Journey Scroll Progress calculation
      if (journeyRef.current && jstickRef.current) {
        const rect = journeyRef.current.getBoundingClientRect();
        const availableScroll = journeyRef.current.offsetHeight - jstickRef.current.offsetHeight;
        if (availableScroll > 0) {
          const jp = Math.min(1, Math.max(0, -rect.top / availableScroll));
          setJourneyProgress(jp);
        }
      }
    };

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      handleScroll();
    };

    const handlePointerMove = (e: PointerEvent) => {
      const ry = (e.clientX / window.innerWidth - 0.5) * 20;
      const rx = -(e.clientY / window.innerHeight - 0.5) * 16;
      setMouseRot({ rx, ry });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  // Smooth scroll to a specific journey milestone
  const handleStepClick = (targetProgress: number) => {
    if (journeyRef.current && jstickRef.current) {
      const rect = journeyRef.current.getBoundingClientRect();
      const availableScroll = journeyRef.current.offsetHeight - jstickRef.current.offsetHeight;
      const targetY = window.scrollY + rect.top + targetProgress * availableScroll;
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  };

  // Card 3D Tilt Effect
  const handleCardTilt = (e: React.PointerEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    card.style.transform = `perspective(800px) rotateY(${(x - 0.5) * 16}deg) rotateX(${(0.5 - y) * 16}deg) scale3d(1.02, 1.02, 1.02)`;
    card.style.setProperty('--gx', `${x * 100}%`);
    card.style.setProperty('--gy', `${y * 100}%`);
  };

  const handleCardReset = (e: React.PointerEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    card.style.transform = '';
  };

  // Cityscape background buildings generation
  const farBuildings = [
    { w: 6, h: 55, mr: 1.5 },
    { w: 8, h: 80, mr: 1.2 },
    { w: 5, h: 45, mr: 1.8 },
    { w: 9, h: 90, mr: 1.0 },
    { w: 7, h: 65, mr: 1.4 },
    { w: 6, h: 50, mr: 1.6 },
    { w: 10, h: 95, mr: 1.2 },
    { w: 7, h: 70, mr: 1.5 },
    { w: 8, h: 85, mr: 1.1 },
    { w: 5, h: 40, mr: 1.7 },
    { w: 9, h: 75, mr: 1.3 },
    { w: 8, h: 88, mr: 1.5 },
    { w: 6, h: 60, mr: 1.2 },
    { w: 11, h: 100, mr: 1.4 },
    { w: 7, h: 70, mr: 1.6 },
  ];

  const nearBuildings = [
    { w: 7, h: 35, mr: 2.0 },
    { w: 9, h: 50, mr: 1.8 },
    { w: 6, h: 30, mr: 2.2 },
    { w: 10, h: 60, mr: 1.5 },
    { w: 8, h: 45, mr: 2.1 },
    { w: 7, h: 38, mr: 1.9 },
    { w: 11, h: 55, mr: 1.7 },
    { w: 9, h: 48, mr: 2.0 },
    { w: 8, h: 42, mr: 1.8 },
    { w: 10, h: 58, mr: 1.6 },
  ];

  // Milestone activation logic
  const activeMilestone = journeyProgress >= 0.85 ? 4
    : journeyProgress >= 0.55 ? 3
      : journeyProgress >= 0.25 ? 2
        : journeyProgress >= 0.03 ? 1
          : 0;

  return (
    <div className={`landing-root ${lang === 'my' ? 'font-myanmar-serif' : ''}`} data-lang={lang}>
      {/* 1. STICKY TOP NAVIGATION */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#D8E6F3]">
        <div className="max-w-[1140px] mx-auto px-4 sm:px-5 h-[68px] flex items-center justify-between gap-2">
          {/* Logo & Brand Identity */}
          <a href="#top" className="flex items-center gap-2.5 sm:gap-3 group min-w-0">
            <img
              src="/sk-logo.png"
              alt="SK Cargo Logo"
              className="h-8 sm:h-10 w-auto object-contain group-hover:scale-105 transition-transform drop-shadow-sm flex-shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-heading font-extrabold text-lg sm:text-xl tracking-tight text-[#0F4C81] truncate">
                SK CARGO
              </span>
              <span className="text-[9px] sm:text-[10px] font-semibold text-[#566B82] uppercase tracking-wider -mt-1 truncate hidden min-[360px]:inline">
                Logistics & Parcel Service
              </span>
            </div>

          </a>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-7 text-sm font-semibold text-[#566B82]">
            <a href="#services" className="hover:text-[#1E75BB] transition-colors">{content.nav.services}</a>
            <a href="#how" className="hover:text-[#1E75BB] transition-colors">{content.nav.howItWorks}</a>
            <a href="#why" className="hover:text-[#1E75BB] transition-colors">{content.nav.whyUs}</a>
            <a href="#contact" className="hover:text-[#1E75BB] transition-colors">{content.nav.contact}</a>
          </div>

          {/* Language Switcher Pill (Optical Alignment Fix) */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className="flex items-center bg-[#F5FAFE] border border-[#D8E6F3] p-0.5 sm:p-1 rounded-full shadow-inner h-[34px] sm:h-[38px]">
              <button
                type="button"
                onClick={() => handleLangChange('en')}
                className={`lang-pill-btn lang-pill-btn-en text-xs sm:text-sm ${lang === 'en'
                  ? 'bg-[#1E75BB] text-white shadow-sm'
                  : 'text-[#566B82] hover:text-[#0F4C81]'
                  }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleLangChange('my')}
                className={`lang-pill-btn lang-pill-btn-my text-xs sm:text-sm ${lang === 'my'
                  ? 'bg-[#1E75BB] text-white shadow-sm'
                  : 'text-[#566B82] hover:text-[#0F4C81]'
                  }`}
              >
                မြန်မာ
              </button>
            </div>
          </div>
        </div>

        {/* Scroll Progress Truck Track */}
        <div className="relative w-full h-[3px] bg-transparent overflow-visible">
          <div
            className="h-full bg-gradient-to-r from-[#1E75BB] via-[#5BA3DC] to-[#FFC72C] transition-all duration-75"
            style={{ width: `${scrollProgress * 100}%` }}
          />
          <div
            className="absolute -top-3 w-7 h-7 -ml-3.5 pointer-events-none transition-all duration-75 text-[#1E75BB] drop-shadow-sm"
            style={{ left: `${scrollProgress * 100}%` }}
          >
            <svg viewBox="0 0 236 112" className="w-full h-full">
              <rect x="4" y="8" width="152" height="72" rx="7" fill="#1E75BB" />
              <rect x="4" y="60" width="152" height="9" fill="#FFC72C" />
              <path d="M160 26h40l26 28v26h-66z" fill="#FFC72C" />
              <circle cx="44" cy="92" r="17" fill="#17222f" />
              <circle cx="194" cy="92" r="17" fill="#17222f" />
            </svg>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION WITH 3D STAGE & TRUCK IN CENTER */}
      <header id="top" className="relative min-h-[calc(100vh-68px)] flex items-center py-12 md:py-20 overflow-hidden bg-gradient-to-b from-[#F5FAFE] via-white to-white">
        {/* Glow Blobs & Infinite Grid Floor */}
        <div className="landing-blob landing-blob-1" />
        <div className="landing-blob landing-blob-2" />
        <div className="landing-floor" />

        <div className="max-w-[1140px] mx-auto px-4 sm:px-5 relative z-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Hero Content */}
          <div className="lg:col-span-7 min-w-0 flex flex-col items-start pt-4 sm:pt-0 w-full">
            {/* Main Headline */}
            <h1 className="landing-hero-headline font-extrabold tracking-tight text-[#0F4C81] mb-6">
              <span>{content.hero.headlineA}</span>{' '}
              <span className="landing-gradient-text block sm:inline">
                {content.hero.headlineB}
              </span>
            </h1>

            {/* Sub-headline / Lead */}
            <p className="text-base sm:text-lg text-[#566B82] max-w-xl mb-4 sm:mb-6 lg:mb-8 leading-relaxed">
              {content.hero.lead}
            </p>

            {/* Mobile 3D Truck Animation Stage (Placed Between Sub-headline and Contact Us on Mobile) */}
            <div className="w-full flex justify-center my-3 sm:my-5 lg:hidden">
              <Hero3DStage mouseRot={mouseRot} content={content} />
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 mb-8 sm:mb-10 w-full sm:w-auto">
              <a
                href="#contact"
                className="landing-btn landing-btn-shine bg-[#FFC72C] text-[#0B2540] hover:bg-[#E5A800] shadow-lg shadow-[#FFC72C]/30 text-sm sm:text-base font-bold w-full sm:w-auto text-center"
              >
                <span>{content.hero.ctaPrimary}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </a>
              <a
                href="#how"
                className="landing-btn bg-white text-[#0F4C81] border-2 border-[#1E75BB] hover:bg-[#E8F2FB] text-sm sm:text-base font-bold w-full sm:w-auto text-center"
              >
                <span>{content.hero.ctaSecondary}</span>
                <ChevronRight className="w-4 h-4 ml-0.5 text-[#1E75BB]" />
              </a>
            </div>

            {/* Key Trust Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full border-t border-[#D8E6F3]/70 pt-6">
              <div className="flex items-center gap-2.5 text-xs font-semibold text-[#0F4C81]">
                <div className="w-6 h-6 rounded-full bg-[#E8F2FB] flex items-center justify-center text-[#1E75BB] flex-shrink-0">
                  <Camera className="w-3.5 h-3.5" />
                </div>
                <span>{content.hero.badgePhoto}</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-semibold text-[#0F4C81]">
                <div className="w-6 h-6 rounded-full bg-[#FEF4EC] flex items-center justify-center text-[#ED7D24] flex-shrink-0">
                  <Scale className="w-3.5 h-3.5" />
                </div>
                <span>{content.hero.badgeWeight}</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-semibold text-[#0F4C81]">
                <div className="w-6 h-6 rounded-full bg-[#E8F2FB] flex items-center justify-center text-[#1E75BB] flex-shrink-0">
                  <Globe2 className="w-3.5 h-3.5" />
                </div>
                <span>{content.hero.badgeBilingual}</span>
              </div>
            </div>
          </div>

          {/* Desktop Right Hero: 3D Stage with SK Cargo Truck & Orbiting Parcels */}
          <div className="hidden lg:flex lg:col-span-5 min-w-0 relative justify-center w-full">
            <Hero3DStage mouseRot={mouseRot} content={content} />
          </div>
        </div>
      </header>

      {/* 3. INFINITE MARQUEE TICKER STRIP */}
      <div className="bg-[#1E75BB] py-4 overflow-hidden relative z-20 shadow-md">
        <div className="landing-track text-white font-heading font-bold text-sm sm:text-base tracking-wide flex items-center">
          {content.ticker.concat(content.ticker).concat(content.ticker).map((item, idx) => (
            <span key={idx} className="flex items-center gap-6">
              <span>{item}</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFC72C] inline-block" />
            </span>
          ))}
        </div>
      </div>

      {/* 4. SERVICES SECTION: 3D TILT CARDS WITH PHOTOGRAPHY */}
      <section id="services" className="py-20 md:py-28 relative bg-white">
        <div className="max-w-[1140px] mx-auto px-5">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F4C81] mb-4 font-heading">
              {content.services.heading}
            </h2>
            <p className="text-base sm:text-lg text-[#566B82]">
              {content.services.subheading}
            </p>
          </div>

          {/* 3 Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: Receiving */}
            <div
              className="landing-card group"
              onPointerMove={handleCardTilt}
              onPointerLeave={handleCardReset}
            >
              <div className="w-full h-44 rounded-xl overflow-hidden mb-6 relative shadow-inner bg-slate-100">
                <img
                  src="/images/service-receiving.jpg"
                  alt="Parcel Receiving"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#0F4C81] shadow-sm flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-[#1E75BB]" />
                  <span>01</span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-[#0F4C81] mb-3 font-heading">
                {content.services.c1Title}
              </h3>
              <p className="text-sm text-[#566B82] leading-relaxed">
                {content.services.c1Desc}
              </p>
            </div>

            {/* Card 2: Photo Records */}
            <div
              className="landing-card group"
              onPointerMove={handleCardTilt}
              onPointerLeave={handleCardReset}
            >
              <div className="w-full h-44 rounded-xl overflow-hidden mb-6 relative shadow-inner bg-slate-100">
                <img
                  src="/images/service-inspection.jpg"
                  alt="HD Photo & Weight Records"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#0F4C81] shadow-sm flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#1E75BB]" />
                  <span>02</span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-[#0F4C81] mb-3 font-heading">
                {content.services.c2Title}
              </h3>
              <p className="text-sm text-[#566B82] leading-relaxed">
                {content.services.c2Desc}
              </p>
            </div>

            {/* Card 3: Repacking & Delivery */}
            <div
              className="landing-card group"
              onPointerMove={handleCardTilt}
              onPointerLeave={handleCardReset}
            >
              <div className="w-full h-44 rounded-xl overflow-hidden mb-6 relative shadow-inner bg-slate-100">
                <img
                  src="/images/service-repacking.jpg"
                  alt="Master Box Repacking"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#0F4C81] shadow-sm flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#1E75BB]" />
                  <span>03</span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-[#0F4C81] mb-3 font-heading">
                {content.services.c3Title}
              </h3>
              <p className="text-sm text-[#566B82] leading-relaxed">
                {content.services.c3Desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS: PINNED 4-STEP CAR MOVING JOURNEY */}
      <div id="how" ref={journeyRef} className="landing-journey">
        <div ref={jstickRef} className="landing-jstick">
          {/* Upper Section: Title + 4 Milestone Cards */}
          <div className="landing-jcontent">
            <div className="text-center max-w-xl mx-auto">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-[#0F4C81] mb-2 font-heading">
                {content.journey.heading}
              </h2>
              <p className="text-xs sm:text-base text-[#566B82]">
                {content.journey.subheading}
              </p>
            </div>

            {/* 4 Interactive Milestone Cards */}
            <div className="landing-stops">
              {[
                { num: 1, title: content.journey.step1Title, desc: content.journey.step1Desc, prog: 0.12 },
                { num: 2, title: content.journey.step2Title, desc: content.journey.step2Desc, prog: 0.38 },
                { num: 3, title: content.journey.step3Title, desc: content.journey.step3Desc, prog: 0.68 },
                { num: 4, title: content.journey.step4Title, desc: content.journey.step4Desc, prog: 0.95 },
              ].map((step, idx) => (
                <div
                  key={idx}
                  onClick={() => handleStepClick(step.prog)}
                  className={`landing-stop ${activeMilestone >= step.num ? 'on' : ''}`}
                >
                  <div className="num">{step.num}</div>
                  <h3 className="font-bold text-[#0F4C81] text-xs sm:text-base font-heading">
                    {step.title}
                  </h3>
                  <p className="text-xs text-[#566B82] hidden sm:block">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Section: Scenery + Road + Smooth Moving Truck */}
          <div className="relative w-full h-[180px] overflow-hidden pointer-events-none">
            {/* Far Cityscape Layer */}
            <div
              className="absolute bottom-[82px] left-0 h-[70px] flex items-end w-[320vw] transition-transform duration-75"
              style={{ transform: `translateX(${-journeyProgress * 40}vw)` }}
            >
              {farBuildings.map((b, i) => (
                <div
                  key={i}
                  className="bg-[#CFE3F4] rounded-t-sm flex-none"
                  style={{ width: `${b.w}vw`, height: `${b.h}%`, marginRight: `${b.mr}vw` }}
                />
              ))}
            </div>

            {/* Near Cityscape Layer */}
            <div
              className="absolute bottom-[82px] left-0 h-[50px] flex items-end w-[320vw] transition-transform duration-75"
              style={{ transform: `translateX(${-journeyProgress * 80}vw)` }}
            >
              {nearBuildings.map((b, i) => (
                <div
                  key={i}
                  className="bg-[#A9CDEA] rounded-t-sm flex-none"
                  style={{ width: `${b.w}vw`, height: `${b.h}%`, marginRight: `${b.mr}vw` }}
                />
              ))}
            </div>

            {/* Animated Driving SK Truck Aligned to Road */}
            <div
              className="landing-truck"
              style={{
                transform: `translate3d(${-80 + journeyProgress * (windowWidth + 80)}px, ${Math.sin(journeyProgress * 120) * 2.5}px, 0)`
              }}
            >
              <svg viewBox="0 0 236 112">
                <rect x="4" y="8" width="152" height="72" rx="7" fill="#1E75BB" />
                <rect x="4" y="60" width="152" height="9" fill="#FFC72C" />
                <text x="80" y="44" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="21" fill="#FFFFFF">
                  SK CARGO
                </text>
                <path d="M160 26h40l26 28v26h-66z" fill="#FFC72C" />
                <path d="M170 34h26l15 19h-41z" fill="#E8F2FB" />
                <rect x="4" y="80" width="222" height="8" rx="3" fill="#0F3D66" />
                <rect x="220" y="62" width="9" height="10" rx="2" fill="#FFFFFF" />

                {/* Spinning Wheels */}
                {[44, 118, 194].map((cx, idx) => (
                  <g key={idx} className="wh" style={{ transform: `rotate(${journeyProgress * 1800}deg)` }}>
                    <circle cx={cx} cy="92" r="17" fill="#17222F" />
                    <circle cx={cx} cy="92" r="8" fill="#CFD8E3" />
                    <path d={`M${cx} 84v16M${cx - 8} 92h16`} stroke="#17222F" strokeWidth="2.5" />
                  </g>
                ))}
              </svg>
            </div>

            {/* Moving Road Surface */}
            <div
              className="landing-road"
              style={{ '--rx': `${-journeyProgress * 1200}px` } as React.CSSProperties}
            />
          </div>
        </div>
      </div>

      {/* 6. WHY CHOOSE SK CARGO (ROYAL NAVY SHOWCASE) */}
      <section id="why" className="py-20 md:py-28 bg-white relative">
        <div className="max-w-[1140px] mx-auto px-5">
          <div className="bg-gradient-to-br from-[#0F4C81] to-[#1E75BB] rounded-3xl p-8 sm:p-14 text-white shadow-2xl shadow-[#0F4C81]/30 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left: Heading */}
            <div className="lg:col-span-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-[#FFC72C] text-xs font-bold mb-4">
                <ShieldCheck className="w-4 h-4" />
                <span>SK Quality Assurance</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight font-heading">
                {content.whyUs.heading}
              </h2>
              <p className="text-white/80 text-sm sm:text-base leading-relaxed">
                {content.whyUs.subheading}
              </p>
            </div>

            {/* Right: Points Checklist */}
            <div className="lg:col-span-7 flex flex-col gap-3.5">
              {[content.whyUs.point1, content.whyUs.point2, content.whyUs.point3, content.whyUs.point4].map((point, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 bg-white/10 hover:bg-white/15 p-4 rounded-2xl transition-all duration-300 hover:translate-x-2 border border-white/5"
                >
                  <div className="w-6 h-6 rounded-full bg-[#FFC72C] flex items-center justify-center flex-shrink-0 text-[#0B2540]">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-sm sm:text-base text-white/95">
                    {point}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 7. CONTACT & INQUIRIES HUB */}
      <section id="contact" className="py-16 md:py-24 bg-[#F5FAFE] relative border-t border-[#D8E6F3]">
        <div className="max-w-[1140px] mx-auto px-5">
          <div className="bg-white rounded-3xl border border-[#D8E6F3] p-8 sm:p-16 text-center relative overflow-hidden shadow-xl shadow-[#0F4C81]/5">
            <div className="max-w-xl mx-auto relative z-10">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F4C81] mb-3 font-heading">
                {content.contact.heading}
              </h2>
              <p className="text-sm sm:text-base text-[#566B82] mb-8 leading-relaxed">
                {content.contact.subheading}
              </p>

              {/* Action Buttons: Phone, Gmail, Facebook Page, Messenger */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left">
                {/* Direct Phone Call */}
                <a
                  href={content.contact.phoneHref}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-[#1E75BB]/10 hover:bg-[#1E75BB]/15 border border-[#1E75BB]/20 transition-all text-[#1E75BB] font-bold group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#1E75BB] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform flex-shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-[#566B82] font-medium">{content.contact.phoneLabel}</div>
                    <div className="text-sm text-[#0F4C81] truncate">{content.contact.phoneDisplay}</div>
                  </div>
                </a>

                {/* Gmail / Email */}
                <a
                  href={content.contact.emailHref}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-[#EA4335]/10 hover:bg-[#EA4335]/15 border border-[#EA4335]/20 transition-all text-[#EA4335] font-bold group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#EA4335] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform flex-shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-[#566B82] font-medium">{content.contact.emailLabel}</div>
                    <div className="text-sm text-[#0F4C81] truncate">{content.contact.emailDisplay}</div>
                  </div>
                </a>

                {/* Facebook Page */}
                <a
                  href={content.contact.facebookHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-4 rounded-2xl bg-[#1877F2]/10 hover:bg-[#1877F2]/15 border border-[#1877F2]/20 transition-all text-[#1877F2] font-bold group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#1877F2] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform flex-shrink-0">
                    <Globe2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-[#566B82] font-medium">{content.contact.facebookLabel}</div>
                    <div className="text-sm text-[#0F4C81] truncate">SK Cargo Facebook</div>
                  </div>
                </a>

                {/* Facebook Messenger */}
                <a
                  href={content.contact.messengerHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-4 rounded-2xl bg-[#0084FF]/10 hover:bg-[#0084FF]/15 border border-[#0084FF]/20 transition-all text-[#0084FF] font-bold group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#0084FF] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform flex-shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-[#566B82] font-medium">{content.contact.messengerLabel}</div>
                    <div className="text-sm text-[#0F4C81] truncate">Chat on Messenger</div>
                  </div>
                </a>
              </div>

              {/* Warehouse Address Pill Linked to Google Maps */}
              <a
                href={content.contact.mapsHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-4 bg-[#F5FAFE] hover:bg-[#E8F2FB] border border-[#D8E6F3] rounded-2xl px-6 py-3.5 text-xs text-[#566B82] transition-colors group"
              >
                <div className="flex items-center gap-2 font-bold text-[#0F4C81]">
                  <MapPin className="w-4 h-4 text-[#1E75BB] group-hover:scale-110 transition-transform" />
                  <span>{content.contact.addressLabel}:</span>
                </div>
                <div className="font-semibold text-[#1E75BB] underline underline-offset-2">
                  {content.contact.addressText}
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="bg-white border-t border-[#D8E6F3] py-8 text-xs text-[#566B82]">
        <div className="max-w-[1140px] mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/sk-logo.png" alt="SK Cargo" className="h-6 w-auto object-contain" />
            <span className="font-heading font-extrabold text-[#0F4C81]">SK CARGO</span>
            <span>·</span>
            {/* <span>{content.footer.tagline}</span> */}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
            <a href={content.contact.phoneHref} className="hover:text-[#1E75BB] transition-colors">{content.contact.phoneDisplay}</a>
            <span>•</span>
            <a href={content.contact.emailHref} className="hover:text-[#1E75BB] transition-colors">{content.contact.emailDisplay}</a>
            <span>•</span>
            <a href={content.contact.mapsHref} target="_blank" rel="noreferrer" className="hover:text-[#1E75BB] transition-colors">{content.contact.addressText}</a>
          </div>
          <div>
            {content.footer.copyright}
          </div>
        </div>
      </footer>
    </div>
  );
};
