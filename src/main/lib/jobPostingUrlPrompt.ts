export function buildJobPostingUrlPrompt(pageText: string): { system: string; prompt: string } {
  const system = `You are an expert at identifying and extracting job postings from web page text.
Given text scraped from a web page (HTML stripped to plain text), determine if it contains a job posting and extract the relevant content.

Guidelines:
- isJobPosting: true only if the page clearly contains a job description/posting
- jobTitle: the specific role title (e.g., "Senior Software Engineer") — empty string if not found
- company: the hiring company name — empty string if not found
- jobDescriptionText: reconstruct a clean, readable version of the job posting text including:
  responsibilities, requirements, qualifications, about the company section
  Format it clearly with line breaks. Do NOT include navigation, headers, footers, ads.
  If isJobPosting is false, return empty string.

Return only the structured data, no commentary.`

  const prompt = `Extract job posting content from this page text:\n\n${pageText}`
  return { system, prompt }
}
