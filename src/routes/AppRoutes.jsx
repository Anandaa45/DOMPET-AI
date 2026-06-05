import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from '../components/layout/AdminLayout.jsx'
import ClientLayout from '../components/layout/ClientLayout.jsx'
import AdminDashboard from '../pages/admin/AdminDashboard.jsx'
import AdminLogs from '../pages/admin/AdminLogs.jsx'
import AdminUsers from '../pages/admin/AdminUsers.jsx'
import Login from '../pages/auth/Login.jsx'
import Register from '../pages/auth/Register.jsx'
import Dashboard from '../pages/client/Dashboard.jsx'
import ReceiptScan from '../pages/client/ReceiptScan.jsx'
import Reports from '../pages/client/Reports.jsx'
import Settings from '../pages/client/Settings.jsx'
import Transactions from '../pages/client/Transactions.jsx'
import WhatsAppConnect from '../pages/client/WhatsAppConnect.jsx'
import Welcome from '../pages/Welcome.jsx'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/welcome" replace />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ClientLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/receipt-scan" element={<ReceiptScan />} />
        <Route path="/whatsapp" element={<WhatsAppConnect />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="/admin" element={<AdminLayout />}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="logs" element={<AdminLogs />} />
      </Route>

      <Route path="*" element={<Navigate to="/welcome" replace />} />
    </Routes>
  )
}
