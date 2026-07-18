// Debug script to understand employer creation issues
// This simulates what happens when creating an employer record

// Sample data from the error
const sampleData = {
  company_name: "asdasd",
  contact_person: "asdasdads", 
  contact_email: "asd@gmail.com",
  contact_phone: "123123132",
  country: "sdsda",
  industry: "sadsdasda",
  billing_address: "",
  billing_email: "",
  billing_name: "",
  billing_notes: "",
  billing_phone: "",
  payment_terms: ""
};

console.log("Sample employer data being sent:");
console.log(JSON.stringify(sampleData, null, 2));

// Based on the migration files, the employer collection has:
// - company_name (required: false)
// - contact_person (required: false) 
// - contact_email (required: false)
// - contact_phone (required: false)
// - country (required: false)
// - industry (required: false)
// - billing fields (all required: false)

// The create rule from the latest migration:
// "@request.auth.id != '' && (@request.auth.role = 'administrator' || @request.auth.role = 'manager' || @request.auth.role = 'staff')"

console.log("\nPotential Issues:");
console.log("1. Authentication - User must be logged in with proper role");
console.log("2. Missing required fields - even though schema says optional, there might be validation");
console.log("3. Data format issues");

// The frontend validation only checks company_name
console.log("\nFrontend validation only checks:");
console.log("- company_name is required");
console.log("But other fields are optional according to schema");

console.log("\nRecommendations:");
console.log("1. Ensure user is authenticated with role: administrator, manager, or staff");
console.log("2. Try creating with minimal required fields");
console.log("3. Check if there are any custom validation rules in hooks");