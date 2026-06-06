/**
 * client/src/lib/pdfGenerator.ts
 * ATS-friendly PDF generation using @react-pdf/renderer
 * Generates clean, parseable PDFs that pass ATS systems
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

// Register a clean, ATS-safe font
Font.register({
  family: "Calibri",
  fonts: [
    { src: "https://fonts.gstatic.com/s/lato/v24/S6uyw4BMUTPHjx4wXiWtFCc.woff2", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/lato/v24/S6u9w4BMUTPHh6UVSwiPGQ3q5d0.woff2", fontWeight: 700 },
  ],
});

// ATS-safe styles — single column, no tables, no graphics
const cvStyles = StyleSheet.create({
  page: {
    fontFamily: "Calibri",
    fontSize: 10.5,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 50,
    color: "#1a1a1a",
    lineHeight: 1.4,
  },
  name: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 2,
    color: "#1a1a1a",
  },
  contact: {
    fontSize: 9.5,
    color: "#444",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    paddingBottom: 2,
    marginBottom: 6,
    marginTop: 12,
    color: "#1a1a1a",
  },
  paragraph: {
    fontSize: 10.5,
    marginBottom: 4,
    lineHeight: 1.5,
  },
  bullet: {
    fontSize: 10.5,
    marginBottom: 3,
    paddingLeft: 12,
    lineHeight: 1.4,
  },
});

const clStyles = StyleSheet.create({
  page: {
    fontFamily: "Calibri",
    fontSize: 11,
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 60,
    color: "#1a1a1a",
    lineHeight: 1.6,
  },
  date: { fontSize: 10.5, marginBottom: 20, color: "#444" },
  heading: { fontSize: 11, fontWeight: 700, marginBottom: 4 },
  salutation: { fontSize: 11, marginBottom: 12 },
  paragraph: { fontSize: 11, marginBottom: 12, lineHeight: 1.6 },
  closing: { fontSize: 11, marginTop: 20 },
  signature: { fontSize: 11, fontWeight: 700, marginTop: 8 },
});

// ── Parse CV text into sections ───────────────────────────────────────────────
function parseCVSections(text: string): Array<{ title: string; lines: string[] }> {
  const sectionHeaders = [
    "PROFESSIONAL SUMMARY", "SUMMARY", "OBJECTIVE",
    "CORE COMPETENCIES", "SKILLS", "TECHNICAL SKILLS", "KEY SKILLS",
    "PROFESSIONAL EXPERIENCE", "EXPERIENCE", "WORK EXPERIENCE",
    "EDUCATION", "CERTIFICATIONS", "AWARDS", "PROJECTS",
    "LANGUAGES", "INTERESTS",
  ];

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const sections: Array<{ title: string; lines: string[] }> = [];
  let currentSection: { title: string; lines: string[] } | null = null;

  for (const line of lines) {
    const isHeader = sectionHeaders.some(
      (h) => line.toUpperCase().replace(/[^A-Z\s]/g, "").trim() === h
    ) || (line.length < 40 && line === line.toUpperCase() && line.length > 3);

    if (isHeader) {
      if (currentSection) sections.push(currentSection);
      currentSection = { title: line, lines: [] };
    } else if (currentSection) {
      currentSection.lines.push(line);
    } else {
      // Header info (name, contact)
      sections.push({ title: "__HEADER__", lines: [line] });
    }
  }
  if (currentSection) sections.push(currentSection);
  return sections;
}

// ── Build CV PDF Document ─────────────────────────────────────────────────────
function buildCVDocument(cvText: string, candidateName: string) {
  const sections = parseCVSections(cvText);
  const headerLines = sections.filter((s) => s.title === "__HEADER__").flatMap((s) => s.lines);
  const contentSections = sections.filter((s) => s.title !== "__HEADER__");

  return createElement(
    Document,
    { title: `${candidateName} - CV`, author: candidateName },
    createElement(
      Page,
      { size: "A4", style: cvStyles.page },
      // Header
      createElement(Text, { style: cvStyles.name }, candidateName),
      headerLines.length > 0
        ? createElement(Text, { style: cvStyles.contact }, headerLines.join(" | "))
        : null,
      // Sections
      ...contentSections.map((section) =>
        createElement(
          View,
          { key: section.title },
          createElement(Text, { style: cvStyles.sectionTitle }, section.title),
          ...section.lines.map((line, i) => {
            const isBullet = line.startsWith("•") || line.startsWith("-") || line.startsWith("*");
            const cleanLine = isBullet ? line.replace(/^[•\-*]\s*/, "• ") : line;
            return createElement(
              Text,
              { key: i, style: isBullet ? cvStyles.bullet : cvStyles.paragraph },
              cleanLine
            );
          })
        )
      )
    )
  );
}

// ── Build Cover Letter PDF Document ──────────────────────────────────────────
function buildCoverLetterDocument(
  coverLetterText: string,
  candidateName: string,
  jobTitle: string,
  company: string
) {
  const paragraphs = coverLetterText
    .split(/\n\n+/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);

  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  return createElement(
    Document,
    { title: `${candidateName} - Cover Letter - ${company}` },
    createElement(
      Page,
      { size: "A4", style: clStyles.page },
      createElement(Text, { style: clStyles.date }, today),
      createElement(Text, { style: clStyles.heading }, `Re: ${jobTitle} — ${company}`),
      createElement(Text, { style: clStyles.salutation }, "Dear Hiring Manager,"),
      ...paragraphs.map((para, i) =>
        createElement(Text, { key: i, style: clStyles.paragraph }, para)
      ),
      createElement(Text, { style: clStyles.closing }, "Yours sincerely,"),
      createElement(Text, { style: clStyles.signature }, candidateName)
    )
  );
}

// ── Public download functions ─────────────────────────────────────────────────
export async function downloadCVAsPDF(
  cvText: string,
  candidateName: string,
  filename?: string
): Promise<void> {
  const doc = buildCVDocument(cvText, candidateName);
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `${candidateName.replace(/\s+/g, "_")}_ATS_CV.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadCoverLetterAsPDF(
  coverLetterText: string,
  candidateName: string,
  jobTitle: string,
  company: string,
  filename?: string
): Promise<void> {
  const doc = buildCoverLetterDocument(coverLetterText, candidateName, jobTitle, company);
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `${candidateName.replace(/\s+/g, "_")}_Cover_Letter_${company.replace(/\s+/g, "_")}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
