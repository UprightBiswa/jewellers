-- Materials become a table the owner can edit, instead of a Prisma enum.

CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameBn" TEXT,
    "code" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Material_slug_key" ON "Material"("slug");
CREATE UNIQUE INDEX "Material_code_key" ON "Material"("code");
CREATE INDEX "Material_isActive_sortOrder_idx" ON "Material"("isActive", "sortOrder");

-- The five the enum used to offer, so nothing on the shop changes today.
INSERT INTO "Material" ("id","slug","name","nameBn","code","sortOrder","updatedAt") VALUES
  ('mat_s925',  'sterling-925',  '925 Sterling Silver', 'রুপো ৯২৫', '925',         0, now()),
  ('mat_s999',  'fine-999',      '999 Fine Silver',     'খাঁটি রুপো ৯৯৯', '999',    1, now()),
  ('mat_oxid',  'oxidised',      'Oxidised Silver',     NULL,       'oxidised',    2, now()),
  ('mat_gold',  'gold-plated',   'Gold Plated Silver',  NULL,       'gold-plated', 3, now()),
  ('mat_plate', 'silver-plated', 'Silver Plated',       NULL,       'plated',      4, now());

-- Product: carry the old enum across, then drop it.
ALTER TABLE "Product" ADD COLUMN "materialId" TEXT;

UPDATE "Product" SET "materialId" = CASE "purity"::text
    WHEN 'S925'        THEN 'mat_s925'
    WHEN 'S999'        THEN 'mat_s999'
    WHEN 'OXIDISED'    THEN 'mat_oxid'
    WHEN 'GOLD_PLATED' THEN 'mat_gold'
    WHEN 'PLATED'      THEN 'mat_plate'
    ELSE 'mat_s925'
  END;

ALTER TABLE "Product" ALTER COLUMN "materialId" SET NOT NULL;
ALTER TABLE "Product" DROP COLUMN "purity";
ALTER TABLE "Product" ADD CONSTRAINT "Product_materialId_fkey"
  FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
CREATE INDEX "Product_materialId_idx" ON "Product"("materialId");

-- OrderItem keeps a plain-text snapshot. An invoice must not change when a
-- material is later renamed or retired.
ALTER TABLE "OrderItem" ADD COLUMN "materialLabel" TEXT;
UPDATE "OrderItem" SET "materialLabel" = "purity"::text WHERE "purity" IS NOT NULL;
ALTER TABLE "OrderItem" DROP COLUMN "purity";
