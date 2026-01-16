import React, { useRef } from 'react';
import html2pdf from 'html2pdf.js';

const formatDate = (dateStr) => {
  if (!dateStr) return '_______________';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '_______________';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const addMonths = (dateStr, months) => {
  if (!dateStr) return '_______________';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '_______________';
  date.setMonth(date.getMonth() + months);
  return formatDate(date.toISOString());
};

const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  return num.toString();
};

const AGENT = {
  name: 'Amit Aswal',
  nameUpper: 'AMIT ASWAL',
  regNo: 'IN/PA-2XXX',
  firm: 'anovIP',
};

const PATENT_OFFICES = {
  'New Delhi': 'New Delhi',
  'Mumbai': 'Mumbai',
  'Kolkata': 'Kolkata',
  'Chennai': 'Chennai'
};

const transformData = (dbData) => {
  if (!dbData) return null;
  
  const applicantNames = (dbData.applicants || []).map(a => a.name).filter(n => n).join('; ') || '_______________';
  const claimsCount = parseInt(dbData.claims_count) || 10;
  const pagesCount = parseInt(dbData.pages_count) || 30;
  const priorityCount = parseInt(dbData.priority_count) || 1;
  
  const baseFee = 8000;
  const extraPages = Math.max(0, pagesCount - 30);
  const extraClaims = Math.max(0, claimsCount - 10);
  const extraPriority = Math.max(0, priorityCount - 1);
  
  const extraPagesFee = extraPages * 800;
  const extraClaimsFee = extraClaims * 1600;
  const extraPriorityFee = extraPriority * 8000;
  const rfeFee = 28000;
  const sequenceFee = 0;
  const totalFee = baseFee + extraPagesFee + extraClaimsFee + extraPriorityFee + rfeFee + sequenceFee;
  
  return {
    docketNo: dbData.DOC_NO?.trim() || '',
    internalRef: dbData.internal_ref || dbData.DOC_NO?.trim() || '',
    clientRef: dbData.client_ref || 'PLEASE ADVICE',
    patentOffice: PATENT_OFFICES[dbData.jurisdiction] || 'New Delhi',
    filingDate: dbData.deposit_date || '',
    inventionTitle: dbData.title || '',
    pctAppNo: dbData.pct_app_no || '_______________',
    applicantName: applicantNames,
    claimsCount, pagesCount, priorityCount,
    baseFee, extraPages, extraClaims, extraPriority,
    extraPagesFee, extraClaimsFee, extraPriorityFee, rfeFee, sequenceFee, totalFee,
    // Deadlines
    rfeDeadline: addMonths(dbData.priority_date || dbData.deposit_date, 31),
    form3Deadline: addMonths(dbData.deposit_date, 6),
    form3ExtendedDeadline: addMonths(dbData.deposit_date, 9),
    poaDeadline: addMonths(dbData.deposit_date, 6),
    // Fees in USD
    rfeFeeUSD: '350',
    miscFeeUSD: '125',
    extensionFeeUSD: '50',
  };
};

const styles = {
  page: { fontFamily: 'Times New Roman, serif', fontSize: '11px', lineHeight: '1.6', padding: '30px 40px', background: 'white', maxWidth: '210mm', margin: '0 auto' },
  heading1: { fontSize: '16px', fontWeight: 'bold', margin: '30px 0 20px 0', borderBottom: '2px solid #333', paddingBottom: '5px' },
  sectionTitle: { fontWeight: 'bold', margin: '20px 0 10px 0', fontSize: '12px' },
  table: { width: '100%', borderCollapse: 'collapse', margin: '15px 0' },
  cell: { border: '1px solid #000', padding: '8px 12px', verticalAlign: 'top', fontSize: '11px' },
  underline: { textDecoration: 'underline' },
  pageBreak: { pageBreakBefore: 'always', marginTop: '40px' },
};

export default function ReportGenerator({ formData, onClose }) {
  const contentRef = useRef();
  const d = transformData(formData);
  
  if (!d) {
    return (
      <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060}}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header"><h5>Report</h5><button className="btn-close" onClick={onClose}></button></div>
            <div className="modal-body text-center p-5"><p>No application data available.</p></div>
          </div>
        </div>
      </div>
    );
  }

  const downloadPDF = () => {
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Report_${d.docketNo || 'Patent'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], before: '.page-break' }
    };
    html2pdf().set(opt).from(contentRef.current).save();
  };

  const downloadDOCX = () => {
    const content = contentRef.current.innerHTML;
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><style>body{font-family:'Times New Roman',serif;font-size:11pt}table{width:100%;border-collapse:collapse}td,th{border:1px solid #000;padding:8px;font-size:11pt}h1{font-size:16pt;border-bottom:2px solid #333}</style></head>
      <body>${content}</body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Report_${d.docketNo || 'Patent'}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060}}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header bg-light sticky-top">
            <h5 className="modal-title">Report Preview - {d.docketNo}</h5>
            <div className="d-flex gap-2 download-header">
              <button className="btn btn-danger btn-sm" onClick={downloadPDF}>Download PDF</button>
              <button className="btn btn-primary btn-sm" onClick={downloadDOCX}>Download DOCX</button>
              <button className="btn-close" onClick={onClose}></button>
            </div>
          </div>
          <div className="modal-body bg-secondary bg-opacity-10">
            <div ref={contentRef} style={styles.page}>
              
              {/* LETTERHEAD HEADER */}
              <div style={{borderBottom: '3px solid #1a365d', paddingBottom: '15px', marginBottom: '25px'}}>
                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                  <tbody>
                    <tr>
                      <td style={{width: '50%', verticalAlign: 'top'}}>
                        <h1 style={{margin: '0', fontSize: '28px', fontWeight: 'bold', color: '#1a365d', letterSpacing: '2px'}}>anovIP</h1>
                        <p style={{margin: '2px 0 0 0', fontSize: '9px', color: '#666', letterSpacing: '1px'}}>CONSULTANTS LLP</p>
                      </td>
                      <td style={{width: '50%', verticalAlign: 'top', textAlign: 'right', fontSize: '9px', color: '#444', lineHeight: '1.5'}}>
                        <p style={{margin: '0'}}>161-B/4, 6th Floor, Gulmohar House,</p>
                        <p style={{margin: '0'}}>Yusuf Sarai Community Center, Gautam Nagar,</p>
                        <p style={{margin: '0'}}>Green Park, New Delhi – 110049, India</p>
                        <p style={{margin: '5px 0 0 0'}}>Tel: +91-11-XXXXXXXX | Fax: +91-11-XXXXXXXX</p>
                        <p style={{margin: '0'}}>Email: info@anovip.com | Web: www.anovip.com</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ==================== GENERAL REPORTING ==================== */}
              <h1 style={styles.heading1}>GENERAL REPORTING</h1>

              {/* RE LINE */}
              <p style={{margin: '0 0 15px 0', fontSize: '11px'}}>
                <strong>RE:</strong> Your ref: {d.clientRef} | {AGENT.firm} ref: {d.internalRef} | Indian Application Number: TBA based on {d.pctAppNo} | Application Filed - {AGENT.firm}, India
              </p>

              {/* CONFIRM RECEIPT */}
              <p style={{margin: '0 0 20px 0', fontWeight: 'bold', backgroundColor: '#ffffcc', padding: '8px'}}>
                PLEASE CONFIRM RECEIPT OF THIS EMAIL USING THE <span style={styles.underline}>REPLY-TO-ALL BUTTON</span> - THANK YOU
              </p>

              {/* APPLICATION DETAILS BLOCK */}
              <div style={{margin: '20px 0', lineHeight: '1.8'}}>
                <p style={{margin: '3px 0'}}>IN RE: INDIAN PATENT APPLICATION NUMBER: <strong>TBA</strong></p>
                <p style={{margin: '3px 0'}}>INTERNATIONAL APPLICATION NUMBER: <strong>{d.pctAppNo}</strong></p>
                <p style={{margin: '3px 0'}}>APPLICANT: <strong>{d.applicantName};</strong></p>
                <p style={{margin: '3px 0'}}>TITLED: <strong>{d.inventionTitle}</strong></p>
                <p style={{margin: '3px 0'}}>YOUR REF: {d.clientRef}</p>
                <p style={{margin: '3px 0'}}>{AGENT.firm} REF.: {d.internalRef}</p>
                <p style={{margin: '10px 0 0 0', fontWeight: 'bold'}}>{formatDate(d.filingDate)} | {d.patentOffice}, India</p>
              </div>

              {/* SALUTATION */}
              <p style={{margin: '20px 0'}}>Dear Sirs,</p>
              <p style={{margin: '0 0 15px 0', textAlign: 'justify'}}>This is with regard to subject application.</p>
              <p style={{margin: '0 0 20px 0', textAlign: 'justify'}}>
                In reference to your instructions to timely file a <strong>PCT-NATIONAL-PHASE application in INDIA</strong>. In response, kindly consider as below:
              </p>

              {/* APPLICATION PARTICULARS */}
              <p style={styles.sectionTitle}>APPLICATION PARTICULARS</p>
              <ol style={{margin: '0', paddingLeft: '20px', lineHeight: '2', textAlign: 'justify'}}>
                <li style={{marginBottom: '15px'}}>
                  We are pleased to report that a <strong>PCT-NATIONAL-PHASE</strong> patent application in INDIA based on Application bearing number <strong>{d.pctAppNo}</strong>, titled "<strong><span style={styles.underline}>{d.inventionTitle}</span></strong>" was successfully submitted at the local Patent Office on <strong><span style={styles.underline}>{formatDate(d.filingDate)}</span></strong> under application number <strong><span style={styles.underline}>TBA</span></strong>.
                </li>
                <li style={{marginBottom: '15px'}}>
                  In proof of the action taken by us, we have attached a copy of the as filed documents, the official filing receipt, and our invoice for your reference.
                </li>
              </ol>

              {/* FORM 18/RFE */}
              <p style={styles.sectionTitle}>FORM 18/REQUEST FOR EXAMINATION (RFE)</p>
              <ol start="3" style={{margin: '0', paddingLeft: '20px', lineHeight: '2', textAlign: 'justify'}}>
                <li style={{marginBottom: '15px'}}>
                  The applicant is required to file a <strong>Request for Examination (RFE)</strong> within 31 months from the earliest priority date. Accordingly, for the current application, the deadline for filing RFE is <strong>{d.rfeDeadline}</strong>. Please note that the examination does not happen automatically and explicit request for examination has to be made before patent office. In absence of submission of RFE before the due date, the subject application would get abandoned irrevocably. Thus, we recommend you to file the same at the earliest so that application can be taken for examination ASAP. The discounted fee for filing RFE is <strong>USD {d.rfeFeeUSD}</strong> (inclusive of professional, official, disbursement and applicable taxes).
                </li>
              </ol>

              {/* FORM 1/PROOF OF RIGHT */}
              <p style={styles.sectionTitle}>FORM 1/PROOF OF RIGHT REQUIREMENT</p>
              <ol start="4" style={{margin: '0', paddingLeft: '20px', lineHeight: '2', textAlign: 'justify'}}>
                <li style={{marginBottom: '15px'}}>
                  As per Sections 7, 54 & 135 and rule 20(1), India Patent Act 1970, as amended, the applicant is required to submit an executed copy of <strong>FORM-1</strong> by all the inventor(s) in the declaration part with date earlier than date of filing of application in India and share the high resolution Scan/PDF copy with us. The executed attachment shall act has a proof that the inventors have assigned their rights to the applicant. In the alternative, you may also share a copy of employment agreement (or any other English language assignment) so as to act as a proof of assignment of rights to the firm. Accordingly, you may choose to submit an executed FORM-1 or copy of assignment to meet our local requirements. Please note that the deadline for filing FORM 1 OR copy of Assignment is <strong>{d.form3Deadline}</strong>. Our discounted fee for filing either of the documents is <strong>USD {d.miscFeeUSD}</strong>.
                </li>
              </ol>

              {/* FORM 3/STATEMENT */}
              <p style={styles.sectionTitle}>FORM 3/STATEMENT AND UNDERTAKING</p>
              <ol start="5" style={{margin: '0', paddingLeft: '20px', lineHeight: '2', textAlign: 'justify'}}>
                <li style={{marginBottom: '15px'}}>
                  As per Section 8 of the Indian Patents Act, 1970, the applicant is required to file a statement and undertaking on the prescribed <strong>FORM 3</strong> regarding foreign or family filings within 6 months from the date of application in India and next FORM 3 within three months from the issuance of the First Examination Report (FER). The current deadline for filing the FORM 3 is <strong>{d.form3Deadline}</strong>. Our discounted fee for filing a FORM 3 is <strong>USD 125</strong> (inclusive of professional, official, disbursement and applicable taxes). Further please note that this deadline can be extended until <strong>{d.form3ExtendedDeadline}</strong> by an additional three months, upon payment of extension fees of USD {d.extensionFeeUSD} per month. Thus, we require you to share details of corresponding/family application details namely priority application number, its filing date, publications, allowances, acceptances, refusals, withdrawals, abandonments and grants so that we may populate FORM 3.
                </li>
              </ol>

              {/* FORM 26/POA */}
              <p style={styles.sectionTitle}>FORM 26/POWER OF AUTHORITY (POA)</p>
              <ol start="6" style={{margin: '0', paddingLeft: '20px', lineHeight: '2', textAlign: 'justify'}}>
                <li style={{marginBottom: '15px'}}>
                  We would require a Power of Attorney (POA/FORM 26) to be executed by the applicants for the subject application. <strong>Power of Authority (PoA)</strong> to be simply executed/signed by the applicants. No legalization or notarization would be required. For the current application, the deadline for filing POA is <strong>{d.poaDeadline}</strong>. Our discounted fee for filing either of the documents is <strong>USD 125</strong>. Post execution, kindly share the high resolution Scan/PDF copy with us.
                </li>
              </ol>

              {/* SPECIAL NOTE */}
              <blockquote style={{margin: '20px 30px', padding: '15px', backgroundColor: '#f9f9f9', borderLeft: '4px solid #666', fontStyle: 'italic', fontSize: '10px', lineHeight: '1.8'}}>
                <strong>Special Note:</strong> The Indian Patent Office has recently waived off the regulations relating to submission of original/paper copies of executed FORM 1 and FORM 26. However, the Indian Patent Office has reserved the right to request for original/paper copy which must be submitted within 15 days of such request. Accordingly, we recommend that you keep original/paper copies of FORM 1 and FORM 26 safe and readily available.
              </blockquote>

              {/* ANTICIPATED ACTION */}
              <p style={styles.sectionTitle}>ANTICIPATED ACTION FROM THE PATENT OFFICE</p>
              <ol start="7" style={{margin: '0', paddingLeft: '20px', lineHeight: '2', textAlign: 'justify'}}>
                <li style={{marginBottom: '15px'}}>
                  We shall now await the publication of the application, which will be further followed by the issue of examination report by the Indian Patent Office (subject to timely submission of RFE). We will keep you informed in case of any further correspondence from the patent office.
                </li>
              </ol>

              {/* CLOSING */}
              <p style={{margin: '25px 0 10px 0', textAlign: 'justify'}}>
                Thank you for the opportunity to serve you. We look forward to numerous such opportunities in future.
              </p>
              <p style={{margin: '10px 0 25px 0'}}>
                Please do not hesitate to contact us for additional information or clarification. We would be happy to assist.
              </p>

              <p style={{margin: '20px 0 10px 0'}}>Yours sincerely,</p>
              <div style={{marginTop: '30px'}}>
                <p style={{margin: '0', fontWeight: 'bold'}}>{AGENT.name}</p>
                <p style={{margin: '3px 0'}}>of {AGENT.firm}</p>
              </div>
              <p style={{margin: '20px 0'}}>Enclosures: As above.</p>

              {/* ==================== QUESTEL REPORTING ==================== */}
              <div className="page-break" style={styles.pageBreak}>
                
                {/* LETTERHEAD HEADER FOR PAGE 2 */}
                <div style={{borderBottom: '3px solid #1a365d', paddingBottom: '15px', marginBottom: '25px'}}>
                  <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <tbody>
                      <tr>
                        <td style={{width: '50%', verticalAlign: 'top'}}>
                          <h1 style={{margin: '0', fontSize: '28px', fontWeight: 'bold', color: '#1a365d', letterSpacing: '2px'}}>anovIP</h1>
                          <p style={{margin: '2px 0 0 0', fontSize: '9px', color: '#666', letterSpacing: '1px'}}>CONSULTANTS LLP</p>
                        </td>
                        <td style={{width: '50%', verticalAlign: 'top', textAlign: 'right', fontSize: '9px', color: '#444', lineHeight: '1.5'}}>
                          <p style={{margin: '0'}}>161-B/4, 6th Floor, Gulmohar House,</p>
                          <p style={{margin: '0'}}>Yusuf Sarai Community Center, Gautam Nagar,</p>
                          <p style={{margin: '0'}}>Green Park, New Delhi – 110049, India</p>
                          <p style={{margin: '5px 0 0 0'}}>Tel: +91-11-XXXXXXXX | Fax: +91-11-XXXXXXXX</p>
                          <p style={{margin: '0'}}>Email: info@anovip.com | Web: www.anovip.com</p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h1 style={styles.heading1}>QUESTEL REPORTING</h1>

                {/* RE LINE */}
                <p style={{margin: '0 0 20px 0', fontSize: '11px'}}>
                  <strong>RE:</strong> Your ref: {d.clientRef} | {AGENT.firm} ref: {d.internalRef} | Indian Application Number: TBA based on {d.pctAppNo} | Reporting of New PCT Filing - {AGENT.firm}, India
                </p>

                {/* APPLICATION DETAILS BLOCK */}
                <div style={{margin: '20px 0', lineHeight: '1.8'}}>
                  <p style={{margin: '3px 0'}}>IN RE: INDIAN PATENT APPLICATION NUMBER: <strong>TBA</strong></p>
                  <p style={{margin: '3px 0'}}>INTERNATIONAL APPLICATION NUMBER: <strong>{d.pctAppNo}</strong></p>
                  <p style={{margin: '3px 0'}}>APPLICANT: <strong>{d.applicantName};</strong></p>
                  <p style={{margin: '3px 0'}}>TITLED: <strong>{d.inventionTitle}</strong></p>
                  <p style={{margin: '3px 0'}}>YOUR REF.: {d.clientRef}</p>
                  <p style={{margin: '3px 0'}}>{AGENT.firm} REF.: {d.internalRef}</p>
                  <p style={{margin: '10px 0 0 0', fontWeight: 'bold'}}>{formatDate(d.filingDate)} | {d.patentOffice}, India</p>
                </div>

                {/* SALUTATION */}
                <p style={{margin: '20px 0'}}>Dear Sir/Madam,</p>
                <p style={{margin: '0 0 15px 0', textAlign: 'justify'}}>This is in reference to the above-identified docket.</p>
                <p style={{margin: '0 0 20px 0', textAlign: 'justify'}}>
                  We are pleased to report that a <strong>PCT-NATIONAL-PHASE</strong> <span style={styles.underline}>APPLICATION</span> of Application No. <strong>{d.pctAppNo}</strong> was filed on your request at the Indian Patent Office, Delhi. The details of which are as under:
                </p>

                {/* APPLICATION DETAILS */}
                <p style={{margin: '15px 0', fontWeight: 'bold'}}>Indian Patent Application Number: TBA</p>
                <p style={{margin: '15px 0', fontWeight: 'bold'}}>Filing Date: {formatDate(d.filingDate)}</p>

                <p style={{margin: '20px 0', fontWeight: 'bold', textDecoration: 'underline'}}>
                  We are also pleased to report that REQUEST FOR EXAMINATION (FORM 18) has been filed along with this application on your request.
                </p>

                <p style={{margin: '15px 0', textAlign: 'justify'}}>
                  A proof of the same is attached herewith as Cash Book Receipt (CBR). We herewith also attach a true digital copy of as filed documents for your reference.
                </p>

                <p style={{margin: '20px 0'}}>The itemized record for the official fee (in Indian Rupee) is as below:</p>

                {/* FEE TABLE */}
                <table style={styles.table}>
                  <tbody>
                    <tr>
                      <td style={{...styles.cell, width: '65%'}}>
                        1. Application Filing Fee<br/>
                        <span style={{fontSize: '10px', fontStyle: 'italic'}}>(with 30 Pages, 10 Claims and 1 Priority)</span>
                      </td>
                      <td style={{...styles.cell, width: '5%', textAlign: 'center'}}>:</td>
                      <td style={{...styles.cell, width: '30%'}}>INR {d.baseFee.toLocaleString()}</td>
                    </tr>
                    {d.extraPages > 0 && (
                      <tr>
                        <td style={styles.cell}>2. Fee for Extra {d.extraPages} Pages in addition to 30</td>
                        <td style={{...styles.cell, textAlign: 'center'}}>:</td>
                        <td style={styles.cell}>INR {d.extraPagesFee.toLocaleString()}</td>
                      </tr>
                    )}
                    {d.extraClaims > 0 && (
                      <tr>
                        <td style={styles.cell}>3. Fee for Extra {d.extraClaims} Claims in addition to 10</td>
                        <td style={{...styles.cell, textAlign: 'center'}}>:</td>
                        <td style={styles.cell}>INR {d.extraClaimsFee.toLocaleString()}</td>
                      </tr>
                    )}
                    {d.extraPriority > 0 && (
                      <tr>
                        <td style={styles.cell}>4. Fee for Extra {d.extraPriority} Priority in addition to 1</td>
                        <td style={{...styles.cell, textAlign: 'center'}}>:</td>
                        <td style={styles.cell}>INR {d.extraPriorityFee.toLocaleString()}</td>
                      </tr>
                    )}
                    <tr>
                      <td style={styles.cell}>5. Fee for Request for Examination</td>
                      <td style={{...styles.cell, textAlign: 'center'}}>:</td>
                      <td style={styles.cell}>INR {d.rfeFee.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td style={styles.cell}>6. Fee for Sequence Listing</td>
                      <td style={{...styles.cell, textAlign: 'center'}}>:</td>
                      <td style={styles.cell}>INR {d.sequenceFee}</td>
                    </tr>
                    <tr>
                      <td style={{...styles.cell, fontWeight: 'bold', textAlign: 'right', paddingRight: '20px'}}>TOTAL FEE</td>
                      <td style={{...styles.cell, textAlign: 'center'}}></td>
                      <td style={{...styles.cell, fontWeight: 'bold'}}>INR {d.totalFee.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>

                {/* CLOSING */}
                <p style={{margin: '25px 0 15px 0'}}>
                  Thank you for the opportunity to serve you, we look forward to numerous such opportunities in future.
                </p>
                <p style={{margin: '15px 0', fontWeight: 'bold', textDecoration: 'underline'}}>
                  Kindly acknowledge receipt of this e-mail.
                </p>

              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}