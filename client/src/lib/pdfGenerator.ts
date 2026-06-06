/**
 * client/src/lib/pdfGenerator.ts
 * ATS-friendly PDF generation using @react-pdf/renderer
 *
 * The CV generator expects structured JSON from the LLM (see CVData type).
 * Falls back to plain-text parsing if JSON is not available.
 *
 * ATS rules enforced:
 *  - Single column layout, no tables, no graphics, no text boxes
 *  - Standard fonts only (Lato / sans-serif)
 *  - Clear heading hierarchy (H1 name → H2 sections → body)
 *  - No headers/footers that confuse parsers
 *  - Unicode bullet "•" only — no special chars
 *  - Section order: Contact → Summary → Experience → Education → Skills → Keywords
 */

import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import { createElement } from "react";

// ── Register ATS-safe fonts ───────────────────────────────────────────────────
Font.register({
  family: "Lato",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/lato/v24/S6uyw4BMUTPHjx4wXiWtFCc.woff2",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/lato/v24/S6u9w4BMUTPHh6UVSwiPGQ3q5d0.woff2",
      fontWeight: 700,
    },
    {
      src: "https://fonts.gstatic.com/s/lato/v24/S6u9w4BMUTPHh50XSwiPGQ3q5d0.woff2",
      fontWeight: 900,
    },
  ],
});

// ── Structured CV data type (from LLM JSON output) ────────────────────────────
export interface CVExperience {
  title: string;
  company: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  bullets: string[];
}

export interface CVEducation {
  degree: string;
  institution: string;
  year?: string;
}

export interface CVData {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  summary?: string;
  experience?: CVExperience[];
  education?: CVEducation[];
  skills?: string[];
  keywords?: string[];
}

// ── Parse the LLM output into CVData ─────────────────────────────────────────
export function parseCVData(raw: string): CVData {
  // Try JSON first (new structured format)
  try {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned) as CVData;
    if (parsed && typeof parsed === "object" && parsed.name) {
      return parsed;
    }
  } catch {
    // fall through to plain-text parser
  }

  // Plain-text fallback parser
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const data: CVData = { name: "Candidate" };

  let currentSection = "";
  let currentExp: CVExperience | null = null;

  for (const line of lines) {
    // Detect section headers (ALL CAPS, short)
    const isHeader =
      line.length < 50 &&
      line === line.toUpperCase() &&
      /^[A-Z\s&/]+$/.test(line);

    if (isHeader) {
      if (currentExp) {
        data.experience = [...(data.experience ?? []), currentExp];
        currentExp = null;
      }
      currentSection = line.replace(/[^A-Z\s]/g, "").trim();
      continue;
    }

    // First non-header line = name if not yet set
    if (!data.name || data.name === "Candidate") {
      if (!currentSection && !line.includes("|") && line.length < 60) {
        data.name = line;
        continue;
      }
    }

    // Contact line (contains | or @ or +)
    if (!currentSection && (line.includes("|") || line.includes("@") || line.startsWith("+"))) {
      const parts = line.split("|").map((p) => p.trim());
      for (const p of parts) {
        if (p.includes("@")) data.email = p;
        else if (p.startsWith("+") || /^\d/.test(p)) data.phone = p;
        else if (p.toLowerCase().includes("linkedin")) data.linkedin = p;
        else if (!data.location) data.location = p;
      }
      continue;
    }

    // Summary
    if (currentSection.includes("SUMMARY") || currentSection.includes("OBJECTIVE")) {
      data.summary = (data.summary ? data.summary + " " : "") + line;
    }

    // Experience
    if (currentSection.includes("EXPERIENCE")) {
      const isBullet = /^[•\-*]/.test(line);
      if (isBullet) {
        if (currentExp) {
          currentExp.bullets.push(line.replace(/^[•\-*]\s*/, ""));
        }
      } else {
        if (currentExp) {
          data.experience = [...(data.experience ?? []), currentExp];
        }
        currentExp = { title: line, company: "", bullets: [] };
      }
    }

    // Education
    if (currentSection.includes("EDUCATION")) {
      const edu: CVEducation = { degree: line, institution: "" };
      data.education = [...(data.education ?? []), edu];
    }

    // Skills
    if (currentSection.includes("SKILL") || currentSection.includes("COMPETENC")) {
      const skills = line.split(/[,|•]/).map((s) => s.trim()).filter(Boolean);
      data.skills = [...(data.skills ?? []), ...skills];
    }
  }

  if (currentExp) {
    data.experience = [...(data.experience ?? []), currentExp];
  }

  return data;
}

// ── ATS CV Styles ─────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    fontFamily: "Lato",
    fontSize: 10,
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 48,
    color: "#111111",
    backgroundColor: "#ffffff",
    lineHeight: 1.45,
  },
  // ── Header block ──
  name: {
    fontFamily: "Lato",
    fontSize: 22,
    fontWeight: 900,
    color: "#0f172a",
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  contactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
    marginBottom: 14,
  },
  contactItem: {
    fontSize: 9,
    color: "#475569",
    marginRight: 12,
  },
  contactSep: {
    fontSize: 9,
    color: "#cbd5e1",
    marginRight: 12,
  },
  // ── Section ──
  sectionContainer: {
    marginTop: 10,
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: "Lato",
    fontSize: 9.5,
    fontWeight: 700,
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 4,
    paddingBottom: 3,
    borderBottomWidth: 1.5,
    borderBottomColor: "#0f172a",
  },
  // ── Summary ──
  summaryText: {
    fontSize: 10,
    color: "#1e293b",
    lineHeight: 1.55,
    marginBottom: 2,
  },
  // ── Experience ──
  expHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 7,
    marginBottom: 2,
  },
  expTitleBlock: {
    flex: 1,
  },
  expTitle: {
    fontFamily: "Lato",
    fontSize: 10.5,
    fontWeight: 700,
    color: "#0f172a",
  },
  expCompany: {
    fontSize: 10,
    color: "#334155",
    marginTop: 1,
  },
  expDateLocation: {
    fontSize: 9,
    color: "#64748b",
    textAlign: "right",
    marginLeft: 8,
  },
  bullet: {
    flexDirection: "row",
    marginBottom: 2.5,
    paddingLeft: 2,
  },
  bulletDot: {
    fontSize: 10,
    color: "#334155",
    marginRight: 6,
    marginTop: 0.5,
    width: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    color: "#1e293b",
    lineHeight: 1.45,
  },
  // ── Education ──
  eduRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },
  eduDegree: {
    fontFamily: "Lato",
    fontSize: 10.5,
    fontWeight: 700,
    color: "#0f172a",
  },
  eduInstitution: {
    fontSize: 10,
    color: "#334155",
  },
  eduYear: {
    fontSize: 9,
    color: "#64748b",
    textAlign: "right",
  },
  // ── Skills ──
  skillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
    marginTop: 4,
  },
  skillChip: {
    fontSize: 9.5,
    color: "#1e293b",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 3,
    marginRight: 5,
    marginBottom: 5,
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
  },
  // ── Keywords footer ──
  keywordsContainer: {
    marginTop: 10,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
  },
  keywordsLabel: {
    fontSize: 8,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  keywordsText: {
    fontSize: 8.5,
    color: "#64748b",
    lineHeight: 1.4,
  },
});

// ── Build CV PDF ──────────────────────────────────────────────────────────────
function buildCVDocument(cvData: CVData, rawText: string) {
  const data = cvData.name !== "Candidate" ? cvData : parseCVData(rawText);

  const contactItems: string[] = [];
  if (data.email) contactItems.push(data.email);
  if (data.phone) contactItems.push(data.phone);
  if (data.location) contactItems.push(data.location);
  if (data.linkedin) contactItems.push(data.linkedin);

  return createElement(
    Document,
    {
      title: `${data.name} — ATS CV`,
      author: data.name,
      subject: "ATS-Optimised Curriculum Vitae",
      creator: "Job Application Agent",
      producer: "Job Application Agent",
    },
    createElement(
      Page,
      { size: "A4", style: S.page },

      // ── Name ──
      createElement(Text, { style: S.name }, data.name),

      // ── Contact row ──
      contactItems.length > 0
        ? createElement(
            View,
            { style: S.contactRow },
            ...contactItems.flatMap((item, i) => [
              createElement(Text, { key: `ci-${i}`, style: S.contactItem }, item),
              i < contactItems.length - 1
                ? createElement(Text, { key: `sep-${i}`, style: S.contactSep }, "·")
                : null,
            ]).filter(Boolean)
          )
        : null,

      // ── Professional Summary ──
      data.summary
        ? createElement(
            View,
            { style: S.sectionContainer },
            createElement(Text, { style: S.sectionTitle }, "Professional Summary"),
            createElement(Text, { style: S.summaryText }, data.summary)
          )
        : null,

      // ── Experience ──
      data.experience && data.experience.length > 0
        ? createElement(
            View,
            { style: S.sectionContainer },
            createElement(Text, { style: S.sectionTitle }, "Professional Experience"),
            ...data.experience.map((exp, ei) =>
              createElement(
                View,
                { key: `exp-${ei}` },
                // Title + date row
                createElement(
                  View,
                  { style: S.expHeader },
                  createElement(
                    View,
                    { style: S.expTitleBlock },
                    createElement(Text, { style: S.expTitle }, exp.title),
                    createElement(
                      Text,
                      { style: S.expCompany },
                      [exp.company, exp.location].filter(Boolean).join(" · ")
                    )
                  ),
                  (exp.startDate || exp.endDate)
                    ? createElement(
                        Text,
                        { style: S.expDateLocation },
                        [exp.startDate, exp.endDate].filter(Boolean).join(" – ")
                      )
                    : null
                ),
                // Bullets
                ...exp.bullets.map((bullet, bi) =>
                  createElement(
                    View,
                    { key: `b-${ei}-${bi}`, style: S.bullet },
                    createElement(Text, { style: S.bulletDot }, "•"),
                    createElement(Text, { style: S.bulletText }, bullet)
                  )
                )
              )
            )
          )
        : null,

      // ── Education ──
      data.education && data.education.length > 0
        ? createElement(
            View,
            { style: S.sectionContainer },
            createElement(Text, { style: S.sectionTitle }, "Education"),
            ...data.education.map((edu, i) =>
              createElement(
                View,
                { key: `edu-${i}`, style: S.eduRow },
                createElement(
                  View,
                  { style: { flex: 1 } },
                  createElement(Text, { style: S.eduDegree }, edu.degree),
                  edu.institution
                    ? createElement(Text, { style: S.eduInstitution }, edu.institution)
                    : null
                ),
                edu.year
                  ? createElement(Text, { style: S.eduYear }, edu.year)
                  : null
              )
            )
          )
        : null,

      // ── Skills ──
      data.skills && data.skills.length > 0
        ? createElement(
            View,
            { style: S.sectionContainer },
            createElement(Text, { style: S.sectionTitle }, "Core Skills"),
            createElement(
              View,
              { style: S.skillsWrap },
              ...data.skills.map((skill, i) =>
                createElement(Text, { key: `sk-${i}`, style: S.skillChip }, skill)
              )
            )
          )
        : null,

      // ── ATS Keywords footer (hidden from human readers, parsed by ATS) ──
      data.keywords && data.keywords.length > 0
        ? createElement(
            View,
            { style: S.keywordsContainer },
            createElement(Text, { style: S.keywordsLabel }, "Key Competencies"),
            createElement(
              Text,
              { style: S.keywordsText },
              data.keywords.join(" · ")
            )
          )
        : null
    )
  );
}

// ── Cover Letter Styles ───────────────────────────────────────────────────────
const CL = StyleSheet.create({
  page: {
    fontFamily: "Lato",
    fontSize: 11,
    paddingTop: 54,
    paddingBottom: 54,
    paddingHorizontal: 60,
    color: "#111111",
    backgroundColor: "#ffffff",
    lineHeight: 1.65,
  },
  senderName: {
    fontFamily: "Lato",
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 2,
  },
  senderContact: {
    fontSize: 9.5,
    color: "#64748b",
    marginBottom: 24,
  },
  date: {
    fontSize: 10.5,
    color: "#475569",
    marginBottom: 18,
  },
  re: {
    fontFamily: "Lato",
    fontSize: 11,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 16,
  },
  salutation: {
    fontSize: 11,
    marginBottom: 14,
    color: "#1e293b",
  },
  paragraph: {
    fontSize: 11,
    marginBottom: 14,
    color: "#1e293b",
    lineHeight: 1.65,
  },
  closing: {
    fontSize: 11,
    marginTop: 24,
    color: "#1e293b",
  },
  signature: {
    fontFamily: "Lato",
    fontSize: 12,
    fontWeight: 700,
    marginTop: 10,
    color: "#0f172a",
  },
});

function buildCoverLetterDocument(
  coverLetterText: string,
  candidateName: string,
  jobTitle: string,
  company: string,
  contactLine?: string
) {
  const paragraphs = coverLetterText
    .split(/\n\n+/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean)
    // Remove salutation / closing if already in the text (we add our own)
    .filter(
      (p) =>
        !p.toLowerCase().startsWith("dear ") &&
        !p.toLowerCase().startsWith("yours ") &&
        !p.toLowerCase().startsWith("sincerely") &&
        !p.toLowerCase().startsWith("kind regards") &&
        !p.toLowerCase().startsWith("best regards")
    );

  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return createElement(
    Document,
    {
      title: `${candidateName} — Cover Letter — ${company}`,
      author: candidateName,
      subject: `Application for ${jobTitle} at ${company}`,
      creator: "Job Application Agent",
    },
    createElement(
      Page,
      { size: "A4", style: CL.page },

      // Sender block
      createElement(Text, { style: CL.senderName }, candidateName),
      contactLine
        ? createElement(Text, { style: CL.senderContact }, contactLine)
        : null,

      // Date
      createElement(Text, { style: CL.date }, today),

      // Re: line
      createElement(
        Text,
        { style: CL.re },
        `Re: Application for ${jobTitle}${company ? ` at ${company}` : ""}`
      ),

      // Salutation
      createElement(Text, { style: CL.salutation }, "Dear Hiring Manager,"),

      // Body paragraphs
      ...paragraphs.map((para, i) =>
        createElement(Text, { key: `p-${i}`, style: CL.paragraph }, para)
      ),

      // Closing
      createElement(Text, { style: CL.closing }, "Yours sincerely,"),
      createElement(Text, { style: CL.signature }, candidateName)
    )
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Download an ATS-friendly CV as PDF.
 * @param cvRaw  Raw string from LLM (JSON or plain text)
 * @param candidateName  Fallback name if JSON doesn't include one
 * @param filename  Optional custom filename
 */
export async function downloadCVAsPDF(
  cvRaw: string,
  candidateName: string,
  filename?: string
): Promise<void> {
  const data = parseCVData(cvRaw);
  // Use parsed name if available, otherwise fall back to candidateName
  if (!data.name || data.name === "Candidate") {
    data.name = candidateName;
  }
  const doc = buildCVDocument(data, cvRaw);
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    filename ??
    `${data.name.replace(/\s+/g, "_")}_ATS_CV.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download a cover letter as PDF.
 */
export async function downloadCoverLetterAsPDF(
  coverLetterText: string,
  candidateName: string,
  jobTitle: string,
  company: string,
  contactLine?: string,
  filename?: string
): Promise<void> {
  const doc = buildCoverLetterDocument(
    coverLetterText,
    candidateName,
    jobTitle,
    company,
    contactLine
  );
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    filename ??
    `${candidateName.replace(/\s+/g, "_")}_Cover_Letter_${company.replace(/\s+/g, "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get a preview of the parsed CV data (for the live preview panel).
 */
export function previewCVData(cvRaw: string): CVData {
  return parseCVData(cvRaw);
}
