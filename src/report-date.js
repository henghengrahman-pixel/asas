// Reporting period is a single calendar day in the panel's configured timezone.
// Default WIB; accepts standard IANA zones such as Asia/Makassar.
export function reportDate(now=new Date(),timeZone=process.env.REPORT_TIMEZONE||'Asia/Jakarta'){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone,day:'2-digit',month:'2-digit',year:'numeric'}).formatToParts(now);
  const values=Object.fromEntries(parts.filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  return `${values.day}-${values.month}-${values.year}`;
}
