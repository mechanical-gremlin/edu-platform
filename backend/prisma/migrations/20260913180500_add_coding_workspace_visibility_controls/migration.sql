ALTER TABLE "Activity"
  ADD COLUMN "studentFileTreeEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "studentEntrypointSelectionEnabled" BOOLEAN NOT NULL DEFAULT true;
