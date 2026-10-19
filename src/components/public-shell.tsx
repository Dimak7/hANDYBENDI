"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X, Phone } from "lucide-react";
import { phone, phoneHref } from "@/lib/public-content";
export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => {
    setOpen(false);
  }, [path]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  return (
    <>
      {process.env.NEXT_PUBLIC_STAGING === "true" && (
        <div className="site-staging-notice">
          STAGING TEST SITE · Use fictional details only. No appointments or payments are taken
          here.
        </div>
      )}
      <a href="#main" className="public-skip">
        Skip to content
      </a>
      <div className="site-topline">
        <span>CHICAGO HOMES. LOCAL KNOW-HOW.</span>
        <a href={phoneHref}>{phone}</a>
      </div>
      <header className="public-header">
        <Link href="/" className="public-logo" aria-label="HandyBandi home">
          <Image src="/handybandi-logo.png" alt="HandyBandi" width={96} height={68} priority />
          <span>
            GOOD WORK.
            <br />
            LESS HASSLE.
          </span>
        </Link>
        <nav className="public-nav" aria-label="Main navigation">
          <Link href="/services">Services</Link>
          <Link href="/commercial">For businesses</Link>
          <Link href="/before-after">Our work</Link>
          <Link href="/service-areas">Where we work</Link>
          <Link href="/request-quote" className="button primary">
            Build your repair list <ArrowUpRight size={15} />
          </Link>
        </nav>
        <button
          className="public-menu-toggle"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="public-mobile-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        {open && (
          <nav id="public-mobile-nav" className="public-mobile-nav" aria-label="Mobile navigation">
            {[
              ["Services", "/services"],
              ["For your home", "/residential"],
              ["For businesses", "/commercial"],
              ["Our work", "/before-after"],
              ["Service areas", "/service-areas"],
              ["About HandyBandi", "/about"],
              ["Customer & team login", "/login"],
            ].map(([label, href]) => (
              <Link onClick={() => setOpen(false)} key={href} href={href}>
                {label}
                <ArrowUpRight size={16} />
              </Link>
            ))}
            <a href={phoneHref}>Call {phone}</a>
            <Link className="button primary" href="/request-quote">
              Get a quote
            </Link>
          </nav>
        )}
      </header>
    </>
  );
}
export function PublicFooter() {
  return (
    <>
      <footer className="public-footer">
        <div className="site-footer-brand">
          <Link href="/">
            HandyBandi<span>Consider it handled.</span>
          </Link>
          <p>
            Handyman services for Chicago homes,
            <br />
            apartments, and business spaces.
          </p>
          <a href={phoneHref}>{phone}</a>
          <a href="mailto:office@handybandi.com">office@handybandi.com</a>
        </div>
        <div>
          <h3>For your place</h3>
          <Link href="/services">All services</Link>
          <Link href="/residential">Homes & apartments</Link>
          <Link href="/landlords">Landlords</Link>
          <Link href="/property-management">Property managers</Link>
          <Link href="/commercial">Commercial maintenance</Link>
        </div>
        <div>
          <h3>A little more</h3>
          <Link href="/about">About us</Link>
          <Link href="/before-after">Our work</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/service-areas">Service areas</Link>
          <Link href="/contact">Contact</Link>
          <a href="https://handybandi.com/blog/">Maintenance journal</a>
          <Link href="/careers">Careers</Link>
          <Link href="/login">Customer & team login</Link>
        </div>
        <div className="site-footer-bottom">
          <span>© {new Date().getFullYear()} HandyBandi · Chicago, Illinois</span>
          <a href="https://handybandi.com/privacy-policy/">Privacy policy</a>
          <a href="https://handybandi.com/terms-and-conditions/">Terms</a>
          <span>Staging preview · appointments confirmed by the office</span>
        </div>
      </footer>
      <div className="public-mobile-cta">
        <a href={phoneHref} aria-label="Call HandyBandi">
          <Phone size={18} />
          Call
        </a>
        <Link href="/request-quote">
          Build your repair list <ArrowUpRight size={16} />
        </Link>
      </div>
    </>
  );
}
