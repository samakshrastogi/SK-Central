import { Router } from 'express';
import { getConnectedApplicationAnalytics, getSkMailpilotApprovalRequests, getSkQuizAdminAnalytics, manageSkMailpilotApproval } from '@/controllers/integration.controller.js';
import { asyncHandler } from '@/utils/asyncHandler.js';

export const integrationRoutes = Router();

integrationRoutes.get('/sk-quiz/admin-analytics', asyncHandler(getSkQuizAdminAnalytics));
integrationRoutes.get('/sk-mailpilot/approval-requests', asyncHandler(getSkMailpilotApprovalRequests));
integrationRoutes.post('/sk-mailpilot/approval-requests/:requestId/:decision', asyncHandler(manageSkMailpilotApproval));
integrationRoutes.get("/:application/admin-analytics", asyncHandler(getConnectedApplicationAnalytics));
