"use client";

import React, { useId } from "react";
import styles from "./RankingControls.module.css";

export interface ShortlistingRules {
  locationCompatibility: "REQUIRED" | "RELAXED";
  mandatorySkills: "REQUIRED" | "RELAXED";
  minimumExperience: "REQUIRED" | "RELAXED";
  seniorityLevel: "REQUIRED" | "RELAXED";
  requiredEducation: "REQUIRED" | "RELAXED";
  requiredCertification: "REQUIRED" | "RELAXED";
  workAuthorization: "REQUIRED" | "RELAXED";
}
export const DEFAULT_SHORTLISTING_RULES: ShortlistingRules = {
  locationCompatibility: "RELAXED",
  mandatorySkills: "RELAXED",
  minimumExperience: "RELAXED",
  seniorityLevel: "RELAXED",
  requiredEducation: "RELAXED",
  requiredCertification: "RELAXED",
  workAuthorization: "RELAXED",
};
export type RuleDescriptions = Partial<Record<keyof ShortlistingRules, string>>;
const RULE_CONFIG: Array<{
  key: keyof ShortlistingRules;
  label: string;
  description: string;
}> = [
  {
    key: "locationCompatibility",
    label: "Location and work model",
    description: "Location, relocation, and onsite, hybrid or remote work",
  },
  {
    key: "minimumExperience",
    label: "Minimum experience",
    description: "Relevant years specified in the JD",
  },
  {
    key: "mandatorySkills",
    label: "Mandatory skills",
    description: "Must-have skills specified in the JD",
  },
  {
    key: "seniorityLevel",
    label: "Role and seniority",
    description: "Required career level and scope of responsibility",
  },
  {
    key: "requiredEducation",
    label: "Education",
    description: "Degree and level specified in the JD",
  },
  {
    key: "requiredCertification",
    label: "Certifications",
    description: "Each credential specified in the JD",
  },
  {
    key: "workAuthorization",
    label: "Work authorization",
    description: "Permission to work in the role’s country",
  },
];
interface ShortlistingRulesProps {
  rules: ShortlistingRules;
  onChange: (rules: ShortlistingRules) => void;
  descriptions?: RuleDescriptions;
  requirements?: Array<{ text: string; rule?: string }>;
}

export default function ShortlistingRulesComponent({
  rules,
  onChange,
  descriptions,
  requirements,
}: ShortlistingRulesProps) {
  const id = useId();
  return (
    <section className={styles.card} aria-labelledby={id + "-title"}>
      <h3 id={id + "-title"} className={styles.title}>
        Shortlisting rules
      </h3>
      <p className={styles.subtitle}>
        Required conditions must be confirmed for the default shortlist.
        <br />
        Relaxed conditions allow shortlisting.
      </p>
      <div className={styles.rules}>
        {RULE_CONFIG.map(({ key, label, description }) => (
          <div key={key} className={styles.ruleRow}>
            <div className={styles.ruleText}>
              <p id={id + key} className={styles.ruleLabel}>
                {label}
              </p>
              <p
                id={id + key + "-description"}
                className={styles.ruleDescription}
              >
                {requirements
                  ?.filter((r) => r.rule === key)
                  .map((r) => r.text)
                  .join("; ") ||
                  descriptions?.[key] ||
                  description}
              </p>
            </div>
            <div
              className={styles.toggle}
              role="radiogroup"
              aria-labelledby={id + key}
              aria-describedby={id + key + "-description"}
            >
              {(["REQUIRED", "RELAXED"] as const).map((mode) => {
                const selected = (rules[key] || "RELAXED") === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    tabIndex={selected ? 0 : -1}
                    className={styles.toggleButton}
                    onClick={() => onChange({ ...rules, [key]: mode })}
                    onKeyDown={(e) => {
                      if (
                        ![
                          "ArrowRight",
                          "ArrowLeft",
                          "ArrowUp",
                          "ArrowDown",
                          "Home",
                          "End",
                        ].includes(e.key)
                      )
                        return;
                      e.preventDefault();
                      const next =
                        e.key === "Home"
                          ? "REQUIRED"
                          : e.key === "End"
                            ? "RELAXED"
                            : mode === "REQUIRED"
                              ? "RELAXED"
                              : "REQUIRED";
                      onChange({ ...rules, [key]: next });
                      const group = e.currentTarget.parentElement!;
                      (
                        group.children[
                          next === "REQUIRED" ? 0 : 1
                        ] as HTMLButtonElement
                      ).focus();
                    }}
                  >
                    {mode === "REQUIRED" ? "Required" : "Relaxed"}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className={styles.ruleFooter}>
        Rules add no scoring weight. Missing required information needs
        verification. Education and certifications carry zero points.
      </p>
    </section>
  );
}
