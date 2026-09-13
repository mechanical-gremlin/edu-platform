ALTER TABLE "Course" ADD COLUMN "visible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Enrollment" ADD COLUMN "position" INTEGER;

WITH ordered_teacher_enrollments AS (
  SELECT "Enrollment"."id", ROW_NUMBER() OVER (
    PARTITION BY "Enrollment"."userId"
    ORDER BY "Course"."createdAt" ASC, "Course"."code" ASC, "Course"."id" ASC
  ) - 1 AS row_index
  FROM "Enrollment"
  INNER JOIN "Course" ON "Course"."id" = "Enrollment"."courseId"
  WHERE "Enrollment"."role" = 'teacher'
)
UPDATE "Enrollment"
SET "position" = ordered_teacher_enrollments.row_index
FROM ordered_teacher_enrollments
WHERE "Enrollment"."id" = ordered_teacher_enrollments."id";

CREATE INDEX "Enrollment_userId_role_position_idx" ON "Enrollment"("userId", "role", "position");
