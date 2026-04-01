export function buildPdfResumeParserPrompt(pdfText: string): { system: string; prompt: string } {
  const system = `You are an expert at parsing resume text into structured data. Extract all resume information from the provided text.

Guidelines:
- work[].name is the company name; work[].position is the job title
- work[].highlights are the bullet points/responsibilities for that role
- skills[].name is the skill category (e.g. "Programming Languages"); skills[].keywords are individual skills in that category
- Dates should be in YYYY-MM format (e.g., "2022-03") or YYYY format — never full sentences
- If a date is "Present" or "Current", use empty string for endDate
- basics.profiles[0].url should be the LinkedIn URL if present
- Extract ALL sections present in the resume — do not omit any section
- If a section is not present in the resume, omit it from the output

Return only the structured data, no commentary.`

  const prompt = `Extract resume data from the following text:\n\n${pdfText}`

  return { system, prompt }
}
