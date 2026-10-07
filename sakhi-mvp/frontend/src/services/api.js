const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("sakhi_token");
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  if (!isFormData) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && token && path !== "/auth/login") {
    localStorage.removeItem("sakhi_token");
    localStorage.removeItem("sakhi_user");
    window.location.assign("/login");
    return;
  }
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

export const api = {
  login: (body) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  register: (body) => request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  sellers: () => request("/sellers"),
  mySeller: () => request("/sellers/me"),
  seller: (id) => request(`/sellers/${id}`),
  products: () => request("/products"),
  myProducts: () => request("/products/mine"),
  createProduct: (body) => request("/products", { method: "POST", body: body instanceof FormData ? body : JSON.stringify(body) }),
  updateProduct: (id, body) => request(`/products/${id}`, { method: "PUT", body: body instanceof FormData ? body : JSON.stringify(body) }),
  removeProduct: (id) => request(`/products/${id}`, { method: "DELETE" }),
  nextWave: () => request("/orders/next-wave"),
  orders: () => request("/orders"),
  createOrder: (body) => request("/orders", { method: "POST", body: JSON.stringify(body) }),
  updateOrder: (id, body) => request(`/orders/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  createReturn: (orderId, formData) => request(`/returns/${orderId}`, { method: "POST", body: formData }),
  myReturns: () => request("/returns/mine"),
  deliveries: () => request("/delivery"),
  uploadPackagePhoto: (id, formData) => request(`/delivery/${id}/package-photo`, { method: "POST", body: formData }),
  updateDelivery: (id, body) => request(`/delivery/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  updateBatchStatus: (batchId, status) => request(`/delivery/batch/${batchId}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  stats: () => request("/admin/stats"),
  waves: () => request("/admin/waves"),
  batches: () => request("/admin/batches"),
  partners: () => request("/admin/partners"),
  assignBatch: (batchId, body) => request(`/admin/batches/${batchId}`, { method: "PUT", body: JSON.stringify(body) }),
  verifications: () => request("/admin/verifications"),
  verify: (id, body) => request(`/admin/verification/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  returns: () => request("/admin/returns"),
  reviewReturn: (id, body) => request(`/admin/returns/${id}`, { method: "PUT", body: JSON.stringify(body) }),
};
