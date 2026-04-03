-- CreateTable
CREATE TABLE "packages" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "weekly_downloads" INTEGER,
    "last_version" TEXT,
    "last_checked_at" TIMESTAMP(3),
    "etag" TEXT,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scans" (
    "id" SERIAL NOT NULL,
    "package_name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "previous_version" TEXT,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "risk_score" INTEGER,
    "static_flags" JSONB,
    "llm_summary" TEXT,
    "diff_url" TEXT,
    "alerted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" SERIAL NOT NULL,
    "scan_id" INTEGER NOT NULL,
    "alert_type" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "packages_name_key" ON "packages"("name");

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
