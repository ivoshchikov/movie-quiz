const fs = require('node:fs');
const path = require('node:path');

function contactDetailsApproved(details) {
  return details?.contactDetailsApproved === true &&
    typeof details.projectBrand === 'string' && !!details.projectBrand.trim() &&
    typeof details.contactEmail === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.contactEmail) &&
    !/[\r\n<>]/.test(details.projectBrand + details.contactEmail);
}
function requireApprovedContact(details = JSON.parse(fs.readFileSync(path.resolve('src/publicSiteDetails.json'),'utf8'))) {
  if (!contactDetailsApproved(details)) throw new Error('Public documents require owner-approved project wording and contact email before production publication.');
}
if (require.main === module) {
  try { requireApprovedContact(); console.log('Public document contact details are approved.'); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { contactDetailsApproved, requireApprovedContact };
