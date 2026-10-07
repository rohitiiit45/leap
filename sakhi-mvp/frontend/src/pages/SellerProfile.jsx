import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Package,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Card from "../components/Card";
import VerifiedBadge from "../components/VerifiedBadge";
import Img from "../components/Img";

import { api } from "../services/api";
import { CAT_IMG, IMG } from "../data/catalog";

export default function SellerProfile() {
  const { id } = useParams();

  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSellerProfile() {
      try {
        setError("");

        const [sellerData, productData] = await Promise.all([
          api.seller(id),
          api.products(),
        ]);

        setSeller(sellerData);

        // Only show products that belong to this seller.
        const sellerProducts = productData.filter(
          (product) => String(product.sellerId) === String(sellerData._id),
        );

        setProducts(sellerProducts);
      } catch (err) {
        setError(err.message || "Unable to load seller profile.");
      }
    }

    loadSellerProfile();
  }, [id]);

  if (!seller && !error) {
    return (
      <>
        <Navbar />

        <main className="page min-h-[70vh] pb-16">
          <p className="py-20 text-center text-slate-500">
            Loading seller profile...
          </p>
        </main>

        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />

        <main className="page min-h-[70vh] pb-16">
          <Link
            to="/marketplace"
            className="mt-4 inline-flex items-center gap-1 py-3 text-sm font-bold text-sakhi-700"
          >
            <ArrowLeft size={16} />
            All businesses
          </Link>

          <div className="mt-6 rounded-2xl bg-red-50 p-5 text-sm text-red-700">
            {error}
          </div>
        </main>

        <Footer />
      </>
    );
  }

  /*
   * IMPORTANT:
   *
   * First priority:
   * 1. Seller profile image, if the backend provides one.
   *
   * Second priority:
   * 2. First uploaded product image.
   *
   * Third priority:
   * 3. Category image.
   *
   * Final fallback:
   * 4. Generic Sakhi image.
   *
   * This prevents the profile from always showing the same
   * hardcoded village image.
   */
  const uploadedProductImage = products.find((product) => product.image)?.image;

  const categoryFallback = CAT_IMG[seller.category]?.[0] || IMG.village;

  const heroImage =
    seller.image ||
    seller.profileImage ||
    seller.coverImage ||
    uploadedProductImage ||
    categoryFallback;

  const stats = [
    {
      label: "Trust score",
      value: `${Number(seller.trustScore || 0).toFixed(1)} / 5`,
      icon: ShieldCheck,
    },
    {
      label: "Rating",
      value: `${Number(seller.rating || 0).toFixed(1)} ★`,
      icon: Star,
    },
    {
      label: "Completed orders",
      value: seller.completedOrders || 0,
      icon: Package,
    },
    {
      label: "On-time delivery",
      value: `${seller.successfulDeliveryRate || 0}%`,
      icon: Truck,
    },
  ];

  return (
    <>
      <Navbar />

      <main className="page min-h-[70vh] pb-16">
        {/* Back button */}
        <Link
          to="/marketplace"
          className="mt-4 inline-flex items-center gap-1 py-3 text-sm font-bold text-sakhi-700"
        >
          <ArrowLeft size={16} />
          All businesses
        </Link>

        {/* Seller hero */}
        <section className="relative mt-2 overflow-hidden rounded-[2rem] bg-slate-950 text-white">
          <Img
            src={heroImage}
            alt={`${seller.businessName} business`}
            emoji="🌸"
            className="h-72 w-full object-cover opacity-70 sm:h-80"
          />

          {/* Dark overlay for readable text */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-7 sm:p-10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-3">
                  <VerifiedBadge status={seller.verificationStatus} />
                </div>

                <h1 className="display text-4xl sm:text-5xl">
                  {seller.businessName}
                </h1>

                <p className="mt-2 flex items-center gap-1 text-sm text-white/80">
                  <MapPin size={14} />
                  {seller.location} · {seller.category}
                </p>
              </div>

              {/* Sakhi ID */}
              <div className="rounded-2xl bg-white/10 px-5 py-3 backdrop-blur">
                <p className="text-xs text-white/60">Sakhi ID</p>

                <p className="font-bold tracking-wide">{seller.sakhiId}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Seller statistics */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <Card key={label} className="p-5">
              <Icon size={19} className="text-warm-500" />

              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                {label}
              </p>

              <p className="mt-1 text-2xl font-bold">{value}</p>
            </Card>
          ))}
        </div>

        {/* About + products */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_.35fr]">
          <Card className="p-6 sm:p-8">
            <p className="eyebrow">About this Sakhi</p>

            <h2 className="mt-2 text-2xl font-bold">
              Made with care, sold locally.
            </h2>

            {seller.description && (
              <p className="mt-4 leading-7 text-slate-600">
                {seller.description}
              </p>
            )}

            {/* Products */}
            <h3 className="mt-8 text-lg font-bold">Products</h3>

            {products.length === 0 ? (
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                This Sakhi has not added any products yet.
              </p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {products.map((product) => (
                  <div
                    key={product._id}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-[#faf8fc] p-3"
                  >
                    {/* Product image */}
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      <Img
                        src={product.image}
                        alt={product.name}
                        emoji="🍛"
                        className="h-full w-full"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-bold">{product.name}</p>

                      <p className="mt-1 text-sm text-slate-500">
                        ₹{product.price}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Why Sakhi */}
          <Card className="h-fit p-6">
            <p className="eyebrow">Why Sakhi</p>

            <div className="mt-5 space-y-4 text-sm text-slate-600">
              <p className="flex gap-3">
                <ShieldCheck className="shrink-0 text-sakhi-600" />

                <span>Verification-led seller identity.</span>
              </p>

              <p className="flex gap-3">
                <Truck className="shrink-0 text-sakhi-600" />

                <span>Organised local delivery waves.</span>
              </p>

              <p className="flex gap-3">
                <Star className="shrink-0 text-sakhi-600" />

                <span>Reputation built through completed orders.</span>
              </p>
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </>
  );
}
