type ResumeCandidate = Record<string, unknown>;

export function generateResumeHtml(candidate: ResumeCandidate, imgSrc: string): string {
  function escapeHtml(value: unknown): string {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function text(value: unknown, fallback = "N/A"): string {
    const escaped = escapeHtml(value).trim();
    return escaped || fallback;
  }

  function fullName(): string {
    const explicitName = text(candidate.full_name, "");
    if (explicitName) return explicitName;

    const nameParts = [
      candidate.first_name,
      candidate.middle_name,
      candidate.last_name,
      candidate.suffix,
    ]
      .map((part) => text(part, ""))
      .filter(Boolean);

    return nameParts.join(" ") || "Candidate";
  }

  function compactParagraph(value: unknown): string {
    return text(value)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join("<br />");
  }

  const name = fullName();
  const email = text(candidate.email, "");
  const phone = text(candidate.phone, "");
  const applicantId = text(candidate.id, "N/A");
  const address = text(
    candidate.home_address || candidate.permanent_address || candidate.address,
  );
  const civilStatus = text(candidate.marital_status);
  const birthdate = text(candidate.birthdate);
  const gender = text(candidate.gender);
  const religion = text(candidate.religion);
  const height = text(candidate.height);
  const weight = text(candidate.weight);
  const pagibigNumber = text(candidate.pagibig_number, "");
  const sssNumber = text(candidate.sss_number, "");
  const philhealthNumber = text(candidate.philhealth, "");
  const highestEducation = text(candidate.highest_educ_attainment, "");
  const workHistory = compactParagraph(candidate.work_history);
  const skills = compactParagraph(candidate.skills);
  const certifications = compactParagraph(candidate.certifications);
  const desiredSalary = text(candidate.desired_salary, "");
  const positionScreened = text(candidate.position_screened, "");
  const status = text(candidate.status, "");

  const educationRows = [
    ["Highest Educational Attainment", highestEducation],
    ["Elementary", text(candidate.school_elementary, "")],
    ["Junior High", text(candidate.school_junior_high, "")],
    ["Senior High", text(candidate.school_senior_high, "")],
    ["College", text(candidate.school_college, "")],
    ["Other", text(candidate.school_other_name || candidate.school_other, "")],
  ]
    .filter(([, value]) => value)
    .map(
      ([label, value]) => `
        <tr>
          <td>${label}</td>
          <td>${value}</td>
        </tr>`,
    )
    .join("");

  const idRows = [
    ["PAG-IBIG", pagibigNumber, "N/A"],
    ["SSS", sssNumber, "N/A"],
    ["PhilHealth", philhealthNumber, "N/A"],
  ]
    .filter(([, value]) => value)
    .map(
      ([type, number, expiry]) => `
        <tr>
          <td>${type}</td>
          <td>${number}</td>
          <td>${expiry}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Resume - ${name}</title>
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            background: #f3f3f3;
            color: #1e1e1e;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 13px;
            line-height: 1.35;
          }

          .page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 24mm 18mm 16mm;
            background: #fff;
            position: relative;
          }

          .header {
            display: grid;
            grid-template-columns: 1fr 165px;
            gap: 24px;
            align-items: start;
            min-height: 150px;
            margin-bottom: 26px;
          }

          .candidate-id {
            margin-top: 24px;
            font-size: 25px;
            letter-spacing: 0.02em;
          }

          .candidate-name {
            margin-top: 2px;
            font-size: 21px;
            font-weight: 700;
            text-transform: uppercase;
          }

          .candidate-email {
            margin-top: 2px;
            font-size: 18px;
            font-weight: 700;
          }

          .candidate-phone {
            margin-top: 8px;
            font-size: 12px;
          }

          .photo {
            width: 165px;
            height: 165px;
            object-fit: cover;
            object-position: center top;
          }

          .section {
            margin-top: 28px;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .section-title {
            margin: 0 0 14px;
            font-size: 24px;
            font-weight: 700;
          }

          .section-title.small-gap {
            margin-bottom: 10px;
          }

          .info-grid {
            border-top: 1px solid #dedede;
          }

          .info-row {
            display: grid;
            grid-template-columns: 120px 1fr 110px 1fr 125px 1fr;
            gap: 12px;
            min-height: 56px;
            align-items: center;
            border-bottom: 1px solid #dedede;
          }

          .info-row.two-col {
            grid-template-columns: 120px 1fr 110px 1fr;
          }

          .info-row.one-col {
            grid-template-columns: 120px 1fr;
          }

          .label {
            font-size: 16px;
          }

          .value {
            font-size: 16px;
            font-weight: 700;
            overflow-wrap: anywhere;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          th {
            text-align: left;
            font-size: 15px;
            font-weight: 700;
            padding: 8px 8px 8px 0;
          }

          td {
            vertical-align: top;
            padding: 5px 8px 7px 0;
            font-size: 15px;
            overflow-wrap: anywhere;
          }

          .ruled {
            border-top: 1px solid #dedede;
          }

          .ruled th,
          .ruled td {
            border-top: 1px solid #efefef;
          }

          .muted-empty {
            color: #555;
            font-style: italic;
          }

          .paragraph-block {
            border-top: 1px solid #dedede;
            padding-top: 10px;
            font-size: 15px;
            overflow-wrap: anywhere;
          }

          .footer {
            position: absolute;
            left: 18mm;
            right: 18mm;
            bottom: 8mm;
            display: flex;
            justify-content: space-between;
            color: #222;
            font-size: 10px;
          }

          @media print {
            body {
              background: #fff;
            }

            .page {
              width: auto;
              min-height: auto;
              margin: 0;
              padding: 18mm 14mm 13mm;
            }
          }
        </style>
      </head>
      <body>
        <main class="page">
          <header class="header">
            <div>
              <div class="candidate-id">${applicantId}</div>
              <div class="candidate-name">${name}</div>
              <div class="candidate-email">${email || "N/A"}</div>
              <div class="candidate-phone">${phone ? `Contact No: ${phone}` : ""}</div>
            </div>
            <img src="${escapeHtml(imgSrc)}" class="photo" alt="profile" />
          </header>

          <section class="section">
            <h1 class="section-title">Personal Information</h1>
            <div class="info-grid">
              <div class="info-row two-col">
                <div class="label">Date of Birth</div>
                <div class="value">${birthdate}</div>
                <div class="label">Age:</div>
                <div class="value">N/A</div>
              </div>
              <div class="info-row">
                <div class="label">Gender:</div>
                <div class="value">${gender}</div>
                <div class="label">Religion:</div>
                <div class="value">${religion}</div>
                <div class="label">Civil Status:</div>
                <div class="value">${civilStatus}</div>
              </div>
              <div class="info-row two-col">
                <div class="label">Weight:</div>
                <div class="value">${weight}</div>
                <div class="label">Height:</div>
                <div class="value">${height}</div>
              </div>
              <div class="info-row one-col">
                <div class="label">Address:</div>
                <div class="value">${address}</div>
              </div>
            </div>
          </section>

          <section class="section">
            <h2 class="section-title">Identification:</h2>
            <table>
              <thead>
                <tr>
                  <th>Identification Type</th>
                  <th>Identification No</th>
                  <th>Expiry Date</th>
                </tr>
              </thead>
              <tbody>
                ${
                  idRows ||
                  `<tr><td colspan="3" class="muted-empty">No identification information provided</td></tr>`
                }
              </tbody>
            </table>
          </section>

          <section class="section">
            <h2 class="section-title small-gap">Education</h2>
            <table class="ruled">
              <tbody>
                ${
                  educationRows ||
                  `<tr><td class="muted-empty">No education information provided</td></tr>`
                }
              </tbody>
            </table>
          </section>

          <section class="section">
            <h2 class="section-title small-gap">Certificates</h2>
            <div class="paragraph-block">${certifications}</div>
          </section>

          <section class="section">
            <h2 class="section-title small-gap">Trainings</h2>
            <div class="paragraph-block">${skills}</div>
          </section>

          <section class="section">
            <h2 class="section-title">Work Experience</h2>
            <table>
              <thead>
                <tr>
                  <th style="width: 28%;">Company</th>
                  <th style="width: 38%;">Position</th>
                  <th style="width: 10%;">Start</th>
                  <th style="width: 10%;">End</th>
                  <th style="width: 14%;">Country</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${workHistory}</td>
                  <td>${positionScreened || "N/A"}</td>
                  <td>N/A</td>
                  <td>N/A</td>
                  <td>N/A</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="section">
            <h2 class="section-title">Language Spoken</h2>
            <table class="ruled">
              <thead>
                <tr>
                  <th>Language</th>
                  <th>Competency</th>
                  <th>Spoken</th>
                  <th>Written</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="muted-empty" colspan="4">No language information provided</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="section">
            <h2 class="section-title">Job Preference</h2>
            <table>
              <thead>
                <tr>
                  <th style="width: 14%;">Class</th>
                  <th style="width: 22%;">Application Type</th>
                  <th style="width: 38%;">Position</th>
                  <th style="width: 14%;">Industry</th>
                  <th style="width: 12%;">Country</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>N/A</td>
                  <td>N/A</td>
                  <td>${positionScreened || "N/A"}</td>
                  <td>${desiredSalary ? `Salary: ${desiredSalary}` : status || "N/A"}</td>
                  <td>N/A</td>
                </tr>
              </tbody>
            </table>
          </section>

          <footer class="footer">
            <span>SkillsTrader Resume</span>
            <span>1/1</span>
          </footer>
        </main>
      </body>
    </html>`;
}
