-- CreateIndex
CREATE INDEX "alerts_scan_id_idx" ON "alerts"("scan_id");

-- CreateIndex
CREATE INDEX "scans_package_name_version_idx" ON "scans"("package_name", "version");

-- CreateIndex
CREATE INDEX "scans_scanned_at_idx" ON "scans"("scanned_at");
