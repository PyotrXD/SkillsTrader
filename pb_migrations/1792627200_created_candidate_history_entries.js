/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const CANDIDATES_ID = "pbc_1773600001";
  const RULE = "@request.auth.id != ''";

  const candidateField = {
    cascadeDelete: true,
    hidden: false,
    maxSelect: 1,
    minSelect: 0,
    name: "candidate",
    presentable: false,
    required: true,
    system: false,
    type: "relation",
    collectionId: CANDIDATES_ID,
  };

  const text = (name, presentable) => ({
    autogeneratePattern: "",
    hidden: false,
    max: 0,
    min: 0,
    name,
    pattern: "",
    presentable: !!presentable,
    primaryKey: false,
    required: false,
    system: false,
    type: "text",
  });

  const date = (name) => ({
    hidden: false,
    max: "",
    min: "",
    name,
    presentable: false,
    required: false,
    system: false,
    type: "date",
  });

  const year = (name) => ({
    hidden: false,
    max: 2100,
    min: 1900,
    name,
    onlyInt: true,
    presentable: false,
    required: false,
    system: false,
    type: "number",
  });

  const autodates = [
    {
      hidden: false,
      name: "created",
      onCreate: true,
      onUpdate: false,
      presentable: false,
      system: false,
      type: "autodate",
    },
    {
      hidden: false,
      name: "updated",
      onCreate: true,
      onUpdate: true,
      presentable: false,
      system: false,
      type: "autodate",
    },
  ];

  const workExperiences = new Collection({
    name: "candidate_work_experiences",
    type: "base",
    system: false,
    listRule: RULE,
    viewRule: RULE,
    createRule: RULE,
    updateRule: RULE,
    deleteRule: RULE,
    indexes: [
      "CREATE INDEX `idx_cwe_candidate` ON `candidate_work_experiences` (`candidate`)",
      "CREATE INDEX `idx_cwe_candidate_end` ON `candidate_work_experiences` (`candidate`, `end_date`)",
    ],
    fields: [
      { ...candidateField },
      text("position", true),
      text("company", true),
      text("location", false),
      date("start_date"),
      date("end_date"),
      {
        hidden: false,
        name: "is_current",
        presentable: false,
        required: false,
        system: false,
        type: "bool",
      },
      text("description", false),
      ...autodates,
    ],
  });

  const educations = new Collection({
    name: "candidate_educations",
    type: "base",
    system: false,
    listRule: RULE,
    viewRule: RULE,
    createRule: RULE,
    updateRule: RULE,
    deleteRule: RULE,
    indexes: [
      "CREATE INDEX `idx_ce_candidate` ON `candidate_educations` (`candidate`)",
      "CREATE INDEX `idx_ce_candidate_level` ON `candidate_educations` (`candidate`, `level`)",
    ],
    fields: [
      { ...candidateField },
      {
        hidden: false,
        maxSelect: 1,
        name: "level",
        presentable: true,
        required: true,
        system: false,
        type: "select",
        values: [
          "elementary",
          "junior_high",
          "senior_high",
          "college",
          "vocational",
          "graduate",
          "other",
        ],
      },
      text("school_name", true),
      text("course", false),
      year("start_year"),
      year("end_year"),
      text("notes", false),
      ...autodates,
    ],
  });

  app.save(workExperiences);
  app.save(educations);
}, (app) => {
  for (const name of ["candidate_work_experiences", "candidate_educations"]) {
    const collection = app.findCollectionByNameOrId(name);
    app.delete(collection);
  }
});
