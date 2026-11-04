export type Preferences = {
  workAuthorization: string;
  requiresSponsorship: string;
  willingToRelocate: string;
  remotePreference: string;
  earliestStartDate: string;
  salaryExpectation: string;
  noticePeriod: string;
  yearsOfExperience: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  gender: string;
  ethnicity: string;
  veteranStatus: string;
  disabilityStatus: string;
  howDidYouHear: string;
  extraNotes: string;
};

export const DEFAULT_PREFERENCES: Preferences = {
  workAuthorization: "",
  requiresSponsorship: "",
  willingToRelocate: "",
  remotePreference: "",
  earliestStartDate: "",
  salaryExpectation: "",
  noticePeriod: "",
  yearsOfExperience: "",
  linkedinUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  gender: "Decline to self-identify",
  ethnicity: "Decline to self-identify",
  veteranStatus: "I am not a protected veteran",
  disabilityStatus: "I do not want to answer",
  howDidYouHear: "Job board",
  extraNotes: "",
};

export const PREFERENCE_FIELDS: { key: keyof Preferences; label: string; hint?: string; multiline?: boolean }[] = [
  { key: "workAuthorization", label: "Work authorization", hint: "e.g. US citizen, Green card, H-1B, EU citizen" },
  { key: "requiresSponsorship", label: "Requires visa sponsorship?", hint: "Yes / No" },
  { key: "willingToRelocate", label: "Willing to relocate?", hint: "Yes / No" },
  { key: "remotePreference", label: "Remote preference", hint: "Remote / Hybrid / On-site / Flexible" },
  { key: "earliestStartDate", label: "Earliest start date", hint: "e.g. Immediately, 2 weeks notice, 2026-01-15" },
  { key: "noticePeriod", label: "Notice period" },
  { key: "salaryExpectation", label: "Salary expectation", hint: "e.g. $140,000 - $160,000" },
  { key: "yearsOfExperience", label: "Total years of experience" },
  { key: "linkedinUrl", label: "LinkedIn URL" },
  { key: "githubUrl", label: "GitHub URL" },
  { key: "portfolioUrl", label: "Portfolio / website URL" },
  { key: "address", label: "Street address" },
  { key: "city", label: "City" },
  { key: "state", label: "State / region" },
  { key: "postalCode", label: "Postal code" },
  { key: "country", label: "Country" },
  { key: "gender", label: "Gender (EEO)", hint: "Used only for voluntary self-identification questions" },
  { key: "ethnicity", label: "Race / ethnicity (EEO)" },
  { key: "veteranStatus", label: "Veteran status (EEO)" },
  { key: "disabilityStatus", label: "Disability status (EEO)" },
  { key: "howDidYouHear", label: "How did you hear about us?" },
  {
    key: "extraNotes",
    label: "Instructions for the agent",
    hint: "Anything else it should know when answering screening questions, e.g. 'Answer security clearance questions with No', 'Never agree to relocate to Texas'.",
    multiline: true,
  },
];
