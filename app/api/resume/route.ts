    const { name, experience, skills, education, jobTitle, email, phone, linkedin, location } = body;

    const prompt = `Write a professional resume for ${name} applying for a ${jobTitle} position.

${location ? `Location: ${location}` : ""}
${email ? `Email: ${email}` : ""}
${phone ? `Phone: ${phone}` : ""}
${linkedin ? `LinkedIn: ${linkedin}` : ""}

Education: ${education}
Experience: ${experience}
Skills: ${skills}

Format it as a clean, professional resume with:
- Contact information at the top
- A brief professional summary (2-3 sentences)
- Work experience with bullet points highlighting achievements and metrics
- Skills section organized by category
- Education section

Use professional language, action verbs, and include specific metrics where possible. Do not use markdown code blocks.`;