import express from "express";
import {  downloadMonthlyReport, downloadYearlyReport, generateRoleReport, generateUserReport, getChartData, getInventoryReport, listMonthlyReports, listYearlyReports, monthlyReport, runMonthlyReportNow } from "../controllers/reportController.js";
import { protect } from "../middlewares/authMIddleware.js";


const router = express.Router();
router.get("/monthly/:month/:year/download", downloadMonthlyReport);
router.get("/yearly/:year/download", downloadYearlyReport);
router.get("/user/:userId", generateUserReport);
router.get("/role/:roleName", generateRoleReport);
router.get("/chart-data", getChartData);
router.get("/generate-monthly", runMonthlyReportNow);


router.get("/amonthly", listMonthlyReports);

router.get("/monthly",protect, monthlyReport);
// new: user-specific report (activity)
router.get("/user/:userId", generateUserReport);

// new: role-specific report


// new: yearly reports listing & download
router.get("/yearly", listYearlyReports);
router.get("/yearly/:year/download", downloadYearlyReport);

router.get("/inventory-summary", getInventoryReport);
router.get("/monthly",protect, monthlyReport);
// **New route**: chart data
router.get("/chart-data", getChartData);
export default router;
