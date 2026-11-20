/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const createRule =
    "@request.auth.id != '' && (@request.auth.role = 'administrator' || @request.auth.role = 'manager' || (@request.auth.role = 'staff' && candidate.is_archived = false))";

  for (const name of ["candidate_work_experiences", "candidate_educations"]) {
    const collection = app.findCollectionByNameOrId(name);
    collection.createRule = createRule;
    app.save(collection);
  }
}, (app) => {
  const createRule =
    "@request.auth.id != '' && (@request.auth.role = 'administrator' || @request.auth.role = 'manager')";

  for (const name of ["candidate_work_experiences", "candidate_educations"]) {
    const collection = app.findCollectionByNameOrId(name);
    collection.createRule = createRule;
    app.save(collection);
  }
});
