/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // UP — make fields optional
    const collection = app.findCollectionByNameOrId("candidates");

    const fieldsToMakeOptional = [
      "certifications",
      "desired_salary",
      "email",
      "phone",
      "skills",
      "work_history",
    ];

    for (const fieldName of fieldsToMakeOptional) {
      const field = collection.fields.getByName(fieldName);
      if (field) {
        field.required = false;
      }
    }

    app.save(collection);
  },

  (app) => {
    // DOWN — rollback: make fields required again
    const collection = app.findCollectionByNameOrId("candidates");

    const fieldsToMakeRequired = [
      "certifications",
      "desired_salary",
      "email",
      "phone",
      "skills",
      "work_history",
    ];

    for (const fieldName of fieldsToMakeRequired) {
      const field = collection.fields.getByName(fieldName);
      if (field) {
        field.required = true;
      }
    }

    app.save(collection);
  }
);