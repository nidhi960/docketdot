import React, { useRef } from 'react';
import html2pdf from 'html2pdf.js';

// Utility Functions
const numberToWords = (num) => {
  if (!num || isNaN(num)) return 'Zero';
  const n = Math.abs(Math.floor(num));
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (n === 0) return 'Zero';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numberToWords(n % 100) : '');
  if (n < 100000) return numberToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numberToWords(n % 1000) : '');
  if (n < 10000000) return numberToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numberToWords(n % 100000) : '');
  return numberToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numberToWords(n % 10000000) : '');
};

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

// Static Agent Details (Always same)
const AGENT = {
  name: 'Amit Aswal',
  nameUpper: 'AMIT ASWAL',
  regNo: 'IN/PA-2XXX',
  firm: 'ANOVIP CONSULTANTS LLP',
  address: 'B-1/123, Example Street, New Delhi - 110001',
  phone: 'XXXXXXXX',
  mobile: '+91-XXXXXXXXXX',
  fax: 'XXXXXXXX',
  email: 'patents@anovip.com'
};

const PATENT_OFFICES = {
  'New Delhi': 'NEW DELHI',
  'Mumbai': 'MUMBAI',
  'Kolkata': 'KOLKATA',
  'Chennai': 'CHENNAI'
};

// Transform database data to Form1 format
const transformData = (dbData) => {
  if (!dbData) return null;
  
  const appType = dbData.application_type || '';
  const appCategory = dbData.applicant_category || '';
  
  return {
    // Basic Info
    docketNo: dbData.DOC_NO?.trim() || '',
    jurisdiction: dbData.jurisdiction || '',
    patentOffice: PATENT_OFFICES[dbData.jurisdiction] || 'NEW DELHI',
    
    // Application Type
    applicationType: appType,
    isConvention: appType === 'CONVENTION',
    isPCT: appType === 'PCT-NATIONAL-PHASE',
    
    // Applicant Category
    applicantCategory: appCategory,
    isNaturalPerson: appCategory === 'Natural',
    isSmallEntity: appCategory === 'Small',
    isStartup: appCategory === 'Start',
    isEducation: appCategory === 'education',
    isOther: appCategory === 'Other',
    
    // Title
    inventionTitle: dbData.title || '',
    
    // Applicants
    applicants: (dbData.applicants || []).map(a => ({
      name: a.name || '',
      nationality: a.nationality || '',
      residence: a.residence_country || '',
      address: a.address || ''
    })),
    
    // Inventors
    inventorsSameAsApplicant: dbData.inventors_same_as_applicant === 'yes',
    inventors: (dbData.inventors || []).map(i => ({
      name: i.name || '',
      nationality: i.citizen_country || '',
      residence: i.residence_country || '',
      address: i.address || ''
    })),
    
    // Priority
    claimingPriority: dbData.claiming_priority === 'yes',
    priorities: (dbData.priorities || []).map(p => ({
      country: p.country || '',
      appNo: p.priority_no || '',
      date: formatDate(p.priority_date),
      applicantName: p.applicant_name || '',
      title: p.title_in_priority || ''
    })),
    
    // PCT Info
    internationalAppNo: dbData.inter_appli_no || '',
    internationalFilingDate: formatDate(dbData.inter_filing_date),
    
    // Page counts
    descriptionPages: Number(dbData.descrip_of_page) || 0,
    claimPages: Number(dbData.claims_page) || 0,
    drawingPages: Number(dbData.drawing_page) || 0,
    abstractPages: Number(dbData.abstract_page) || 1,
    form2Pages: Number(dbData.form_2_page) || 1,
    sumPages: Number(dbData.sum_number_of_page) || 0,
    totalPages: Number(dbData.total_pages) || 0,
    numberOfDrawings: Number(dbData.number_of_drawing) || 0,
    numberOfClaims: Number(dbData.number_of_claims) || 0,
    numberOfPriorities: Number(dbData.number_of_priorities) || 0,
    
    // Fees
    basicFee: Number(dbData.basic_fee) || 0,
    extraPages: Number(dbData.no_of_extra_page) || 0,
    extraPagesFee: Number(dbData.extra_page_charge) || 0,
    extraClaims: Number(dbData.no_of_extra_claims) || 0,
    extraClaimsFee: Number(dbData.extra_claims_charge) || 0,
    extraPriorities: Number(dbData.no_of_extra_priorities) || 0,
    extraPrioritiesFee: Number(dbData.extra_priorities_charge) || 0,
    
    // Examination
    requestExamination: dbData.request_examination === 'yes',
    examinationFee: Number(dbData.examination_charge) || 0,
    
    // Sequence
    hasSequence: dbData.sequence_listing === 'yes',
    sequencePages: Number(dbData.sequence_page) || 0,
    sequenceFee: Number(dbData.sequence_charge) || 0,
    
    // Deposit
    depositDate: dbData.deposit_date || '',
    totalFee: Number(dbData.deposit_fee) || 0
  };
};

const styles = {
  page: { fontFamily: 'Times New Roman, serif', fontSize: '11px', lineHeight: '1.4', padding: '20px', background: 'white', maxWidth: '210mm', margin: '0 auto' },
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: '8px' },
  cell: { border: '1px solid #000', padding: '4px 6px', verticalAlign: 'top', fontSize: '10px' },
  headerCell: { border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold', backgroundColor: '#f5f5f5', fontSize: '10px' },
  sectionHeader: { fontWeight: 'bold', padding: '6px', border: '1px solid #000', backgroundColor: '#f9f9f9' },
  checkbox: { display: 'inline-block', width: '12px', height: '12px', border: '1px solid #000', marginRight: '4px', textAlign: 'center', lineHeight: '10px', fontSize: '10px' },
  strike: { textDecoration: 'line-through', color: '#888' }
};

const Chk = ({ checked, label, strike }) => (
  <span style={strike ? styles.strike : {}}>
    <span style={styles.checkbox}>{checked ? '√' : ''}</span> {label}
  </span>
);

export default function Form1Generator({ formData, onClose }) {
  const contentRef = useRef();
  const d = transformData(formData);
  
  // If no data, show message
  if (!d) {
    return (
      <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060}}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5>Form 1</h5>
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
      filename: `Form1_${d.docketNo || 'Patent'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        scrollY: 0,
        windowWidth: element.scrollWidth
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' 
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    
    html2pdf().set(opt).from(element).save();
  };

  const downloadDOCX = () => {
    const content = contentRef.current.innerHTML;
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><style>body{font-family:'Times New Roman',serif;font-size:11pt}table{width:100%;border-collapse:collapse}td,th{border:1px solid #000;padding:5px;font-size:10pt}</style></head>
      <body>${content}</body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Form1_${d.docketNo || 'Patent'}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Get first applicant for display
  const firstApplicant = d.applicants[0] || { name: '', nationality: '', address: '' };

  return (
    <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060}}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header bg-light sticky-top">
            <h5 className="modal-title">Form 1 Preview - {d.docketNo}</h5>
            <div className="d-flex gap-2 download-header">
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
                    <td style={{...styles.cell, width: '70%', textAlign: 'center'}} rowSpan="6">
                      <h2 style={{margin: '5px 0', fontSize: '16px'}}>FORM 1</h2>
                      <p style={{margin: '3px 0'}}>THE PATENTS ACT 1970</p>
                      <p style={{margin: '3px 0'}}>(39 of 1970)</p>
                      <p style={{margin: '3px 0'}}>and</p>
                      <p style={{margin: '3px 0'}}>THE PATENTS RULES, 2003</p>
                      <p style={{margin: '8px 0', fontWeight: 'bold'}}>APPLICATION FOR GRANT OF PATENT</p>
                      <p style={{margin: '3px 0', fontStyle: 'italic', fontSize: '9px'}}>[See Section 7, 54 and 135 and sub-rule (1) of rule 20]</p>
                    </td>
                    <td colSpan="2" style={{...styles.headerCell, textAlign: 'center'}}>(FOR OFFICE USE ONLY)</td>
                  </tr>
                  <tr><td style={styles.cell}>Application No.:</td><td style={styles.cell}></td></tr>
                  <tr><td style={styles.cell}>Filing Date:</td><td style={styles.cell}></td></tr>
                  <tr><td style={styles.cell}>Amount of Fee paid:</td><td style={styles.cell}></td></tr>
                  <tr><td style={styles.cell}>CBR No.:</td><td style={styles.cell}></td></tr>
                  <tr><td style={styles.cell}>Signature:</td><td style={styles.cell}></td></tr>
                </tbody>
              </table>

              {/* 1. REFERENCE */}
              <table style={styles.table}>
                <tbody>
                  <tr>
                    <td style={{...styles.cell, width: '70%'}}><strong>1. APPLICANT'S REFERENCE / IDENTIFICATION NO. (AS ALLOTTED BY OFFICE)</strong></td>
                    <td style={styles.cell}>{d.docketNo}</td>
                  </tr>
                </tbody>
              </table>

              {/* 2. TYPE OF APPLICATION */}
              <table style={styles.table}>
                <tbody>
                  <tr><td colSpan="4" style={styles.sectionHeader}>2. TYPE OF APPLICATION [Please tick (√) at the appropriate category]</td></tr>
                  <tr>
                    <td style={styles.cell}><Chk checked={!d.isConvention && !d.isPCT} label="Ordinary" /></td>
                    <td style={styles.cell}><Chk checked={d.isConvention} label="Convention" /></td>
                    <td style={styles.cell}><Chk checked={d.isPCT} label="PCT-NP" /></td>
                    <td style={styles.cell}><Chk checked={false} label="PPH" /></td>
                  </tr>
                  <tr>
                    <td style={styles.cell}><Chk checked={false} label="Divisional" /></td>
                    <td style={styles.cell}><Chk checked={false} label="Patent of Addition" /></td>
                    <td style={styles.cell}><Chk checked={false} label="Divisional" /></td>
                    <td style={styles.cell}><Chk checked={false} label="Patent of Addition" /></td>
                  </tr>
                </tbody>
              </table>

              {/* 3A. APPLICANTS */}
              <table style={styles.table}>
                <tbody>
                  <tr><td colSpan="6" style={styles.sectionHeader}>3A. APPLICANT(S)</td></tr>
                  <tr>
                    <td style={styles.headerCell}>Name in Full</td>
                    <td style={styles.headerCell}>Gender (optional)</td>
                    <td style={styles.headerCell}>Nationality</td>
                    <td style={styles.headerCell}>Country of Residence</td>
                    <td style={styles.headerCell}>Age (optional)</td>
                    <td style={styles.headerCell}>Address of the Applicant</td>
                  </tr>
                  {d.applicants.map((app, i) => (
                    <tr key={i}>
                      <td style={styles.cell}><strong>{app.name}</strong></td>
                      <td style={styles.cell}>Prefer not to disclose</td>
                      <td style={styles.cell}>{d.isNaturalPerson ? `a citizen of ${app.nationality}` : `a company organized and existing under the laws of ${app.nationality}`}</td>
                      <td style={styles.cell}>{app.residence || app.nationality}</td>
                      <td style={styles.cell}>Prefer not to disclose</td>
                      <td style={styles.cell}>
                        <div>{app.address}</div>
                        <div style={{marginTop: '4px'}}><strong>Email:</strong> {AGENT.email}</div>
                        <div><strong>Contact:</strong> {AGENT.mobile}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 3B. CATEGORY */}
              <table style={styles.table}>
                <tbody>
                  <tr><td colSpan="4" style={styles.sectionHeader}>3B. CATEGORY OF APPLICANT [Please tick (√) at the appropriate category]</td></tr>
                  <tr>
                    <td style={styles.cell}><Chk checked={d.isNaturalPerson} label="Natural Person" /></td>
                    <td style={styles.cell} colSpan="2">
                      Other than Natural Person: <Chk checked={d.isSmallEntity} label="Small Entity" /> <Chk checked={d.isStartup} label="Startup" /> <Chk checked={d.isOther} label="Other" />
                    </td>
                    <td style={styles.cell}><Chk checked={d.isEducation} label="Educational Institution" /></td>
                  </tr>
                </tbody>
              </table>

              {/* 4. INVENTORS */}
              <table style={styles.table}>
                <tbody>
                  <tr><td colSpan="6" style={styles.sectionHeader}>4. INVENTOR(S) [Please tick (√) at the appropriate category]</td></tr>
                  <tr>
                    <td style={styles.cell} colSpan="4">Are all the inventor(s) same as the applicant(s) named above?</td>
                    <td style={styles.cell}><Chk checked={d.inventorsSameAsApplicant} label="Yes" /></td>
                    <td style={styles.cell}><Chk checked={!d.inventorsSameAsApplicant} label="No" /></td>
                  </tr>
                  {!d.inventorsSameAsApplicant && (
                    <>
                      <tr><td colSpan="6" style={styles.cell}><strong>If "No",</strong> furnish the details of the inventor(s)</td></tr>
                      <tr>
                        <td style={styles.headerCell}>Name in Full</td>
                        <td style={styles.headerCell}>Gender</td>
                        <td style={styles.headerCell}>Nationality</td>
                        <td style={styles.headerCell}>Age</td>
                        <td style={styles.headerCell}>Country of Residence</td>
                        <td style={styles.headerCell}>Address</td>
                      </tr>
                      {d.inventors.map((inv, i) => (
                        <tr key={i}>
                          <td style={styles.cell}><strong>{inv.name}</strong></td>
                          <td style={styles.cell}>Prefer not to disclose</td>
                          <td style={styles.cell}>a citizen of {inv.nationality}</td>
                          <td style={styles.cell}>Prefer not to disclose</td>
                          <td style={styles.cell}>{inv.residence || inv.nationality}</td>
                          <td style={styles.cell}>{inv.address}</td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>

              {/* 5. TITLE */}
              <table style={styles.table}>
                <tbody>
                  <tr><td style={styles.sectionHeader}>5. TITLE OF THE INVENTION</td></tr>
                  <tr><td style={{...styles.cell, padding: '10px', fontWeight: 'bold'}}>"{d.inventionTitle}"</td></tr>
                </tbody>
              </table>

              {/* 6. AGENT */}
              <table style={styles.table}>
                <tbody>
                  <tr><td colSpan="2" style={styles.sectionHeader}>6. AUTHORISED REGISTERED PATENT AGENT(S)</td></tr>
                  <tr><td style={{...styles.cell, width: '40%'}}>IN/PA No.</td><td style={styles.cell}>{AGENT.regNo}</td></tr>
                  <tr><td style={styles.cell}>Name</td><td style={styles.cell}>{AGENT.name}</td></tr>
                  <tr><td style={styles.cell}>Mobile No. (OTP verification mandatory - will be redacted)</td><td style={styles.cell}>{AGENT.mobile}</td></tr>
                </tbody>
              </table>

              {/* 7. ADDRESS FOR SERVICE */}
              <table style={styles.table}>
                <tbody>
                  <tr><td colSpan="2" style={styles.sectionHeader}>7. ADDRESS FOR SERVICE OF APPLICANT IN INDIA</td></tr>
                  <tr><td style={{...styles.cell, width: '40%'}}>Name</td><td style={styles.cell}><strong>{AGENT.firm}</strong><br/>{AGENT.address}</td></tr>
                  <tr><td style={styles.cell}>Telephone No.</td><td style={styles.cell}>011-{AGENT.phone}</td></tr>
                  <tr><td style={styles.cell}>Mobile No.</td><td style={styles.cell}>{AGENT.mobile}</td></tr>
                  <tr><td style={styles.cell}>Fax No.</td><td style={styles.cell}>011-{AGENT.fax}</td></tr>
                  <tr><td style={styles.cell}>E-mail ID</td><td style={styles.cell}>{AGENT.email}</td></tr>
                </tbody>
              </table>

              {/* 8. CONVENTION PRIORITY */}
              <table style={styles.table}>
                <tbody>
                  <tr><td colSpan="6" style={styles.sectionHeader}>8. IN CASE OF APPLICATION CLAIMING PRIORITY OF APPLICATION FILED IN CONVENTION COUNTRY, PARTICULARS OF CONVENTION APPLICATION</td></tr>
                  <tr>
                    <td style={styles.headerCell}>Country</td>
                    <td style={styles.headerCell}>Application Number</td>
                    <td style={styles.headerCell}>Filing Date</td>
                    <td style={styles.headerCell}>Name of Applicant</td>
                    <td style={styles.headerCell}>Title of the invention</td>
                    <td style={styles.headerCell}>IPC</td>
                  </tr>
                  {d.claimingPriority && d.priorities.length > 0 ? d.priorities.map((p, i) => (
                    <tr key={i}>
                      <td style={styles.cell}><strong>{p.country}</strong></td>
                      <td style={styles.cell}><strong>{p.appNo}</strong></td>
                      <td style={styles.cell}><strong>{p.date}</strong></td>
                      <td style={styles.cell}><strong>{p.applicantName || firstApplicant.name}</strong></td>
                      <td style={styles.cell}><strong>{p.title || d.inventionTitle}</strong></td>
                      <td style={styles.cell}></td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6" style={styles.cell}>-</td></tr>
                  )}
                </tbody>
              </table>

              {/* 9. PCT */}
              <table style={styles.table}>
                <tbody>
                  <tr><td colSpan="2" style={styles.sectionHeader}>9. IN CASE OF PCT NATIONAL PHASE APPLICATION, PARTICULARS OF INTERNATIONAL APPLICATION FILED UNDER PATENT CO-OPERATION TREATY (PCT)</td></tr>
                  <tr><td style={styles.cell}>International application number</td><td style={styles.cell}>{d.isPCT ? d.internationalAppNo : '-'}</td></tr>
                  <tr><td style={styles.cell}>International Filing Date</td><td style={styles.cell}>{d.isPCT ? d.internationalFilingDate : '-'}</td></tr>
                </tbody>
              </table>

              {/* 10. DIVISIONAL */}
              <table style={styles.table}>
                <tbody>
                  <tr><td colSpan="2" style={styles.sectionHeader}>10. IN CASE OF DIVISIONAL APPLICATION FILED UNDER SECTION 16, PARTICULARS OF ORIGINAL (FIRST) APPLICATION</td></tr>
                  <tr><td style={styles.cell}>Original (first) application No.</td><td style={styles.cell}>-</td></tr>
                  <tr><td style={styles.cell}>Date of filing of original (first) application</td><td style={styles.cell}>-</td></tr>
                </tbody>
              </table>

              {/* 11. PATENT OF ADDITION */}
              <table style={styles.table}>
                <tbody>
                  <tr><td colSpan="2" style={styles.sectionHeader}>11. IN CASE OF PATENT OF ADDITION FILED UNDER SECTION 54, PARTICULARS OF MAIN APPLICATION OR PATENT</td></tr>
                  <tr><td style={styles.cell}>Main application/patent No.</td><td style={styles.cell}>-</td></tr>
                  <tr><td style={styles.cell}>Date of filing of main application</td><td style={styles.cell}>-</td></tr>
                </tbody>
              </table>

              {/* 12. DECLARATIONS */}
              <table style={styles.table}>
                <tbody>
                  <tr><td colSpan="3" style={styles.sectionHeader}>12. DECLARATIONS</td></tr>
                  <tr>
                    <td colSpan="3" style={styles.cell}>
                      <p><strong>(i) Declaration by the inventor(s)</strong></p>
                      <p style={{fontSize: '9px'}}><strong>(In case the applicant is an assignee:</strong> the inventor(s) may sign herein below or the applicant may upload the assignment or enclose the assignment with this application for patent or send the assignment by post/electronic transmission duly authenticated within the prescribed period).</p>
                      <p>We, the above named inventor(s) are the true & first inventor(s) for this Invention and declare that the applicant(s) herein are our assignee or legal representative.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style={styles.headerCell}>Name(s)</td>
                    <td style={styles.headerCell}>Signature(s)</td>
                    <td style={styles.headerCell}>Date</td>
                  </tr>
                  {(d.inventorsSameAsApplicant ? d.applicants : d.inventors).map((inv, i) => (
                    <tr key={i}>
                      <td style={styles.cell}><strong>{inv.name}</strong></td>
                      <td style={styles.cell}></td>
                      <td style={styles.cell}></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* DECLARATION BY APPLICANTS */}
              <table style={styles.table}>
                <tbody>
                  <tr>
                    <td style={styles.cell}>
                      <p><strong>(iii) Declaration by the applicant(s):</strong></p>
                      <p>We the applicant(s) hereby declare(s) that: -</p>
                      <div style={{marginLeft: '20px', lineHeight: '1.8'}}>
                        <p><Chk checked={true} /> We are in possession of the above-mentioned invention.</p>
                        <p><Chk checked={true} /> The <span style={styles.strike}>provisional</span>/complete specification relating to the invention is filed with this application.</p>
                        <p style={styles.strike}><Chk checked={false} /> The invention as disclosed in the specification uses the biological material from India...</p>
                        <p><Chk checked={true} /> There is no lawful ground of objection(s) to the grant of the Patent to us.</p>
                        <p style={styles.strike}><Chk checked={false} /> We are the true & first inventor(s).</p>
                        <p><Chk checked={!d.inventorsSameAsApplicant} /> We are the assignee or legal representative of true & first inventor(s).</p>
                        {d.isConvention && (
                          <>
                            <p><Chk checked={true} /> The application or each of the applications, particulars of which are given in Paragraph-8, was the first application in convention country/countries in respect of our invention(s).</p>
                            <p><Chk checked={true} /> We claim the priority from the above mentioned application(s) filed in convention country/countries and state that no application for protection in respect of the invention had been made in a convention country before that date by us or by any person from which We derive the title.</p>
                          </>
                        )}
                        {d.isPCT && <p><Chk checked={true} /> Our application in India is based on international application under Patent Cooperation Treaty (PCT) as mentioned in Paragraph-9.</p>}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 13. ATTACHMENTS */}
              <table style={styles.table}>
                <tbody>
                  <tr><td colSpan="4" style={styles.sectionHeader}>13. FOLLOWING ARE THE ATTACHMENTS WITH THE APPLICATION</td></tr>
                  <tr><td colSpan="4" style={styles.cell}><strong>(a) Form 2</strong></td></tr>
                  <tr>
                    <td style={styles.headerCell}>Item</td>
                    <td style={styles.headerCell}>Details</td>
                    <td style={styles.headerCell}>Fee</td>
                    <td style={styles.headerCell}>Remarks</td>
                  </tr>
                  <tr>
                    <td style={styles.cell}>Complete/<span style={styles.strike}>provisional</span> specification (description only)</td>
                    <td style={styles.cell}>No. of pages: <strong>{d.descriptionPages}</strong><br/>Form 2 page: <strong>{d.form2Pages}</strong></td>
                    <td style={styles.cell}>INR {d.basicFee}<br/>INR {d.extraPagesFee}</td>
                    <td style={styles.cell}>Application Fee<br/>Fee For Extra <strong>{d.extraPages}</strong> Pages</td>
                  </tr>
                  <tr>
                    <td style={styles.cell}>No. of Claim(s)</td>
                    <td style={styles.cell}>No. of claims: <strong>{d.numberOfClaims}</strong><br/>No. of pages: <strong>{d.claimPages}</strong></td>
                    <td style={styles.cell}>INR {d.extraClaimsFee}</td>
                    <td style={styles.cell}>Fee For Extra <strong>{d.extraClaims}</strong> claims</td>
                  </tr>
                  <tr>
                    <td style={styles.cell}>Abstract</td>
                    <td style={styles.cell}>No. of page: <strong>{d.abstractPages}</strong></td>
                    <td style={styles.cell}>INR 0</td>
                    <td style={styles.cell}>Fee For Extra <strong>{d.extraPriorities}</strong> priority</td>
                  </tr>
                  <tr>
                    <td style={styles.cell}>No. of Drawing(s)</td>
                    <td style={styles.cell}>No. of drawings: <strong>{d.numberOfDrawings}</strong> and No. of pages: <strong>{d.drawingPages}</strong></td>
                    <td style={styles.cell}>INR {d.examinationFee}<br/>INR {d.sequenceFee}</td>
                    <td style={styles.cell}>Fee For Examination<br/>Fee For Sequence Listing</td>
                  </tr>
                  <tr>
                    <td colSpan="2" style={styles.cell}></td>
                    <td style={{...styles.cell, fontWeight: 'bold'}}>INR {d.totalFee}</td>
                    <td style={{...styles.cell, fontWeight: 'bold'}}>TOTAL FEE</td>
                  </tr>
                </tbody>
              </table>

              {/* OTHER ATTACHMENTS */}
              <table style={styles.table}>
                <tbody>
                  <tr>
                    <td style={styles.cell}>
                      <p>(b) Complete Specification comprising, No. of Claims – {d.numberOfClaims} ({numberToWords(d.numberOfClaims)}) with No. of Pages – {d.totalPages} ({numberToWords(d.totalPages)})</p>
                      <p>(c) Drawings - No. of sheets – {d.drawingPages} ({numberToWords(d.drawingPages)})</p>
                      <p>(d) Statement and undertaking on Form 3</p>
                      <p>(e) Declaration of inventorship on Form 5</p>
                      {d.requestExamination && <p>(f) Request for Examination on Form 18</p>}
                      {d.claimingPriority && <p>(g) Copy of certified Priority Document</p>}
                      <p>(h) Copy of executed Form 1/Copy of deed of Assignment</p>
                      {d.claimingPriority && <p>(i) Verified English translation of Priority document</p>}
                      {d.claimingPriority && <p>(j) Submission of DAS code (****)</p>}
                      <p>(k) Copy of General Power of Authority.</p>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* FINAL DECLARATION */}
              <div style={{marginTop: '15px', padding: '10px', border: '1px solid #000'}}>
                <p><strong>Deposit of Total fee INR {d.totalFee}/- ({numberToWords(d.totalFee)} only) - via electronic transfer.</strong></p>
                <p style={{marginTop: '10px'}}>We hereby declare that to the best of our knowledge, information and belief the fact and matters stated herein are correct and We request that a patent may be granted to us for the said invention.</p>
                <p style={{marginTop: '15px'}}>Dated this {formatDateLong(d.depositDate)},</p>
                
                <div style={{marginTop: '30px', textAlign: 'right', paddingRight: '50px'}}>
                  <p>Signature: _______________________</p>
                  <p>Name of the signatory: <strong>{AGENT.nameUpper}</strong></p>
                  <p>(IN/PA No. {AGENT.regNo})</p>
                  <p>of {AGENT.firm}</p>
                  <p><strong>AGENT FOR THE APPLICANT(S)</strong></p>
                </div>
                
                <div style={{marginTop: '30px'}}>
                  <p>To,</p>
                  <p>The Controller of Patents</p>
                  <p>The Patent Office,</p>
                  <p>At <strong>{d.patentOffice}</strong></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}