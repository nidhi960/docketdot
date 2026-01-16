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
  
  // Calculate fees
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
    patentOffice: PATENT_OFFICES[dbData.jurisdiction] || 'New Delhi',
    filingDate: dbData.deposit_date || '',
    inventionTitle: dbData.title || '',
    pctAppNo: dbData.pct_app_no || '_______________',
    applicantName: applicantNames,
    claimsCount,
    pagesCount,
    priorityCount,
    baseFee,
    extraPages,
    extraClaims,
    extraPriority,
    extraPagesFee,
    extraClaimsFee,
    extraPriorityFee,
    rfeFee,
    sequenceFee,
    totalFee,
  };
};

const styles = {
  page: { fontFamily: 'Times New Roman, serif', fontSize: '12px', lineHeight: '1.6', padding: '40px 50px', background: 'white', maxWidth: '210mm', margin: '0 auto' },
  table: { width: '100%', borderCollapse: 'collapse', margin: '15px 0' },
  cell: { border: '1px solid #000', padding: '8px 12px', verticalAlign: 'top', fontSize: '11px' },
  cellNoBorder: { padding: '4px 12px', verticalAlign: 'top', fontSize: '11px' },
};

export default function CoverLetterGenerator({ formData, onClose }) {
  const contentRef = useRef();
  const d = transformData(formData);
  
  if (!d) {
    return (
      <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060}}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header"><h5>Cover Letter</h5><button className="btn-close" onClick={onClose}></button></div>
            <div className="modal-body text-center p-5"><p>No application data available.</p></div>
          </div>
        </div>
      </div>
    );
  }

  const downloadPDF = () => {
    const element = contentRef.current;
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `CoverLetter_${d.docketNo || 'Patent'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    html2pdf().set(opt).from(element).save();
  };

  const downloadDOCX = () => {
    const content = contentRef.current.innerHTML;
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><style>body{font-family:'Times New Roman',serif;font-size:12pt}table{width:100%;border-collapse:collapse}td,th{border:1px solid #000;padding:8px;font-size:11pt}</style></head>
      <body>${content}</body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CoverLetter_${d.docketNo || 'Patent'}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060}}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header bg-light sticky-top">
            <h5 className="modal-title">Cover Letter Preview - {d.docketNo}</h5>
            <div className="d-flex gap-2 download-header">
              <button className="btn btn-danger btn-sm" onClick={downloadPDF}>Download PDF</button>
              <button className="btn btn-primary btn-sm" onClick={downloadDOCX}>Download DOCX</button>
              <button className="btn-close" onClick={onClose}></button>
            </div>
          </div>
          <div className="modal-body bg-secondary bg-opacity-10">
            <div ref={contentRef} style={styles.page}>
              
              {/* LETTERHEAD HEADER */}
              <div style={{borderBottom: '3px solid #1a365d', paddingBottom: '15px', marginBottom: '20px'}}>
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

              {/* DATE AND LOCATION LINE */}
              <p style={{margin: '0 0 5px 0', fontWeight: 'bold'}}>
                {formatDate(d.filingDate)} | {d.patentOffice}, India
              </p>
              
              {/* Internal Reference */}
              <p style={{margin: '0 0 25px 0', fontWeight: 'bold'}}>
                anovIP Ref: {d.internalRef}
              </p>

              {/* ADDRESSEE */}
              <div style={{marginBottom: '20px'}}>
                <p style={{margin: '0', fontWeight: 'bold'}}>To,</p>
                <p style={{margin: '0', fontWeight: 'bold'}}>The Controller General of Patents,</p>
                <p style={{margin: '0', fontWeight: 'bold'}}>Designs, and Trade Marks</p>
                <p style={{margin: '0'}}>Boudhik Sampada Bhawan,</p>
                <p style={{margin: '0'}}>Plot No. 32, Sector 14</p>
                <p style={{margin: '0'}}>Dwarka, {d.patentOffice} – 110078, India</p>
              </div>

              {/* SUBJECT LINE */}
              <h2 style={{fontSize: '13px', margin: '25px 0 20px 0', fontWeight: 'bold'}}>
                Re: NEW PCT-NATIONAL-PHASE APPLICATION - INDIA OUT OF APPLICATION NO. {d.pctAppNo}
              </h2>

              {/* SALUTATION */}
              <p style={{margin: '15px 0'}}>Dear Sir,</p>

              {/* BODY - Introduction */}
              <p style={{margin: '0 0 15px 0', textAlign: 'justify', lineHeight: '1.8'}}>
                We have the honor to submit herewith <strong>PCT-NATIONAL-PHASE – INDIA</strong> for the application for letters patent under The Patents (Amendment) Act, 2005 for an invention:
              </p>

              {/* APPLICATION DETAILS */}
              <p style={{margin: '0 0 20px 0', textAlign: 'justify', lineHeight: '1.8'}}>
                <strong>PCT-NATIONAL-PHASE</strong> application in India out of Application No. <strong>{d.pctAppNo}</strong> in the name of <strong>{d.applicantName}</strong>; titled <strong>"{d.inventionTitle}"</strong> with {d.claimsCount} ({numberToWords(d.claimsCount)}) claims, {d.pagesCount} ({numberToWords(d.pagesCount)}) pages and {d.priorityCount} ({numberToWords(d.priorityCount)}) Priority.
              </p>

              {/* FEE DETAILS HEADER */}
              <h1 style={{fontSize: '14px', margin: '25px 0 15px 0', fontWeight: 'bold'}}>
                Details of the Fee:
              </h1>

              {/* FEE TABLE */}
              <table style={{...styles.table, borderCollapse: 'collapse'}}>
                <tbody>
                  <tr>
                    <td style={{...styles.cell, width: '65%'}}>
                      <li style={{marginLeft: '15px'}}>Application Filing Fee<br/>
                      <span style={{fontSize: '10px', fontStyle: 'italic'}}>(with 30 Pages, 10 Claims and 1 Priority)</span></li>
                    </td>
                    <td style={{...styles.cell, width: '5%', textAlign: 'center'}}>:</td>
                    <td style={{...styles.cell, width: '30%'}}>INR {d.baseFee.toLocaleString()}</td>
                  </tr>
                  {d.extraPages > 0 && (
                    <tr>
                      <td style={styles.cell}>
                        <li style={{marginLeft: '15px'}}>Fee for Extra {d.extraPages} Pages in addition to 30</li>
                      </td>
                      <td style={{...styles.cell, textAlign: 'center'}}>:</td>
                      <td style={styles.cell}>INR {d.extraPagesFee.toLocaleString()}</td>
                    </tr>
                  )}
                  {d.extraClaims > 0 && (
                    <tr>
                      <td style={styles.cell}>
                        <li style={{marginLeft: '15px'}}>Fee for Extra {d.extraClaims} Claims in addition to 10</li>
                      </td>
                      <td style={{...styles.cell, textAlign: 'center'}}>:</td>
                      <td style={styles.cell}>INR {d.extraClaimsFee.toLocaleString()}</td>
                    </tr>
                  )}
                  {d.extraPriority > 0 && (
                    <tr>
                      <td style={styles.cell}>
                        <li style={{marginLeft: '15px'}}>Fee for Extra {d.extraPriority} Priority in addition to 1</li>
                      </td>
                      <td style={{...styles.cell, textAlign: 'center'}}>:</td>
                      <td style={styles.cell}>INR {d.extraPriorityFee.toLocaleString()}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={styles.cell}>
                      <li style={{marginLeft: '15px'}}>Fee for Request for Examination</li>
                    </td>
                    <td style={{...styles.cell, textAlign: 'center'}}>:</td>
                    <td style={styles.cell}>INR {d.rfeFee.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style={styles.cell}>
                      <li style={{marginLeft: '15px'}}>Fee for Sequence Listing</li>
                    </td>
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
              <p style={{margin: '25px 0 20px 0'}}>
                The Controller is respectfully requested to take that on record.
              </p>

              <p style={{margin: '20px 0 10px 0'}}>Yours faithfully,</p>

              {/* SIGNATURE BLOCK */}
              <div style={{marginTop: '40px'}}>
                <p style={{margin: '0', fontWeight: 'bold'}}>{AGENT.nameUpper}</p>
                <p style={{margin: '3px 0'}}>(IN/PA No. {AGENT.regNo})</p>
                <p style={{margin: '3px 0'}}>of {AGENT.firm}</p>
                <p style={{margin: '3px 0', fontWeight: 'bold'}}>AGENT FOR THE APPLICANT(s)</p>
              </div>

              {/* ENCLOSURES */}
              <div style={{marginTop: '30px'}}>
                <p style={{margin: '0 0 10px 0', fontWeight: 'bold'}}>Enclosures:</p>
                <ol style={{margin: '0', paddingLeft: '20px', lineHeight: '1.8'}}>
                  <li>Form 1,</li>
                  <li>Form 2 - Complete Specification,</li>
                  <li>Form 3,</li>
                  <li>Form 5,</li>
                  <li>FORM 18</li>
                  <li>Copy of Notification of the International Application Number and of the International Filing Date RO/105</li>
                  <li>Copy of Notification Concerning Submission or Transmittal of Priority Document IB/304</li>
                  <li>Copy of notification of the Recording of a Change IB/306</li>
                  <li>Proof of right</li>
                  <li>FORM 26</li>
                </ol>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}