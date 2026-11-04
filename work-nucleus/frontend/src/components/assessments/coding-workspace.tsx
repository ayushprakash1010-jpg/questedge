"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Code2,
  Terminal,
  FileText,
  Clock,
  Cpu,
  Send,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { CodingChallenge, runCandidateCode, submitCandidateCode, CodeSubmissionStatus } from "@/lib/assessment-api";

// Dynamically import Monaco Editor to avoid SSR window errors
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// Language mappings for Monaco & Judge0
const SUPPORTED_LANGUAGES: Record<
  string,
  { name: string; monacoId: string; judge0Id: number; defaultTemplate: string }
> = {
  python: {
    name: "Python (3.8+)",
    monacoId: "python",
    judge0Id: 71,
    defaultTemplate: `# Write your solution here\nimport sys\n\ndef solve():\n    lines = sys.stdin.read().splitlines()\n    if not lines:\n        return\n    # Process input\n    print(lines[0])\n\nif __name__ == '__main__':\n    solve()\n`,
  },
  javascript: {
    name: "JavaScript (Node.js)",
    monacoId: "javascript",
    judge0Id: 63,
    defaultTemplate: `// Write your solution here\nconst fs = require('fs');\n\nfunction solve() {\n  const input = fs.readFileSync(0, 'utf-8').trim().split('\\n');\n  // Process input\n  console.log(input[0] || '');\n}\n\nsolve();\n`,
  },
  java: {
    name: "Java (OpenJDK 13)",
    monacoId: "java",
    judge0Id: 62,
    defaultTemplate: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextLine()) {\n            System.out.println(sc.nextLine());\n        }\n    }\n}\n`,
  },
  cpp: {
    name: "C++ (GCC 9.2)",
    monacoId: "cpp",
    judge0Id: 54,
    defaultTemplate: `#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string line;\n    if (getline(cin, line)) {\n        cout << line << endl;\n    }\n    return 0;\n}\n`,
  },
  typescript: {
    name: "TypeScript (3.7)",
    monacoId: "typescript",
    judge0Id: 74,
    defaultTemplate: `import * as fs from 'fs';\n\nfunction solve(): void {\n  const input = fs.readFileSync(0, 'utf-8').trim().split('\\n');\n  console.log(input[0] || '');\n}\n\nsolve();\n`,
  },
  go: {
    name: "Go (1.13)",
    monacoId: "go",
    judge0Id: 60,
    defaultTemplate: `package main\n\nimport (\n\t"bufio"\n\t"fmt"\n\t"os"\n)\n\nfunc main() {\n\tscanner := bufio.NewScanner(os.Stdin)\n\tif scanner.Scan() {\n\t\tfmt.Println(scanner.Text())\n\t}\n}\n`,
  },
};

interface CodingWorkspaceProps {
  token: string;
  challenges: CodingChallenge[];
  onComplete: () => Promise<void>;
}

export function CodingWorkspace({ token, challenges, onComplete }: CodingWorkspaceProps) {
  const [selectedChallengeIdx, setSelectedChallengeIdx] = useState(0);
  const currentChallenge = challenges[selectedChallengeIdx];

  const [selectedLangKey, setSelectedLangKey] = useState<string>("python");
  const [codePerLang, setCodePerLang] = useState<Record<string, string>>({});
  const [editorTheme, setEditorTheme] = useState<"vs-dark" | "light">("vs-dark");

  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"testcases" | "output">("testcases");

  const [runResults, setRunResults] = useState<any>(null);
  const [submitResults, setSubmitResults] = useState<any>(null);
  const [customInput, setCustomInput] = useState("");

  // Initialize starter code when challenge or language changes
  useEffect(() => {
    if (!currentChallenge) return;
    const starter = currentChallenge.starterCode?.[selectedLangKey] ||
      SUPPORTED_LANGUAGES[selectedLangKey]?.defaultTemplate ||
      "";

    setCodePerLang((prev) => {
      const existing = prev[`${currentChallenge.id}_${selectedLangKey}`];
      if (existing !== undefined) return prev;
      return { ...prev, [`${currentChallenge.id}_${selectedLangKey}`]: starter };
    });
  }, [currentChallenge, selectedLangKey]);

  if (!currentChallenge) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
        <p className="text-slate-600">No coding challenges found in this assessment.</p>
      </div>
    );
  }

  const currentCodeKey = `${currentChallenge.id}_${selectedLangKey}`;
  const currentCode = codePerLang[currentCodeKey] || "";

  const handleCodeChange = (value?: string) => {
    if (value === undefined) return;
    setCodePerLang((prev) => ({ ...prev, [currentCodeKey]: value }));
  };

  const handleResetCode = () => {
    const starter =
      currentChallenge.starterCode?.[selectedLangKey] ||
      SUPPORTED_LANGUAGES[selectedLangKey]?.defaultTemplate ||
      "";
    setCodePerLang((prev) => ({ ...prev, [currentCodeKey]: starter }));
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setActiveTab("output");
    try {
      const langConfig = SUPPORTED_LANGUAGES[selectedLangKey];
      const res = await runCandidateCode(token, {
        challengeId: currentChallenge.id,
        sourceCode: currentCode,
        language: selectedLangKey,
        languageId: langConfig.judge0Id,
      });
      setRunResults(res);
      setSubmitResults(null);
    } catch (err: any) {
      setRunResults({
        testCases: [
          {
            testCaseId: "error",
            passed: false,
            actualOutput: null,
            expectedOutput: "",
            error: err.message || "Failed to execute code",
            statusDescription: "Execution Error",
          },
        ],
        passed: 0,
        total: 1,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitCode = async () => {
    setIsSubmitting(true);
    setActiveTab("output");
    try {
      const langConfig = SUPPORTED_LANGUAGES[selectedLangKey];
      const res = await submitCandidateCode(token, {
        challengeId: currentChallenge.id,
        sourceCode: currentCode,
        language: selectedLangKey,
        languageId: langConfig.judge0Id,
      });
      setSubmitResults(res);
      setRunResults(null);
    } catch (err: any) {
      alert(err.message || "Failed to submit code");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] bg-slate-900 text-slate-100">
      {/* Top Challenge Switcher & Header Bar */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {challenges.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedChallengeIdx(idx);
                setRunResults(null);
                setSubmitResults(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                idx === selectedChallengeIdx
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              Problem {idx + 1}: {c.title}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onComplete}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Send className="h-3.5 w-3.5" />
            Finish Assessment
          </button>
        </div>
      </div>

      {/* Main Split Body: Left = Problem Spec, Right = Monaco + Console */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Column: Problem Statement (4 cols) */}
        <div className="lg:col-span-5 bg-slate-950 border-r border-slate-800 overflow-y-auto p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  currentChallenge.difficulty === "HARD"
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    : currentChallenge.difficulty === "MEDIUM"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                }`}
              >
                {currentChallenge.difficulty}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Max Score: {currentChallenge.maxScore} pts
              </span>
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" /> {currentChallenge.timeLimitSeconds}s limit
              </span>
            </div>

            <h1 className="text-xl font-bold text-white mb-3">{currentChallenge.title}</h1>
            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {currentChallenge.description}
            </div>
          </div>

          {currentChallenge.constraints && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Constraints
              </h4>
              <p className="text-xs text-slate-300 font-mono whitespace-pre-line">
                {currentChallenge.constraints}
              </p>
            </div>
          )}

          {/* Sample Test Cases */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Sample Test Cases
            </h4>
            <div className="space-y-3">
              {currentChallenge.sampleTestCases.map((tc, idx) => (
                <div
                  key={tc.id || idx}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono space-y-2"
                >
                  <div>
                    <span className="text-slate-500 block mb-0.5">Input:</span>
                    <pre className="bg-slate-950 p-2 rounded text-slate-200 overflow-x-auto">
                      {tc.input}
                    </pre>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Expected Output:</span>
                    <pre className="bg-slate-950 p-2 rounded text-emerald-400 overflow-x-auto">
                      {tc.expectedOutput}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Code Editor & Execution Console (7 cols) */}
        <div className="lg:col-span-7 flex flex-col bg-slate-900 overflow-hidden">
          {/* Editor Action Toolbar */}
          <div className="bg-slate-850 border-b border-slate-800 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <select
                value={selectedLangKey}
                onChange={(e) => setSelectedLangKey(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {Object.keys(SUPPORTED_LANGUAGES).map((key) => (
                  <option key={key} value={key}>
                    {SUPPORTED_LANGUAGES[key].name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setEditorTheme((prev) => (prev === "vs-dark" ? "light" : "vs-dark"))}
                className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 border border-slate-700 transition-colors"
              >
                {editorTheme === "vs-dark" ? "🌙 Dark" : "☀️ Light"}
              </button>

              <button
                onClick={handleResetCode}
                title="Reset to starter template"
                className="text-[11px] text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRunCode}
                disabled={isRunning || isSubmitting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white transition-colors disabled:opacity-50"
              >
                {isRunning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400" />
                )}
                Run Code
              </button>

              <button
                onClick={handleSubmitCode}
                disabled={isRunning || isSubmitting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5" />
                )}
                Submit Code
              </button>
            </div>
          </div>

          {/* Monaco Editor Component */}
          <div className="flex-1 min-h-[300px]">
            <Editor
              height="100%"
              theme={editorTheme}
              language={SUPPORTED_LANGUAGES[selectedLangKey]?.monacoId || "python"}
              value={currentCode}
              onChange={handleCodeChange}
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                wordWrap: "on",
              }}
            />
          </div>

          {/* Bottom Drawer: Testcases & Execution Console */}
          <div className="h-56 bg-slate-950 border-t border-slate-800 flex flex-col">
            {/* Tabs */}
            <div className="flex items-center gap-4 px-4 border-b border-slate-800 bg-slate-900 text-xs font-semibold">
              <button
                onClick={() => setActiveTab("testcases")}
                className={`py-2 px-1 border-b-2 transition-colors ${
                  activeTab === "testcases"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Sample Tests ({currentChallenge.sampleTestCases.length})
              </button>
              <button
                onClick={() => setActiveTab("output")}
                className={`py-2 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === "output"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Terminal className="h-3.5 w-3.5" />
                Execution Output
                {(runResults || submitResults) && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                )}
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-4 text-xs font-mono">
              {activeTab === "testcases" && (
                <div className="space-y-3">
                  {currentChallenge.sampleTestCases.map((tc, idx) => (
                    <div key={idx} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-slate-400 font-bold mb-1">Test #{idx + 1}</div>
                      <div className="text-slate-300">Input: {tc.input}</div>
                      <div className="text-emerald-400">Expected: {tc.expectedOutput}</div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "output" && (
                <div>
                  {isRunning && (
                    <div className="flex items-center gap-2 text-indigo-400 py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Executing against sample test cases via Judge0 sandbox...</span>
                    </div>
                  )}

                  {isSubmitting && (
                    <div className="flex items-center gap-2 text-indigo-400 py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Grading final submission against hidden evaluation test cases...</span>
                    </div>
                  )}

                  {!isRunning && !isSubmitting && !runResults && !submitResults && (
                    <div className="text-slate-500 py-4 text-center">
                      Click <span className="text-slate-300 font-bold">Run Code</span> to test against sample test cases, or{" "}
                      <span className="text-slate-300 font-bold">Submit Code</span> for final grading.
                    </div>
                  )}

                  {runResults && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="font-bold text-slate-200">
                          Sample Test Results: {runResults.passed} / {runResults.total} Passed
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            runResults.passed === runResults.total
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {runResults.passed === runResults.total ? "ALL PASSED" : "FAILED SOME"}
                        </span>
                      </div>

                      {runResults.testCases?.map((tc: any, idx: number) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border ${
                            tc.passed
                              ? "border-emerald-500/30 bg-emerald-950/20"
                              : "border-rose-500/30 bg-rose-950/20"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-300">Case {idx + 1}</span>
                            <span className={tc.passed ? "text-emerald-400" : "text-rose-400"}>
                              {tc.passed ? "✓ Passed" : "✗ Failed"}
                            </span>
                          </div>
                          {tc.actualOutput !== null && (
                            <div>
                              <span className="text-slate-500">Your Output:</span>{" "}
                              <span className="text-slate-200">{tc.actualOutput}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-slate-500">Expected:</span>{" "}
                            <span className="text-emerald-300">{tc.expectedOutput}</span>
                          </div>
                          {tc.error && (
                            <div className="text-rose-400 mt-1 whitespace-pre-wrap">
                              Error: {tc.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {submitResults && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div>
                          <span className="font-bold text-white text-sm">
                            Score: {submitResults.score} / {submitResults.maxScore}
                          </span>
                          <span className="text-slate-400 text-xs ml-2">
                            ({submitResults.testCasesPassed} / {submitResults.totalTestCases} total test cases passed)
                          </span>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded text-xs font-bold ${
                            submitResults.status === "PASSED"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {submitResults.status}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                        <div className="text-slate-300 font-semibold mb-1">Evaluation Summary</div>
                        <div className="text-slate-400 text-xs">
                          Hidden test cases passed: {submitResults.hiddenPassed} / {submitResults.hiddenTotal}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

