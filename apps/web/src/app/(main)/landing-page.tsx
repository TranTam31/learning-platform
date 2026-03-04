"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  BookOpen,
  Code2,
  GraduationCap,
  Layers,
  Puzzle,
  Shield,
  Smartphone,
  Users,
  ArrowRight,
  Blocks,
  Sparkles,
  Globe,
  Github,
} from "lucide-react";

// ── Animation helpers ──────────────────────────────────────

function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StaggerContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.1 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const staggerItem = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] as const },
  },
};

// ── Components ─────────────────────────────────────────────

function Nav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">Moly</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <a
            href="#features"
            className="transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="transition-colors hover:text-foreground"
          >
            How It Works
          </a>
          <a
            href="#developers"
            className="transition-colors hover:text-foreground"
          >
            Developers
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/signin"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
          >
            Get Started
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background grid + gradient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-size-[4rem_4rem] opacity-30" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-primary)/0.12,transparent_70%)]" />
        <div className="absolute bottom-0 h-32 w-full bg-linear-to-t from-background to-transparent" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-24 md:pb-32 md:pt-32">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex justify-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Open Learning Platform
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto max-w-4xl text-center text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl lg:text-7xl"
        >
          Build curricula.{" "}
          <span className="bg-linear-to-r from-primary to-chart-5 bg-clip-text text-transparent">
            Create assignments.
          </span>{" "}
          Empower learning.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed text-muted-foreground md:text-xl"
        >
          A platform where educators design structured courses, and developers
          build infinitely diverse assignment types through a sandboxed Widget
          SDK — like plugins for learning.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            href="/signup"
            className="group inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:brightness-110"
          >
            Get Started
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>

        {/* Hero visual — abstract app preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mx-auto mt-20 max-w-5xl"
        >
          <div className="rounded-2xl border border-border/60 bg-card/50 p-2 shadow-2xl backdrop-blur-sm">
            <div className="rounded-xl border border-border/40 bg-card">
              {/* Fake app bar */}
              <div className="flex items-center gap-2 border-b border-border/40 px-5 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-destructive/60" />
                  <div className="h-3 w-3 rounded-full bg-chart-4/60" />
                  <div className="h-3 w-3 rounded-full bg-primary/60" />
                </div>
                <div className="ml-4 flex-1 rounded-md bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
                  moly.app/dashboard
                </div>
              </div>

              {/* App content mockup */}
              <div className="grid grid-cols-12 gap-0">
                {/* Sidebar */}
                <div className="col-span-3 border-r border-border/40 p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <div className="h-2.5 w-20 rounded bg-primary/30" />
                    </div>
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-2"
                      >
                        <div className="h-4 w-4 rounded bg-muted" />
                        <div
                          className="h-2.5 rounded bg-muted"
                          style={{ width: `${60 + i * 12}px` }}
                        />
                      </div>
                    ))}
                    <div className="my-3 border-t border-border/40" />
                    <div className="px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Course Tree
                    </div>
                    {["Module 1", "Lesson 1.1", "Lesson 1.2", "Homework"].map(
                      (label, i) => (
                        <div
                          key={label}
                          className="flex items-center gap-1.5 py-1"
                          style={{ paddingLeft: `${12 + i * 8}px` }}
                        >
                          <div
                            className={`h-2 w-2 rounded-sm ${
                              i === 3 ? "bg-chart-4" : "bg-muted-foreground/30"
                            }`}
                          />
                          <span className="text-[10px] text-muted-foreground">
                            {label}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {/* Main content */}
                <div className="col-span-9 p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="h-4 w-48 rounded bg-foreground/20" />
                        <div className="mt-2 h-2.5 w-72 rounded bg-muted-foreground/20" />
                      </div>
                      <div className="flex gap-2">
                        <div className="h-8 w-20 rounded-md bg-primary/20" />
                        <div className="h-8 w-8 rounded-md bg-muted" />
                      </div>
                    </div>

                    {/* Content blocks mimicking BlockNote editor */}
                    <div className="mt-6 space-y-3 rounded-lg border border-border/30 p-4">
                      <div className="h-3 w-80 rounded bg-foreground/15" />
                      <div className="h-3 w-full rounded bg-muted-foreground/10" />
                      <div className="h-3 w-3/4 rounded bg-muted-foreground/10" />
                      <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <div className="flex items-center gap-2">
                          <Puzzle className="h-4 w-4 text-primary" />
                          <div className="h-2.5 w-32 rounded bg-primary/30" />
                        </div>
                        <div className="mt-2 h-24 rounded-md bg-primary/10" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: BookOpen,
      title: "Structured Curricula",
      description:
        "Organize courses into modules, lessons, and homework with an intuitive tree-based editor. Drag, drop, and nest to build your perfect syllabus.",
    },
    {
      icon: Puzzle,
      title: "Widget SDK",
      description:
        "Build custom assignment types as standalone web apps. They run in sandboxed iframes — like Figma plugins or Chrome extensions for education.",
    },
    {
      icon: Shield,
      title: "Multi-Level Permissions",
      description:
        "Organization owners, admins, teachers, and students — each with precisely scoped access. Hierarchical roles that just work.",
    },
    {
      icon: Layers,
      title: "Block-Based Editor",
      description:
        "Create beautiful lesson content with a Notion-like editor powered by BlockNote. Rich text, media, code blocks, and more.",
    },
    {
      icon: Smartphone,
      title: "Web & Mobile",
      description:
        "Full-featured Next.js dashboard for educators, plus a native Expo mobile app for students to learn on the go.",
    },
    {
      icon: Users,
      title: "Classes & Groups",
      description:
        "Create class instances from courses, manage students and teachers, organize study groups, and track assignment progress.",
    },
  ];

  return (
    <section id="features" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <FadeIn className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Features
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
            Everything you need to teach and learn
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            From curriculum design to interactive assignments — a complete
            toolkit for modern education.
          </p>
        </FadeIn>

        <StaggerContainer className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={staggerItem}
              className="group rounded-2xl border border-border/60 bg-card/50 p-6 transition-all hover:border-primary/30 hover:bg-card hover:shadow-lg"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                <feature.icon className="h-5.5 w-5.5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Design Your Curriculum",
      description:
        "Use the tree-based course editor to organize content into modules, lessons, and homework assignments. Write rich content with the BlockNote editor.",
      visual: (
        <div className="space-y-2.5">
          {[
            { label: "Algebra Fundamentals", indent: 0, type: "course" },
            { label: "Linear Equations", indent: 1, type: "module" },
            { label: "Introduction", indent: 2, type: "lesson" },
            { label: "Practice Problems", indent: 2, type: "homework" },
            { label: "Quadratic Equations", indent: 1, type: "module" },
            { label: "The Quadratic Formula", indent: 2, type: "lesson" },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2"
              style={{ paddingLeft: `${item.indent * 20}px` }}
            >
              <div
                className={`h-2.5 w-2.5 rounded-sm ${
                  item.type === "homework"
                    ? "bg-chart-4"
                    : item.type === "module"
                      ? "bg-primary"
                      : item.type === "course"
                        ? "bg-chart-2"
                        : "bg-muted-foreground/40"
                }`}
              />
              <span
                className={`text-sm ${item.type === "course" ? "font-semibold" : ""}`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      number: "02",
      title: "Create or Pick Widgets",
      description:
        "Browse the Widget Marketplace for interactive assignments, or build your own with the SDK. Quizzes, simulations, coding exercises — anything you can imagine.",
      visual: (
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { name: "Graph Plotter", icon: "📈" },
            { name: "Quiz Builder", icon: "✅" },
            { name: "Code Runner", icon: "💻" },
            { name: "Geometry", icon: "📐" },
          ].map((w) => (
            <div
              key={w.name}
              className="flex items-center gap-2 rounded-lg border border-border/50 bg-background p-2.5"
            >
              <span className="text-lg">{w.icon}</span>
              <span className="text-xs font-medium">{w.name}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      number: "03",
      title: "Teach Your Classes",
      description:
        "Create class instances from your courses. Add teachers and students, organize groups, and assign homework.",
      visual: (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Submissions
            </span>
            <span className="text-xs font-semibold text-primary">24/30</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-4/5 rounded-full bg-primary" />
          </div>
          <div className="mt-2 grid grid-cols-6 gap-1.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className={`h-6 w-full rounded ${i < 8 ? "bg-primary/30" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="how-it-works" className="relative py-24 md:py-32">
      {/* Subtle background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--color-primary)/0.04,transparent_60%)]" />

      <div className="relative mx-auto max-w-6xl px-6">
        <FadeIn className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            How It Works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
            From course design to classroom
          </h2>
        </FadeIn>

        <div className="mt-20 space-y-20">
          {steps.map((step, i) => (
            <FadeIn key={step.number} delay={i * 0.1}>
              <div
                className={`flex flex-col items-center gap-12 md:flex-row ${
                  i % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                {/* Text */}
                <div className="flex-1 space-y-4">
                  <span className="text-5xl font-bold text-primary/20">
                    {step.number}
                  </span>
                  <h3 className="text-2xl font-bold">{step.title}</h3>
                  <p className="text-lg leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>

                {/* Visual */}
                <div className="w-full flex-1 md:max-w-sm">
                  <div className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-lg">
                    {step.visual}
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function DeveloperSection() {
  return (
    <section id="developers" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-linear-to-br from-card via-card to-primary/5">
          <div className="grid gap-0 lg:grid-cols-2">
            {/* Text */}
            <FadeIn className="p-8 md:p-12 lg:p-16">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Code2 className="h-3 w-3" />
                For Developers
              </div>

              <h2 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
                Build once, teach everywhere
              </h2>

              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Create interactive assignment widgets as standalone web apps.
                Publish them to the Marketplace, and every teacher on the
                platform can use them — instantly.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  {
                    icon: Globe,
                    text: "Widgets run in sandboxed iframes — any web technology works",
                  },
                  {
                    icon: Blocks,
                    text: "Simple postMessage API: READY → PARAMS → SUBMIT",
                  },
                  {
                    icon: GraduationCap,
                    text: "Auto-generated config UI via Tweakpane schema",
                  },
                ].map((item) => (
                  <div key={item.text} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <item.icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm leading-relaxed text-muted-foreground">
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="https://github.com/moly-edu/widget-sdk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
                >
                  <Github className="h-4 w-4" />
                  Widget SDK
                </a>
                <a
                  href="https://github.com/moly-edu/widget-template"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-5 text-sm font-medium transition-all hover:bg-accent"
                >
                  <Code2 className="h-4 w-4" />
                  Starter Template
                </a>
              </div>
            </FadeIn>

            {/* Code preview */}
            <FadeIn delay={0.2} className="flex items-center p-4 lg:p-8">
              <div className="w-full overflow-hidden rounded-xl border border-border/60 bg-background font-mono text-sm shadow-lg">
                <div className="flex items-center gap-2 border-b border-border/40 bg-muted/30 px-4 py-2.5">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/20" />
                    <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/20" />
                    <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/20" />
                  </div>
                  <span className="ml-2 text-xs text-muted-foreground">
                    widget.ts
                  </span>
                </div>
                <div className="overflow-x-auto p-4 text-[13px] leading-6">
                  <pre className="text-muted-foreground">
                    <Line c="comment">{`// 1. Tell the host your widget is ready`}</Line>
                    <Line>
                      <K>window</K>.parent.<F>postMessage</F>(
                    </Line>
                    <Line>
                      {"  "}
                      {`{ type: "WIDGET_READY" }, "*"`}
                    </Line>
                    <Line>{");"}</Line>
                    <Line />

                    <Line c="comment">{`// 2. Receive config from the teacher`}</Line>
                    <Line>
                      <K>window</K>.<F>addEventListener</F>("message", (e){" "}
                      {`=> {`}
                    </Line>
                    <Line>
                      {"  "}
                      <K>if</K> (e.data.type === <V>{`"PARAMS_UPDATE"`}</V>){" "}
                      {"{"}
                    </Line>
                    <Line>
                      {"    "}
                      <K>const</K> config = e.data.<S>params</S>;
                    </Line>
                    <Line>
                      {"    "}
                      <F>renderAssignment</F>(config);
                    </Line>
                    <Line>{"  }"}</Line>
                    <Line>{"});"}</Line>
                    <Line />

                    <Line c="comment">{`// 3. Submit the student's answer`}</Line>
                    <Line>
                      <K>window</K>.parent.<F>postMessage</F>(
                    </Line>
                    <Line>{"  {"}</Line>
                    <Line>
                      {"    "}
                      <S>type</S>: <V>{`"SUBMIT"`}</V>,
                    </Line>
                    <Line>
                      {"    "}
                      <S>answer</S>: {"{ value: studentAnswer }"}
                    </Line>
                    <Line>{"  }"}, "*"</Line>
                    <Line>{");"}</Line>
                  </pre>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}

// Code syntax highlighting helpers
function Line({ children, c }: { children?: React.ReactNode; c?: "comment" }) {
  if (!children) return <span className="block h-6">{"\n"}</span>;
  if (c === "comment")
    return <span className="block text-muted-foreground/50">{children}</span>;
  return <span className="block">{children}</span>;
}
function K({ children }: { children: React.ReactNode }) {
  return <span className="text-chart-3">{children}</span>;
}
function F({ children }: { children: React.ReactNode }) {
  return <span className="text-chart-2">{children}</span>;
}
function S({ children }: { children: React.ReactNode }) {
  return <span className="text-chart-5">{children}</span>;
}
function V({ children }: { children: React.ReactNode }) {
  return <span className="text-chart-4">{children}</span>;
}

function Roles() {
  const roles = [
    {
      icon: GraduationCap,
      title: "For Educators",
      points: [
        "Design tree-structured curricula with a visual editor",
        "Write rich lesson content with BlockNote",
        "Attach interactive widgets as homework",
        "Track student progress and grade submissions",
      ],
    },
    {
      icon: Users,
      title: "For Students",
      points: [
        "Join classes and access course materials",
        "Complete interactive assignments on web or mobile",
        "View scores and review submitted work",
        "Learn on the go with the Expo mobile app",
      ],
    },
    {
      icon: Code2,
      title: "For Developers",
      points: [
        "Build assignment widgets with any web framework",
        "Link GitHub repos for automated CI builds",
        "Publish to the Widget Marketplace",
        "Reach every teacher and student on the platform",
      ],
    },
  ];

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <FadeIn className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            For Everyone
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
            One platform, three perspectives
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Whether you teach, learn, or build — Moly has tools made for you.
          </p>
        </FadeIn>

        <StaggerContainer className="mt-16 grid gap-6 md:grid-cols-3">
          {roles.map((role) => (
            <motion.div
              key={role.title}
              variants={staggerItem}
              className="rounded-2xl border border-border/60 bg-card/50 p-8"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <role.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-bold">{role.title}</h3>
              <ul className="mt-4 space-y-3">
                {role.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground"
                  >
                    <ArrowRight className="mt-1 h-3 w-3 shrink-0 text-primary" />
                    {point}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/50">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
            <Sparkles className="h-3 w-3 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">Moly</span>
        </div>

        <a
          href="https://github.com/TranTam31/learning-platform"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:text-foreground transition-colors"
        >
          <Github className="h-4 w-4" />
          <span>GitHub</span>
        </a>
      </div>
    </footer>
  );
}

// ── Main export ────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <Hero />
      <Features />
      <HowItWorks />
      <DeveloperSection />
      <Roles />
      <Footer />
    </div>
  );
}
