ALTER TABLE "Course" ADD COLUMN "visible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Course" ADD COLUMN "position" INTEGER;

WITH ordered_courses AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "code" ASC, "id" ASC) - 1 AS row_index
  FROM "Course"
)
UPDATE "Course"
SET "position" = ordered_courses.row_index
FROM ordered_courses
WHERE "Course"."id" = ordered_courses."id";

ALTER TABLE "Course" ALTER COLUMN "position" SET NOT NULL;

CREATE INDEX "Course_position_idx" ON "Course"("position");
