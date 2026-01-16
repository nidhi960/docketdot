import React, { useRef } from 'react';
import html2pdf from 'html2pdf.js';

const formatDate = (dateStr) => {
  if (!dateStr) return '___________';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '___________';
  return date.toLocaleDateString('en-GB');
};

const formatDateLong = (dateStr) => {
  if (!dateStr) return 'this _____ day of _____, _____';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'this _____ day of _____, _____';
  const day = date.getDate();
  const suffix = ['th', 'st', 'nd', 'rd'][(day % 10 > 3 || Math.floor(day / 10) === 1) ? 0 : day % 10];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${day}${suffix} day of ${months[date.getMonth()]}, ${date.getFullYear()}`;
};

const AGENT = {
  name: 'Amit Aswal',
  nameUpper: 'AMIT ASWAL',
  regNo: 'IN/PA-2XXX',
  firm: 'ANOVIP CONSULTANTS LLP',
};

const PATENT_OFFICES = {
  'New Delhi': 'NEW DELHI',
  'Mumbai': 'MUMBAI',
  'Kolkata': 'KOLKATA',
  'Chennai': 'CHENNAI'
};

const transformData = (dbData) => {
  if (!dbData) return null;
  const firstApplicant = dbData.applicants?.[0] || {};
  const isCompany = dbData.applicant_category !== 'Natural';
  
  return {
    docketNo: dbData.DOC_NO?.trim() || '',
    patentOffice: PATENT_OFFICES[dbData.jurisdiction] || 'NEW DELHI',
    inventionTitle: dbData.title || '',
    applicantName: firstApplicant.name || '',
    applicantNationality: firstApplicant.nationality || 'INDIA',
    applicantAddress: firstApplicant.address || '',
    nationalityStatement: isCompany 
      ? `a company organized and existing under the laws of ${firstApplicant.nationality || 'INDIA'}`
      : `a citizen of ${firstApplicant.nationality || 'INDIA'}`,
    filingDate: dbData.deposit_date || '',
    claimingPriority: dbData.claiming_priority === 'yes',
    priorities: (dbData.priorities || []).map(p => ({
      country: p.country || '',
      appNo: p.priority_no || '',
      date: formatDate(p.priority_date),
      applicantName: p.applicant_name || firstApplicant.name || '',
    })),
  };
};

const styles = {
  page: { fontFamily: 'Times New Roman, serif', fontSize: '11px', lineHeight: '1.5', padding: '30px 40px', background: 'white', maxWidth: '210mm', margin: '0 auto' },
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: '0' },
  cell: { border: '1px solid #000', padding: '8px 10px', verticalAlign: 'top', fontSize: '11px' },
  headerCell: { border: '1px solid #000', padding: '20px', textAlign: 'center', fontSize: '12px' },
  strike: { textDecoration: 'line-through', color: '#888' }
};

export default function Form3Generator({ formData, onClose }) {
  const contentRef = useRef();
  const d = transformData(formData);
  
  if (!d) {
    return (
      <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060}}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header"><h5>Form 3</h5><button className="btn-close" onClick={onClose}></button></div>
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
      filename: `Form3_${d.docketNo || 'Patent'}.pdf`,
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
      <head><meta charset='utf-8'><style>body{font-family:'Times New Roman',serif;font-size:11pt}table{width:100%;border-collapse:collapse}td,th{border:1px solid #000;padding:8px;font-size:11pt}</style></head>
      <body>${content}</body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Form3_${d.docketNo || 'Patent'}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const firstPriority = d.priorities[0] || {};

  return (
    <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060}}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header bg-light sticky-top">
            <h5 className="modal-title">Form 3 Preview - {d.docketNo}</h5>
            <div className="d-flex gap-2 download-header">
              <button className="btn btn-danger btn-sm" onClick={downloadPDF}>Download PDF</button>
              <button className="btn btn-primary btn-sm" onClick={downloadDOCX}>Download DOCX</button>
              <button className="btn-close" onClick={onClose}></button>
            </div>
          </div>
          <div className="modal-body bg-secondary bg-opacity-10">
            <div ref={contentRef} style={styles.page}>
              
              <table style={styles.table}>
                <tbody>
                  {/* HEADER */}
                  <tr>
                    <td colSpan="6" style={styles.headerCell}>
                      <p style={{margin: '0 0 10px 0', fontWeight: 'bold', fontSize: '14px'}}>"FORM 3"</p>
                      <p style={{margin: '5px 0'}}>THE PATENTS ACT, 1970</p>
                      <p style={{margin: '5px 0'}}>(39 of 1970)</p>
                      <p style={{margin: '5px 0'}}>and</p>
                      <p style={{margin: '5px 0'}}>THE PATENTS RULES, 2003</p>
                      <p style={{margin: '15px 0 5px 0', fontWeight: 'bold', fontSize: '13px'}}>STATEMENT AND UNDERTAKING UNDER SECTION 8</p>
                      <p style={{margin: '5px 0', fontStyle: 'italic', fontSize: '10px'}}>(See sub-rule (2) and (3) of Rule 12)</p>
                    </td>
                  </tr>

                  {/* SECTION 1 */}
                  <tr>
                    <td style={{...styles.cell, width: '25%', fontWeight: 'bold'}}>1. Name of the applicant(s).</td>
                    <td colSpan="5" style={styles.cell}>
                      <p style={{margin: 0, textAlign: 'justify', lineHeight: '1.8'}}>
                        I/We, <strong>{d.applicantName}</strong> {d.nationalityStatement}, having address at <strong>{d.applicantAddress}</strong>; do hereby declare:
                      </p>
                    </td>
                  </tr>

                  {/* SECTION 2 */}
                  <tr>
                    <td style={{...styles.cell, fontWeight: 'bold', verticalAlign: 'top'}}>
                      2. Name, address and nationality of the joint applicant.
                    </td>
                    <td colSpan="5" style={styles.cell}>
                      <p style={{margin: '0 0 15px 0', textAlign: 'justify', lineHeight: '1.8'}}>
                        (i) that I/we who have made the Application for patent number.................. in India, dated <strong>{formatDateLong(d.filingDate)}</strong>, based on <strong>{firstPriority.appNo || '..................'}</strong>, alone/jointly with..............
                      </p>
                      
                      <p style={{margin: '15px 0', textAlign: 'justify', lineHeight: '1.8', ...styles.strike}}>
                        (ii) that I/We have not made any application for the same/substantially the same invention outside India
                      </p>
                      
                      <p style={{margin: '15px 0', textAlign: 'center', fontWeight: 'bold'}}>Or</p>
                      
                      <p style={{margin: '15px 0 10px 0', textAlign: 'justify', lineHeight: '1.8'}}>
                        (iii) that I/We have made for the same/substantially same invention, application(s) for patent in the other countries, the particulars of which are given below:
                      </p>
                    </td>
                  </tr>

                  {/* PRIORITY TABLE HEADER */}
                  <tr>
                    <td style={{...styles.cell, fontWeight: 'bold', textAlign: 'center', fontSize: '10px'}}>Name of the country</td>
                    <td style={{...styles.cell, fontWeight: 'bold', textAlign: 'center', fontSize: '10px'}}>Date of application</td>
                    <td style={{...styles.cell, fontWeight: 'bold', textAlign: 'center', fontSize: '10px'}}>Application No.</td>
                    <td style={{...styles.cell, fontWeight: 'bold', textAlign: 'center', fontSize: '10px'}}>Status of the application</td>
                    <td style={{...styles.cell, fontWeight: 'bold', textAlign: 'center', fontSize: '10px'}}>Date of publication</td>
                    <td style={{...styles.cell, fontWeight: 'bold', textAlign: 'center', fontSize: '10px'}}>Date of disposal</td>
                  </tr>

                  {/* PRIORITY DATA ROWS */}
                  {d.claimingPriority && d.priorities.length > 0 ? (
                    d.priorities.map((p, i) => (
                      <tr key={i}>
                        <td style={{...styles.cell, textAlign: 'center'}}><strong>{p.country}</strong></td>
                        <td style={{...styles.cell, textAlign: 'center'}}><strong>{p.date}</strong></td>
                        <td style={{...styles.cell, textAlign: 'center'}}><strong>{p.appNo}</strong></td>
                        <td style={{...styles.cell, textAlign: 'center'}}>-</td>
                        <td style={{...styles.cell, textAlign: 'center'}}>-</td>
                        <td style={{...styles.cell, textAlign: 'center'}}>-</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td style={{...styles.cell, textAlign: 'center'}}>------------------------</td>
                      <td style={{...styles.cell, textAlign: 'center'}}>------------------------</td>
                      <td style={{...styles.cell, textAlign: 'center'}}>------------------------</td>
                      <td style={{...styles.cell, textAlign: 'center'}}>-</td>
                      <td style={{...styles.cell, textAlign: 'center'}}>-</td>
                      <td style={{...styles.cell, textAlign: 'center'}}>-</td>
                    </tr>
                  )}

                  {/* Empty rows for additional entries */}
                  {[...Array(Math.max(0, 3 - (d.priorities?.length || 0)))].map((_, i) => (
                    <tr key={`empty-${i}`}>
                      <td style={{...styles.cell, textAlign: 'center'}}>------------------------</td>
                      <td style={{...styles.cell, textAlign: 'center'}}>------------------------</td>
                      <td style={{...styles.cell, textAlign: 'center'}}>------------------------</td>
                      <td style={{...styles.cell, textAlign: 'center'}}>-</td>
                      <td style={{...styles.cell, textAlign: 'center'}}>-</td>
                      <td style={{...styles.cell, textAlign: 'center'}}>-</td>
                    </tr>
                  ))}

                  {/* SECTION 3 */}
                  <tr>
                    <td style={{...styles.cell, fontWeight: 'bold', verticalAlign: 'top'}}>3. Name and address of the assignee</td>
                    <td colSpan="5" style={styles.cell}>
                      <p style={{margin: '0 0 15px 0', textAlign: 'justify', lineHeight: '1.8'}}>
                        (i) that the rights in the application(s) has/have been assigned to <strong>{d.applicantName}</strong> {d.nationalityStatement}, having address at <strong>{d.applicantAddress}</strong>;
                      </p>
                      
                      <p style={{margin: '15px 0', textAlign: 'justify', lineHeight: '1.8'}}>
                        (ii) that I/We undertake that up to the date of grant of the patent by the Controller, I/We would keep him informed in writing the details regarding corresponding applications for patents filed outside India in accordance with the provisions contained in section 8 and rule 12.
                      </p>
                      
                      <p style={{margin: '20px 0 0 0'}}><strong>Dated this: {formatDateLong(d.filingDate)}</strong></p>
                    </td>
                  </tr>

                  {/* SECTION 4 */}
                  <tr>
                    <td colSpan="6" style={styles.cell}>
                      <p style={{margin: 0}}>4. To be signed by the applicant or his authorized registered patent agent.</p>
                    </td>
                  </tr>

                  {/* SECTION 5 */}
                  <tr>
                    <td style={{...styles.cell, fontWeight: 'bold', verticalAlign: 'top'}}>5. Name of the natural person who has signed.</td>
                    <td colSpan="5" style={styles.cell}>
                      <div style={{marginTop: '20px'}}>
                        <p style={{margin: '0 0 5px 0'}}><strong>{AGENT.nameUpper}</strong></p>
                        <p style={{margin: '0 0 5px 0'}}>(IN/PA No. {AGENT.regNo})</p>
                        <p style={{margin: '0 0 5px 0'}}>of {AGENT.firm}</p>
                        <p style={{margin: '10px 0 0 0', fontWeight: 'bold'}}>AGENT FOR THE APPLICANT(S)</p>
                      </div>
                    </td>
                  </tr>

                  {/* TO CONTROLLER */}
                  <tr>
                    <td colSpan="6" style={styles.cell}>
                      <p style={{margin: '10px 0 5px 0'}}>To</p>
                      <p style={{margin: '0 0 5px 0'}}>The Controller of Patents,</p>
                      <p style={{margin: '0 0 5px 0'}}>The Patent Office,</p>
                      <p style={{margin: 0}}>at <strong>{d.patentOffice}</strong></p>
                    </td>
                  </tr>

                </tbody>
              </table>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}