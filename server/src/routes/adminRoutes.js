import { Router } from 'express'
import {
  getAdminDashboardStats,
  getAdminUsers,
  getAdminLogs,
  updateUserRole,
} from '../controllers/adminController.js'

const router = Router()

router.get('/stats', getAdminDashboardStats)
router.get('/users', getAdminUsers)
router.get('/logs', getAdminLogs)
router.put('/users/role', updateUserRole)

export default router
