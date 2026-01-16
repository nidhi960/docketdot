import React, { useRef } from 'react';
import html2pdf from 'html2pdf.js';

const formatDateLong = (dateStr) => {
  if (!dateStr) return '.......... day of ........, .......';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '.......... day of ........, .......';
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
  
  return {
    docketNo: dbData.DOC_NO?.trim() || '',
    patentOffice: PATENT_OFFICES[dbData.jurisdiction] || 'NEW DELHI',
    filingDate: dbData.deposit_date || '',
    applicants: (dbData.applicants || []).map(a => ({
      name: a.name || '',
      nationality: a.nationality || '',
      address: a.address || ''
    })),
  };
};

const styles = {
  page: { fontFamily: 'Times New Roman, serif', fontSize: '12px', lineHeight: '1.6', padding: '40px 50px', background: 'white', maxWidth: '210mm', margin: '0 auto' },
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: '0' },
  cell: { border: '1px solid #000', padding: '20px 25px', verticalAlign: 'top', fontSize: '12px' },
  headerCell: { border: '1px solid #000', padding: '20px', textAlign: 'center', fontSize: '12px' },
};

export default function Form9Generator({ formData, onClose }) {
  const contentRef = useRef();
  const d = transformData(formData);
  
  if (!d) {
    return (
      <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060}}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header"><h5>Form 9</h5><button className="btn-close" onClick={onClose}></button></div>
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
      filename: `Form9_${d.docketNo || 'Patent'}.pdf`,
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
      <head><meta charset='utf-8'><style>body{font-family:'Times New Roman',serif;font-size:12pt}table{width:100%;border-collapse:collapse}td,th{border:1px solid #000;padding:20px;font-size:12pt}</style></head>
      <body>${content}</body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Form9_${d.docketNo || 'Patent'}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060}}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header bg-light sticky-top">
            <h5 className="modal-title">Form 9 Preview - {d.docketNo}</h5>
            <div className="d-flex gap-2 download-header">
              <button className="btn btn-danger btn-sm" onClick={downloadPDF}>Download PDF</button>
              <button className="btn btn-primary btn-sm" onClick={downloadDOCX}>Download DOCX</button>
              <button className="btn-close" onClick={onClose}></button>
            </div>
          </div>
          <div className="modal-body bg-secondary bg-opacity-10">
            <div ref={contentRef} style={styles.page}>
              
              {/* MAIN TABLE - SINGLE BORDERED BOX */}
              <table style={styles.table}>
                <tbody>
                  {/* HEADER SECTION */}
                  <tr>
                    <td style={styles.headerCell}>
                      <p style={{margin: '0 0 15px 0', fontWeight: 'bold', fontSize: '14px'}}>FORM 9</p>
                      <p style={{margin: '5px 0'}}>THE PATENTS ACT, 1970</p>
                      <p style={{margin: '5px 0'}}>(39 of 1970)</p>
                      <p style={{margin: '5px 0'}}>and</p>
                      <p style={{margin: '5px 0'}}>THE PATENTS RULES, 2003</p>
                      <p style={{margin: '20px 0 5px 0', fontWeight: 'bold', fontSize: '13px'}}>REQUEST FOR PUBLICATION</p>
                      <p style={{margin: '5px 0', fontStyle: 'italic', fontSize: '11px'}}>[See section 11A (2); rule 24A]</p>
                    </td>
                  </tr>

                  {/* BODY CONTENT */}
                  <tr>
                    <td style={{...styles.cell, borderTop: 'none', textAlign: 'left', lineHeight: '2'}}>
                      <p style={{margin: '20px 0'}}>We,</p>
                      
                      {/* APPLICANT(S) LIST */}
                      <div style={{margin: '15px 0 25px 30px'}}>
                        {d.applicants.length > 0 ? d.applicants.map((applicant, index) => (
                          <div key={index} style={{marginBottom: index < d.applicants.length - 1 ? '12px' : '0'}}>
                            <p style={{margin: '0 0 3px 0', fontWeight: 'bold'}}>{index + 1}. {applicant.name}</p>
                            {applicant.nationality && (
                              <p style={{margin: '0 0 2px 20px', fontSize: '11px'}}>
                                Nationality: {applicant.nationality}
                              </p>
                            )}
                            {applicant.address && (
                              <p style={{margin: '0 0 2px 20px', fontSize: '11px'}}>
                                Address: {applicant.address}
                              </p>
                            )}
                          </div>
                        )) : (
                          <p style={{margin: 0, fontStyle: 'italic', color: '#666'}}>[Applicant details not provided]</p>
                        )}
                      </div>
                      
                      <p style={{margin: '20px 0', textAlign: 'justify'}}>
                        hereby request for early publication of our Patent application number <span style={{textDecoration: 'underline'}}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span> dated <strong>{formatDateLong(d.filingDate)}</strong> under section 11A(2) of the Act.
                      </p>

                      {/* SIGNATURE SECTION */}
                      <div style={{marginTop: '40px'}}>
                        <p style={{margin: '15px 0'}}><strong>Dated {formatDateLong(d.filingDate)}</strong></p>
                        
                        <table style={{width: '60%', borderCollapse: 'collapse', marginTop: '30px', marginLeft: 'auto'}}>
                          <tbody>
                            <tr>
                              <td style={{padding: '8px 0', width: '40%'}}>Signature:</td>
                              <td style={{padding: '8px 0', borderBottom: '1px solid #000'}}></td>
                            </tr>
                            <tr>
                              <td style={{padding: '8px 0'}}>Name of the signatory:</td>
                              <td style={{padding: '8px 0'}}><strong>{AGENT.nameUpper}</strong></td>
                            </tr>
                            <tr>
                              <td style={{padding: '8px 0'}}></td>
                              <td style={{padding: '8px 0'}}>(IN/PA No. {AGENT.regNo})</td>
                            </tr>
                            <tr>
                              <td style={{padding: '8px 0'}}></td>
                              <td style={{padding: '8px 0'}}>of {AGENT.firm}</td>
                            </tr>
                            <tr>
                              <td style={{padding: '8px 0'}}></td>
                              <td style={{padding: '8px 0', fontWeight: 'bold'}}>AGENT FOR THE APPLICANT(S)</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* ADDRESSEE SECTION */}
                      <div style={{marginTop: '50px'}}>
                        <p style={{margin: '5px 0'}}>To,</p>
                        <p style={{margin: '5px 0'}}>The Controller of Patents,</p>
                        <p style={{margin: '5px 0'}}>The Patent Office,</p>
                        <p style={{margin: '5px 0'}}>At <strong>{d.patentOffice}</strong></p>
                      </div>
                    </td>
                  </tr>

                  {/* EMPTY BOTTOM ROW (as in original doc) */}
                  <tr>
                    <td style={{...styles.cell, borderTop: 'none', height: '20px'}}></td>
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