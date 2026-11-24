"use client";

export interface ReviewedRequirement {
  id: string;
  text: string;
  maxPoints: number;
  required: boolean;
}

interface ScorecardReviewProps {
  requirements: ReviewedRequirement[];
  confirmed: boolean;
  onConfirm: (confirmed: boolean) => void;
}

export default function ScorecardReview({ requirements, confirmed, onConfirm }: ScorecardReviewProps) {
  return (
    <>
      <p className="mt-1 text-xs text-gray-600">Check the points available for each requirement. Review which conditions are required for eligibility.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-gray-600">
            <tr><th scope="col" className="py-2">Requirement</th><th scope="col" className="px-3">Eligibility</th><th scope="col" className="text-right">Points</th></tr>
          </thead>
          <tbody>
            {requirements.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="py-2 text-gray-800">{r.text}</td>
                <td className="px-3 text-xs text-gray-600">{r.required ? "Required" : "Relaxed"}</td>
                <td className="text-right tabular-nums">{r.maxPoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm font-medium text-gray-800">
        <input type="checkbox" checked={confirmed} onChange={(e) => onConfirm(e.target.checked)} />
        I confirm these requirements and points for all candidates.
      </label>
    </>
  );
}
