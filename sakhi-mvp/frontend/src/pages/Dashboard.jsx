import SellerDashboard from "./dashboards/SellerDashboard";
import CustomerDashboard from "./dashboards/CustomerDashboard";
import DeliveryDashboard from "./dashboards/DeliveryDashboard";
import AdminDashboard from "./dashboards/AdminDashboard";

const dashboards = {
  seller: SellerDashboard,
  customer: CustomerDashboard,
  delivery_partner: DeliveryDashboard,
  admin: AdminDashboard
};

export default function Dashboard({ role }) {
  const Component = dashboards[role] || CustomerDashboard;
  return <Component />;
}
