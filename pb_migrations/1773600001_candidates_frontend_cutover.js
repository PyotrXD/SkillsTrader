/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const LEGACY_CANDIDATES_ID = "pbc_2496120988";
  const NEW_CANDIDATES_ID = "pbc_1773600001";

  const candidateStatuses = [
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

  function findCollectionOrNull(idOrName) {
    try {
      return app.findCollectionByNameOrId(idOrName);
    } catch (_) {
      return null;
    }
  }

  function repointCandidateRelation(collectionName, targetCollectionId) {
    const newRelationIds = {
      documents: "relcandnewdoc01",
      interviews: "relcandnewint01",
      placements: "relcandnewpla01",
    };
    const newFieldId = newRelationIds[collectionName];
    if (!newFieldId) {
      throw new Error(`Unsupported collection for candidate repoint: ${collectionName}`);
    }

    let collection = app.findCollectionByNameOrId(collectionName);
    let existingCandidate = collection.fields.getByName("candidate");
    let existingLegacyCandidate = collection.fields.getByName("candidate_legacy");

    // Already migrated for this collection.
    if (existingCandidate && existingLegacyCandidate) {
      return app.save(collection);
    }

    // Partially migrated state: candidate already renamed, but new candidate missing.
    if (!existingCandidate && existingLegacyCandidate) {
      collection.fields.add(
        new Field({
          id: newFieldId,
          type: "relation",
          name: "candidate",
          required: false,
          collectionId: targetCollectionId,
          cascadeDelete: false,
          minSelect: 0,
          maxSelect: 1,
        })
      );
      return app.save(collection);
    }

    if (!existingCandidate) {
      throw new Error(
        `Missing candidate relation field in collection "${collectionName}".`
      );
    }

    // PocketBase doesn't allow changing relation collectionId in-place.
    // Keep existing links under candidate_legacy, then add a fresh candidate relation.
    existingCandidate.name = "candidate_legacy";
    existingCandidate.required = false;
    app.save(collection);

    collection = app.findCollectionByNameOrId(collectionName);
    existingCandidate = collection.fields.getByName("candidate");
    existingLegacyCandidate = collection.fields.getByName("candidate_legacy");

    // Already completed after the intermediate save.
    if (existingCandidate && existingLegacyCandidate) {
      return app.save(collection);
    }

    collection.fields.add(
      new Field({
        id: newFieldId,
        type: "relation",
        name: "candidate",
        required: false,
        collectionId: targetCollectionId,
        cascadeDelete: false,
        minSelect: 0,
        maxSelect: 1,
      })
    );

    return app.save(collection);
  }

  // 1) Preserve existing candidates data as legacy.
  const legacyCandidates = app.findCollectionByNameOrId(LEGACY_CANDIDATES_ID);
  if (legacyCandidates.name !== "candidates_legacy") {
    legacyCandidates.name = "candidates_legacy";
    app.save(legacyCandidates);
  }

  // 2) Create a new frontend-aligned candidates collection.
  const existingNewCandidates = findCollectionOrNull(NEW_CANDIDATES_ID);
  if (!existingNewCandidates) {
    const candidates = new Collection({
      id: NEW_CANDIDATES_ID,
      name: "candidates",
      type: "base",
      system: false,
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      indexes: [],
      fields: [
      {
        system: true,
        hidden: false,
        presentable: false,
        name: "id",
        type: "text",
        required: true,
        primaryKey: true,
        autogeneratePattern: "[a-z0-9]{15}",
        min: 15,
        max: 15,
        pattern: "^[a-z0-9]+$",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "last_name",
        type: "text",
        required: true,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "first_name",
        type: "text",
        required: true,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "middle_name",
        type: "text",
        required: false,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "prefix",
        type: "text",
        required: false,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "suffix",
        type: "text",
        required: false,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "full_name",
        type: "text",
        required: false,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "marital_status",
        type: "text",
        required: false,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "home_address",
        type: "text",
        required: false,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "permanent_address",
        type: "text",
        required: false,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "pagibig_number",
        type: "text",
        required: false,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "highest_educ_attainment",
        type: "text",
        required: false,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "school_elementary",
        type: "text",
        required: false,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "school_junior_high",
        type: "text",
        required: false,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "school_senior_high",
        type: "text",
        required: false,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "school_college",
        type: "text",
        required: false,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "school_other",
        type: "text",
        required: false,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "school_other_name",
        type: "text",
        required: false,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "email",
        type: "email",
        required: true,
        onlyDomains: [],
        exceptDomains: [],
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "phone",
        type: "text",
        required: true,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "address",
        type: "text",
        required: false,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "education",
        type: "text",
        required: false,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "work_history",
        type: "editor",
        required: true,
        maxSize: 0,
        convertURLs: false,
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "skills",
        type: "text",
        required: true,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "certifications",
        type: "editor",
        required: true,
        maxSize: 0,
        convertURLs: false,
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "desired_salary",
        type: "text",
        required: true,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "position_screened",
        type: "text",
        required: false,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "notes",
        type: "editor",
        required: false,
        maxSize: 0,
        convertURLs: false,
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "status",
        type: "select",
        required: true,
        maxSelect: 1,
        values: candidateStatuses,
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "consent_given",
        type: "bool",
        required: false,
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "consent_at",
        type: "date",
        required: false,
        min: "",
        max: "",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "consent_source",
        type: "text",
        required: false,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "consent_version",
        type: "text",
        required: false,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "action_required",
        type: "json",
        required: false,
        maxSize: 0,
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "photo",
        type: "file",
        required: false,
        protected: true,
        maxSelect: 1,
        maxSize: 10000000,
        mimeTypes: [
          "image/jpeg",
          "image/png",
          "image/svg+xml",
          "image/gif",
          "image/webp",
        ],
        thumbs: ["200x200"],
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "created",
        type: "autodate",
        onCreate: true,
        onUpdate: false,
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "updated",
        type: "autodate",
        onCreate: true,
        onUpdate: true,
      },
      ],
    });
    app.save(candidates);
  } else if (existingNewCandidates.name !== "candidates") {
    existingNewCandidates.name = "candidates";
    app.save(existingNewCandidates);
  }

  // 3) Retarget dependent candidate relations.
  repointCandidateRelation("documents", NEW_CANDIDATES_ID);
  repointCandidateRelation("interviews", NEW_CANDIDATES_ID);
  repointCandidateRelation("placements", NEW_CANDIDATES_ID);
}, (app) => {
  const LEGACY_CANDIDATES_ID = "pbc_2496120988";
  const NEW_CANDIDATES_ID = "pbc_1773600001";

  function restoreCandidateRelation(collectionName, targetCollectionId) {
    const collection = app.findCollectionByNameOrId(collectionName);
    const currentCandidate = collection.fields.getByName("candidate");
    const legacyCandidate = collection.fields.getByName("candidate_legacy");

    if (currentCandidate) {
      collection.fields.removeById(currentCandidate.id);
    }

    if (!legacyCandidate) {
      throw new Error(
        `Missing candidate_legacy relation field in collection "${collectionName}".`
      );
    }

    legacyCandidate.name = "candidate";
    legacyCandidate.collectionId = targetCollectionId;
    legacyCandidate.required = collectionName === "placements";

    return app.save(collection);
  }

  // 1) Repoint dependent candidate relations back to legacy.
  restoreCandidateRelation("documents", LEGACY_CANDIDATES_ID);
  restoreCandidateRelation("interviews", LEGACY_CANDIDATES_ID);
  restoreCandidateRelation("placements", LEGACY_CANDIDATES_ID);

  // 2) Delete the new candidates collection.
  const newCandidates = app.findCollectionByNameOrId(NEW_CANDIDATES_ID);
  app.delete(newCandidates);

  // 3) Rename legacy collection back to candidates.
  const legacyCandidates = app.findCollectionByNameOrId(LEGACY_CANDIDATES_ID);
  legacyCandidates.name = "candidates";
  return app.save(legacyCandidates);
});
