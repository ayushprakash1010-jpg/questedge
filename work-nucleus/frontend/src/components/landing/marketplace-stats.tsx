"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const stats = [
  { value: 142, label: "Active Mandates", prefix: "", suffix: "+" },
  { value: 68, label: "Rewards Distributed", prefix: "₹", suffix: "L+" },
  { value: 2400, label: "Verified Recruiters", prefix: "", suffix: "+" },
  { value: 890, label: "Successful Hires", prefix: "", suffix: "+" },
];

function AnimatedNumber({ target, prefix, suffix }: { target: number; prefix: string; suffix: string }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const step = Math.ceil(target / 60);
    const timer = setInterval(() => {
      setCurrent((prev) => {
        if (prev + step >= target) {
          clearInterval(timer);
          return target;
        }
        return prev + step;
      });
    }, 20);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <span>
      {prefix}{current.toLocaleString("en-IN")}{suffix}
    </span>
  );
}

export function MarketplaceStats() {
  return (
    <section className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-2xl font-extrabold text-white sm:text-3xl">
                <AnimatedNumber target={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
              </div>
              <div className="mt-1 text-sm font-medium text-indigo-200">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
