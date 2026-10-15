"use client";
import { ArrowRight, Plus } from "lucide-react";
import { useSite } from "@/lib/site";
import Corners from "./Corners";

const W = "mx-auto w-[min(1240px,calc(100%-24px))]";

export default function Sections() {
  const c = useSite((s) => s.content);
  return (
    <>
      {/* Features */}
      {c.features.length > 0 && (
        <section id="why" className={`${W} scroll-mt-24 pt-28`}>
          <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <div className="kicker"><b>02</b> {c.featuresEyebrow}</div>
              <h2 className="sec-title mt-4">{c.featuresTitle}</h2>
            </div>
          </div>
          <div className="mt-10 grid gap-3 md:grid-cols-3">
            {c.features.map((f, i) => (
              <div key={i} className="panel-soft spot lift p-6 sm:p-7">
                <div className="flex items-center justify-between">
                  <span className="mono text-[.75rem] text-muted">/{String(i + 1).padStart(2, "0")}</span>
                  <span className="h-2 w-2 rounded-sm bg-accent" />
                </div>
                <h3 className="mt-6 text-lg font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-2 text-[.9rem] leading-[1.8] text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Steps + FAQ */}
      <section id="how" className={`${W} scroll-mt-24 pt-28`}>
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <div className="kicker"><b>03</b> {c.stepsEyebrow}</div>
            <ol className="mt-8 space-y-3">
              {c.steps.map((s, i) => (
                <li key={i} className="panel-soft flex gap-4 p-5">
                  <span className="step-n h-fit">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h4 className="font-semibold">{s.title}</h4>
                    <p className="mt-1.5 text-[.86rem] leading-[1.75] text-muted">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div id="faq" className="scroll-mt-28">
            <div className="kicker"><b>04</b> {c.faqEyebrow}</div>
            <div className="mt-8 space-y-2.5">
              {c.faq.map((f, i) => (
                <details key={i} className="panel-soft group p-5 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium">
                    {f.q}
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-line transition group-open:rotate-45 group-open:bg-accent group-open:text-accent-ink"><Plus size={15} /></span>
                  </summary>
                  <p className="mt-3 text-[.86rem] leading-[1.75] text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={`${W} pt-28`}>
        <div className="corners relative overflow-hidden rounded-[24px] bg-inverse px-[6%] py-16 text-inverse-fg sm:py-20">
          <Corners />
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-accent opacity-30 blur-3xl" />
          <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-[clamp(1.8rem,4.5vw,3rem)] font-bold leading-tight tracking-tight">{c.ctaTitle}</h2>
              <p className="mt-3 opacity-70">{c.ctaSubtitle}</p>
            </div>
            <a href="#compress" className="btn btn-primary btn-lg">{c.ctaButton} <ArrowRight size={17} /></a>
          </div>
        </div>
      </section>
    </>
  );
}
