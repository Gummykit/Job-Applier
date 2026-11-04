import { z } from "zod";

export const ResumeSchema = z.object({
  basics: z.object({
    name: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    location: z.string().nullable(),
    headline: z.string().nullable().describe("One-line professional title, e.g. 'Senior Backend Engineer'"),
    summary: z.string().nullable().describe("2-4 sentence professional summary"),
    links: z.array(z.object({ label: z.string(), url: z.string() })),
  }),
  experience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      location: z.string().nullable(),
      start: z.string().nullable().describe("e.g. 'Jan 2021'"),
      end: z.string().nullable().describe("e.g. 'Present' or 'Mar 2023'"),
      bullets: z.array(z.string()),
    }),
  ),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string().nullable(),
      field: z.string().nullable(),
      start: z.string().nullable(),
      end: z.string().nullable(),
      details: z.string().nullable().describe("GPA, honors, relevant coursework"),
    }),
  ),
  skills: z.array(z.object({ category: z.string(), items: z.array(z.string()) })),
  projects: z.array(
    z.object({
      name: z.string(),
      description: z.string().nullable(),
      url: z.string().nullable(),
      bullets: z.array(z.string()),
    }),
  ),
  certifications: z.array(
    z.object({ name: z.string(), issuer: z.string().nullable(), date: z.string().nullable() }),
  ),
  languages: z.array(z.object({ language: z.string(), level: z.string().nullable() })),
});
export type Resume = z.infer<typeof ResumeSchema>;

export const JobExtractionSchema = z.object({
  isJobPosting: z.boolean().describe("false if the page is not a job posting (login wall, 404, expired)"),
  title: z.string(),
  company: z.string().nullable(),
  location: z.string().nullable(),
  remote: z.enum(["remote", "hybrid", "onsite", "unknown"]),
  employmentType: z.string().nullable().describe("Full-time, Contract, Internship..."),
  salary: z.string().nullable(),
  description: z.string().describe("The full job description, cleaned of navigation and boilerplate, as plain text with paragraphs"),
  requirements: z.array(z.string()).describe("Must-have requirements, one per item"),
  niceToHave: z.array(z.string()),
  keywords: z.array(z.string()).describe("Skills, tools and terms an ATS would scan for"),
  applyUrl: z.string().nullable().describe("Direct application URL if one is visible in the text"),
});
export type JobExtraction = z.infer<typeof JobExtractionSchema>;

export const TailorSchema = z.object({
  resume: ResumeSchema,
  changes: z.array(z.string()).describe("Specific edits made, one per item"),
  matchScore: z.number().describe("0-100 honest estimate of candidate/job fit"),
  missingKeywords: z.array(z.string()).describe("Important requirements the candidate does not evidence"),
});
export type TailorResult = z.infer<typeof TailorSchema>;

export const emptyResume = (): Resume => ({
  basics: { name: "", email: null, phone: null, location: null, headline: null, summary: null, links: [] },
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  languages: [],
});
