// Keep the original line order so evidence can be traced back to the upload.
// Known candidate names may appear again in project credits or page footers.
export function redactResumeText(
  input: string,
  candidateName?: string,
): string {
  const names = new Set<string>();
  const addName = (value?: string) => {
    const name = value?.trim();
    if (name && name.length >= 2 && !/^candidate(?:\s*\d+)?$/i.test(name))
      names.add(name);
  };
  addName(candidateName);
  const normalized = input.normalize('NFKC').replace(/\r\n?/g, '\n');
  // A filename or account display name can differ from the name in the document.
  const header = normalized.trimStart().split('\n').slice(0, 4);
  const first = header[0]?.split(/[|•]/u)[0].trim();
  if (first && /^[\p{Lu}][\p{L}'’.-]*(?:\s+[\p{Lu}][\p{L}'’.-]*){1,4}$/u.test(first)
    && /@|\+\d{1,3}[\s(-]/.test(header.join(' '))
    && !/\b(?:engineer|analyst|manager|developer|architect|scientist|designer|resume|résumé|curriculum|experience|skills|education|certification)\b/i.test(first)) {
    addName(first);
  }
  for (const match of normalized.matchAll(
    /^\s*(?:full\s+name|candidate\s+name|name)\s*:\s*([^|\n;]+)/gim,
  )) {
    addName(match[1]);
  }
  let text = normalized
    .replace(
      /^\s*(?:home address|street address|residential address|address|date of birth|birth date|dob|passport(?: number)?|national id|aadhaar(?: number)?|social security number|ssn|gender|marital status|nationality)\s*[:\-]\s*.*$/gim,
      '[personal details removed]',
    )
    .replace(/[\w.+%'-]+@[\w.-]+\.[a-z]{2,}/gi, '[email]')
    .replace(
      /(?:https?:\/\/|www\.|(?:[\w-]+\.)?(?:linkedin\.com|github\.com|gitlab\.com|bitbucket\.org)\/)[^\s|<>()]+/gi,
      '[link]',
    )
    .replace(/(?<!\w)\+?\d[\d ().-]{6,}\d(?!\w)/g, (match) => {
      const digits = match.replace(/\D/g, '');
      // Accept international numbers and preserve employment dates such as 2021-2024.
      return digits.length >= 10 && digits.length <= 15 ? '[phone]' : match;
    });
  for (const name of names) {
    const pattern = name
      .split(/\s+/)
      .map((part) => part.replace(/[.*+?^$\x7b\x7d()|[\]\\]/g, '\\$&'))
      .join('\\s+');
    text = text.replace(
      new RegExp('(?<![\\p{L}\\p{N}])' + pattern + '(?![\\p{L}\\p{N}])', 'giu'),
      '[candidate]',
    );
  }
  return text;
}
