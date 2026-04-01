export function buildPdfResumeParserPrompt(pdfText: string): { system: string; prompt: string } {
  const system = `You are an expert at parsing resume text into structured data. Extract all resume information from the provided text.

Guidelines:
- work[].name is the company name; work[].position is the job title
- work[].highlights are the bullet points/responsibilities for that role
- skills[].name is the skill category (e.g. "Programming Languages"); skills[].keywords are individual skills in that category
- Dates should be in YYYY-MM format (e.g., "2022-03") or YYYY format — never full sentences
- If a date is "Present" or "Current", use empty string for endDate
- basics.city is the city/location; basics.url is the LinkedIn or personal URL
- Every field is required. Use empty string "" for any text field not found in the PDF
- Use empty array [] for any section not present in the resume (e.g. if no volunteer experience, return volunteer: [])

Return ONLY valid JSON matching this exact structure (no markdown, no commentary):
{
  "basics": { "name": "", "email": "", "phone": "", "city": "", "url": "" },
  "work": [{ "name": "Company", "position": "Title", "startDate": "YYYY-MM", "endDate": "", "highlights": ["bullet"] }],
  "skills": [{ "name": "Category", "keywords": ["skill1"] }],
  "projects": [{ "name": "Project", "highlights": ["bullet"] }],
  "education": [{ "institution": "", "area": "", "studyType": "", "startDate": "", "endDate": "", "score": "", "courses": [] }],
  "volunteer": [{ "organization": "", "position": "", "startDate": "", "endDate": "", "summary": "", "highlights": [] }],
  "awards": [{ "title": "", "date": "", "awarder": "", "summary": "" }],
  "publications": [{ "name": "", "publisher": "", "releaseDate": "", "url": "", "summary": "" }],
  "languages": [{ "language": "", "fluency": "" }],
  "interests": [{ "name": "", "keywords": [] }],
  "references": [{ "name": "", "reference": "" }]
}`

  const prompt = `Extract resume data from the following text:\n\n${pdfText}`

  return { system, prompt }
}
