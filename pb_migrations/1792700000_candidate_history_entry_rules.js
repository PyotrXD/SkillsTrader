/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Read tier mirrors the parent `candidates` collection; write tier mirrors the
  // UI gate `canManageCandidates` (administrator || manager), so the server never
  // grants an edit the interface already hides.
  const READ =
    "@request.auth.id != '' && (@request.auth.role = 'administrator' || @request.auth.role = 'manager' || @request.auth.role = 'staff')";
  const WRITE =
    "@request.auth.id != '' && (@request.auth.role = 'administrator' || @request.auth.role = 'manager')";

  for (const name of ["candidate_work_experiences", "candidate_educations"]) {
    const collection = app.findCollectionByNameOrId(name);

    collection.listRule = READ;
    collection.viewRule = READ;
    collection.createRule = WRITE;
    collection.updateRule = WRITE;
    collection.deleteRule = WRITE;

    app.save(collection);
  }
}, (app) => {
  const PREVIOUS = "@request.auth.id != ''";

  for (const name of ["candidate_work_experiences", "candidate_educations"]) {
    const collection = app.findCollectionByNameOrId(name);

    collection.listRule = PREVIOUS;
    collection.viewRule = PREVIOUS;
    collection.createRule = PREVIOUS;
    collection.updateRule = PREVIOUS;
    collection.deleteRule = PREVIOUS;

    app.save(collection);
  }
});
