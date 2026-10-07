import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Marketplace from "./pages/Marketplace";
import Dashboard from "./pages/Dashboard";
import SellerProfile from "./pages/SellerProfile";
import { useAuth } from "./context/AuthContext";

function Protected({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={`/${user.role}`} replace />;
  return children;
}
export default function App(){
 return <Routes>
   <Route path="/" element={<Home/>}/>
   <Route path="/login" element={<Login/>}/>
   <Route path="/signup" element={<Signup/>}/>
   <Route path="/marketplace" element={<Marketplace/>}/>
   <Route path="/sellers/:id" element={<SellerProfile/>}/>
   <Route path="/seller" element={<Protected role="seller"><Dashboard role="seller"/></Protected>}/>
   <Route path="/customer" element={<Protected role="customer"><Dashboard role="customer"/></Protected>}/>
   <Route path="/delivery_partner" element={<Protected role="delivery_partner"><Dashboard role="delivery_partner"/></Protected>}/>
   <Route path="/admin" element={<Protected role="admin"><Dashboard role="admin"/></Protected>}/>
   <Route path="*" element={<Navigate to="/" replace/>}/>
 </Routes>
}
