type ResumeCandidate = Record<string, unknown>;

export function generateResumeHtml(candidate: ResumeCandidate, imgSrc: string): string {
  function escapeHtml(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const name = escapeHtml(candidate?.full_name ?? 'candidate');
  const email = escapeHtml(candidate?.email ?? '');
  const phone = escapeHtml(candidate?.phone ?? '');
  const address = escapeHtml(candidate?.address ?? '');
  const skills = escapeHtml(candidate?.skills ?? '');
  const education = escapeHtml(candidate?.education ?? '');
  const work_history = escapeHtml(candidate?.work_history ?? '');
  const certifications = escapeHtml(candidate?.certifications ?? '');
  const desired_salary = escapeHtml(candidate?.desired_salary ?? '');
  const status = escapeHtml(candidate?.status ?? '');

  return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Resume - ${name}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#222; margin:20px; }
          .resume { max-width:760px; margin:0 auto; border:1px solid #e6e6e6; padding:22px; }
          .header { display:flex; gap:18px; align-items:center; }
          .avatar { width:110px; height:110px; border-radius:50%; object-fit:cover; border:1px solid #ddd; }
          .name { font-size:22px; font-weight:700; margin:0; }
          .meta { color:#666; font-size:13px; margin-top:6px; }
          .section { margin-top:16px; }
          .section h3 { margin:0 0 8px 0; font-size:12px; color:#666; text-transform:uppercase; letter-spacing:0.06em; }
          .section p { margin:0; font-size:14px; line-height:1.45; }
          .cols { display:flex; gap:18px; }
          .col { flex:1; }
        </style>
      </head>
      <body>
        <div class="resume">
          <div class="header">
            <img src="${imgSrc}" class="avatar" alt="profile" />
            <div>
              <h1 class="name">${name}</h1>
              <div class="meta">${email}</div>
              <div class="meta">${phone}</div>
              <div class="meta">${address}</div>
            </div>
          </div>
          <div class="section cols">
            <div class="col">
              <h3>Skills</h3>
              <p>${skills || '—'}</p>
              <h3 style="margin-top:12px">Education</h3>
              <p>${education || '—'}</p>
              <h3 style="margin-top:12px">Certifications</h3>
              <p>${certifications || '—'}</p>
            </div>
            <div class="col">
              <h3>Work History</h3>
              <p>${work_history || '—'}</p>
              <h3 style="margin-top:12px">Status & Salary</h3>
              <p>Status: ${status || '—'}</p>
              <p>Desired salary: ${desired_salary || '—'}</p>
            </div>
          </div>
        </div>
      </body>
    </html>`;
}
