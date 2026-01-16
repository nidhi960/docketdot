import React, { useRef } from 'react';
import html2pdf from 'html2pdf.js';

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
  
  // Get inventors - if same as applicant, use applicants
  let inventors = [];
  if (dbData.inventors_same_as_applicant === 'yes') {
    inventors = (dbData.applicants || []).map(a => ({
      name: a.name || '',
      nationality: a.nationality || '',
      address: a.address || ''
    }));
  } else {
    inventors = (dbData.inventors || []).map(i => ({
      name: i.name || '',
      nationality: i.citizen_country || i.nationality || '',
      address: i.address || ''
    }));
  }
  
  return {
    docketNo: dbData.DOC_NO?.trim() || '',
    patentOffice: PATENT_OFFICES[dbData.jurisdiction] || 'NEW DELHI',
    applicantName: firstApplicant.name || '',
    applicantNationality: firstApplicant.nationality || 'INDIA',
    applicantAddress: firstApplicant.address || '',
    nationalityStatement: isCompany 
      ? `a company organized and existing under the laws of ${firstApplicant.nationality || 'INDIA'}`
      : `a citizen of ${firstApplicant.nationality || 'INDIA'}`,
    filingDate: dbData.deposit_date || '',
    inventors: inventors,
    isConvention: dbData.application_type === 'CONVENTION',
  };
};

const styles = {
  page: { fontFamily: 'Times New Roman, serif', fontSize: '11px', lineHeight: '1.5', padding: '25px 35px', background: 'white', maxWidth: '210mm', margin: '0 auto' },
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: '0' },
  cell: { border: '1px solid #000', padding: '8px 12px', verticalAlign: 'top', fontSize: '11px' },
  headerCell: { border: '1px solid #000', padding: '15px', textAlign: 'center', fontSize: '12px' },
  strike: { textDecoration: 'line-through', color: '#888' }
};

export default function Form5Generator({ formData, onClose }) {
  const contentRef = useRef();
  const d = transformData(formData);
  
  if (!d) {
    return (
      <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060}}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header"><h5>Form 5</h5><button className="btn-close" onClick={onClose}></button></div>
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
      filename: `Form5_${d.docketNo || 'Patent'}.pdf`,
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
    link.download = `Form5_${d.docketNo || 'Patent'}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Show only actual inventors (no empty slots)
  const inventorSlots = d.inventors.filter(inv => inv.name && inv.name.trim() !== '');

  return (
    <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060}}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header bg-light sticky-top">
            <h5 className="modal-title">Form 5 Preview - {d.docketNo}</h5>
            <div className="d-flex gap-2  download-header">
              <button className="btn btn-danger btn-sm" onClick={downloadPDF}>Download PDF</button>
              <button className="btn btn-primary btn-sm" onClick={downloadDOCX}>Download DOCX</button>
              <button className="btn-close" onClick={onClose}></button>
            </div>
          </div>
          <div className="modal-body bg-secondary bg-opacity-10">
            <div ref={contentRef} style={styles.page}>
              
              {/* HEADER */}
              <table style={styles.table}>
                <tbody>
                  <tr>
                    <td colSpan="3" style={styles.headerCell}>
                      <p style={{margin: '0 0 10px 0', fontWeight: 'bold', fontSize: '14px'}}>FORM 5</p>
                      <p style={{margin: '5px 0'}}>THE PATENTS ACT, 1970</p>
                      <p style={{margin: '5px 0'}}>(39 of 1970)</p>
                      <p style={{margin: '5px 0'}}>and</p>
                      <p style={{margin: '5px 0'}}>THE PATENTS RULES, 2003</p>
                      <p style={{margin: '15px 0 5px 0', fontWeight: 'bold', fontSize: '13px'}}>DECLARATION AS TO INVENTORSHIP</p>
                      <p style={{margin: '5px 0', fontStyle: 'italic', fontSize: '10px'}}>[See section 10 (6) and rule 13 (6)]</p>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* SECTION 1 - APPLICANT TABLE */}
              <table style={{...styles.table, marginTop: '15px'}}>
                <tbody>
                  <tr>
                    <td style={{...styles.cell, fontWeight: 'bold', width: '30%'}}>1. Applicant Name</td>
                    <td style={{...styles.cell, fontWeight: 'bold', width: '35%'}}>Nationality</td>
                    <td style={{...styles.cell, fontWeight: 'bold', width: '35%'}}>Address</td>
                  </tr>
                  <tr>
                    <td style={styles.cell}>{d.applicantName}</td>
                    <td style={styles.cell}>{d.nationalityStatement}</td>
                    <td style={styles.cell}>{d.applicantAddress}</td>
                  </tr>
                </tbody>
              </table>

              {/* DECLARATION TEXT */}
              <table style={styles.table}>
                <tbody>
                  <tr>
                    <td style={{...styles.cell, borderTop: 'none', textAlign: 'justify', lineHeight: '1.8'}}>
                      <p style={{margin: 0}}>
                        hereby declare that the true and first inventor(s) of the invention disclosed in the complete specification filed in pursuance of our application numbered <span style={{textDecoration: 'underline'}}>_________________</span> dated <strong>{formatDateLong(d.filingDate)}</strong> is/are:
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* SECTION 2 - INVENTORS */}
              <table style={styles.table}>
                <tbody>
                  <tr>
                    <td colSpan="2" style={{...styles.cell, fontWeight: 'bold', backgroundColor: '#f5f5f5'}}>
                      2. INVENTOR(S)
                    </td>
                  </tr>
                  
                  {inventorSlots.length > 0 ? inventorSlots.map((inventor, idx) => (
                    <React.Fragment key={idx}>
                      <tr>
                        <td style={{...styles.cell, width: '20%'}}>(a) Name:</td>
                        <td style={styles.cell}><strong>{inventor.name}</strong></td>
                      </tr>
                      <tr>
                        <td style={styles.cell}>(b) Nationality:</td>
                        <td style={styles.cell}>{inventor.nationality ? `a citizen of ${inventor.nationality}` : ''}</td>
                      </tr>
                      <tr>
                        <td style={styles.cell}>(c) Address:</td>
                        <td style={styles.cell}>{inventor.address || ''}</td>
                      </tr>
                      {idx < inventorSlots.length - 1 && (
                        <tr>
                          <td colSpan="2" style={{...styles.cell, height: '5px', padding: '2px', backgroundColor: '#f9f9f9'}}></td>
                        </tr>
                      )}
                    </React.Fragment>
                  )) : (
                    <tr>
                      <td colSpan="2" style={styles.cell}>No inventors specified</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* SIGNATURE SECTION */}
              <table style={styles.table}>
                <tbody>
                  <tr>
                    <td style={{...styles.cell, width: '30%'}}></td>
                    <td style={styles.cell}>
                      <p style={{margin: '15px 0'}}><strong>Dated this {formatDateLong(d.filingDate)}</strong></p>
                      <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '20px'}}>
                        <tbody>
                          <tr>
                            <td style={{padding: '5px 0', width: '40%'}}>Signature:</td>
                            <td style={{padding: '5px 0', borderBottom: '1px solid #000'}}></td>
                          </tr>
                          <tr>
                            <td style={{padding: '5px 0'}}>Name of the signatory:</td>
                            <td style={{padding: '5px 0'}}><strong>{AGENT.nameUpper}</strong></td>
                          </tr>
                          <tr>
                            <td style={{padding: '5px 0'}}></td>
                            <td style={{padding: '5px 0'}}>(IN/PA No. {AGENT.regNo})</td>
                          </tr>
                          <tr>
                            <td style={{padding: '5px 0'}}></td>
                            <td style={{padding: '5px 0'}}>of {AGENT.firm}</td>
                          </tr>
                          <tr>
                            <td style={{padding: '5px 0'}}></td>
                            <td style={{padding: '5px 0', fontWeight: 'bold'}}>AGENT FOR THE APPLICANT(S)</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* SECTION 3 - CONVENTION DECLARATION */}
              <table style={styles.table}>
                <tbody>
                  <tr>
                    <td style={{...styles.cell, width: '30%', fontWeight: 'bold', verticalAlign: 'top'}}>
                      3. DECLARATION TO BE GIVEN WHEN THE APPLICATION IN INDIA IS FILED BY THE APPLICANT(S) IN THE CONVENTION COUNTRY: -
                      <br/><br/>
                      We the applicant(s) in the convention country hereby declare that our right to apply for a patent in India is by way of assignment from the true and first inventor(s).
                    </td>
                    <td style={styles.cell}>
                      <p style={{margin: '20px 0'}}><strong>Dated this {formatDateLong(d.filingDate)}</strong></p>
                      <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '20px'}}>
                        <tbody>
                          <tr>
                            <td style={{padding: '5px 0', width: '40%'}}>Signature:</td>
                            <td style={{padding: '5px 0', borderBottom: '1px solid #000'}}></td>
                          </tr>
                          <tr>
                            <td style={{padding: '5px 0'}}>Name of the signatory:</td>
                            <td style={{padding: '5px 0'}}><strong>{AGENT.nameUpper}</strong></td>
                          </tr>
                          <tr>
                            <td style={{padding: '5px 0'}}></td>
                            <td style={{padding: '5px 0'}}>(IN/PA No. {AGENT.regNo})</td>
                          </tr>
                          <tr>
                            <td style={{padding: '5px 0'}}></td>
                            <td style={{padding: '5px 0'}}>of {AGENT.firm}</td>
                          </tr>
                          <tr>
                            <td style={{padding: '5px 0'}}></td>
                            <td style={{padding: '5px 0', fontWeight: 'bold'}}>AGENT FOR THE APPLICANT(S)</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* SECTION 4 - STATEMENT */}
              <table style={styles.table}>
                <tbody>
                  <tr>
                    <td style={{...styles.cell, width: '30%', verticalAlign: 'top'}}>
                      <p style={{margin: '0 0 10px 0'}}><strong>4. STATEMENT</strong> (to be signed by the additional inventor(s) not mentioned in the application form)</p>
                      <p style={{margin: '10px 0', ...styles.strike}}>
                        We assent to the invention referred to in the above declaration, being included in the complete specification filed in pursuance of the stated application.
                      </p>
                      <p style={{margin: '15px 0'}}>Dated this .......... day of ........, .......</p>
                      <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '15px'}}>
                        <tbody>
                          <tr>
                            <td style={{padding: '5px 0'}}>Signature of the additional inventor(s):</td>
                            <td style={{padding: '5px 0', borderBottom: '1px solid #000'}}></td>
                          </tr>
                          <tr>
                            <td style={{padding: '5px 0'}}>Name:</td>
                            <td style={{padding: '5px 0'}}>..............................</td>
                          </tr>
                        </tbody>
                      </table>
                      <div style={{marginTop: '30px'}}>
                        <p style={{margin: '5px 0'}}>To,</p>
                        <p style={{margin: '5px 0'}}>The Controller of Patents,</p>
                        <p style={{margin: '5px 0'}}>The Patent Office,</p>
                        <p style={{margin: '5px 0'}}>At <strong>{d.patentOffice}</strong></p>
                      </div>
                    </td>
                    <td style={styles.cell}></td>
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