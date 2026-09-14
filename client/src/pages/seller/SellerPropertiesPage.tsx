import { useState, useEffect } from "react";
import { api } from "../../api/client";
import { inr, imgSrc } from "../../lib/format";
import type { Property } from "../../types";

export default function SellerPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState<Property | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);

  // New property form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    propertyType: "APARTMENT",
    bhk: 2,
    bathrooms: 2,
    price: 7500000,
    carpetArea: 1150,
    superBuiltUpArea: 1400,
    furnishing: "SEMI_FURNISHED",
    floor: 4,
    totalFloors: 14,
    parking: 1,
    address: "",
    locality: "",
    city: "Bengaluru",
    latitude: 12.9716,
    longitude: 77.5946,
    contactName: "",
    contactPhone: "",
  });

  const fetchMine = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ results: Property[] }>("/properties/mine");
      setProperties(res.results || []);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load properties");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMine();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/properties", formData);
      setShowAddModal(false);
      void fetchMine();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to create property");
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await api.patch(`/properties/${id}/status`);
      void fetchMine();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to update status");
    }
  };

  const handleUploadImages = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showUploadModal || !selectedFiles || selectedFiles.length === 0) return;
    setUploading(true);
    try {
      await api.upload(`/properties/${showUploadModal.id}/images`, selectedFiles);
      setSelectedFiles(null);
      void fetchMine();
      setShowUploadModal(null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to upload photos");
    } finally {
      setUploading(false);
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      await api.post(`/properties/images/${imageId}/primary`);
      void fetchMine();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to set primary image");
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      await api.del(`/properties/images/${imageId}`);
      void fetchMine();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to delete image");
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">My Property Listings</h1>
          <p className="text-sm text-ink/70">
            Create, edit, and upload media for your active inventory
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-sand shadow hover:bg-ink/90"
        >
          + Add New Property
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-ink/60">Loading properties...</div>
      ) : properties.length === 0 ? (
        <div className="rounded-3xl border border-ink/10 bg-white p-12 text-center space-y-3">
          <p className="font-serif text-xl font-bold">No properties listed yet</p>
          <p className="text-sm text-ink/70">
            Add your first property listing to begin receiving customer inquiries and scheduling tours.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-sand"
          >
            Create Property
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <div
              key={p.id}
              className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="relative">
                  <img
                    src={imgSrc(p.primaryImage)}
                    alt=""
                    className="h-44 w-full object-cover"
                  />
                  <span
                    className={`absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      p.status === "ACTIVE"
                        ? "bg-moss text-white"
                        : p.status === "SOLD"
                        ? "bg-ink text-sand"
                        : "bg-gray-400 text-white"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="font-serif text-lg font-bold line-clamp-1">{p.title}</h3>
                  <p className="font-serif text-xl font-bold text-brass">{inr(p.price)}</p>
                  <p className="text-xs text-ink/70">
                    {p.bhk} BHK · {p.carpetArea} sq ft · <span className="capitalize">{p.locality}</span>
                  </p>
                  <div className="flex gap-4 text-xs text-ink/60 pt-1 border-t border-ink/5">
                    <span>Views: {p.views ?? 0}</span>
                    <span>Photos: {p.images?.length ?? 0}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-ink/5 p-3 bg-sand/20 flex flex-wrap gap-2 justify-between items-center text-xs">
                <button
                  onClick={() => setShowUploadModal(p)}
                  className="rounded-lg bg-white border border-ink/20 px-2.5 py-1 font-semibold text-ink hover:bg-sand"
                >
                  📷 Manage Photos
                </button>
                {p.status !== "SOLD" && (
                  <button
                    onClick={() => void handleToggleStatus(p.id)}
                    className="rounded-lg border border-ink/20 px-2.5 py-1 font-semibold text-ink/70 hover:bg-white"
                  >
                    {p.status === "ACTIVE" ? "Deactivate" : "Activate"}
                  </button>
                )}
                {p.status === "SOLD" && (
                  <span className="text-[11px] font-bold text-ink/60">Marked SOLD by Admin</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Property Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-ink/10 pb-3">
              <h2 className="font-serif text-2xl font-bold">Add New Property Listing</h2>
              <button onClick={() => setShowAddModal(false)} className="text-xl text-ink/50 hover:text-ink">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink/70 mb-1">Listing Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Luxurious 3 BHK with Balcony in Whitefield"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink/70 mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe highlights, view, facing, ventilation, connectivity..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-ink/70 mb-1">Property Type</label>
                  <select
                    value={formData.propertyType}
                    onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                    className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm"
                  >
                    <option value="APARTMENT">Apartment</option>
                    <option value="VILLA">Villa</option>
                    <option value="INDEPENDENT_HOUSE">Independent House</option>
                    <option value="PLOT">Plot</option>
                    <option value="BUILDER_FLOOR">Builder Floor</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-ink/70 mb-1">Bedrooms (BHK)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.bhk}
                    onChange={(e) => setFormData({ ...formData, bhk: Number(e.target.value) })}
                    className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink/70 mb-1">Bathrooms</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({ ...formData, bathrooms: Number(e.target.value) })}
                    className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-ink/70 mb-1">Price (₹ INR)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink/70 mb-1">Carpet Area (sq ft)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.carpetArea}
                    onChange={(e) => setFormData({ ...formData, carpetArea: Number(e.target.value) })}
                    className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink/70 mb-1">Super Built-up Area</label>
                  <input
                    type="number"
                    value={formData.superBuiltUpArea}
                    onChange={(e) => setFormData({ ...formData, superBuiltUpArea: Number(e.target.value) })}
                    className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-ink/70 mb-1">Furnishing</label>
                  <select
                    value={formData.furnishing}
                    onChange={(e) => setFormData({ ...formData, furnishing: e.target.value })}
                    className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm"
                  >
                    <option value="UNFURNISHED">Unfurnished</option>
                    <option value="SEMI_FURNISHED">Semi-Furnished</option>
                    <option value="FULLY_FURNISHED">Fully Furnished</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-ink/70 mb-1">Floor / Total Floors</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Floor"
                      value={formData.floor}
                      onChange={(e) => setFormData({ ...formData, floor: Number(e.target.value) })}
                      className="w-1/2 rounded-xl border border-ink/20 px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Total"
                      value={formData.totalFloors}
                      onChange={(e) => setFormData({ ...formData, totalFloors: Number(e.target.value) })}
                      className="w-1/2 rounded-xl border border-ink/20 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-ink/70 mb-1">Parking Slots</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.parking}
                    onChange={(e) => setFormData({ ...formData, parking: Number(e.target.value) })}
                    className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-ink/70 mb-1">Locality (lowercase)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. whitefield"
                    value={formData.locality}
                    onChange={(e) => setFormData({ ...formData, locality: e.target.value.toLowerCase() })}
                    className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink/70 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink/70 mb-1">Address</label>
                  <input
                    type="text"
                    required
                    placeholder="Full street address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink/70 mb-1">Contact Name</label>
                  <input
                    type="text"
                    required
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink/70 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    required
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-ink/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-ink/70 hover:bg-ink/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-ink px-6 py-2 text-sm font-semibold text-sand hover:bg-ink/90"
                >
                  Publish Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Images Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl font-bold">Property Photos</h3>
              <button onClick={() => setShowUploadModal(null)} className="text-xl text-ink/50 hover:text-ink">
                &times;
              </button>
            </div>
            <p className="text-xs text-ink/70">
              Manage uploaded images for <span className="font-bold">{showUploadModal.title}</span>.
            </p>

            {/* Current Images */}
            {showUploadModal.images && showUploadModal.images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                {showUploadModal.images.map((img) => (
                  <div key={img.id} className="relative group rounded-lg overflow-hidden border border-ink/10">
                    <img src={imgSrc(img.path)} alt="" className="h-24 w-full object-cover" />
                    {img.isPrimary && (
                      <span className="absolute top-1 left-1 bg-brass text-ink text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                        Primary
                      </span>
                    )}
                    <div className="absolute inset-0 bg-ink/70 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1 p-1">
                      {!img.isPrimary && (
                        <button
                          type="button"
                          onClick={() => void handleSetPrimary(img.id)}
                          className="text-[10px] bg-white text-ink px-1.5 py-0.5 rounded font-bold hover:bg-sand"
                        >
                          Star
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleDeleteImage(img.id)}
                        className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold hover:bg-red-700"
                      >
                        Del
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Form */}
            <form onSubmit={handleUploadImages} className="space-y-3 pt-2 border-t border-ink/10">
              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1">
                  Upload Photos (JPEG, PNG, WebP &lt; 5MB)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => setSelectedFiles(e.target.files)}
                  className="w-full text-xs text-ink/80 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-ink file:text-sand hover:file:bg-ink/90 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-ink/70 hover:bg-ink/5"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFiles || selectedFiles.length === 0}
                  className="rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-sand hover:bg-ink/90 disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload Photos"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
