import React, { useRef } from 'react';
import html2pdf from 'html2pdf.js';
const transformData = (dbData) => {
  if (!dbData) return null;
  
  return {
    docketNo: dbData.DOC_NO?.trim() || '',
    inventionTitle: dbData.title || '',
    applicants: (dbData.applicants || []).map(a => ({
      name: a.name || '',
      nationality: a.nationality || '',
      residence: a.residence_country || '',
      address: a.address || ''
    })),
  };
};

const styles = {
  page: {
    fontFamily: 'Times New Roman, serif',
    fontSize: '12px',
    lineHeight: '1.6',
    padding: '40px 50px',
    background: 'white',
    maxWidth: '210mm',
    minHeight: '297mm',
    margin: '0 auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '0',
  },
  cell: {
    border: '1px solid #000',
    padding: '15px 20px',
    verticalAlign: 'top',
    fontSize: '12px',
  },
  headerCell: {
    border: '1px solid #000',
    padding: '25px 20px',
    textAlign: 'center',
    fontSize: '14px',
  },
  sectionHeader: {
    border: '1px solid #000',
    padding: '12px 20px',
    fontWeight: 'bold',
    fontSize: '12px',
  }
};

export default function Form2Generator({ formData, onClose }) {
  const contentRef = useRef();
  const d = transformData(formData);
  
  if (!d) {
    return (
      <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060}}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5>Form 2</h5>
              <button className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body text-center p-5">
              <p>No application data available.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

const downloadPDF = () => {
    const element = contentRef.current;
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Form2_${d.docketNo || 'Patent'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
};

  const downloadDOCX = () => {
    const content = contentRef.current.innerHTML;
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><style>body{font-family:'Times New Roman',serif;font-size:12pt}table{width:100%;border-collapse:collapse}td,th{border:1px solid #000;padding:15px;font-size:12pt}</style></head>
      <body>${content}</body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Form2_${d.docketNo || 'Patent'}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060}}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header bg-light sticky-top">
            <h5 className="modal-title">Form 2 Preview - {d.docketNo}</h5>
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
                  {/* HEADER SECTION */}
                  <tr>
                    <td style={styles.headerCell}>
                      <h2 style={{margin: '10px 0', fontSize: '18px', fontWeight: 'bold', letterSpacing: '8px'}}>F O R M 2</h2>
                      <p style={{margin: '15px 0 5px 0', fontWeight: 'bold'}}>THE PATENTS ACT, 1970</p>
                      <p style={{margin: '5px 0', fontWeight: 'bold'}}>(39 of 1970)</p>
                      <p style={{margin: '10px 0', fontWeight: 'bold', fontSize: '16px'}}>&amp;</p>
                      <p style={{margin: '5px 0', fontWeight: 'bold'}}>THE PATENTS RULES, 2003</p>
                      <p style={{margin: '20px 0 10px 0', fontWeight: 'bold', fontSize: '16px'}}>COMPLETE SPECIFICATION</p>
                      <p style={{margin: '10px 0', fontStyle: 'italic', fontSize: '11px'}}>(See section 10 and rule 13)</p>
                    </td>
                  </tr>

                  {/* 1. TITLE OF THE INVENTION */}
                  <tr>
                    <td style={styles.sectionHeader}>
                      <span>1.</span>&nbsp;&nbsp;&nbsp;<strong>TITLE OF THE INVENTION</strong>
                    </td>
                  </tr>
                  <tr>
                    <td style={{...styles.cell, padding: '20px 25px'}}>
                      <p style={{margin: 0, fontWeight: 'bold', fontSize: '13px'}}>"{d.inventionTitle}"</p>
                    </td>
                  </tr>

                  {/* 2. APPLICANT(S) */}
                  <tr>
                    <td style={styles.sectionHeader}>
                      <span>2.</span>&nbsp;&nbsp;&nbsp;<strong>APPLICANT(s)</strong>
                    </td>
                  </tr>
                  <tr>
                    <td style={{...styles.cell, padding: '20px 25px'}}>
                      {d.applicants.map((applicant, index) => (
                        <div key={index} style={{marginBottom: index < d.applicants.length - 1 ? '15px' : '0'}}>
                          <p style={{margin: '0 0 5px 0', fontWeight: 'bold'}}>{applicant.name}</p>
                          {applicant.nationality && (
                            <p style={{margin: '0 0 3px 0', fontSize: '11px'}}>
                              Nationality: {applicant.nationality}
                            </p>
                          )}
                          {applicant.address && (
                            <p style={{margin: '0', fontSize: '11px'}}>
                              Address: {applicant.address}
                            </p>
                          )}
                        </div>
                      ))}
                    </td>
                  </tr>

                  {/* 3. PREAMBLE TO THE DESCRIPTION */}
                  <tr>
                    <td style={styles.sectionHeader}>
                      <span>3.</span>&nbsp;&nbsp;&nbsp;<strong>PREAMBLE TO THE DESCRIPTION</strong>
                    </td>
                  </tr>
                  <tr>
                    <td style={{...styles.cell, padding: '25px'}}>
                      <p style={{margin: '0 0 15px 0', fontWeight: 'bold', textAlign: 'center', fontSize: '13px'}}>COMPLETE SPECIFICATION</p>
                      <p style={{margin: 0, textAlign: 'justify', lineHeight: '1.8'}}>
                        The following specification particularly describes the invention and the manner in which it is to be performed.
                      </p>
                    </td>
                  </tr>

                </tbody>
              </table>

              {/* Additional space for specification content */}
              <div style={{marginTop: '30px', padding: '20px', border: '1px solid #000', minHeight: '200px'}}>
                <p style={{textAlign: 'center', color: '#666', fontStyle: 'italic'}}>
                  [Technical Field, Background, Summary, Detailed Description, Claims, Abstract to be added here]
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}