/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("candidates");

  const statusField = collection.fields.getByName("status");

  if (statusField) {
    statusField.values = [
      "New Applicant",
      "Lined-Up",
      "For final interview",
      "For medical",
      "Fit to work",
      "Unfit to work",
      "Pending medical",
      "For deployment",
      "Visa Arrived",
      "Awaiting Visa",
      "Deployed",
      "Rejected",
    ];
  }

  app.save(collection);
}, (app) => {
  // Rollback — ibalik ang dati
  const collection = app.findCollectionByNameOrId("candidates");

  const statusField = collection.fields.getByName("status");

  if (statusField) {
    statusField.values = [
      "Applied",
      "Screening",
      "Screened",
      "For Interview",
      "Interviewed",
      "Placed",
      "Rejected",
    ];
  }

  app.save(collection);
});