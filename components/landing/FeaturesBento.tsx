"use client";

import { motion } from "framer-motion";
import { Clock, Target, BarChart3, Zap } from "lucide-react";

const features = [
  {
    icon: Clock,
    title: "Authentic Full-Length Exams",
    description:
      "Experience exactly what test day feels like. Our full-length practice tests perfectly replicate the real Digital SAT interface, timing, and question formats.",
    highlight: "3+ hours of focused practice per test",
    color: "blue",
  },
  {
    icon: Target,
    title: "Targeted Sectional Practice",
    description:
      "Don't have time for a full test? Take bite-sized, specific sections to drill down on your weak points and maximize your study efficiency.",
    highlight: "Math and Verbal sections",
    color: "slate",
  },
];

const additionalFeatures = [
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Track your progress with detailed performance breakdowns by topic, difficulty, and question type.",
  },
  {
    icon: Zap,
    title: "Adaptive Learning",
    description: "Our system learns your patterns and recommends exactly what you need to practice next.",
  },
];

export default function FeaturesBento() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-foreground tracking-tight">
            Two Powerful Testing Modes
          </h2>
          <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
            Whether you have 3 hours or 30 minutes, we have the perfect practice option for you.
          </p>
        </motion.div>

        {/* Main Feature Cards - Bento Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group relative bg-card border border-border rounded-2xl p-8 hover:border-blue-200 hover:shadow-lg transition-all duration-300"
            >
              {/* Icon */}
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6 ${
                feature.color === "blue" 
                  ? "bg-blue-50 text-blue-600" 
                  : "bg-slate-100 text-slate-700"
              }`}>
                <feature.icon className="w-7 h-7" />
              </div>

              {/* Content */}
              <h3 className="text-2xl font-bold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {feature.description}
              </p>

              {/* Highlight tag */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                feature.color === "blue"
                  ? "bg-blue-50 text-blue-700 border border-blue-100"
                  : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}>
                {feature.highlight}
              </div>

              {/* Decorative gradient on hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </motion.div>
          ))}
        </div>

        {/* Secondary Features */}
        <div className="grid md:grid-cols-2 gap-6">
          {additionalFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
              className="flex items-start gap-4 bg-slate-50 rounded-xl p-6"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white border border-border flex items-center justify-center">
                <feature.icon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
